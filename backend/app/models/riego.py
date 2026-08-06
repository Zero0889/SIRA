import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class EstadoRiego(str, enum.Enum):
    PLANIFICADO = "planificado"
    EJECUTANDO = "ejecutando"
    COMPLETADO = "completado"
    CANCELADO = "cancelado"


class EventoRiego(Base):
    __tablename__ = "eventos_riego"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parcela_id: Mapped[int] = mapped_column(ForeignKey("parcelas.id", ondelete="CASCADE"))
    inicio: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    fin: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    estado: Mapped[EstadoRiego] = mapped_column(
        Enum(
            EstadoRiego,
            name="estado_riego",
            values_callable=lambda enum: [e.value for e in enum],
            native_enum=True,
        ),
        default=EstadoRiego.PLANIFICADO,
    )
    minutos_planificados: Mapped[float] = mapped_column(Float, default=0.0)
    minutos_ejecutados: Mapped[float] = mapped_column(Float, default=0.0)

    eto_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    kc: Mapped[float | None] = mapped_column(Float, nullable=True)
    etc_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    lamina_mm: Mapped[float | None] = mapped_column(Float, nullable=True)
    razon: Mapped[str | None] = mapped_column(String(300), nullable=True)
