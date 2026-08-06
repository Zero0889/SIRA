from datetime import date

from fastapi import APIRouter, HTTPException, Query

from app.agronomy.eto import EtoResult
from app.weather import WeatherService
from app.weather.base import CurrentWeather, DailyWeather, ForecastDay, NearestStation

router = APIRouter(prefix="/weather", tags=["weather"])

_service = WeatherService.default()


@router.get("/current", response_model=CurrentWeather)
async def current(
    lat: float = Query(..., ge=-90, le=90, description="Latitud en grados decimales (ejemplo: parcela demo en Arequipa).", examples=[-15.6059]),
    lon: float = Query(..., ge=-180, le=180, description="Longitud en grados decimales.", examples=[-71.4549]),
):
    try:
        return await _service.current(lat, lon)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Fuente clima falló: {e}")


@router.get("/forecast", response_model=list[ForecastDay])
async def forecast(
    lat: float = Query(..., ge=-90, le=90, description="Latitud en grados decimales (ejemplo: parcela demo en Arequipa).", examples=[-15.6059]),
    lon: float = Query(..., ge=-180, le=180, description="Longitud en grados decimales.", examples=[-71.4549]),
    dias: int = Query(7, ge=1, le=16, description="Número de días de pronóstico (1 a 16).", examples=[5]),
):
    try:
        return await _service.forecast(lat, lon, dias)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Fuente clima falló: {e}")


@router.get("/daily", response_model=DailyWeather)
async def daily(
    lat: float = Query(..., ge=-90, le=90, description="Latitud en grados decimales (ejemplo: parcela demo en Arequipa).", examples=[-15.6059]),
    lon: float = Query(..., ge=-180, le=180, description="Longitud en grados decimales.", examples=[-71.4549]),
    fecha: date = Query(..., description="Fecha del cálculo en formato YYYY-MM-DD.", examples=["2026-07-24"]),
):
    resultado = await _service.daily(lat, lon, fecha)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Sin datos para esa fecha/ubicación")
    return resultado


@router.get("/eto")
async def eto(
    lat: float = Query(..., ge=-90, le=90, description="Latitud en grados decimales (ejemplo: parcela demo en Arequipa).", examples=[-15.6059]),
    lon: float = Query(..., ge=-180, le=180, description="Longitud en grados decimales.", examples=[-71.4549]),
    altitud_m: float = Query(0.0, description="Altitud en metros sobre el nivel del mar (msnm).", examples=[4449]),
    fecha: date = Query(..., description="Fecha del cálculo en formato YYYY-MM-DD.", examples=["2026-07-24"]),
):
    r = await _service.calcular_eto_diaria(lat, lon, altitud_m, fecha)
    if r is None:
        raise HTTPException(status_code=404, detail="Sin datos meteorológicos")
    clima, eto_result = r
    return {
        "fecha": fecha.isoformat(),
        "ubicacion": {"lat": lat, "lon": lon, "altitud_m": altitud_m},
        "clima_fuente": clima.fuente,
        "eto_mm": round(eto_result.eto_mm, 3),
        "eto_reportada_por_fuente_mm": clima.eto_mm,
        "detalle": {
            "delta": round(eto_result.delta, 5),
            "gamma": round(eto_result.gamma, 5),
            "rn_mj_m2": round(eto_result.rn_mj_m2, 3),
            "ra_mj_m2": round(eto_result.ra_mj_m2, 3),
            "rso_mj_m2": round(eto_result.rso_mj_m2, 3),
            "es_kpa": round(eto_result.es_kpa, 3),
            "ea_kpa": round(eto_result.ea_kpa, 3),
        },
        "entradas": {
            "t_max_c": clima.t_max_c,
            "t_min_c": clima.t_min_c,
            "hr_media_pct": clima.hr_media_pct,
            "viento_2m_ms": clima.viento_2m_ms,
            "radiacion_mj_m2_dia": clima.radiacion_mj_m2_dia,
            "presion_kpa": clima.presion_kpa,
        },
    }


@router.get("/estacion-senamhi", response_model=NearestStation | None)
async def estacion_senamhi(
    lat: float = Query(..., ge=-90, le=90, description="Latitud en grados decimales (ejemplo: parcela demo en Arequipa).", examples=[-15.6059]),
    lon: float = Query(..., ge=-180, le=180, description="Longitud en grados decimales.", examples=[-71.4549]),
    max_km: float = Query(50.0, ge=1, le=500),
):
    return await _service.estacion_senamhi_cercana(lat, lon, max_km)


@router.get("/elevation")
async def elevation(
    lat: float = Query(..., ge=-90, le=90, description="Latitud en grados decimales (ejemplo: parcela demo en Arequipa).", examples=[-15.6059]),
    lon: float = Query(..., ge=-180, le=180, description="Longitud en grados decimales.", examples=[-71.4549]),
):
    import httpx
    url = f"https://api.open-meteo.com/v1/elevation?latitude={lat}&longitude={lon}"
    async with httpx.AsyncClient() as client:
        r = await client.get(url, timeout=10.0)
        r.raise_for_status()
        data = r.json()
        elev = data.get("elevation", [0.0])[0]
        return {"altitud_m": round(float(elev), 1)}

