from datetime import timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.dispositivo import EstadoDispositivo
from app.models.lectura import Lectura
from app.models.parcela import Parcela
from app.models.riego import EventoRiego
from app.models.usuario import ParcelaUsuario, Usuario
from app.security import get_current_user
from app.schemas import OperationsOverviewOut
from app.services.operations import (
    DEVICE_ONLINE_SECONDS,
    build_irrigation_trend,
    build_parcel_alerts,
    seconds_since,
    utc_now,
)

router = APIRouter(prefix="/operations", tags=["operations"])


@router.get("/overview", response_model=OperationsOverviewOut)
async def operations_overview(
    days: int = Query(14, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    """Snapshot agregado del portafolio para la pantalla Resumen."""
    now = utc_now()
    parcelas = list(
        (
            await db.execute(
                select(Parcela)
                .join(ParcelaUsuario, ParcelaUsuario.parcela_id == Parcela.id)
                .where(ParcelaUsuario.usuario_id == user.id)
                .order_by(Parcela.nombre)
            )
        ).unique().scalars().all()
    )
    parcel_ids = [parcela.id for parcela in parcelas]

    if parcel_ids:
        latest_reading_ids = (
            select(func.max(Lectura.id)).where(Lectura.parcela_id.in_(parcel_ids)).group_by(Lectura.parcela_id)
        )
        readings = list(
            (await db.execute(select(Lectura).where(Lectura.id.in_(latest_reading_ids)))).scalars().all()
        )
        devices = list(
            (await db.execute(select(EstadoDispositivo).where(EstadoDispositivo.parcela_id.in_(parcel_ids)))).scalars().all()
        )
        latest_irrigation_ids = (
            select(func.max(EventoRiego.id)).where(EventoRiego.parcela_id.in_(parcel_ids)).group_by(EventoRiego.parcela_id)
        )
        latest_irrigations = list(
            (await db.execute(select(EventoRiego).where(EventoRiego.id.in_(latest_irrigation_ids)))).scalars().all()
        )
        since = now - timedelta(days=days - 1)
        trend_events = list(
            (
                await db.execute(
                    select(EventoRiego)
                    .where(EventoRiego.parcela_id.in_(parcel_ids), EventoRiego.inicio >= since)
                    .order_by(desc(EventoRiego.inicio))
                )
            ).scalars().all()
        )
    else:
        readings, devices, latest_irrigations, trend_events = [], [], [], []

    reading_by_parcel = {reading.parcela_id: reading for reading in readings}
    device_by_parcel = {device.parcela_id: device for device in devices}
    irrigation_by_parcel = {event.parcela_id: event for event in latest_irrigations}
    parcels_by_id = {parcela.id: parcela for parcela in parcelas}

    alerts: list[dict] = []
    parcel_rows: list[dict] = []
    online_nodes = 0
    dry_parcels = 0
    humidity_values: list[float] = []

    for parcela in parcelas:
        reading = reading_by_parcel.get(parcela.id)
        device = device_by_parcel.get(parcela.id)
        irrigation = irrigation_by_parcel.get(parcela.id)
        parcel_alerts = build_parcel_alerts(parcela, reading, device, now)
        alerts.extend(parcel_alerts)

        age = seconds_since(device.ultima_conexion, now) if device else None
        online = bool(device and age is not None and age <= DEVICE_ONLINE_SECONDS)
        online_nodes += int(online)
        if reading and reading.humedad_suelo_pct is not None:
            humidity_values.append(reading.humedad_suelo_pct)
            dry_parcels += int(reading.humedad_suelo_pct < 30)

        has_critical = any(alert["nivel"] == "critical" for alert in parcel_alerts)
        has_warning = any(alert["nivel"] == "warning" for alert in parcel_alerts)
        health = "critical" if has_critical else "warning" if has_warning else "healthy" if online else "unknown"

        parcel_rows.append(
            {
                "parcela": parcela,
                "cultivo_nombre": parcela.cultivo.nombre_comun if parcela.cultivo else None,
                "ultima_lectura": reading,
                "ultimo_riego": irrigation,
                "dispositivo": {
                    "ultima_conexion": device.ultima_conexion,
                    "segundos_sin_conexion": age,
                    "firmware_version": device.firmware_version,
                    "modo_conexion": device.modo_conexion,
                    "modo_operacion": device.modo_operacion,
                    "bateria_pct": device.bateria_pct,
                    "senal_dbm": device.senal_dbm,
                    "lecturas_pendientes": device.lecturas_pendientes,
                    "simulado": device.simulado,
                }
                if device
                else None,
                "salud": health,
                "alertas": parcel_alerts,
            }
        )

    severity = {"critical": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda alert: (severity[alert["nivel"]], alert["parcela_nombre"], alert["codigo"]))
    trend = build_irrigation_trend(trend_events, parcels_by_id, days, now)
    water_liters = round(sum(point["volumen_ejecutado_l"] for point in trend), 1)
    critical_count = sum(alert["nivel"] == "critical" for alert in alerts)
    status = "critical" if critical_count else "attention" if alerts else "operational"

    return {
        "generated_at": now,
        "status": status,
        "metrics": {
            "parcelas_total": len(parcelas),
            "area_total_m2": round(sum(parcela.area_m2 for parcela in parcelas), 1),
            "nodos_online": online_nodes,
            "nodos_offline": len(parcelas) - online_nodes,
            "parcelas_riego_necesario": dry_parcels,
            "alertas_activas": len(alerts),
            "alertas_criticas": critical_count,
            "humedad_media_pct": round(sum(humidity_values) / len(humidity_values), 1) if humidity_values else None,
            "agua_ejecutada_l": water_liters,
        },
        "parcelas": parcel_rows,
        "alertas": alerts,
        "tendencia": trend,
    }
