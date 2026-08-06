from datetime import datetime, timedelta, timezone

from app.models.dispositivo import EstadoDispositivo
from app.models.lectura import Lectura
from app.models.parcela import Parcela
from app.models.riego import EventoRiego
from app.services.operations import build_irrigation_trend, build_parcel_alerts, seconds_since


NOW = datetime(2026, 8, 3, 12, 0, tzinfo=timezone.utc)


def parcel() -> Parcela:
    return Parcela(
        id=7,
        nombre="Terraza Norte",
        device_id="SIRA-007",
        latitud=-13.5,
        longitud=-71.9,
        area_m2=100,
        caudal_emisor_l_h=4,
        n_emisores=60,
        altitud_m=3400,
    )


def test_seconds_since_accepts_sqlite_naive_datetimes():
    assert seconds_since(datetime(2026, 8, 3, 11, 55), NOW) == 300


def test_build_parcel_alerts_prioritizes_field_risks():
    parcela = parcel()
    lectura = Lectura(
        parcela_id=parcela.id,
        humedad_suelo_pct=18,
        nivel_tanque_pct=8,
        temperatura_c=1.5,
    )
    dispositivo = EstadoDispositivo(
        parcela_id=parcela.id,
        ultima_conexion=NOW - timedelta(minutes=12),
        bateria_pct=12,
        lecturas_pendientes=3,
        modo_conexion="wifi",
        modo_operacion="recomendacion",
        simulado=False,
    )

    alerts = build_parcel_alerts(parcela, lectura, dispositivo, NOW)
    codes = {alert["codigo"] for alert in alerts}

    assert {"sin_conexion", "bateria_baja", "tanque_bajo", "riesgo_helada", "suelo_seco"} <= codes
    assert all(alert["parcela_id"] == parcela.id for alert in alerts)


def test_irrigation_trend_fills_empty_days_and_calculates_volume():
    parcela = parcel()
    event = EventoRiego(
        parcela_id=parcela.id,
        inicio=NOW - timedelta(days=1),
        minutos_planificados=30,
        minutos_ejecutados=20,
    )

    trend = build_irrigation_trend([event], {parcela.id: parcela}, days=7, now=NOW)

    assert len(trend) == 7
    assert trend[-2]["eventos"] == 1
    assert trend[-2]["volumen_planificado_l"] == 120.0
    assert trend[-2]["volumen_ejecutado_l"] == 80.0
    assert trend[0]["eventos"] == 0
