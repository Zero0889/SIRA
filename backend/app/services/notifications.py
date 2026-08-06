from datetime import datetime, timedelta, timezone
import logging
import re
from urllib.parse import urlsplit

import httpx
from sqlalchemy import desc, select

from app.config import get_settings
from app.db import SessionLocal
from app.models.notificacion import NotificacionSms

logger = logging.getLogger(__name__)
E164_PATTERN = re.compile(r"^\+[1-9]\d{7,14}$")
SMSGATE_MODES = {"local", "cloud", "private"}
SMSGATE_CLOUD_BASE_URL = "https://api.sms-gate.app"


def mask_phone(number: str) -> str:
    if not number:
        return ""
    return f"{number[:3]}••••{number[-3:]}" if len(number) > 7 else "••••"


def _valid_base_url(base_url: str) -> bool:
    if not base_url:
        return False
    parsed = urlsplit(base_url)
    return bool(
        parsed.scheme in {"http", "https"}
        and parsed.netloc
        and not parsed.username
        and not parsed.password
        and not parsed.query
        and not parsed.fragment
    )


def build_smsgate_url(mode: str, base_url: str) -> str:
    normalized_mode = mode.strip().lower()
    if normalized_mode not in SMSGATE_MODES:
        raise ValueError("SMSGATE_MODE debe ser local, cloud o private")

    normalized_base = base_url.strip().rstrip("/")
    if normalized_mode == "cloud" and not normalized_base:
        normalized_base = SMSGATE_CLOUD_BASE_URL
    if not _valid_base_url(normalized_base):
        raise ValueError("SMSGATE_BASE_URL no es una URL HTTP(S) válida")

    if normalized_mode == "local":
        return f"{normalized_base}/message"
    if normalized_mode == "private":
        return f"{normalized_base}/api/3rdparty/v1/messages"
    return f"{normalized_base}/3rdparty/v1/messages"


def build_smsgate_payload(
    recipient: str,
    message: str,
    sim_number: int | None = None,
) -> dict:
    if not E164_PATTERN.fullmatch(recipient):
        raise ValueError("El destinatario SMS debe usar formato E.164")
    if sim_number is not None and sim_number not in {1, 2, 3}:
        raise ValueError("SMSGATE_SIM_NUMBER debe ser 1, 2 o 3")

    payload: dict = {
        "phoneNumbers": [recipient],
        "textMessage": {"text": " ".join(message.split())[:320]},
    }
    if sim_number is not None:
        payload["simNumber"] = sim_number
    return payload


def sms_status() -> dict:
    settings = get_settings()
    provider = settings.sms_provider.strip().lower()
    mode = settings.smsgate_mode.strip().lower()
    selected = provider == "smsgate"

    try:
        build_smsgate_url(mode, settings.smsgate_base_url)
        valid_gateway = True
    except ValueError:
        valid_gateway = False

    valid_recipient = bool(E164_PATTERN.fullmatch(settings.sms_to))
    valid_sim = settings.smsgate_sim_number is None or settings.smsgate_sim_number in {1, 2, 3}
    configured = bool(
        selected
        and settings.smsgate_username
        and settings.smsgate_password
        and valid_gateway
        and valid_recipient
        and valid_sim
    )

    if provider == "disabled":
        state = "disabled"
    elif configured:
        state = "ready"
    else:
        state = "incomplete"

    return {
        "provider": provider,
        "mode": mode if mode in SMSGATE_MODES else "invalid",
        "state": state,
        "configured": configured,
        "recipient": mask_phone(settings.sms_to),
        "sender": "Android / SIM" if selected else "",
        "cooldown_minutes": settings.sms_cooldown_minutes,
        "triggers": {
            "irrigation": settings.sms_notify_irrigation,
            "frost": settings.sms_notify_frost,
            "tank_low": settings.sms_notify_tank_low,
        },
    }


async def _recently_sent(parcela_id: int | None, event: str) -> bool:
    settings = get_settings()
    cutoff = datetime.now(timezone.utc) - timedelta(
        minutes=max(1, settings.sms_cooldown_minutes)
    )
    async with SessionLocal() as db:
        stmt = (
            select(NotificacionSms)
            .where(
                NotificacionSms.parcela_id == parcela_id,
                NotificacionSms.evento == event,
                NotificacionSms.estado == "sent",
                NotificacionSms.creado >= cutoff,
            )
            .order_by(desc(NotificacionSms.creado))
            .limit(1)
        )
        return (await db.execute(stmt)).scalar_one_or_none() is not None


async def send_sms(
    message: str,
    *,
    event: str,
    parcela_id: int | None = None,
    bypass_cooldown: bool = False,
    transport: httpx.AsyncBaseTransport | None = None,
) -> dict:
    """Envía un SMS con SMSGate. Los errores se registran sin romper la ingestión."""
    settings = get_settings()
    status = sms_status()
    if not status["configured"]:
        return {"sent": False, "reason": status["state"]}
    if not bypass_cooldown and await _recently_sent(parcela_id, event):
        return {"sent": False, "reason": "cooldown"}

    result_state = "failed"
    error: str | None = None
    clean_message = " ".join(message.split())[:320]
    try:
        send_url = build_smsgate_url(
            settings.smsgate_mode,
            settings.smsgate_base_url,
        )
        payload = build_smsgate_payload(
            settings.sms_to,
            clean_message,
            settings.smsgate_sim_number,
        )
        async with httpx.AsyncClient(timeout=15.0, transport=transport) as client:
            response = await client.post(
                send_url,
                auth=httpx.BasicAuth(
                    settings.smsgate_username,
                    settings.smsgate_password,
                ),
                json=payload,
            )
            response.raise_for_status()
        result_state = "sent"
    except (httpx.HTTPError, ValueError) as exc:
        error = str(exc)[:500]
        logger.warning("No se pudo enviar la alerta SMS (%s): %s", event, error)

    async with SessionLocal() as db:
        db.add(
            NotificacionSms(
                parcela_id=parcela_id,
                evento=event,
                proveedor="smsgate",
                destinatario=mask_phone(settings.sms_to),
                mensaje=clean_message,
                estado=result_state,
                error=error,
            )
        )
        await db.commit()

    return {"sent": result_state == "sent", "reason": result_state}


async def notify_ingest_events(
    *,
    parcela_id: int,
    parcela_nombre: str,
    accion: str,
    minutos_riego: float,
    temperatura_c: float | None,
    humedad_suelo_pct: float | None,
    nivel_tanque_pct: float | None,
) -> None:
    settings = get_settings()
    if not sms_status()["configured"]:
        return

    if settings.sms_notify_frost and temperatura_c is not None and temperatura_c <= 3:
        await send_sms(
            f"SIRA · {parcela_nombre}: alerta de helada, {temperatura_c:.1f} °C. Revisa la parcela.",
            event="frost",
            parcela_id=parcela_id,
        )
    if settings.sms_notify_tank_low and nivel_tanque_pct is not None and nivel_tanque_pct < 15:
        await send_sms(
            f"SIRA · {parcela_nombre}: reserva de agua crítica, {nivel_tanque_pct:.0f}%. Revisa el tanque.",
            event="tank_low",
            parcela_id=parcela_id,
        )
    if settings.sms_notify_irrigation and accion == "regar":
        soil = f" Suelo {humedad_suelo_pct:.0f}%." if humedad_suelo_pct is not None else ""
        await send_sms(
            f"SIRA · {parcela_nombre}: riego recomendado por {minutos_riego:.1f} min.{soil}",
            event="irrigation",
            parcela_id=parcela_id,
        )
