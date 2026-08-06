"""Interfaz común para todos los proveedores meteorológicos.

Cualquier fuente (Open-Meteo, NASA POWER, SENAMHI...) implementa este contrato
para que el resto del sistema no dependa de una fuente concreta.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date, datetime
from typing import List, Optional


@dataclass(frozen=True)
class CurrentWeather:
    """Snapshot actual — usado por el motor de riego para decidir 'regar ahora'."""
    fuente: str
    timestamp: datetime
    temperatura_c: float | None
    humedad_rel: float | None
    presion_hpa: float | None
    viento_ms: float | None
    precipitacion_mm_h: float | None
    radiacion_wm2: float | None


@dataclass(frozen=True)
class DailyWeather:
    """Agregado diario — la unidad para calcular ETo por FAO-56."""
    fuente: str
    fecha: date
    t_max_c: float
    t_min_c: float
    hr_media_pct: float
    hr_max_pct: float | None
    hr_min_pct: float | None
    viento_2m_ms: float
    radiacion_mj_m2_dia: float
    precipitacion_mm: float
    presion_kpa: float | None
    eto_mm: float | None  # si la fuente ya la trae calculada


@dataclass(frozen=True)
class ForecastDay:
    """Pronóstico diario — para anticipar lluvia y posponer riego."""
    fecha: date
    t_max_c: float
    t_min_c: float
    precipitacion_mm: float
    prob_precipitacion_pct: float | None
    eto_mm: float | None


@dataclass(frozen=True)
class NearestStation:
    """Estación meteorológica cercana — para validación oficial (SENAMHI)."""
    id_estacion: str
    nombre: str
    latitud: float
    longitud: float
    altitud_m: float
    distancia_km: float


class WeatherProvider(ABC):
    """Contrato mínimo que debe cumplir un proveedor meteorológico."""

    nombre: str = "abstract"

    @abstractmethod
    async def current(self, lat: float, lon: float) -> CurrentWeather:
        """Condiciones actuales en la ubicación."""

    async def daily(self, lat: float, lon: float, fecha: date) -> DailyWeather | None:
        """Agregado diario de una fecha específica. Puede no estar soportado."""
        return None

    async def forecast(
        self, lat: float, lon: float, dias: int = 7
    ) -> List[ForecastDay]:
        """Pronóstico. Devuelve lista vacía si la fuente no lo soporta."""
        return []

    async def nearest_station(
        self, lat: float, lon: float, max_km: float = 50.0
    ) -> Optional[NearestStation]:
        """Estación oficial más cercana. Solo aplica a fuentes con red física."""
        return None
