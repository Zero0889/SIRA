from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    nombre: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SesionUsuario(Base):
    __tablename__ = "sesiones_usuario"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expira: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ParcelaUsuario(Base):
    __tablename__ = "parcelas_usuarios"
    __table_args__ = (UniqueConstraint("usuario_id", "parcela_id", name="uq_usuario_parcela"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"), index=True)
    parcela_id: Mapped[int] = mapped_column(ForeignKey("parcelas.id", ondelete="CASCADE"), index=True)
    rol: Mapped[str] = mapped_column(String(20), default="propietario")


class CredencialDispositivo(Base):
    __tablename__ = "credenciales_dispositivo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parcela_id: Mapped[int] = mapped_column(
        ForeignKey("parcelas.id", ondelete="CASCADE"), unique=True, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    rotado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
