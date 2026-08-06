from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models.notificacion import NotificacionSms
from app.models.usuario import ParcelaUsuario, Usuario
from app.security import get_current_user
from app.services.notifications import send_sms, sms_status

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/status")
async def notification_status(_user: Usuario = Depends(get_current_user)):
    """Estado seguro de la integración; nunca expone números completos ni secretos."""
    return sms_status()


@router.get("/history")
async def notification_history(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    safe_limit = max(1, min(limit, 100))
    rows = (
        await db.execute(
            select(NotificacionSms)
            .join(ParcelaUsuario, ParcelaUsuario.parcela_id == NotificacionSms.parcela_id)
            .where(ParcelaUsuario.usuario_id == user.id)
            .order_by(desc(NotificacionSms.creado))
            .limit(safe_limit)
        )
    ).scalars().all()
    return [
        {
            "id": row.id,
            "event": row.evento,
            "provider": row.proveedor,
            "recipient": row.destinatario,
            "message": row.mensaje,
            "status": row.estado,
            "created_at": row.creado.isoformat(),
        }
        for row in rows
    ]


@router.post("/test")
async def notification_test(_user: Usuario = Depends(get_current_user)):
    result = await send_sms(
        "SIRA · Mensaje de prueba. Las alertas SMS están configuradas correctamente.",
        event="test",
        bypass_cooldown=True,
    )
    return {"ok": result["sent"], **result}
