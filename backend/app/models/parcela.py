from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Parcela(Base):
    __tablename__ = "parcelas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(120))
    device_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    latitud: Mapped[float] = mapped_column(Float)
    longitud: Mapped[float] = mapped_column(Float)
    altitud_m: Mapped[float] = mapped_column(Float, default=0.0)

    area_m2: Mapped[float] = mapped_column(Float, default=0.0)
    caudal_emisor_l_h: Mapped[float] = mapped_column(Float, default=4.0)
    n_emisores: Mapped[int] = mapped_column(Integer, default=0)

    cultivo_id: Mapped[int | None] = mapped_column(
        ForeignKey("cultivos.id", ondelete="SET NULL"), nullable=True
    )
    fecha_siembra: Mapped[date | None] = mapped_column(Date, nullable=True)

    creado: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    cultivo = relationship("Cultivo", lazy="joined")
