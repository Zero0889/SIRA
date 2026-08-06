"""Orquestador de proveedores meteorológicos.

Regla general:
- 'current' y 'forecast'   → Open-Meteo (siempre en vivo, cualquier lat/lon).
- 'daily' pasado (>2 días) → NASA POWER (más preciso históricamente).
- 'daily' reciente         → Open-Meteo.
- Si el cultivo tiene una estación SENAMHI a <50 km, se anexa como validación.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import List

from app.agronomy.eto import EtoInputs, EtoResult, calcular_eto
from app.weather.base import CurrentWeather, DailyWeather, ForecastDay, NearestStation
from app.weather.nasa_power import NasaPowerProvider
from app.weather.open_meteo import OpenMeteoProvider
from app.weather.senamhi import SenamhiProvider


@dataclass
class WeatherService:
    open_meteo: OpenMeteoProvider
    nasa_power: NasaPowerProvider
    senamhi: SenamhiProvider

    @classmethod
    def default(cls) -> "WeatherService":
        return cls(
            open_meteo=OpenMeteoProvider(),
            nasa_power=NasaPowerProvider(),
            senamhi=SenamhiProvider(),
        )

    async def current(self, lat: float, lon: float) -> CurrentWeather:
        return await self.open_meteo.current(lat, lon)

    async def forecast(self, lat: float, lon: float, dias: int = 7) -> List[ForecastDay]:
        return await self.open_meteo.forecast(lat, lon, dias)

    async def daily(self, lat: float, lon: float, fecha: date) -> DailyWeather | None:
        hoy = date.today()
        antiguedad = (hoy - fecha).days
        if antiguedad >= 3:
            resultado = await self.nasa_power.daily(lat, lon, fecha)
            if resultado is not None:
                return resultado
        return await self.open_meteo.daily(lat, lon, fecha)

    async def calcular_eto_diaria(
        self, lat: float, lon: float, altitud_m: float, fecha: date
    ) -> tuple[DailyWeather, EtoResult] | None:
        clima = await self.daily(lat, lon, fecha)
        if clima is None:
            return None
        entrada = EtoInputs(
            fecha=fecha,
            latitud_deg=lat,
            altitud_m=altitud_m,
            t_max_c=clima.t_max_c,
            t_min_c=clima.t_min_c,
            hr_media_pct=clima.hr_media_pct,
            hr_max_pct=clima.hr_max_pct,
            hr_min_pct=clima.hr_min_pct,
            viento_2m_ms=clima.viento_2m_ms,
            radiacion_mj_m2_dia=clima.radiacion_mj_m2_dia,
            presion_kpa=clima.presion_kpa,
        )
        return clima, calcular_eto(entrada)

    async def estacion_senamhi_cercana(
        self, lat: float, lon: float, max_km: float = 50.0
    ) -> NearestStation | None:
        return await self.senamhi.nearest_station(lat, lon, max_km)
