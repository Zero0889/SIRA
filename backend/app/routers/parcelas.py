import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.parcela import Parcela
from app.models.control import ControlParcela
from app.models.usuario import CredencialDispositivo, ParcelaUsuario, Usuario
from app.schemas import DeviceIdentifierOut, ParcelaCreate, ParcelaOut
from app.security import get_current_user, hash_token, new_device_token, require_parcel_access

router = APIRouter(prefix="/parcelas", tags=["parcelas"])

DEVICE_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def build_device_id() -> str:
    """Genera un identificador legible con 100 bits aproximados de entropía."""
    blocks = [
        "".join(secrets.choice(DEVICE_ID_ALPHABET) for _ in range(4))
        for _ in range(5)
    ]
    return f"SIRA-{'-'.join(blocks)}"


async def available_device_id(db: AsyncSession) -> str:
    for _ in range(10):
        candidate = build_device_id()
        exists = await db.scalar(select(Parcela.id).where(Parcela.device_id == candidate))
        if exists is None:
            return candidate
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="No se pudo generar un identificador disponible. Inténtalo nuevamente.",
    )


@router.get("", response_model=list[ParcelaOut])
async def list_parcelas(
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    result = await db.execute(
        select(Parcela)
        .join(ParcelaUsuario, ParcelaUsuario.parcela_id == Parcela.id)
        .where(ParcelaUsuario.usuario_id == user.id)
    )
    return result.scalars().all()


@router.post("/device-identifiers/generate", response_model=DeviceIdentifierOut)
async def generate_device_identifier(
    db: AsyncSession = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    """Entrega un identificador neutral para ESP32, STM32 u otro nodo compatible."""
    return DeviceIdentifierOut(device_id=await available_device_id(db))


@router.post("", response_model=ParcelaOut, status_code=201)
async def create_parcela(
    payload: ParcelaCreate,
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    exists = await db.execute(select(Parcela).where(Parcela.device_id == payload.device_id))
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="device_id ya registrado")
    parcela = Parcela(**payload.model_dump())
    try:
        db.add(parcela)
        await db.flush()
        db.add(ParcelaUsuario(usuario_id=user.id, parcela_id=parcela.id))
        db.add(ControlParcela(parcela_id=parcela.id))
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="device_id ya registrado") from exc
    await db.refresh(parcela)
    return parcela


@router.get("/{parcela_id}", response_model=ParcelaOut)
async def get_parcela(
    parcela_id: int,
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    return await require_parcel_access(parcela_id, user, db)


@router.post("/{parcela_id}/device-credential/rotate")
async def rotate_device_credential(
    parcela_id: int,
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    parcela = await require_parcel_access(parcela_id, user, db)
    token = new_device_token()
    credential = (
        await db.execute(
            select(CredencialDispositivo).where(CredencialDispositivo.parcela_id == parcela.id)
        )
    ).scalar_one_or_none()
    if credential is None:
        credential = CredencialDispositivo(parcela_id=parcela.id, token_hash=hash_token(token))
        db.add(credential)
    else:
        credential.token_hash = hash_token(token)
        credential.rotado = datetime.now(timezone.utc)
    await db.commit()
    return {
        "device_id": parcela.device_id,
        "device_token": token,
        "warning": "Copia esta credencial ahora. SIRA no volverá a mostrarla.",
    }


@router.delete("/{parcela_id}", status_code=204)
async def delete_parcela(
    parcela_id: int,
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    """Elimina la parcela y en cascada todas sus lecturas y eventos de riego."""
    parcela = await require_parcel_access(parcela_id, user, db)
    await db.delete(parcela)
    await db.commit()
    return None
