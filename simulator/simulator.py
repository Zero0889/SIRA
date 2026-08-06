"""Simulador del firmware ESP32 para SIRA.

Genera lecturas realistas con ruido y tendencias físicas plausibles,
y las envía por POST /ingest al backend. Simula distintos escenarios agronómicos.

Uso:
    python simulator.py                            # normal, envía cada 5s
    python simulator.py --escenario sequia         # suelo se seca rápido
    python simulator.py --escenario lluvia         # sensor de lluvia activo
    python simulator.py --escenario tanque_vacio   # tanque bajo
    python simulator.py --interval 2               # cada 2 segundos
    python simulator.py --backend http://otra:8000
"""
from __future__ import annotations

import argparse
import asyncio
import math
import random
import signal
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal

import httpx

# Fuerza UTF-8 en stdout (Windows cp1252 por defecto no soporta → · ✓)
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


Escenario = Literal["normal", "sequia", "lluvia", "tanque_vacio", "riego_manual"]


@dataclass
class EstadoParcela:
    """Estado interno que evoluciona en el tiempo — imita física real del terreno."""
    humedad_suelo_pct: float = 55.0
    nivel_tanque_pct: float = 90.0
    temperatura_base_c: float = 20.0
    hr_base_pct: float = 75.0
    bateria_pct: float = 92.0

    def paso(self, escenario: Escenario, minuto_del_dia: int) -> None:
        """Avanza un paso de simulación (llamado cada ciclo)."""
        # Temperatura sigue curva sinusoidal diaria: min 5am, max 3pm
        ang = 2 * math.pi * (minuto_del_dia - 300) / 1440  # pico ~3pm
        self.temperatura_base_c = 20.0 + 6.0 * math.sin(ang)
        # HR inversa a temperatura
        self.hr_base_pct = 80.0 - 4.0 * math.sin(ang)

        # Suelo: se seca lentamente por evapotranspiración (~0.5%/ciclo)
        # o rápido en sequía
        secado = 0.5 if escenario != "sequia" else 1.5
        self.humedad_suelo_pct -= secado + random.uniform(-0.1, 0.1)
        # Rebote realista si baja mucho (simulando riego pasado)
        if self.humedad_suelo_pct < 20:
            self.humedad_suelo_pct = 55.0  # "el sistema ya regó"

        # Si llueve, el suelo sube
        if escenario == "lluvia":
            self.humedad_suelo_pct = min(95, self.humedad_suelo_pct + 5)

        # Tanque baja lentamente por evaporación / consumo
        self.nivel_tanque_pct -= 0.1
        if escenario == "tanque_vacio":
            self.nivel_tanque_pct = min(self.nivel_tanque_pct, 10.0)
        if self.nivel_tanque_pct < 5:
            self.nivel_tanque_pct = 100.0  # "alguien rellenó el tanque"
        self.bateria_pct = max(5.0, self.bateria_pct - 0.03)


def generar_lectura(estado: EstadoParcela, escenario: Escenario, device_id: str) -> dict:
    """Construye el payload JSON que el ESP32 enviaría."""
    ruido = lambda x, sigma: x + random.gauss(0, sigma)

    return {
        "device_id": device_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "temperatura_c": round(ruido(estado.temperatura_base_c, 0.3), 2),
        "humedad_rel": round(max(20.0, min(100.0, ruido(estado.hr_base_pct, 1.5))), 1),
        "presion_hpa": round(ruido(1013.0, 1.0), 1),
        "humedad_suelo_pct": round(max(0.0, min(100.0, ruido(estado.humedad_suelo_pct, 0.5))), 1),
        "nivel_tanque_pct": round(max(0.0, min(100.0, estado.nivel_tanque_pct)), 1),
        "llovio": escenario == "lluvia",
        "luz_lux": round(max(0.0, 40000 * math.sin(math.pi * (datetime.now().hour - 6) / 12) + random.gauss(0, 500)), 0),
        "bateria_pct": round(estado.bateria_pct, 1),
        "senal_dbm": round(random.uniform(-78, -58), 1),
        "firmware_version": "simulator-1.0",
        "modo_conexion": "wifi",
        "modo_operacion": "recomendacion",
        "lecturas_pendientes": 0,
        "simulado": True,
    }


async def enviar_lectura(client: httpx.AsyncClient, url: str, api_key: str, payload: dict) -> dict:
    r = await client.post(
        f"{url}/ingest",
        headers={"X-API-Key": api_key, "Content-Type": "application/json"},
        json=payload,
        timeout=30.0,
    )
    r.raise_for_status()
    return r.json()


ICONO_ACCION = {
    "regar": "[REGAR]",
    "esperar": "[----]",
    "cancelar_por_lluvia": "[LLUVIA]",
    "tanque_bajo": "[TANQUE!]",
    "sin_cultivo": "[?]",
}


async def loop(args: argparse.Namespace) -> None:
    estado = EstadoParcela()
    print(f"[SIRA sim] device={args.device}, escenario={args.escenario}, backend={args.backend}, interval={args.interval}s")
    print("-" * 100)

    async with httpx.AsyncClient() as client:
        ciclo = 0
        while True:
            ahora = datetime.now()
            minuto_del_dia = ahora.hour * 60 + ahora.minute
            estado.paso(args.escenario, minuto_del_dia)

            payload = generar_lectura(estado, args.escenario, args.device)
            try:
                respuesta = await enviar_lectura(client, args.backend, args.api_key, payload)
                icono = ICONO_ACCION.get(respuesta["accion"], "[?]")
                marca = ahora.strftime("%H:%M:%S")
                print(
                    f"{marca}  t={payload['temperatura_c']:5.1f}C "
                    f"hr={payload['humedad_rel']:4.1f}% "
                    f"suelo={payload['humedad_suelo_pct']:4.1f}% "
                    f"tanque={payload['nivel_tanque_pct']:5.1f}%  "
                    f"{icono:10s} {respuesta['razon']}"
                )
                if respuesta["accion"] == "regar":
                    # Simula que la bomba efectivamente subió el suelo
                    estado.humedad_suelo_pct = min(85, estado.humedad_suelo_pct + 20)
            except httpx.HTTPStatusError as e:
                print(f"  ERROR HTTP {e.response.status_code}: {e.response.text[:200]}")
            except Exception as e:
                print(f"  ERROR: {type(e).__name__}: {e}")

            ciclo += 1
            if args.max_ciclos and ciclo >= args.max_ciclos:
                print(f"[SIRA sim] {ciclo} ciclos completados, saliendo.")
                return
            await asyncio.sleep(args.interval)


def main() -> None:
    p = argparse.ArgumentParser(description="Simulador ESP32 para SIRA")
    p.add_argument("--device", default="ESP32-DEMO-001", help="device_id de la parcela")
    p.add_argument("--backend", default="http://127.0.0.1:8000", help="URL base del backend")
    p.add_argument("--api-key", default="cambia-este-token-largo-y-secreto", help="X-API-Key")
    p.add_argument(
        "--escenario",
        choices=["normal", "sequia", "lluvia", "tanque_vacio"],
        default="normal",
        help="escenario a simular",
    )
    p.add_argument("--interval", type=float, default=5.0, help="segundos entre envíos")
    p.add_argument("--max-ciclos", type=int, default=0, help="salir tras N ciclos (0 = infinito)")
    args = p.parse_args()

    def _stop(*_):
        print("\n[SIRA sim] Interrumpido por el usuario.")
        sys.exit(0)

    signal.signal(signal.SIGINT, _stop)

    try:
        asyncio.run(loop(args))
    except KeyboardInterrupt:
        _stop()


if __name__ == "__main__":
    main()
