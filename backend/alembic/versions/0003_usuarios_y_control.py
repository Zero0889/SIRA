"""usuarios, credenciales por nodo y control remoto

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table("usuarios", sa.Column("id", sa.Integer, primary_key=True), sa.Column("email", sa.String(254), nullable=False, unique=True), sa.Column("nombre", sa.String(120), nullable=False), sa.Column("password_hash", sa.String(255), nullable=False), sa.Column("activo", sa.Boolean, nullable=False, server_default=sa.true()), sa.Column("creado", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")))
    op.create_index("ix_usuarios_email", "usuarios", ["email"], unique=True)
    op.create_table("sesiones_usuario", sa.Column("id", sa.Integer, primary_key=True), sa.Column("usuario_id", sa.Integer, sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False), sa.Column("token_hash", sa.String(64), nullable=False, unique=True), sa.Column("expira", sa.DateTime(timezone=True), nullable=False), sa.Column("creado", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")))
    op.create_index("ix_sesiones_usuario_usuario_id", "sesiones_usuario", ["usuario_id"])
    op.create_index("ix_sesiones_usuario_token_hash", "sesiones_usuario", ["token_hash"], unique=True)
    op.create_index("ix_sesiones_usuario_expira", "sesiones_usuario", ["expira"])
    op.create_table("parcelas_usuarios", sa.Column("id", sa.Integer, primary_key=True), sa.Column("usuario_id", sa.Integer, sa.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False), sa.Column("parcela_id", sa.Integer, sa.ForeignKey("parcelas.id", ondelete="CASCADE"), nullable=False), sa.Column("rol", sa.String(20), nullable=False, server_default="propietario"), sa.UniqueConstraint("usuario_id", "parcela_id", name="uq_usuario_parcela"))
    op.create_index("ix_parcelas_usuarios_usuario_id", "parcelas_usuarios", ["usuario_id"])
    op.create_index("ix_parcelas_usuarios_parcela_id", "parcelas_usuarios", ["parcela_id"])
    op.create_table("credenciales_dispositivo", sa.Column("id", sa.Integer, primary_key=True), sa.Column("parcela_id", sa.Integer, sa.ForeignKey("parcelas.id", ondelete="CASCADE"), nullable=False, unique=True), sa.Column("token_hash", sa.String(64), nullable=False, unique=True), sa.Column("creado", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")), sa.Column("rotado", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_credenciales_dispositivo_parcela_id", "credenciales_dispositivo", ["parcela_id"], unique=True)
    op.create_index("ix_credenciales_dispositivo_token_hash", "credenciales_dispositivo", ["token_hash"], unique=True)
    op.create_table("control_parcelas", sa.Column("id", sa.Integer, primary_key=True), sa.Column("parcela_id", sa.Integer, sa.ForeignKey("parcelas.id", ondelete="CASCADE"), nullable=False, unique=True), sa.Column("modo", sa.String(20), nullable=False, server_default="apagado"), sa.Column("duracion_maxima_min", sa.Float, nullable=False, server_default="60"), sa.Column("humedad_bloqueo_pct", sa.Float, nullable=False, server_default="70"), sa.Column("tanque_minimo_pct", sa.Float, nullable=False, server_default="15"), sa.Column("actualizado", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")))
    op.create_index("ix_control_parcelas_parcela_id", "control_parcelas", ["parcela_id"], unique=True)
    op.create_table("ordenes_riego", sa.Column("id", sa.Integer, primary_key=True), sa.Column("parcela_id", sa.Integer, sa.ForeignKey("parcelas.id", ondelete="CASCADE"), nullable=False), sa.Column("solicitado_por_usuario_id", sa.Integer, sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True), sa.Column("evento_riego_id", sa.Integer, sa.ForeignKey("eventos_riego.id", ondelete="SET NULL"), nullable=True), sa.Column("origen", sa.String(20), nullable=False, server_default="manual"), sa.Column("accion", sa.String(12), nullable=False), sa.Column("estado", sa.String(20), nullable=False, server_default="pendiente"), sa.Column("duracion_min", sa.Float, nullable=False, server_default="0"), sa.Column("razon", sa.String(300), nullable=False), sa.Column("detalle_dispositivo", sa.Text, nullable=True), sa.Column("creado", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")), sa.Column("expira", sa.DateTime(timezone=True), nullable=False), sa.Column("entregado", sa.DateTime(timezone=True), nullable=True), sa.Column("actualizado", sa.DateTime(timezone=True), nullable=True), sa.Column("completado", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_ordenes_riego_parcela_id", "ordenes_riego", ["parcela_id"])
    op.create_index("ix_ordenes_riego_solicitado_por_usuario_id", "ordenes_riego", ["solicitado_por_usuario_id"])
    op.create_index("ix_ordenes_riego_evento_riego_id", "ordenes_riego", ["evento_riego_id"])
    op.create_index("ix_ordenes_riego_estado", "ordenes_riego", ["estado"])
    op.create_index("ix_ordenes_riego_creado", "ordenes_riego", ["creado"])
    op.create_index("ix_ordenes_riego_expira", "ordenes_riego", ["expira"])


def downgrade() -> None:
    op.drop_table("ordenes_riego")
    op.drop_table("control_parcelas")
    op.drop_table("credenciales_dispositivo")
    op.drop_table("parcelas_usuarios")
    op.drop_table("sesiones_usuario")
    op.drop_table("usuarios")
