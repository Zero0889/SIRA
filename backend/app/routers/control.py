from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.control import ControlParcela, EstadoOrden, ModoRiego, OrdenRiego
from app.models.dispositivo import EstadoDispositivo
from app.models.lectura import Lectura
from app.models.riego import EstadoRiego, EventoRiego
from app.models.usuario import CredencialDispositivo, Usuario
from app.security import as_utc, get_current_user, require_parcel_access, utc_now

router = APIRouter(prefix="/parcelas", tags=["control de riego"])


class ControlUpdate(BaseModel):
    modo: ModoRiego
    duracion_maxima_min: float | None = Field(None, ge=1, le=180)
    humedad_bloqueo_pct: float | None = Field(None, ge=20, le=100)
    tanque_minimo_pct: float | None = Field(None, ge=0, le=80)


class ManualCommand(BaseModel):
    accion: str = Field(..., pattern=r"^(iniciar|detener)$")
    duracion_min: float = Field(0, ge=0, le=180)


async def get_or_create_control(parcela_id: int, db: AsyncSession) -> ControlParcela:
    control = (
        await db.execute(select(ControlParcela).where(ControlParcela.parcela_id == parcela_id))
    ).scalar_one_or_none()
    if control is None:
        control = ControlParcela(parcela_id=parcela_id)
        db.add(control)
        await db.flush()
    return control


def serialize_command(command: OrdenRiego) -> dict:
    return {
        "id": command.id,
        "origen": command.origen,
        "accion": command.accion,
        "estado": command.estado.value,
        "duracion_min": command.duracion_min,
        "razon": command.razon,
        "creado": command.creado,
        "expira": command.expira,
        "entregado": command.entregado,
        "actualizado": command.actualizado,
        "completado": command.completado,
        "detalle_dispositivo": command.detalle_dispositivo,
    }


@router.get("/{parcela_id}/control")
async def control_status(
    parcela_id: int,
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    await require_parcel_access(parcela_id, user, db)
    control = await get_or_create_control(parcela_id, db)
    commands = (
        await db.execute(
            select(OrdenRiego)
            .where(OrdenRiego.parcela_id == parcela_id)
            .order_by(desc(OrdenRiego.creado))
            .limit(12)
        )
    ).scalars().all()
    credential_exists = bool(
        await db.scalar(
            select(CredencialDispositivo.id).where(CredencialDispositivo.parcela_id == parcela_id)
        )
    )
    return {
        "modo": control.modo.value,
        "duracion_maxima_min": control.duracion_maxima_min,
        "humedad_bloqueo_pct": control.humedad_bloqueo_pct,
        "tanque_minimo_pct": control.tanque_minimo_pct,
        "credencial_configurada": credential_exists,
        "ordenes": [serialize_command(command) for command in commands],
    }


@router.patch("/{parcela_id}/control")
async def update_control(
    parcela_id: int,
    payload: ControlUpdate,
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    await require_parcel_access(parcela_id, user, db)
    control = await get_or_create_control(parcela_id, db)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(control, field, value)
    await db.commit()
    return {"ok": True, "modo": control.modo.value}


@router.post("/{parcela_id}/control/commands", status_code=201)
async def create_manual_command(
    parcela_id: int,
    payload: ManualCommand,
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    await require_parcel_access(parcela_id, user, db)
    control = await get_or_create_control(parcela_id, db)
    now = utc_now()

    if payload.accion == "iniciar":
        if control.modo != ModoRiego.MANUAL:
            raise HTTPException(409, "Cambia la parcela a modo manual antes de iniciar el riego")
        if payload.duracion_min < 1 or payload.duracion_min > control.duracion_maxima_min:
            raise HTTPException(422, f"La duración debe estar entre 1 y {control.duracion_maxima_min:g} minutos")

        device = await db.scalar(select(EstadoDispositivo).where(EstadoDispositivo.parcela_id == parcela_id))
        reading = await db.scalar(
            select(Lectura).where(Lectura.parcela_id == parcela_id).order_by(desc(Lectura.timestamp)).limit(1)
        )
        blockers: list[str] = []
        if device is None or (now - as_utc(device.ultima_conexion)).total_seconds() > 300:
            blockers.append("el nodo no tiene comunicación reciente")
        if reading is None:
            blockers.append("no existe una lectura reciente de sensores")
        else:
            if reading.nivel_tanque_pct is not None and reading.nivel_tanque_pct < control.tanque_minimo_pct:
                blockers.append("el tanque está por debajo del mínimo seguro")
            if reading.humedad_suelo_pct is not None and reading.humedad_suelo_pct >= control.humedad_bloqueo_pct:
                blockers.append("el suelo ya supera la humedad de bloqueo")
            if reading.llovio:
                blockers.append("el sensor reporta lluvia")
        if blockers:
            raise HTTPException(409, "No se puede iniciar: " + "; ".join(blockers))

        active = await db.scalar(
            select(OrdenRiego.id).where(
                OrdenRiego.parcela_id == parcela_id,
                OrdenRiego.accion == "iniciar",
                OrdenRiego.estado.in_([EstadoOrden.PENDIENTE, EstadoOrden.ENTREGADA, EstadoOrden.EJECUTANDO]),
            )
        )
        if active:
            raise HTTPException(409, "Ya existe una orden de riego activa")

        event = EventoRiego(
            parcela_id=parcela_id,
            estado=EstadoRiego.PLANIFICADO,
            minutos_planificados=payload.duracion_min,
            razon=f"Riego manual solicitado por {user.nombre}"[:300],
        )
        db.add(event)
        await db.flush()
        event_id = event.id
        reason = f"Orden manual de {payload.duracion_min:g} minutos"
    else:
        event_id = None
        reason = "Detención manual solicitada por el operador"

    command = OrdenRiego(
        parcela_id=parcela_id,
        solicitado_por_usuario_id=user.id,
        evento_riego_id=event_id,
        origen="manual",
        accion=payload.accion,
        duracion_min=payload.duracion_min if payload.accion == "iniciar" else 0,
        razon=reason,
        expira=now + timedelta(minutes=10),
    )
    db.add(command)
    await db.commit()
    await db.refresh(command)
    return serialize_command(command)
