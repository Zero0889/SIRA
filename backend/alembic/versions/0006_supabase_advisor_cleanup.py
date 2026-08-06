"""corrige hallazgos del asesor de Supabase

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-06
"""
from typing import Sequence, Union

from alembic import op


revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


DUPLICATE_INDEXES = (
    "ix_control_parcelas_parcela_id",
    "ix_credenciales_dispositivo_parcela_id",
    "ix_credenciales_dispositivo_token_hash",
    "ix_estado_dispositivos_parcela_id",
    "ix_sesiones_usuario_token_hash",
    "ix_usuarios_email",
)


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return

    for index in DUPLICATE_INDEXES:
        op.execute(f'DROP INDEX IF EXISTS public."{index}"')

    op.execute("ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY")
    op.execute("REVOKE ALL PRIVILEGES ON TABLE public.alembic_version FROM PUBLIC")
    op.execute(
        "DO $$ BEGIN "
        "IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN "
        "REVOKE ALL PRIVILEGES ON TABLE public.alembic_version FROM anon; "
        "END IF; "
        "IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN "
        "REVOKE ALL PRIVILEGES ON TABLE public.alembic_version FROM authenticated; "
        "END IF; "
        "END $$;"
    )


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return

    op.execute("ALTER TABLE public.alembic_version DISABLE ROW LEVEL SECURITY")
    op.create_index(
        "ix_control_parcelas_parcela_id",
        "control_parcelas",
        ["parcela_id"],
        unique=True,
    )
    op.create_index(
        "ix_credenciales_dispositivo_parcela_id",
        "credenciales_dispositivo",
        ["parcela_id"],
        unique=True,
    )
    op.create_index(
        "ix_credenciales_dispositivo_token_hash",
        "credenciales_dispositivo",
        ["token_hash"],
        unique=True,
    )
    op.create_index(
        "ix_estado_dispositivos_parcela_id",
        "estado_dispositivos",
        ["parcela_id"],
        unique=True,
    )
    op.create_index(
        "ix_sesiones_usuario_token_hash",
        "sesiones_usuario",
        ["token_hash"],
        unique=True,
    )
    op.create_index("ix_usuarios_email", "usuarios", ["email"], unique=True)
