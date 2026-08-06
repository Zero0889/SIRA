"""Determinación del Kc según la etapa fenológica actual del cultivo."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from app.models.cultivo import Cultivo, EtapaFenologica


@dataclass(frozen=True)
class KcActual:
    etapa: EtapaFenologica
    kc: float
    dia_del_ciclo: int
    dias_restantes_etapa: int


def kc_para_dia(cultivo: Cultivo, fecha_siembra: date, fecha_actual: date) -> KcActual | None:
    """Devuelve el Kc vigente en `fecha_actual` según la duración de cada etapa cargada."""
    if not cultivo.kc_etapas:
        return None

    dia = (fecha_actual - fecha_siembra).days
    if dia < 0:
        return None

    acumulado = 0
    etapas = sorted(cultivo.kc_etapas, key=lambda e: e.orden)
    for etapa in etapas:
        acumulado += etapa.duracion_dias
        if dia < acumulado:
            return KcActual(
                etapa=etapa.etapa,
                kc=etapa.kc,
                dia_del_ciclo=dia,
                dias_restantes_etapa=acumulado - dia,
            )

    # Ciclo terminado — se mantiene el Kc final por si sigue el manejo
    ultima = etapas[-1]
    return KcActual(
        etapa=ultima.etapa,
        kc=ultima.kc,
        dia_del_ciclo=dia,
        dias_restantes_etapa=0,
    )
