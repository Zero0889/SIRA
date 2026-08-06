from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models.cultivo import Cultivo
from app.schemas import CultivoOut

router = APIRouter(prefix="/cultivos", tags=["cultivos"])


@router.get("", response_model=list[CultivoOut])
async def list_cultivos(db: AsyncSession = Depends(get_db)):
    stmt = select(Cultivo).options(selectinload(Cultivo.kc_etapas))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{cultivo_id}", response_model=CultivoOut)
async def get_cultivo(cultivo_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Cultivo)
        .where(Cultivo.id == cultivo_id)
        .options(selectinload(Cultivo.kc_etapas))
    )
    result = await db.execute(stmt)
    cultivo = result.scalar_one_or_none()
    if not cultivo:
        raise HTTPException(status_code=404, detail="Cultivo no encontrado")
    return cultivo
