from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.lectura import Lectura
from app.models.dispositivo import EstadoDispositivo
from app.models.parcela import Parcela
from app.models.riego import EventoRiego
from app.models.usuario import Usuario
from app.security import get_current_user, require_parcel_access

router = APIRouter(prefix="/parcelas", tags=["lecturas"])


@router.get("/{parcela_id}/lecturas")
async def lecturas_recientes(
    parcela_id: int,
    horas: int = Query(24, ge=1, le=720),
    limit: int = Query(500, ge=1, le=5000),
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    await require_parcel_access(parcela_id, user, db)
    desde = datetime.now(timezone.utc) - timedelta(hours=horas)
    stmt = (
        select(Lectura)
        .where(Lectura.parcela_id == parcela_id, Lectura.timestamp >= desde)
        .order_by(desc(Lectura.timestamp))
        .limit(limit)
    )
    result = await db.execute(stmt)
    lecturas = list(result.scalars().all())
    return [
        {
            "id": l.id,
            "timestamp": l.timestamp.isoformat(),
            "temperatura_c": l.temperatura_c,
            "humedad_rel": l.humedad_rel,
            "presion_hpa": l.presion_hpa,
            "humedad_suelo_pct": l.humedad_suelo_pct,
            "nivel_tanque_pct": l.nivel_tanque_pct,
            "llovio": l.llovio,
            "luz_lux": l.luz_lux,
        }
        for l in lecturas
    ]


@router.get("/{parcela_id}/riegos")
async def riegos_recientes(
    parcela_id: int,
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    await require_parcel_access(parcela_id, user, db)
    stmt = (
        select(EventoRiego)
        .where(EventoRiego.parcela_id == parcela_id)
        .order_by(desc(EventoRiego.inicio))
        .limit(limit)
    )
    result = await db.execute(stmt)
    return [
        {
            "id": e.id,
            "inicio": e.inicio.isoformat(),
            "fin": e.fin.isoformat() if e.fin else None,
            "estado": e.estado.value,
            "minutos_planificados": e.minutos_planificados,
            "minutos_ejecutados": e.minutos_ejecutados,
            "eto_mm": e.eto_mm,
            "kc": e.kc,
            "etc_mm": e.etc_mm,
            "lamina_mm": e.lamina_mm,
            "razon": e.razon,
        }
        for e in result.scalars().all()
    ]


@router.get("/{parcela_id}/resumen")
async def resumen_parcela(
    parcela_id: int,
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    """Snapshot para la pantalla principal del dashboard."""
    parcela = await require_parcel_access(parcela_id, user, db)

    ultima = (
        await db.execute(
            select(Lectura)
            .where(Lectura.parcela_id == parcela_id)
            .order_by(desc(Lectura.timestamp))
            .limit(1)
        )
    ).scalar_one_or_none()

    ultimo_riego = (
        await db.execute(
            select(EventoRiego)
            .where(EventoRiego.parcela_id == parcela_id)
            .order_by(desc(EventoRiego.inicio))
            .limit(1)
        )
    ).scalar_one_or_none()

    dispositivo = (
        await db.execute(
            select(EstadoDispositivo).where(EstadoDispositivo.parcela_id == parcela_id)
        )
    ).scalar_one_or_none()

    alertas = []
    ahora = datetime.now(timezone.utc)
    if dispositivo:
        ultima_conexion = dispositivo.ultima_conexion
        if ultima_conexion.tzinfo is None:
            ultima_conexion = ultima_conexion.replace(tzinfo=timezone.utc)
        segundos_sin_conexion = max(0, int((ahora - ultima_conexion).total_seconds()))
        if segundos_sin_conexion > 300:
            alertas.append({"nivel": "alerta", "codigo": "sin_conexion", "mensaje": "Nodo sin comunicación por más de 5 minutos"})
        if dispositivo.bateria_pct is not None and dispositivo.bateria_pct < 25:
            alertas.append({"nivel": "alerta", "codigo": "bateria_baja", "mensaje": f"Batería baja: {dispositivo.bateria_pct:.0f}%"})
    else:
        segundos_sin_conexion = None
        alertas.append({"nivel": "aviso", "codigo": "sin_telemetria", "mensaje": "Aún no se recibió telemetría del nodo"})
    if ultima and ultima.temperatura_c is not None and ultima.temperatura_c <= 3:
        alertas.append({"nivel": "alerta", "codigo": "riesgo_helada", "mensaje": f"Temperatura baja: {ultima.temperatura_c:.1f} °C; revisar riesgo de helada"})
    if ultima and ultima.nivel_tanque_pct is not None and ultima.nivel_tanque_pct < 15:
        alertas.append({"nivel": "alerta", "codigo": "tanque_bajo", "mensaje": f"Reserva de agua crítica: {ultima.nivel_tanque_pct:.0f}%"})

    return {
        "parcela": {
            "id": parcela.id,
            "nombre": parcela.nombre,
            "device_id": parcela.device_id,
            "latitud": parcela.latitud,
            "longitud": parcela.longitud,
        },
        "ultima_lectura": {
            "timestamp": ultima.timestamp.isoformat() if ultima else None,
            "temperatura_c": ultima.temperatura_c if ultima else None,
            "humedad_rel": ultima.humedad_rel if ultima else None,
            "humedad_suelo_pct": ultima.humedad_suelo_pct if ultima else None,
            "nivel_tanque_pct": ultima.nivel_tanque_pct if ultima else None,
            "llovio": ultima.llovio if ultima else None,
        } if ultima else None,
        "ultimo_riego": {
            "inicio": ultimo_riego.inicio.isoformat(),
            "minutos": ultimo_riego.minutos_planificados,
            "eto_mm": ultimo_riego.eto_mm,
            "kc": ultimo_riego.kc,
            "etc_mm": ultimo_riego.etc_mm,
            "razon": ultimo_riego.razon,
        } if ultimo_riego else None,
        "dispositivo": {
            "ultima_conexion": dispositivo.ultima_conexion.isoformat(),
            "segundos_sin_conexion": segundos_sin_conexion,
            "firmware_version": dispositivo.firmware_version,
            "modo_conexion": dispositivo.modo_conexion,
            "modo_operacion": dispositivo.modo_operacion,
            "bateria_pct": dispositivo.bateria_pct,
            "senal_dbm": dispositivo.senal_dbm,
            "lecturas_pendientes": dispositivo.lecturas_pendientes,
            "simulado": dispositivo.simulado,
        } if dispositivo else None,
        "contexto_altoandino": {
            "activo": parcela.altitud_m >= 3000,
            "altitud_m": parcela.altitud_m,
            "alertas": alertas,
        },
    }
