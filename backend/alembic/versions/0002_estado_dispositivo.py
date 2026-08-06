"""estado operativo de nodos de campo

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "estado_dispositivos",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("parcela_id", sa.Integer, sa.ForeignKey("parcelas.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("ultima_conexion", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("firmware_version", sa.String(32), nullable=True),
        sa.Column("modo_conexion", sa.String(20), nullable=False, server_default="serial"),
        sa.Column("modo_operacion", sa.String(20), nullable=False, server_default="recomendacion"),
        sa.Column("bateria_pct", sa.Float, nullable=True),
        sa.Column("senal_dbm", sa.Float, nullable=True),
        sa.Column("lecturas_pendientes", sa.Integer, nullable=False, server_default="0"),
        sa.Column("simulado", sa.Boolean, nullable=False, server_default=sa.true()),
    )
    op.create_index("ix_estado_dispositivos_parcela_id", "estado_dispositivos", ["parcela_id"], unique=True)
    op.create_index("ix_estado_dispositivos_ultima_conexion", "estado_dispositivos", ["ultima_conexion"])


def downgrade() -> None:
    op.drop_index("ix_estado_dispositivos_ultima_conexion", table_name="estado_dispositivos")
    op.drop_index("ix_estado_dispositivos_parcela_id", table_name="estado_dispositivos")
    op.drop_table("estado_dispositivos")

