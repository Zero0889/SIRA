import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ModoRiego(str, enum.Enum):
    APAGADO = "apagado"
    MANUAL = "manual"
    AUTOMATICO = "automatico"


class EstadoOrden(str, enum.Enum):
    PENDIENTE = "pendiente"
    ENTREGADA = "entregada"
    EJECUTANDO = "ejecutando"
    COMPLETADA = "completada"
    CANCELADA = "cancelada"
    RECHAZADA = "rechazada"
    FALLIDA = "fallida"
    EXPIRADA = "expirada"


class ControlParcela(Base):
    __tablename__ = "control_parcelas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parcela_id: Mapped[int] = mapped_column(
        ForeignKey("parcelas.id", ondelete="CASCADE"), unique=True, index=True
    )
    modo: Mapped[ModoRiego] = mapped_column(
        Enum(ModoRiego, native_enum=False, values_callable=lambda values: [v.value for v in values]),
        default=ModoRiego.APAGADO,
    )
    duracion_maxima_min: Mapped[float] = mapped_column(Float, default=60.0)
    humedad_bloqueo_pct: Mapped[float] = mapped_column(Float, default=70.0)
    tanque_minimo_pct: Mapped[float] = mapped_column(Float, default=15.0)
    actualizado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class OrdenRiego(Base):
    __tablename__ = "ordenes_riego"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parcela_id: Mapped[int] = mapped_column(ForeignKey("parcelas.id", ondelete="CASCADE"), index=True)
    solicitado_por_usuario_id: Mapped[int | None] = mapped_column(
        ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True, index=True
    )
    evento_riego_id: Mapped[int | None] = mapped_column(
        ForeignKey("eventos_riego.id", ondelete="SET NULL"), nullable=True, index=True
    )
    origen: Mapped[str] = mapped_column(String(20), default="manual")
    accion: Mapped[str] = mapped_column(String(12))
    estado: Mapped[EstadoOrden] = mapped_column(
        Enum(EstadoOrden, native_enum=False, values_callable=lambda values: [v.value for v in values]),
        default=EstadoOrden.PENDIENTE,
        index=True,
    )
    duracion_min: Mapped[float] = mapped_column(Float, default=0.0)
    razon: Mapped[str] = mapped_column(String(300))
    detalle_dispositivo: Mapped[str | None] = mapped_column(Text, nullable=True)
    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    expira: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    entregado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actualizado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completado: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
