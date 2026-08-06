"""historial de notificaciones SMS

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notificaciones_sms",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "parcela_id",
            sa.Integer,
            sa.ForeignKey("parcelas.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("evento", sa.String(40), nullable=False),
        sa.Column("proveedor", sa.String(20), nullable=False, server_default="smsgate"),
        sa.Column("destinatario", sa.String(32), nullable=False),
        sa.Column("mensaje", sa.String(320), nullable=False),
        sa.Column("estado", sa.String(20), nullable=False),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column(
            "creado",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index(
        "ix_notificaciones_sms_parcela_id",
        "notificaciones_sms",
        ["parcela_id"],
    )
    op.create_index("ix_notificaciones_sms_evento", "notificaciones_sms", ["evento"])
    op.create_index("ix_notificaciones_sms_estado", "notificaciones_sms", ["estado"])
    op.create_index("ix_notificaciones_sms_creado", "notificaciones_sms", ["creado"])


def downgrade() -> None:
    op.drop_table("notificaciones_sms")
