"""ETo diaria por Penman-Monteith FAO-56.

Referencia: Allen et al. (1998). Crop evapotranspiration — Guidelines for computing
crop water requirements. FAO Irrigation and Drainage Paper 56.

Todas las fórmulas siguen la numeración del manual FAO-56.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date


SOLAR_CONSTANT = 0.0820  # MJ / m² / min                    (Gsc)
STEFAN_BOLTZMANN = 4.903e-9  # MJ / K⁴ / m² / día           (σ)
ALBEDO_REFERENCE_CROP = 0.23  # pasto de referencia         (α)


@dataclass(frozen=True)
class EtoInputs:
    """Entradas para ETo diaria FAO-56.

    Si se proveen hr_max_pct y hr_min_pct se usa la ecuación 17 (más precisa).
    En caso contrario se cae a hr_media_pct con la ecuación 19 (simplificada).
    """
    fecha: date
    latitud_deg: float
    altitud_m: float
    t_max_c: float
    t_min_c: float
    hr_media_pct: float                   # 0-100
    viento_2m_ms: float                   # m/s a 2 m
    radiacion_mj_m2_dia: float            # radiación solar incidente (Rs)
    presion_kpa: float | None = None      # si es None se estima por altitud
    hr_max_pct: float | None = None       # opcional, mejora la estimación de ea
    hr_min_pct: float | None = None


@dataclass(frozen=True)
class EtoResult:
    eto_mm: float
    rn_mj_m2: float
    ra_mj_m2: float
    rso_mj_m2: float
    delta: float
    gamma: float
    es_kpa: float
    ea_kpa: float


# ---------- Ecuaciones de apoyo ----------

def presion_atmosferica_kpa(altitud_m: float) -> float:
    """Ec. 7 — presión atmosférica en función de la altitud (kPa)."""
    return 101.3 * ((293.0 - 0.0065 * altitud_m) / 293.0) ** 5.26


def constante_psicrometrica(presion_kpa: float) -> float:
    """Ec. 8 — γ (kPa/°C)."""
    return 0.665e-3 * presion_kpa


def presion_vapor_saturacion_a(t_c: float) -> float:
    """Ec. 11 — e°(T), presión de vapor a saturación a temperatura T (kPa)."""
    return 0.6108 * math.exp((17.27 * t_c) / (t_c + 237.3))


def pendiente_vapor(t_c: float) -> float:
    """Ec. 13 — Δ, pendiente de la curva de presión de vapor (kPa/°C)."""
    e_t = presion_vapor_saturacion_a(t_c)
    return (4098.0 * e_t) / ((t_c + 237.3) ** 2)


def radiacion_extraterrestre(latitud_deg: float, dia_del_ano: int) -> float:
    """Ec. 21 — Ra, radiación extraterrestre diaria (MJ/m²/día)."""
    phi = math.radians(latitud_deg)
    dr = 1.0 + 0.033 * math.cos(2.0 * math.pi * dia_del_ano / 365.0)          # Ec. 23
    delta = 0.409 * math.sin(2.0 * math.pi * dia_del_ano / 365.0 - 1.39)      # Ec. 24
    # arg de arccos acotado a [-1, 1] para latitudes altas
    ws_arg = -math.tan(phi) * math.tan(delta)
    ws_arg = max(-1.0, min(1.0, ws_arg))
    ws = math.acos(ws_arg)                                                    # Ec. 25
    ra = (
        (24.0 * 60.0 / math.pi)
        * SOLAR_CONSTANT
        * dr
        * (ws * math.sin(phi) * math.sin(delta) + math.cos(phi) * math.cos(delta) * math.sin(ws))
    )
    return ra


def radiacion_cielo_despejado(ra: float, altitud_m: float) -> float:
    """Ec. 37 — Rso, radiación de cielo despejado (MJ/m²/día)."""
    return (0.75 + 2e-5 * altitud_m) * ra


def radiacion_neta_onda_corta(rs: float) -> float:
    """Ec. 38 — Rns."""
    return (1.0 - ALBEDO_REFERENCE_CROP) * rs


def radiacion_neta_onda_larga(
    t_max_c: float, t_min_c: float, ea_kpa: float, rs: float, rso: float
) -> float:
    """Ec. 39 — Rnl."""
    tmax_k4 = (t_max_c + 273.16) ** 4
    tmin_k4 = (t_min_c + 273.16) ** 4
    ratio = min(1.0, rs / rso) if rso > 0 else 1.0
    return (
        STEFAN_BOLTZMANN
        * ((tmax_k4 + tmin_k4) / 2.0)
        * (0.34 - 0.14 * math.sqrt(max(0.0, ea_kpa)))
        * (1.35 * ratio - 0.35)
    )


# ---------- Cálculo principal ----------

def calcular_eto(inp: EtoInputs) -> EtoResult:
    """Calcula ETo diaria (mm/día) — Ec. 6 de FAO-56."""
    t_mean = (inp.t_max_c + inp.t_min_c) / 2.0

    presion = inp.presion_kpa if inp.presion_kpa is not None else presion_atmosferica_kpa(inp.altitud_m)
    gamma = constante_psicrometrica(presion)
    delta = pendiente_vapor(t_mean)

    # Presión de vapor
    e_tmax = presion_vapor_saturacion_a(inp.t_max_c)
    e_tmin = presion_vapor_saturacion_a(inp.t_min_c)
    es = (e_tmax + e_tmin) / 2.0                                              # Ec. 12
    if inp.hr_max_pct is not None and inp.hr_min_pct is not None:
        ea = (e_tmin * inp.hr_max_pct + e_tmax * inp.hr_min_pct) / 200.0      # Ec. 17
    else:
        ea = (es * inp.hr_media_pct) / 100.0                                  # Ec. 19 simplificada

    # Radiación
    j = inp.fecha.timetuple().tm_yday
    ra = radiacion_extraterrestre(inp.latitud_deg, j)
    rso = radiacion_cielo_despejado(ra, inp.altitud_m)
    rns = radiacion_neta_onda_corta(inp.radiacion_mj_m2_dia)
    rnl = radiacion_neta_onda_larga(inp.t_max_c, inp.t_min_c, ea, inp.radiacion_mj_m2_dia, rso)
    rn = rns - rnl                                                            # Ec. 40
    g = 0.0  # despreciable para paso diario                                   Ec. 42

    numerador = 0.408 * delta * (rn - g) + gamma * (900.0 / (t_mean + 273.0)) * inp.viento_2m_ms * (es - ea)
    denominador = delta + gamma * (1.0 + 0.34 * inp.viento_2m_ms)
    eto = numerador / denominador

    return EtoResult(
        eto_mm=eto,
        rn_mj_m2=rn,
        ra_mj_m2=ra,
        rso_mj_m2=rso,
        delta=delta,
        gamma=gamma,
        es_kpa=es,
        ea_kpa=ea,
    )


def viento_10m_a_2m(u10_ms: float) -> float:
    """Ec. 47 — conversión de velocidad de viento medida a 10 m a 2 m sobre pasto."""
    return u10_ms * (4.87 / math.log(67.8 * 10.0 - 5.42))
