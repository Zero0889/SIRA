"""Cálculos puros para el centro de operaciones de SIRA."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Iterable

from app.models.dispositivo import EstadoDispositivo
from app.models.lectura import Lectura
from app.models.parcela import Parcela
from app.models.riego import EventoRiego


DEVICE_ONLINE_SECONDS = 300
LOW_BATTERY_PCT = 25.0
CRITICAL_TANK_PCT = 15.0
DRY_SOIL_PCT = 30.0
FROST_RISK_C = 3.0


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def seconds_since(value: datetime, now: datetime | None = None) -> int:
    current = as_utc(now or utc_now())
    return max(0, int((current - as_utc(value)).total_seconds()))


def build_parcel_alerts(
    parcela: Parcela,
    reading: Lectura | None,
    device: EstadoDispositivo | None,
    now: datetime | None = None,
) -> list[dict]:
    """Devuelve alertas ordenables y accionables para una parcela."""
    alerts: list[dict] = []

    def add(code: str, level: str, title: str, detail: str) -> None:
        alerts.append(
            {
                "id": f"{code}-{parcela.id}",
                "parcela_id": parcela.id,
                "parcela_nombre": parcela.nombre,
                "codigo": code,
                "nivel": level,
                "titulo": title,
                "detalle": detail,
            }
        )

    if device is None:
        add("sin_telemetria", "warning", "Nodo sin telemetría", "Todavía no se recibió el estado del dispositivo.")
    else:
        age = seconds_since(device.ultima_conexion, now)
        if age > DEVICE_ONLINE_SECONDS:
            add("sin_conexion", "critical", "Nodo sin comunicación", f"Último contacto hace {format_age(age)}.")
        if device.bateria_pct is not None and device.bateria_pct < LOW_BATTERY_PCT:
            add("bateria_baja", "critical", "Batería baja", f"Queda {device.bateria_pct:.0f}% de batería.")
        if device.lecturas_pendientes > 0:
            add(
                "lecturas_pendientes",
                "info",
                "Lecturas por sincronizar",
                f"El nodo conserva {device.lecturas_pendientes} lecturas pendientes.",
            )

    if reading is None:
        add("sin_lecturas", "warning", "Parcela sin lecturas", "Conecta el nodo para comenzar a supervisar el suelo.")
    else:
        if reading.nivel_tanque_pct is not None and reading.nivel_tanque_pct < CRITICAL_TANK_PCT:
            add("tanque_bajo", "critical", "Reserva de agua crítica", f"Tanque al {reading.nivel_tanque_pct:.0f}%.")
        if reading.temperatura_c is not None and reading.temperatura_c <= FROST_RISK_C:
            add("riesgo_helada", "critical", "Riesgo de helada", f"Temperatura registrada: {reading.temperatura_c:.1f} °C.")
        if reading.humedad_suelo_pct is not None and reading.humedad_suelo_pct < DRY_SOIL_PCT:
            add("suelo_seco", "warning", "Suelo por debajo del umbral", f"Humedad actual: {reading.humedad_suelo_pct:.1f}%.")

    if parcela.cultivo_id is None or parcela.fecha_siembra is None:
        add("configuracion_incompleta", "info", "Configuración agronómica incompleta", "Asigna cultivo y fecha de siembra.")

    return alerts


def format_age(seconds: int) -> str:
    if seconds < 60:
        return f"{seconds} s"
    if seconds < 3600:
        return f"{seconds // 60} min"
    if seconds < 86400:
        return f"{seconds // 3600} h"
    return f"{seconds // 86400} d"


def build_irrigation_trend(
    events: Iterable[EventoRiego],
    parcels_by_id: dict[int, Parcela],
    days: int,
    now: datetime | None = None,
) -> list[dict]:
    """Agrupa actividad diaria y completa días sin eventos con cero."""
    current = as_utc(now or utc_now())
    first_day = current.date() - timedelta(days=days - 1)
    totals: dict[str, dict[str, float | int]] = defaultdict(
        lambda: {
            "eventos": 0,
            "minutos_planificados": 0.0,
            "minutos_ejecutados": 0.0,
            "volumen_planificado_l": 0.0,
            "volumen_ejecutado_l": 0.0,
        }
    )

    for event in events:
        day = as_utc(event.inicio).date()
        if day < first_day or day > current.date():
            continue
        key = day.isoformat()
        row = totals[key]
        row["eventos"] = int(row["eventos"]) + 1
        row["minutos_planificados"] = float(row["minutos_planificados"]) + event.minutos_planificados
        row["minutos_ejecutados"] = float(row["minutos_ejecutados"]) + event.minutos_ejecutados

        parcela = parcels_by_id.get(event.parcela_id)
        if parcela:
            flow_l_min = parcela.n_emisores * parcela.caudal_emisor_l_h / 60
            row["volumen_planificado_l"] = float(row["volumen_planificado_l"]) + flow_l_min * event.minutos_planificados
            row["volumen_ejecutado_l"] = float(row["volumen_ejecutado_l"]) + flow_l_min * event.minutos_ejecutados

    result: list[dict] = []
    for offset in range(days):
        key = (first_day + timedelta(days=offset)).isoformat()
        row = totals[key]
        result.append(
            {
                "fecha": key,
                "eventos": int(row["eventos"]),
                "minutos_planificados": round(float(row["minutos_planificados"]), 1),
                "minutos_ejecutados": round(float(row["minutos_ejecutados"]), 1),
                "volumen_planificado_l": round(float(row["volumen_planificado_l"]), 1),
                "volumen_ejecutado_l": round(float(row["volumen_ejecutado_l"]), 1),
            }
        )
    return result

