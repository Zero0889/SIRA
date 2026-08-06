"""Motor de decisión de riego — el cerebro del sistema.

Recibe una lectura del ESP32 y decide si regar, cuánto y por qué.

Combina:
  1. Kc según la etapa fenológica del cultivo (día del ciclo).
  2. ETo del día por FAO-56 (con datos meteorológicos reales).
  3. ETc = Kc × ETo → mm de agua que el cultivo pide hoy.
  4. Humedad de suelo actual medida por el sensor capacitivo.
  5. Pronóstico de lluvia próxima 24h (cancela riego si viene lluvia).
  6. Nivel del tanque (aborta si está muy bajo).
  7. Traduce lámina (mm) → minutos de bomba según caudal del emisor.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Literal

from app.agronomy.kc import kc_para_dia
from app.models.parcela import Parcela
from app.weather import WeatherService


Accion = Literal["regar", "esperar", "cancelar_por_lluvia", "tanque_bajo", "sin_cultivo"]


@dataclass
class DecisionRiego:
    accion: Accion
    minutos_riego: float
    lamina_mm: float
    eto_mm: float | None
    kc: float | None
    etc_mm: float | None
    razon: str


# Umbrales por defecto — ajustables por parcela en el futuro
HUMEDAD_SUELO_UMBRAL_PCT = 60.0    # sobre este valor, el suelo tiene agua suficiente
NIVEL_TANQUE_MINIMO_PCT = 15.0     # bajo este valor, no encender bomba
LLUVIA_PRONOSTICADA_UMBRAL_MM = 5.0  # 5 mm en próximas 24h → cancela riego


class MotorRiego:
    def __init__(self, weather: WeatherService | None = None) -> None:
        self.weather = weather or WeatherService.default()

    async def decidir(
        self,
        parcela: Parcela,
        humedad_suelo_pct: float | None,
        nivel_tanque_pct: float | None,
        llovio_reciente: bool | None,
        fecha_actual: date | None = None,
    ) -> DecisionRiego:
        fecha_actual = fecha_actual or date.today()

        if parcela.cultivo is None or parcela.fecha_siembra is None:
            return DecisionRiego(
                accion="sin_cultivo",
                minutos_riego=0.0,
                lamina_mm=0.0,
                eto_mm=None,
                kc=None,
                etc_mm=None,
                razon="Parcela sin cultivo o sin fecha de siembra registrada",
            )

        # 1. Tanque bajo — abortar sin cálculos costosos
        if nivel_tanque_pct is not None and nivel_tanque_pct < NIVEL_TANQUE_MINIMO_PCT:
            return DecisionRiego(
                accion="tanque_bajo",
                minutos_riego=0.0,
                lamina_mm=0.0,
                eto_mm=None,
                kc=None,
                etc_mm=None,
                razon=f"Nivel del tanque {nivel_tanque_pct:.0f}% bajo el mínimo ({NIVEL_TANQUE_MINIMO_PCT:.0f}%)",
            )

        # 2. Suelo con humedad suficiente
        if humedad_suelo_pct is not None and humedad_suelo_pct > HUMEDAD_SUELO_UMBRAL_PCT:
            return DecisionRiego(
                accion="esperar",
                minutos_riego=0.0,
                lamina_mm=0.0,
                eto_mm=None,
                kc=None,
                etc_mm=None,
                razon=f"Humedad de suelo {humedad_suelo_pct:.0f}% sobre umbral ({HUMEDAD_SUELO_UMBRAL_PCT:.0f}%)",
            )

        # 3. Lluvia reportada por el sensor o pronosticada
        if llovio_reciente:
            return DecisionRiego(
                accion="cancelar_por_lluvia",
                minutos_riego=0.0,
                lamina_mm=0.0,
                eto_mm=None,
                kc=None,
                etc_mm=None,
                razon="Sensor de lluvia activo",
            )

        # 4. Kc del cultivo hoy
        kc_actual = kc_para_dia(parcela.cultivo, parcela.fecha_siembra, fecha_actual)
        if kc_actual is None:
            return DecisionRiego(
                accion="esperar",
                minutos_riego=0.0,
                lamina_mm=0.0,
                eto_mm=None,
                kc=None,
                etc_mm=None,
                razon="No se pudo determinar Kc (fecha_siembra futura o cultivo sin etapas cargadas)",
            )

        # 5. Consulta ETo y pronóstico de lluvia próximo
        try:
            eto_data = await self.weather.calcular_eto_diaria(
                parcela.latitud, parcela.longitud, parcela.altitud_m, fecha_actual
            )
            pronostico = await self.weather.forecast(
                parcela.latitud, parcela.longitud, dias=2
            )
        except Exception as e:
            return DecisionRiego(
                accion="esperar",
                minutos_riego=0.0,
                lamina_mm=0.0,
                eto_mm=None,
                kc=kc_actual.kc,
                etc_mm=None,
                razon=f"Sin datos meteorológicos disponibles: {e}",
            )

        if eto_data is None:
            return DecisionRiego(
                accion="esperar", minutos_riego=0.0, lamina_mm=0.0,
                eto_mm=None, kc=kc_actual.kc, etc_mm=None,
                razon="ETo del día no disponible",
            )

        clima, eto_result = eto_data
        eto_mm = eto_result.eto_mm
        etc_mm = eto_mm * kc_actual.kc

        # 6. Lluvia pronosticada próximas 24h
        lluvia_24h = sum(d.precipitacion_mm for d in pronostico[:1]) if pronostico else 0.0
        if lluvia_24h >= LLUVIA_PRONOSTICADA_UMBRAL_MM:
            return DecisionRiego(
                accion="cancelar_por_lluvia",
                minutos_riego=0.0,
                lamina_mm=0.0,
                eto_mm=eto_mm,
                kc=kc_actual.kc,
                etc_mm=etc_mm,
                razon=f"Pronóstico de {lluvia_24h:.1f} mm próximas 24h (umbral {LLUVIA_PRONOSTICADA_UMBRAL_MM} mm)",
            )

        # 7. Lámina a aplicar = ETc − lluvia efectiva de ayer/hoy
        lluvia_hoy = clima.precipitacion_mm
        lamina_mm = max(0.0, etc_mm - lluvia_hoy)

        # 8. Convertir mm a minutos de bomba
        minutos = _mm_a_minutos_riego(
            lamina_mm=lamina_mm,
            area_m2=parcela.area_m2,
            n_emisores=parcela.n_emisores,
            caudal_emisor_l_h=parcela.caudal_emisor_l_h,
        )
        if minutos <= 0:
            return DecisionRiego(
                accion="esperar",
                minutos_riego=0.0,
                lamina_mm=lamina_mm,
                eto_mm=eto_mm,
                kc=kc_actual.kc,
                etc_mm=etc_mm,
                razon=f"Lámina requerida = {lamina_mm:.2f} mm cubierta por lluvia reciente",
            )

        return DecisionRiego(
            accion="regar",
            minutos_riego=round(minutos, 1),
            lamina_mm=round(lamina_mm, 2),
            eto_mm=round(eto_mm, 2),
            kc=kc_actual.kc,
            etc_mm=round(etc_mm, 2),
            razon=(
                f"Etapa {kc_actual.etapa.value} (día {kc_actual.dia_del_ciclo}), "
                f"Kc={kc_actual.kc:.2f} · ETo={eto_mm:.2f}mm → ETc={etc_mm:.2f}mm. "
                f"Aplicar {lamina_mm:.2f}mm ≈ {minutos:.1f} min."
            ),
        )


def _mm_a_minutos_riego(
    lamina_mm: float,
    area_m2: float,
    n_emisores: int,
    caudal_emisor_l_h: float,
) -> float:
    """Convierte lámina (mm) a minutos de riego.

    1 mm sobre 1 m² = 1 L. Entonces: volumen_L = lamina_mm × area_m2.
    Caudal total del sistema = n_emisores × caudal_emisor_l_h  (L/h).
    Tiempo (h) = volumen_L / caudal_total.
    """
    if area_m2 <= 0 or n_emisores <= 0 or caudal_emisor_l_h <= 0:
        return 0.0
    volumen_l = lamina_mm * area_m2
    caudal_total_l_h = n_emisores * caudal_emisor_l_h
    horas = volumen_l / caudal_total_l_h
    return horas * 60.0
