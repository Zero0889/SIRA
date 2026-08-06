import enum
from typing import List

from sqlalchemy import Enum, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class EtapaFenologica(str, enum.Enum):
    INICIAL = "inicial"
    DESARROLLO = "desarrollo"
    MEDIA = "media"
    FINAL = "final"


class Cultivo(Base):
    __tablename__ = "cultivos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre_comun: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    nombre_cientifico: Mapped[str | None] = mapped_column(String(150), nullable=True)
    familia: Mapped[str | None] = mapped_column(String(80), nullable=True)
    profundidad_raiz_m: Mapped[float] = mapped_column(Float, default=0.4)
    agotamiento_permisible: Mapped[float] = mapped_column(Float, default=0.5)

    kc_etapas: Mapped[List["KcEtapa"]] = relationship(
        back_populates="cultivo",
        cascade="all, delete-orphan",
        order_by="KcEtapa.orden",
        lazy="selectin",
    )


class KcEtapa(Base):
    __tablename__ = "kc_etapas"
    __table_args__ = (UniqueConstraint("cultivo_id", "etapa", name="uq_cultivo_etapa"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cultivo_id: Mapped[int] = mapped_column(ForeignKey("cultivos.id", ondelete="CASCADE"))
    etapa: Mapped[EtapaFenologica] = mapped_column(
        Enum(
            EtapaFenologica,
            name="etapa_fenologica",
            values_callable=lambda enum: [e.value for e in enum],
            native_enum=True,
        )
    )
    orden: Mapped[int] = mapped_column(Integer)
    duracion_dias: Mapped[int] = mapped_column(Integer)
    kc: Mapped[float] = mapped_column(Float)

    cultivo: Mapped[Cultivo] = relationship(back_populates="kc_etapas")
