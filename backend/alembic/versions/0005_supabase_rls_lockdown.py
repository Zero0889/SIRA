"""bloquea el acceso directo a las tablas de SIRA en Supabase

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-06
"""
from typing import Sequence, Union

from alembic import op


revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SIRA_TABLES = (
    "cultivos",
    "kc_etapas",
    "parcelas",
    "lecturas",
    "eventos_riego",
    "estado_dispositivos",
    "usuarios",
    "sesiones_usuario",
    "parcelas_usuarios",
    "credenciales_dispositivo",
    "control_parcelas",
    "ordenes_riego",
    "notificaciones_sms",
)


def _quoted_list() -> str:
    return ", ".join(f'public."{table}"' for table in SIRA_TABLES)


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return

    for table in SIRA_TABLES:
        op.execute(f'ALTER TABLE public."{table}" ENABLE ROW LEVEL SECURITY')

    tables = _quoted_list()
    op.execute(f"REVOKE ALL PRIVILEGES ON TABLE {tables} FROM PUBLIC")
    op.execute(
        "DO $$ BEGIN "
        "IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN "
        f"REVOKE ALL PRIVILEGES ON TABLE {tables} FROM anon; "
        "END IF; "
        "IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN "
        f"REVOKE ALL PRIVILEGES ON TABLE {tables} FROM authenticated; "
        "END IF; "
        "END $$;"
    )
    op.execute(
        "DO $$ DECLARE seq_identifier text; BEGIN "
        "FOR seq_identifier IN "
        "SELECT s.sequence_schema || '.' || quote_ident(s.sequence_name) "
        "FROM information_schema.sequences AS s WHERE s.sequence_schema = 'public' "
        "LOOP "
        "EXECUTE 'REVOKE ALL PRIVILEGES ON SEQUENCE ' || seq_identifier || ' FROM PUBLIC'; "
        "IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN "
        "EXECUTE 'REVOKE ALL PRIVILEGES ON SEQUENCE ' || seq_identifier || ' FROM anon'; "
        "END IF; "
        "IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN "
        "EXECUTE 'REVOKE ALL PRIVILEGES ON SEQUENCE ' || seq_identifier || ' FROM authenticated'; "
        "END IF; "
        "END LOOP; END $$;"
    )


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return

    # No se restauran permisos públicos automáticamente: sería una regresión
    # de seguridad. Si se necesita Data API, debe añadirse una política explícita.
    for table in SIRA_TABLES:
        op.execute(f'ALTER TABLE public."{table}" DISABLE ROW LEVEL SECURITY')
