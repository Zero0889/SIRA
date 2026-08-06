from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models.cultivo import Cultivo
from app.models.control import ControlParcela, EstadoOrden, ModoRiego, OrdenRiego
from app.models.dispositivo import EstadoDispositivo
from app.models.lectura import Lectura
from app.models.parcela import Parcela
from app.models.riego import EstadoRiego, EventoRiego
from app.schemas import IngestPayload, IngestResponse
from app.services.irrigation import MotorRiego
from app.security import authenticate_device
from app.services.notifications import notify_ingest_events

router = APIRouter(prefix="/ingest", tags=["ingest"])

_motor = MotorRiego()


@router.post("", response_model=IngestResponse)
async def ingest(
    payload: IngestPayload,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    x_device_token: str | None = Header(None, alias="X-Device-Token"),
    x_api_key: str | None = Header(None, alias="X-API-Key"),
):
    # 1. Localizar la parcela por device_id — eager load cultivo + kc_etapas
    #    para evitar lazy-load en async (SQLAlchemy MissingGreenlet).
    stmt = (
        select(Parcela)
        .where(Parcela.device_id == payload.device_id)
        .options(selectinload(Parcela.cultivo).selectinload(Cultivo.kc_etapas))
    )
    result = await db.execute(stmt)
    parcela = result.scalar_one_or_none()
    if not parcela:
        raise HTTPException(
            status_code=404,
            detail=f"device_id '{payload.device_id}' no registrado. Crea la parcela primero.",
        )
    await authenticate_device(parcela, db, x_device_token, x_api_key)

    # 2. Persistir la lectura
    lectura = Lectura(
        parcela_id=parcela.id,
        timestamp=payload.timestamp or datetime.now(timezone.utc),
        temperatura_c=payload.temperatura_c,
        humedad_rel=payload.humedad_rel,
        presion_hpa=payload.presion_hpa,
        humedad_suelo_pct=payload.humedad_suelo_pct,
        nivel_tanque_pct=payload.nivel_tanque_pct,
        llovio=payload.llovio,
        luz_lux=payload.luz_lux,
    )
    db.add(lectura)
    await db.flush()

    # Estado operativo del nodo. Los campos son opcionales para conservar
    # compatibilidad con el Arduino de Proteus y futuros nodos ESP32.
    estado_dispositivo = (
        await db.execute(
            select(EstadoDispositivo).where(EstadoDispositivo.parcela_id == parcela.id)
        )
    ).scalar_one_or_none()
    if estado_dispositivo is None:
        estado_dispositivo = EstadoDispositivo(parcela_id=parcela.id)
        db.add(estado_dispositivo)
    estado_dispositivo.ultima_conexion = datetime.now(timezone.utc)
    estado_dispositivo.firmware_version = payload.firmware_version
    estado_dispositivo.modo_conexion = payload.modo_conexion
    estado_dispositivo.modo_operacion = payload.modo_operacion
    estado_dispositivo.bateria_pct = payload.bateria_pct
    estado_dispositivo.senal_dbm = payload.senal_dbm
    estado_dispositivo.lecturas_pendientes = payload.lecturas_pendientes
    estado_dispositivo.simulado = payload.simulado

    # 3. Motor de decisión
    decision = await _motor.decidir(
        parcela=parcela,
        humedad_suelo_pct=payload.humedad_suelo_pct,
        nivel_tanque_pct=payload.nivel_tanque_pct,
        llovio_reciente=payload.llovio,
    )

    control = await db.scalar(
        select(ControlParcela).where(ControlParcela.parcela_id == parcela.id)
    )
    active_command = await db.scalar(
        select(OrdenRiego).where(
            OrdenRiego.parcela_id == parcela.id,
            OrdenRiego.accion == "iniciar",
            OrdenRiego.estado.in_([
                EstadoOrden.PENDIENTE,
                EstadoOrden.ENTREGADA,
                EstadoOrden.EJECUTANDO,
            ]),
        )
    )

    # 4. Si decide regar, planificar el evento y, en automÃ¡tico, la orden fÃ­sica.
    if decision.accion == "regar":
        evento = EventoRiego(
            parcela_id=parcela.id,
            estado=EstadoRiego.PLANIFICADO,
            minutos_planificados=decision.minutos_riego,
            eto_mm=decision.eto_mm,
            kc=decision.kc,
            etc_mm=decision.etc_mm,
            lamina_mm=decision.lamina_mm,
            razon=decision.razon[:300],
        )
        db.add(evento)
        await db.flush()

        if control and control.modo == ModoRiego.AUTOMATICO:
            if active_command is None:
                safe_duration = min(decision.minutos_riego, control.duracion_maxima_min)
                db.add(
                    OrdenRiego(
                        parcela_id=parcela.id,
                        evento_riego_id=evento.id,
                        origen="automatico",
                        accion="iniciar",
                        duracion_min=safe_duration,
                        razon=decision.razon[:300],
                        expira=datetime.now(timezone.utc) + timedelta(minutes=10),
                    )
                )
    elif control and control.modo == ModoRiego.AUTOMATICO and active_command:
        if active_command.estado == EstadoOrden.PENDIENTE:
            active_command.estado = EstadoOrden.CANCELADA
            active_command.actualizado = datetime.now(timezone.utc)
            if active_command.evento_riego_id:
                event = await db.get(EventoRiego, active_command.evento_riego_id)
                if event:
                    event.estado = EstadoRiego.CANCELADO
                    event.fin = datetime.now(timezone.utc)
        else:
            pending_stop = await db.scalar(
                select(OrdenRiego.id).where(
                    OrdenRiego.parcela_id == parcela.id,
                    OrdenRiego.accion == "detener",
                    OrdenRiego.estado.in_([EstadoOrden.PENDIENTE, EstadoOrden.ENTREGADA]),
                )
            )
            if pending_stop is None:
                db.add(
                    OrdenRiego(
                        parcela_id=parcela.id,
                        origen="automatico",
                        accion="detener",
                        duracion_min=0,
                        razon=f"DetenciÃ³n de seguridad: {decision.razon}"[:300],
                        expira=datetime.now(timezone.utc) + timedelta(minutes=10),
                    )
                )

    await db.commit()

    background_tasks.add_task(
        notify_ingest_events,
        parcela_id=parcela.id,
        parcela_nombre=parcela.nombre,
        accion=decision.accion,
        minutos_riego=decision.minutos_riego,
        temperatura_c=payload.temperatura_c,
        humedad_suelo_pct=payload.humedad_suelo_pct,
        nivel_tanque_pct=payload.nivel_tanque_pct,
    )

    return IngestResponse(
        ok=True,
        lectura_id=lectura.id,
        accion=decision.accion,
        minutos_riego=decision.minutos_riego,
        razon=decision.razon,
    )
