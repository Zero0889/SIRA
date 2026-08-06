from sqlalchemy import select

from app.config import get_settings
from app.db import SessionLocal
from app.models.parcela import Parcela
from app.models.usuario import ParcelaUsuario, Usuario
from app.security import hash_password


async def ensure_bootstrap_user() -> None:
    """Crea el operador local y adopta datos previos solo en instalaciones nuevas/locales."""
    settings = get_settings()
    if not settings.bootstrap_admin_email or not settings.bootstrap_admin_password:
        return

    async with SessionLocal() as db:
        user = (
            await db.execute(select(Usuario).where(Usuario.email == settings.bootstrap_admin_email.lower()))
        ).scalar_one_or_none()
        if user is None:
            user = Usuario(
                email=settings.bootstrap_admin_email.lower(),
                nombre=settings.bootstrap_admin_name,
                password_hash=hash_password(settings.bootstrap_admin_password),
            )
            db.add(user)
            await db.flush()

        assigned = select(ParcelaUsuario.parcela_id)
        orphan_parcels = (
            await db.execute(select(Parcela.id).where(Parcela.id.not_in(assigned)))
        ).scalars().all()
        for parcela_id in orphan_parcels:
            db.add(ParcelaUsuario(usuario_id=user.id, parcela_id=parcela_id))
        await db.commit()
