"""Tests de ETo contra ejemplos canónicos del manual FAO-56."""
from datetime import date

import pytest

from app.agronomy.eto import (
    EtoInputs,
    calcular_eto,
    presion_atmosferica_kpa,
    presion_vapor_saturacion_a,
    radiacion_extraterrestre,
    viento_10m_a_2m,
)


def test_presion_atmosferica_1800m():
    """FAO-56 Ejemplo 2: z=1800 m → P ≈ 81.8 kPa."""
    assert presion_atmosferica_kpa(1800) == pytest.approx(81.8, abs=0.2)


def test_e0_a_25c():
    """FAO-56 tabla 2.4: e°(25°C) ≈ 3.168 kPa."""
    assert presion_vapor_saturacion_a(25.0) == pytest.approx(3.168, abs=0.005)


def test_ra_latitud_20s():
    """FAO-56 Ejemplo 8: lat=-20°, 3 sept (J=246) → Ra ≈ 32.2 MJ/m²/día."""
    ra = radiacion_extraterrestre(-20.0, 246)
    assert ra == pytest.approx(32.2, abs=0.3)


def test_viento_10m_a_2m():
    """FAO-56 Ec. 47: u10=3.2 m/s → u2 ≈ 2.4 m/s."""
    assert viento_10m_a_2m(3.2) == pytest.approx(2.39, abs=0.05)


def test_eto_ejemplo_fao56_18():
    """FAO-56 Ejemplo 18 — Uccle (Bélgica), 6 de julio.

    Datos oficiales:
      lat = 50°48' N, z = 100 m, J = 187
      Tmax = 21.5°C, Tmin = 12.3°C
      HRmax = 84%, HRmin = 63%
      u2 = 2.78 m/s, Rs = 22.07 MJ/m²/día
    Resultado esperado: ETo ≈ 3.88 mm/día
    """
    inp = EtoInputs(
        fecha=date(2024, 7, 6),
        latitud_deg=50.80,
        altitud_m=100.0,
        t_max_c=21.5,
        t_min_c=12.3,
        hr_media_pct=73.5,
        hr_max_pct=84.0,
        hr_min_pct=63.0,
        viento_2m_ms=2.78,
        radiacion_mj_m2_dia=22.07,
    )
    res = calcular_eto(inp)
    assert res.eto_mm == pytest.approx(3.88, abs=0.2)


def test_eto_valores_no_negativos():
    """Sanity: en condiciones normales ETo debe ser positivo y razonable (<15 mm/día)."""
    inp = EtoInputs(
        fecha=date(2024, 1, 15),
        latitud_deg=-12.05,  # Lima, Perú
        altitud_m=150.0,
        t_max_c=28.0,
        t_min_c=19.0,
        hr_media_pct=75.0,
        viento_2m_ms=1.5,
        radiacion_mj_m2_dia=20.0,
    )
    res = calcular_eto(inp)
    assert 0 < res.eto_mm < 15
    assert res.rn_mj_m2 > 0
