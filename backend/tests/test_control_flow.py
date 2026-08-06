from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models.control import ControlParcela, EstadoOrden, ModoRiego, OrdenRiego
from app.models.dispositivo import EstadoDispositivo
from app.models.lectura import Lectura
from app.models.parcela import Parcela
from app.models.riego import EstadoRiego, EventoRiego
from app.models.usuario import CredencialDispositivo, ParcelaUsuario, Usuario
from app.routers.control import ManualCommand, create_manual_command
from app.routers.devices import CommandAck, acknowledge_command, next_command
from app.security import hash_password, hash_token, require_parcel_access, verify_password


def test_passwords_are_salted_and_verifiable():
    first = hash_password("UnaClaveSegura2026!")
    second = hash_password("UnaClaveSegura2026!")
    assert first != second
    assert verify_password("UnaClaveSegura2026!", first)
    assert not verify_password("otra-clave", first)


@pytest.mark.asyncio
async def test_manual_command_device_delivery_and_acknowledgement():
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    sessions = async_sessionmaker(engine, expire_on_commit=False)

    async with sessions() as db:
        owner = Usuario(email="owner@example.com", nombre="Propietaria", password_hash=hash_password("ClaveSegura2026!"))
        intruder = Usuario(email="other@example.com", nombre="Otro", password_hash=hash_password("OtraClave2026!"))
        parcel = Parcela(nombre="Parcela segura", device_id="SIRA-TEST-CONTROL-0001", latitud=-12, longitud=-76)
        db.add_all([owner, intruder, parcel])
        await db.flush()
        db.add_all([
            ParcelaUsuario(usuario_id=owner.id, parcela_id=parcel.id),
            ControlParcela(parcela_id=parcel.id, modo=ModoRiego.MANUAL),
            CredencialDispositivo(parcela_id=parcel.id, token_hash=hash_token("device-secret")),
            EstadoDispositivo(parcela_id=parcel.id, ultima_conexion=datetime.now(timezone.utc), simulado=False),
            Lectura(parcela_id=parcel.id, humedad_suelo_pct=35, nivel_tanque_pct=80, llovio=False),
        ])
        await db.commit()

        with pytest.raises(HTTPException) as denied:
            await require_parcel_access(parcel.id, intruder, db)
        assert denied.value.status_code == 404

        created = await create_manual_command(
            parcel.id,
            ManualCommand(accion="iniciar", duracion_min=10),
            db,
            owner,
        )
        assert created["estado"] == "pendiente"

        delivered = await next_command(parcel.device_id, db, "device-secret", None)
        assert delivered["command"]["action"] == "iniciar"
        assert delivered["command"]["duration_seconds"] == 600

        await acknowledge_command(
            parcel.device_id,
            created["id"],
            CommandAck(estado="ejecutando"),
            db,
            "device-secret",
            None,
        )
        completed = await acknowledge_command(
            parcel.device_id,
            created["id"],
            CommandAck(estado="completada", minutos_ejecutados=9.5),
            db,
            "device-secret",
            None,
        )
        assert completed["estado"] == EstadoOrden.COMPLETADA.value

        command = await db.get(OrdenRiego, created["id"])
        event = await db.get(EventoRiego, command.evento_riego_id)
        assert event.estado == EstadoRiego.COMPLETADO
        assert event.minutos_ejecutados == 9.5

    await engine.dispose()
