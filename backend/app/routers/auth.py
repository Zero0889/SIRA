from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_db
from app.models.usuario import SesionUsuario, Usuario
from app.security import (
    SESSION_COOKIE,
    get_current_user,
    hash_password,
    hash_token,
    new_session_token,
    utc_now,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class Credentials(BaseModel):
    email: str = Field(..., min_length=5, max_length=254, pattern=r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
    password: str = Field(..., min_length=10, max_length=128)


class RegisterPayload(Credentials):
    nombre: str = Field(..., min_length=2, max_length=120)


class UserOut(BaseModel):
    id: int
    email: str
    nombre: str


def user_out(user: Usuario) -> UserOut:
    return UserOut(id=user.id, email=user.email, nombre=user.nombre)


async def create_session(user: Usuario, response: Response, db: AsyncSession) -> None:
    settings = get_settings()
    token = new_session_token()
    expires = utc_now() + timedelta(days=settings.session_days)
    await db.execute(delete(SesionUsuario).where(SesionUsuario.expira <= utc_now()))
    db.add(SesionUsuario(usuario_id=user.id, token_hash=hash_token(token), expira=expires))
    await db.commit()
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=settings.session_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.app_env == "production",
        samesite="lax",
        path="/",
    )


@router.post("/register", response_model=UserOut, status_code=201)
async def register(payload: RegisterPayload, response: Response, db: AsyncSession = Depends(get_db)):
    if not get_settings().allow_registration:
        raise HTTPException(status_code=403, detail="El registro público está desactivado")
    email = payload.email.lower().strip()
    if await db.scalar(select(Usuario.id).where(Usuario.email == email)):
        raise HTTPException(status_code=409, detail="Ya existe una cuenta con ese correo")
    user = Usuario(email=email, nombre=payload.nombre.strip(), password_hash=hash_password(payload.password))
    db.add(user)
    await db.flush()
    await create_session(user, response, db)
    return user_out(user)


@router.post("/login", response_model=UserOut)
async def login(payload: Credentials, response: Response, db: AsyncSession = Depends(get_db)):
    user = (
        await db.execute(select(Usuario).where(Usuario.email == payload.email.lower().strip()))
    ).scalar_one_or_none()
    if user is None or not user.activo or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Correo o contraseña incorrectos")
    await create_session(user, response, db)
    return user_out(user)


@router.post("/logout", status_code=204)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        await db.execute(delete(SesionUsuario).where(SesionUsuario.token_hash == hash_token(token)))
        await db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")


@router.get("/me", response_model=UserOut)
async def me(user: Usuario = Depends(get_current_user)):
    return user_out(user)
