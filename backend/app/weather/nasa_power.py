"""Proveedor NASA POWER — fuente HISTÓRICA para FAO-56.

- Gratuito, sin API key.
- Cobertura global 0.5°×0.5° derivada de satélite (MERRA-2, CERES).
- `community=AG` entrega variables ya alineadas con lo que pide FAO-56:
    - T2M (temperatura a 2 m)
    - RH2M (humedad relativa a 2 m)
    - WS2M (viento a 2 m — ya convertido, no hace falta transformar)
    - ALLSKY_SFC_SW_DWN (radiación solar en superficie, MJ/m²/día)
    - PRECTOTCORR (precipitación corregida, mm/día)
- Latencia: 2-5 días vs tiempo real.
- Docs: https://power.larc.nasa.gov/docs/services/api/
"""
from __future__ import annotations

from datetime import date, datetime, timezone

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.weather.base import CurrentWeather, DailyWeather, WeatherProvider

# NASA POWER usa -999 como sentinela para "sin dato"
NA = -999.0


def _clean(v: float | None) -> float | None:
    if v is None or v == NA:
        return None
    return v


class NasaPowerProvider(WeatherProvider):
    nombre = "nasa-power"

    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = base_url or get_settings().nasa_power_base_url

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
    async def _get(self, path: str, params: dict) -> dict:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(f"{self.base_url}{path}", params=params)
            r.raise_for_status()
            return r.json()

    async def daily(self, lat: float, lon: float, fecha: date) -> DailyWeather | None:
        yyyymmdd = fecha.strftime("%Y%m%d")
        data = await self._get(
            "/temporal/daily/point",
            {
                "parameters": ",".join([
                    "T2M_MAX", "T2M_MIN", "T2M",
                    "RH2M",
                    "WS2M",
                    "ALLSKY_SFC_SW_DWN",
                    "PRECTOTCORR",
                    "PS",  # presión superficial (kPa)
                ]),
                "community": "AG",
                "latitude": lat,
                "longitude": lon,
                "start": yyyymmdd,
                "end": yyyymmdd,
                "format": "JSON",
            },
        )
        params = data.get("properties", {}).get("parameter", {})

        def val(k: str) -> float | None:
            return _clean(params.get(k, {}).get(yyyymmdd))

        t_max = val("T2M_MAX")
        t_min = val("T2M_MIN")
        rh = val("RH2M")
        rad = val("ALLSKY_SFC_SW_DWN")
        if t_max is None or t_min is None or rh is None or rad is None:
            return None

        return DailyWeather(
            fuente=self.nombre,
            fecha=fecha,
            t_max_c=t_max,
            t_min_c=t_min,
            hr_media_pct=rh,
            hr_max_pct=None,
            hr_min_pct=None,
            viento_2m_ms=val("WS2M") or 1.0,
            radiacion_mj_m2_dia=rad,
            precipitacion_mm=val("PRECTOTCORR") or 0.0,
            presion_kpa=val("PS"),
            eto_mm=None,  # NASA POWER no entrega ETo, la calcula nuestro motor
        )

    async def current(self, lat: float, lon: float) -> CurrentWeather:
        """NASA POWER no tiene tiempo real — devolvemos la última fecha disponible."""
        raise NotImplementedError(
            "NASA POWER no expone 'current' — usa daily() con una fecha pasada."
        )
