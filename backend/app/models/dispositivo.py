from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class EstadoDispositivo(Base):
    """Último estado conocido del nodo de campo, real o simulado."""

    __tablename__ = "estado_dispositivos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parcela_id: Mapped[int] = mapped_column(
        ForeignKey("parcelas.id", ondelete="CASCADE"), unique=True, index=True
    )
    ultima_conexion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    firmware_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    modo_conexion: Mapped[str] = mapped_column(String(20), default="serial")
    modo_operacion: Mapped[str] = mapped_column(String(20), default="recomendacion")
    bateria_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    senal_dbm: Mapped[float | None] = mapped_column(Float, nullable=True)
    lecturas_pendientes: Mapped[int] = mapped_column(Integer, default=0)
    simulado: Mapped[bool] = mapped_column(Boolean, default=True)

