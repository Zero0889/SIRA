from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class NotificacionSms(Base):
    __tablename__ = "notificaciones_sms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parcela_id: Mapped[int | None] = mapped_column(
        ForeignKey("parcelas.id", ondelete="SET NULL"), nullable=True, index=True
    )
    evento: Mapped[str] = mapped_column(String(40), index=True)
    proveedor: Mapped[str] = mapped_column(String(20), default="smsgate")
    destinatario: Mapped[str] = mapped_column(String(32))
    mensaje: Mapped[str] = mapped_column(String(320))
    estado: Mapped[str] = mapped_column(String(20), index=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    creado: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
