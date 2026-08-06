import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timezone

from fastapi import Cookie, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_db
from app.models.parcela import Parcela
from app.models.usuario import CredencialDispositivo, ParcelaUsuario, SesionUsuario, Usuario

SESSION_COOKIE = "sira_session"
PASSWORD_ITERATIONS = 310_000


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def new_session_token() -> str:
    return secrets.token_urlsafe(48)


def new_device_token() -> str:
    return f"sira_dev_{secrets.token_urlsafe(36)}"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    return "pbkdf2_sha256${}${}${}".format(
        PASSWORD_ITERATIONS,
        base64.urlsafe_b64encode(salt).decode("ascii"),
        base64.urlsafe_b64encode(digest).decode("ascii"),
    )


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, iterations, salt_value, digest_value = stored.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_value.encode("ascii"))
        expected = base64.urlsafe_b64decode(digest_value.encode("ascii"))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


async def require_api_key(
    x_api_key: str = Header(..., alias="X-API-Key"),
) -> None:
    expected = get_settings().ingest_api_key
    if not expected or not secrets.compare_digest(x_api_key, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API key inválida")


async def get_current_user(
    session_token: str | None = Cookie(None, alias=SESSION_COOKIE),
    db: AsyncSession = Depends(get_db),
) -> Usuario:
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inicia sesión para continuar")
    row = (
        await db.execute(
            select(SesionUsuario, Usuario)
            .join(Usuario, Usuario.id == SesionUsuario.usuario_id)
            .where(SesionUsuario.token_hash == hash_token(session_token), Usuario.activo.is_(True))
        )
    ).first()
    if not row or as_utc(row.SesionUsuario.expira) <= utc_now():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="La sesión expiró")
    return row.Usuario


async def require_parcel_access(
    parcela_id: int,
    user: Usuario,
    db: AsyncSession,
) -> Parcela:
    parcela = (
        await db.execute(
            select(Parcela)
            .join(ParcelaUsuario, ParcelaUsuario.parcela_id == Parcela.id)
            .where(Parcela.id == parcela_id, ParcelaUsuario.usuario_id == user.id)
        )
    ).unique().scalar_one_or_none()
    if parcela is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parcela no encontrada")
    return parcela


async def authenticate_device(
    parcela: Parcela,
    db: AsyncSession,
    device_token: str | None,
    legacy_api_key: str | None,
) -> None:
    if device_token:
        credential = (
            await db.execute(
                select(CredencialDispositivo).where(
                    CredencialDispositivo.parcela_id == parcela.id,
                    CredencialDispositivo.token_hash == hash_token(device_token),
                )
            )
        ).scalar_one_or_none()
        if credential:
            return

    settings = get_settings()
    if (
        settings.allow_legacy_device_key
        and legacy_api_key
        and settings.ingest_api_key
        and secrets.compare_digest(legacy_api_key, settings.ingest_api_key)
    ):
        return
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credencial del nodo inválida")
