from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, func, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Lectura(Base):
    __tablename__ = "lecturas"
    __table_args__ = (
        Index("ix_lecturas_parcela_time", "parcela_id", "timestamp"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parcela_id: Mapped[int] = mapped_column(ForeignKey("parcelas.id", ondelete="CASCADE"))
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    temperatura_c: Mapped[float | None] = mapped_column(Float, nullable=True)
    humedad_rel: Mapped[float | None] = mapped_column(Float, nullable=True)
    presion_hpa: Mapped[float | None] = mapped_column(Float, nullable=True)
    humedad_suelo_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    nivel_tanque_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    llovio: Mapped[bool | None] = mapped_column(default=None, nullable=True)
    luz_lux: Mapped[float | None] = mapped_column(Float, nullable=True)
