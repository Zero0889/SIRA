"""Proveedor SENAMHI WIS2 — validación oficial peruana.

- WIS2-in-a-box, estándar OMM. Sin autenticación.
- 31 estaciones sinópticas en Perú.
- Variables: temperatura, punto de rocío, presión, viento (velocidad y dirección).
- NO tiene: precipitación, humedad relativa directa, radiación, pronóstico.
  → De la HR se aproxima a partir de temp y punto de rocío (fórmula August-Roche-Magnus).
- El certificado SSL del dominio es inválido → verify=False (documentado).
- Base URL: https://wis.senamhi.gob.pe/oapi
"""
from __future__ import annotations

import math
from datetime import date, datetime, timezone
from typing import List, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.weather.base import CurrentWeather, DailyWeather, NearestStation, WeatherProvider

STATIONS_PATH = "/collections/stations/items"
OBS_PATH = "/collections/urn:wmo:md:pe-senamhi:synop-hourly/items"


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distancia en km entre dos puntos (fórmula del haversine)."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _hr_desde_temp_y_dewpoint(t_c: float, td_c: float) -> float:
    """Humedad relativa (%) desde temperatura y punto de rocío. August-Roche-Magnus."""
    a, b = 17.625, 243.04
    num = math.exp((a * td_c) / (b + td_c))
    den = math.exp((a * t_c) / (b + t_c))
    return max(0.0, min(100.0, 100.0 * num / den))


class SenamhiProvider(WeatherProvider):
    nombre = "senamhi-wis2"

    def __init__(self, base_url: str | None = None) -> None:
        s = get_settings()
        self.base_url = base_url or s.senamhi_base_url
        self.verify_ssl = s.senamhi_verify_ssl

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8))
    async def _get(self, path: str, params: dict) -> dict:
        async with httpx.AsyncClient(timeout=15.0, verify=self.verify_ssl) as client:
            r = await client.get(f"{self.base_url}{path}", params=params)
            r.raise_for_status()
            return r.json()

    async def _todas_las_estaciones(self) -> list[dict]:
        data = await self._get(STATIONS_PATH, {"f": "json", "limit": 500})
        return data.get("features", [])

    async def nearest_station(
        self, lat: float, lon: float, max_km: float = 50.0
    ) -> Optional[NearestStation]:
        estaciones = await self._todas_las_estaciones()
        candidata: NearestStation | None = None
        for f in estaciones:
            coords = f.get("geometry", {}).get("coordinates", [])
            if len(coords) < 2:
                continue
            elon, elat = coords[0], coords[1]
            ealt = coords[2] if len(coords) > 2 else 0.0
            dist = _haversine_km(lat, lon, elat, elon)
            if dist > max_km:
                continue
            if candidata is None or dist < candidata.distancia_km:
                p = f.get("properties", {})
                candidata = NearestStation(
                    id_estacion=p.get("wigos_station_identifier", ""),
                    nombre=p.get("name", ""),
                    latitud=elat,
                    longitud=elon,
                    altitud_m=ealt,
                    distancia_km=dist,
                )
        return candidata

    async def _ultimas_observaciones(self, wsi: str, limit: int = 24) -> list[dict]:
        data = await self._get(
            OBS_PATH,
            {
                "f": "json",
                "wigos_station_identifier": wsi,
                "sortby": "-phenomenonTime",
                "limit": limit,
            },
        )
        return data.get("features", [])

    async def current(self, lat: float, lon: float) -> CurrentWeather:
        est = await self.nearest_station(lat, lon)
        if not est:
            raise RuntimeError(
                f"No hay estación SENAMHI a menos de 50 km de ({lat}, {lon})"
            )

        # Traemos las últimas 12 observaciones y colapsamos por reportId
        obs = await self._ultimas_observaciones(est.id_estacion, limit=12)
        lecturas: dict[str, float] = {}
        ts: datetime | None = None
        for o in obs:
            p = o.get("properties", {})
            nombre = p.get("name")
            valor = p.get("value")
            if nombre and valor is not None and nombre not in lecturas:
                lecturas[nombre] = float(valor)
                if ts is None and p.get("phenomenonTime"):
                    ts = datetime.fromisoformat(
                        p["phenomenonTime"].replace("Z", "+00:00")
                    )

        t = lecturas.get("air_temperature")
        td = lecturas.get("dewpoint_temperature")
        hr = _hr_desde_temp_y_dewpoint(t, td) if t is not None and td is not None else None

        return CurrentWeather(
            fuente=f"{self.nombre}:{est.nombre}",
            timestamp=ts or datetime.now(timezone.utc),
            temperatura_c=t,
            humedad_rel=hr,
            presion_hpa=lecturas.get("non_coordinate_pressure"),
            viento_ms=lecturas.get("wind_speed"),
            precipitacion_mm_h=None,  # SENAMHI WIS2 no expone precipitación
            radiacion_wm2=None,
        )
