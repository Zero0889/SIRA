from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.control import EstadoOrden, OrdenRiego
from app.models.dispositivo import EstadoDispositivo
from app.models.parcela import Parcela
from app.models.riego import EstadoRiego, EventoRiego
from app.security import authenticate_device, utc_now

router = APIRouter(prefix="/devices", tags=["devices"])


class HeartbeatPayload(BaseModel):
    bateria_pct: float | None = Field(None, ge=0, le=100)
    senal_dbm: float | None = Field(None, ge=-150, le=0)
    firmware_version: str | None = Field(None, max_length=32)
    modo_conexion: str = Field("wifi", max_length=20)
    modo_operacion: str = Field("recomendacion", max_length=20)
    lecturas_pendientes: int = Field(0, ge=0)
    simulado: bool = True


class CommandAck(BaseModel):
    estado: str = Field(..., pattern=r"^(ejecutando|completada|fallida|rechazada|cancelada)$")
    minutos_ejecutados: float | None = Field(None, ge=0, le=180)
    detalle: str | None = Field(None, max_length=500)


async def get_authorized_parcel(
    device_id: str,
    db: AsyncSession,
    device_token: str | None,
    legacy_api_key: str | None,
) -> Parcela:
    parcela = await db.scalar(select(Parcela).where(Parcela.device_id == device_id))
    if parcela is None:
        raise HTTPException(404, "Dispositivo no registrado")
    await authenticate_device(parcela, db, device_token, legacy_api_key)
    return parcela


@router.post("/{device_id}/heartbeat")
async def heartbeat(
    device_id: str,
    payload: HeartbeatPayload,
    db: AsyncSession = Depends(get_db),
    x_device_token: str | None = Header(None, alias="X-Device-Token"),
    x_api_key: str | None = Header(None, alias="X-API-Key"),
):
    parcela = await get_authorized_parcel(device_id, db, x_device_token, x_api_key)
    state = await db.scalar(
        select(EstadoDispositivo).where(EstadoDispositivo.parcela_id == parcela.id)
    )
    if state is None:
        state = EstadoDispositivo(parcela_id=parcela.id)
        db.add(state)
    state.ultima_conexion = datetime.now(timezone.utc)
    for field, value in payload.model_dump().items():
        setattr(state, field, value)
    await db.commit()
    return {"ok": True, "device_id": device_id, "server_time": state.ultima_conexion}


@router.get("/{device_id}/commands/next")
async def next_command(
    device_id: str,
    db: AsyncSession = Depends(get_db),
    x_device_token: str | None = Header(None, alias="X-Device-Token"),
    x_api_key: str | None = Header(None, alias="X-API-Key"),
):
    parcela = await get_authorized_parcel(device_id, db, x_device_token, x_api_key)
    now = utc_now()
    expired = (
        await db.execute(
            select(OrdenRiego).where(
                OrdenRiego.parcela_id == parcela.id,
                OrdenRiego.estado == EstadoOrden.PENDIENTE,
                OrdenRiego.expira <= now,
            )
        )
    ).scalars().all()
    for item in expired:
        item.estado = EstadoOrden.EXPIRADA
        item.actualizado = now

    command = (
        await db.execute(
            select(OrdenRiego)
            .where(
                OrdenRiego.parcela_id == parcela.id,
                OrdenRiego.estado == EstadoOrden.PENDIENTE,
                OrdenRiego.expira > now,
            )
            .order_by(case((OrdenRiego.accion == "detener", 0), else_=1), OrdenRiego.id)
            .limit(1)
        )
    ).scalar_one_or_none()
    if command is None:
        await db.commit()
        return {"command": None, "server_time": now}

    command.estado = EstadoOrden.ENTREGADA
    command.entregado = now
    command.actualizado = now
    await db.commit()
    return {
        "command": {
            "id": command.id,
            "action": command.accion,
            "duration_seconds": round(command.duracion_min * 60),
            "expires_at": command.expira,
        },
        "server_time": now,
    }


@router.post("/{device_id}/commands/{command_id}/ack")
async def acknowledge_command(
    device_id: str,
    command_id: int,
    payload: CommandAck,
    db: AsyncSession = Depends(get_db),
    x_device_token: str | None = Header(None, alias="X-Device-Token"),
    x_api_key: str | None = Header(None, alias="X-API-Key"),
):
    parcela = await get_authorized_parcel(device_id, db, x_device_token, x_api_key)
    command = await db.scalar(
        select(OrdenRiego).where(OrdenRiego.id == command_id, OrdenRiego.parcela_id == parcela.id)
    )
    if command is None:
        raise HTTPException(404, "Orden no encontrada")

    state_map = {
        "ejecutando": EstadoOrden.EJECUTANDO,
        "completada": EstadoOrden.COMPLETADA,
        "fallida": EstadoOrden.FALLIDA,
        "rechazada": EstadoOrden.RECHAZADA,
        "cancelada": EstadoOrden.CANCELADA,
    }
    now = utc_now()
    command.estado = state_map[payload.estado]
    command.actualizado = now
    command.detalle_dispositivo = payload.detalle
    if command.estado in {
        EstadoOrden.COMPLETADA,
        EstadoOrden.FALLIDA,
        EstadoOrden.RECHAZADA,
        EstadoOrden.CANCELADA,
    }:
        command.completado = now

    if command.evento_riego_id:
        event = await db.get(EventoRiego, command.evento_riego_id)
        if event:
            if command.estado == EstadoOrden.EJECUTANDO:
                event.estado = EstadoRiego.EJECUTANDO
            elif command.estado == EstadoOrden.COMPLETADA:
                event.estado = EstadoRiego.COMPLETADO
                event.fin = now
                event.minutos_ejecutados = payload.minutos_ejecutados or command.duracion_min
            elif command.estado in {
                EstadoOrden.FALLIDA,
                EstadoOrden.RECHAZADA,
                EstadoOrden.CANCELADA,
            }:
                event.estado = EstadoRiego.CANCELADO
                event.fin = now
                event.minutos_ejecutados = payload.minutos_ejecutados or 0
    await db.commit()
    return {"ok": True, "command_id": command.id, "estado": command.estado.value}
