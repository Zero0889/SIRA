"""Proveedor Open-Meteo — fuente PRINCIPAL de pronóstico y ETo.

- Gratuito, sin API key.
- Cobertura global por lat/lon (no depende de estaciones).
- Ya calcula ETo (evapotranspiration) por defecto según FAO-56.
- Docs: https://open-meteo.com/en/docs
"""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import List

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.agronomy.eto import viento_10m_a_2m
from app.config import get_settings
from app.weather.base import CurrentWeather, DailyWeather, ForecastDay, WeatherProvider


class OpenMeteoProvider(WeatherProvider):
    nombre = "open-meteo"

    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = base_url or get_settings().open_meteo_base_url

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
    async def _get(self, path: str, params: dict) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{self.base_url}{path}", params=params)
            r.raise_for_status()
            return r.json()

    async def current(self, lat: float, lon: float) -> CurrentWeather:
        data = await self._get(
            "/forecast",
            {
                "latitude": lat,
                "longitude": lon,
                "current": ",".join([
                    "temperature_2m",
                    "relative_humidity_2m",
                    "surface_pressure",
                    "wind_speed_10m",
                    "precipitation",
                    "shortwave_radiation",
                ]),
                "wind_speed_unit": "ms",
                "timezone": "auto",
            },
        )
        cur = data.get("current", {})
        # Open-Meteo entrega viento a 10 m — convertir a 2 m (FAO-56 Ec. 47)
        u10 = cur.get("wind_speed_10m")
        u2 = viento_10m_a_2m(u10) if u10 is not None else None
        return CurrentWeather(
            fuente=self.nombre,
            timestamp=datetime.fromisoformat(cur["time"]).replace(tzinfo=timezone.utc),
            temperatura_c=cur.get("temperature_2m"),
            humedad_rel=cur.get("relative_humidity_2m"),
            presion_hpa=cur.get("surface_pressure"),
            viento_ms=u2,
            precipitacion_mm_h=cur.get("precipitation"),
            radiacion_wm2=cur.get("shortwave_radiation"),
        )

    async def daily(self, lat: float, lon: float, fecha: date) -> DailyWeather | None:
        data = await self._get(
            "/forecast",
            {
                "latitude": lat,
                "longitude": lon,
                "start_date": fecha.isoformat(),
                "end_date": fecha.isoformat(),
                "daily": ",".join([
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "relative_humidity_2m_max",
                    "relative_humidity_2m_min",
                    "relative_humidity_2m_mean",
                    "wind_speed_10m_max",
                    "shortwave_radiation_sum",  # MJ/m²/día
                    "precipitation_sum",
                    "et0_fao_evapotranspiration",
                    "surface_pressure_mean",
                ]),
                "wind_speed_unit": "ms",
                "timezone": "auto",
            },
        )
        d = data.get("daily", {})
        if not d.get("time"):
            return None
        idx = 0
        u10 = d["wind_speed_10m_max"][idx]
        u2 = viento_10m_a_2m(u10) if u10 is not None else 0.0
        presion_hpa = d.get("surface_pressure_mean", [None])[idx]
        return DailyWeather(
            fuente=self.nombre,
            fecha=fecha,
            t_max_c=d["temperature_2m_max"][idx],
            t_min_c=d["temperature_2m_min"][idx],
            hr_media_pct=d["relative_humidity_2m_mean"][idx],
            hr_max_pct=d["relative_humidity_2m_max"][idx],
            hr_min_pct=d["relative_humidity_2m_min"][idx],
            viento_2m_ms=u2,
            radiacion_mj_m2_dia=d["shortwave_radiation_sum"][idx],
            precipitacion_mm=d["precipitation_sum"][idx],
            presion_kpa=(presion_hpa / 10.0) if presion_hpa else None,
            eto_mm=d["et0_fao_evapotranspiration"][idx],
        )

    async def forecast(self, lat: float, lon: float, dias: int = 7) -> List[ForecastDay]:
        data = await self._get(
            "/forecast",
            {
                "latitude": lat,
                "longitude": lon,
                "forecast_days": min(max(dias, 1), 16),
                "daily": ",".join([
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "precipitation_sum",
                    "precipitation_probability_max",
                    "et0_fao_evapotranspiration",
                ]),
                "timezone": "auto",
            },
        )
        d = data.get("daily", {})
        salida: List[ForecastDay] = []
        for i, fecha_str in enumerate(d.get("time", [])):
            salida.append(
                ForecastDay(
                    fecha=date.fromisoformat(fecha_str),
                    t_max_c=d["temperature_2m_max"][i],
                    t_min_c=d["temperature_2m_min"][i],
                    precipitacion_mm=d["precipitation_sum"][i] or 0.0,
                    prob_precipitacion_pct=d.get("precipitation_probability_max", [None] * len(d["time"]))[i],
                    eto_mm=d["et0_fao_evapotranspiration"][i],
                )
            )
        return salida
