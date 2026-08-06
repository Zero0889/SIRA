"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-07-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Enums declarados con create_type=False: los creamos manualmente con SQL crudo
# (IF NOT EXISTS) para evitar la doble creación de Alembic/SQLAlchemy.
etapa_enum = postgresql.ENUM(
    "inicial", "desarrollo", "media", "final",
    name="etapa_fenologica", create_type=False,
)
estado_riego_enum = postgresql.ENUM(
    "planificado", "ejecutando", "completado", "cancelado",
    name="estado_riego", create_type=False,
)


def upgrade() -> None:
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'etapa_fenologica') THEN "
        "CREATE TYPE etapa_fenologica AS ENUM ('inicial', 'desarrollo', 'media', 'final'); "
        "END IF; END $$;"
    )
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_riego') THEN "
        "CREATE TYPE estado_riego AS ENUM ('planificado', 'ejecutando', 'completado', 'cancelado'); "
        "END IF; END $$;"
    )

    op.create_table(
        "cultivos",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("nombre_comun", sa.String(100), nullable=False, unique=True),
        sa.Column("nombre_cientifico", sa.String(150), nullable=True),
        sa.Column("familia", sa.String(80), nullable=True),
        sa.Column("profundidad_raiz_m", sa.Float, nullable=False, server_default="0.4"),
        sa.Column("agotamiento_permisible", sa.Float, nullable=False, server_default="0.5"),
    )
    op.create_index("ix_cultivos_nombre_comun", "cultivos", ["nombre_comun"])

    op.create_table(
        "kc_etapas",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "cultivo_id",
            sa.Integer,
            sa.ForeignKey("cultivos.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("etapa", etapa_enum, nullable=False),
        sa.Column("orden", sa.Integer, nullable=False),
        sa.Column("duracion_dias", sa.Integer, nullable=False),
        sa.Column("kc", sa.Float, nullable=False),
        sa.UniqueConstraint("cultivo_id", "etapa", name="uq_cultivo_etapa"),
    )

    op.create_table(
        "parcelas",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("nombre", sa.String(120), nullable=False),
        sa.Column("device_id", sa.String(64), nullable=False, unique=True),
        sa.Column("latitud", sa.Float, nullable=False),
        sa.Column("longitud", sa.Float, nullable=False),
        sa.Column("altitud_m", sa.Float, nullable=False, server_default="0"),
        sa.Column("area_m2", sa.Float, nullable=False, server_default="0"),
        sa.Column("caudal_emisor_l_h", sa.Float, nullable=False, server_default="4"),
        sa.Column("n_emisores", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "cultivo_id",
            sa.Integer,
            sa.ForeignKey("cultivos.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("fecha_siembra", sa.Date, nullable=True),
        sa.Column(
            "creado",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_parcelas_device_id", "parcelas", ["device_id"])

    op.create_table(
        "lecturas",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "parcela_id",
            sa.Integer,
            sa.ForeignKey("parcelas.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("temperatura_c", sa.Float, nullable=True),
        sa.Column("humedad_rel", sa.Float, nullable=True),
        sa.Column("presion_hpa", sa.Float, nullable=True),
        sa.Column("humedad_suelo_pct", sa.Float, nullable=True),
        sa.Column("nivel_tanque_pct", sa.Float, nullable=True),
        sa.Column("llovio", sa.Boolean, nullable=True),
        sa.Column("luz_lux", sa.Float, nullable=True),
    )
    op.create_index("ix_lecturas_timestamp", "lecturas", ["timestamp"])
    op.create_index("ix_lecturas_parcela_time", "lecturas", ["parcela_id", "timestamp"])

    op.create_table(
        "eventos_riego",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "parcela_id",
            sa.Integer,
            sa.ForeignKey("parcelas.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "inicio",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("fin", sa.DateTime(timezone=True), nullable=True),
        sa.Column("estado", estado_riego_enum, nullable=False, server_default="planificado"),
        sa.Column("minutos_planificados", sa.Float, nullable=False, server_default="0"),
        sa.Column("minutos_ejecutados", sa.Float, nullable=False, server_default="0"),
        sa.Column("eto_mm", sa.Float, nullable=True),
        sa.Column("kc", sa.Float, nullable=True),
        sa.Column("etc_mm", sa.Float, nullable=True),
        sa.Column("lamina_mm", sa.Float, nullable=True),
        sa.Column("razon", sa.String(300), nullable=True),
    )
    op.create_index("ix_eventos_riego_inicio", "eventos_riego", ["inicio"])


def downgrade() -> None:
    op.drop_index("ix_eventos_riego_inicio", table_name="eventos_riego")
    op.drop_table("eventos_riego")

    op.drop_index("ix_lecturas_parcela_time", table_name="lecturas")
    op.drop_index("ix_lecturas_timestamp", table_name="lecturas")
    op.drop_table("lecturas")

    op.drop_index("ix_parcelas_device_id", table_name="parcelas")
    op.drop_table("parcelas")

    op.drop_table("kc_etapas")
    op.drop_index("ix_cultivos_nombre_comun", table_name="cultivos")
    op.drop_table("cultivos")

    op.execute("DROP TYPE IF EXISTS estado_riego")
    op.execute("DROP TYPE IF EXISTS etapa_fenologica")
