"""Bridge Serial -> HTTP para conectar un Arduino (real o en Proteus) al backend SIRA.

Como funciona:
  1. El Arduino escribe por Serial (baudrate 9600 por defecto) una linea JSON con
     las lecturas de sus sensores:  {"suelo":45,"tanque":80,"temp":22,"hr":70,"lluvia":0}
  2. Este script lee esa linea del COM, la parsea, la enriquece con device_id y
     hace POST /ingest al backend FastAPI.
  3. El backend responde con la decision ("regar 45 min" / "esperar").
  4. El bridge escribe la decision de vuelta al Arduino por Serial en formato:
     ACCION:REGAR:45
     ACCION:ESPERAR:0
     El Arduino puede parsearlo para activar el rele.

Uso:
  python serial_bridge.py --port COM3
  python serial_bridge.py --port COM3 --baud 115200 --device ESP32-001
  python serial_bridge.py --list      # lista los puertos COM disponibles
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone

# La razon del motor trae caracteres como →, ≈, ·, tildes. En Windows la consola
# usa cp1252 por defecto y eso puede reventar el print (UnicodeEncodeError).
# Forzamos UTF-8 en la salida para que el bridge nunca se caiga por encoding.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

try:
    import serial
    import serial.tools.list_ports
except ImportError:
    print("[ERROR] Falta la libreria pyserial. Instalala con:  pip install pyserial")
    sys.exit(1)

try:
    import httpx
except ImportError:
    httpx = None
    print("[AVISO] httpx no instalado. Solo se mostraran las lecturas sin enviar al backend.")


ICONO = {
    "regar": "REGAR",
    "esperar": "ESPERAR",
    "cancelar_por_lluvia": "LLUVIA",
    "tanque_bajo": "TANQUE!",
    "sin_cultivo": "SIN_CULTIVO",
}


def listar_puertos() -> None:
    puertos = list(serial.tools.list_ports.comports())
    if not puertos:
        print("No hay puertos COM disponibles.")
        print("Si estas usando Proteus, asegurate de tener un COMPIM configurado")
        print("y un par de puertos virtuales creados con VSPD o com0com.")
        return
    print(f"Puertos COM detectados ({len(puertos)}):")
    for p in puertos:
        print(f"  {p.device:8s}  {p.description}")


def payload_desde_linea(linea: str, device_id: str) -> dict | None:
    """Convierte la linea JSON del Arduino en el payload esperado por /ingest."""
    linea = linea.strip()
    if not linea or linea.startswith("#") or linea.startswith("="):
        return None
    try:
        raw = json.loads(linea)
    except json.JSONDecodeError:
        # Mostrar las lineas informativas del Arduino (como "Firmware Inicializado")
        if linea:
            print(f"  [Arduino] {linea}")
        return None

    # Mapeo tolerante: el Arduino puede usar nombres cortos.
    # Usamos _primero() en vez de "a or b" para no perder valores 0
    #   (ej. suelo=0% es una lectura valida, no un dato ausente).
    def _primero(*claves):
        for k in claves:
            if k in raw and raw[k] is not None:
                return raw[k]
        return None

    return {
        "device_id": device_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "temperatura_c": _primero("temp", "temperatura_c"),
        "humedad_rel": _primero("hr", "humedad_rel"),
        "presion_hpa": _primero("presion", "presion_hpa"),
        "humedad_suelo_pct": _primero("suelo", "humedad_suelo_pct"),
        "nivel_tanque_pct": _primero("tanque", "nivel_tanque_pct"),
        "llovio": bool(_primero("lluvia", "llovio")),
        "luz_lux": _primero("lux", "luz_lux"),
        # Telemetría de laboratorio: permite desarrollar el panel altoandino
        # antes de disponer del ESP32 y su sistema solar reales.
        "bateria_pct": _primero("bateria", "bateria_pct") or 100,
        "senal_dbm": _primero("senal", "senal_dbm"),
        "firmware_version": "proteus-uno-1.0",
        "modo_conexion": "serial",
        "modo_operacion": "recomendacion",
        "lecturas_pendientes": 0,
        "simulado": True,
    }


def resolver_device(client, backend: str, device: str) -> str | None:
    """Evita el error 404 por device_id no coincidente.

    Consulta las parcelas registradas. Si el device configurado existe, lo usa.
    Si no, usa el device_id de la primera parcela (y avisa). Asi el puente
    siempre apunta a una parcela real, sin importar como la hayas nombrado.
    """
    if client is None:
        return None
    try:
        r = client.get(f"{backend}/parcelas", timeout=5.0)
        r.raise_for_status()
        parcelas = r.json()
    except Exception:
        return None
    ids = [p.get("device_id") for p in parcelas]
    if device in ids:
        return device
    if parcelas:
        nuevo = parcelas[0]["device_id"]
        print(
            f"[AVISO] El device '{device}' no esta registrado. "
            f"Usando '{nuevo}' (parcela '{parcelas[0].get('nombre')}').",
            flush=True,
        )
        return nuevo
    print(
        f"[AVISO] No hay parcelas registradas todavia. "
        f"Crea una en el frontend (device_id sugerido: '{device}').",
        flush=True,
    )
    return None


def enviar(client, backend: str, api_key: str, payload: dict) -> dict | None:
    """Envia el payload al backend. Retorna None si falla."""
    if client is None:
        return None
    try:
        r = client.post(
            f"{backend}/ingest",
            headers={"X-API-Key": api_key, "Content-Type": "application/json"},
            json=payload,
            timeout=10.0,
        )
        if r.status_code == 404:
            try:
                detalle = r.json().get("detail", "Recurso no encontrado")
            except Exception:
                detalle = "Recurso no encontrado"
            return {"_error": detalle, "_status": 404}
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return {"_error": str(e)}


def formato_orden(respuesta: dict) -> str:
    """Formato que el Arduino puede parsear."""
    accion = respuesta.get("accion", "esperar").upper()
    minutos = int(round(respuesta.get("minutos_riego", 0)))
    return f"ACCION:{accion}:{minutos}\n"


def imprimir_lectura(marca: str, payload: dict, respuesta: dict | None) -> None:
    """Imprime la lectura recibida del Arduino de forma legible."""
    temp = payload.get("temperatura_c", "?")
    hr = payload.get("humedad_rel", "?")
    suelo = payload.get("humedad_suelo_pct", "?")
    tanque = payload.get("nivel_tanque_pct", "?")
    lluvia = "SI" if payload.get("llovio") else "NO"

    linea = (
        f"[{marca}]  "
        f"Temp={temp}C  |  "
        f"Humedad={hr}%  |  "
        f"Suelo={suelo}%  |  "
        f"Tanque={tanque}%  |  "
        f"Lluvia={lluvia}"
    )

    if respuesta is None:
        linea += "  ->  (backend no disponible)"
    elif "_error" in respuesta:
        linea += f"  ->  AVISO: {respuesta['_error'][:160]}"
    else:
        accion = respuesta.get("accion", "?")
        icono = ICONO.get(accion, accion)
        razon = respuesta.get("razon", "")[:60]
        linea += f"  ->  [{icono}] {razon}"

    print(linea, flush=True)


def loop(args: argparse.Namespace) -> None:
    print("=" * 90)
    print("  SIRA - Bridge Serial (Proteus/Arduino -> Backend)")
    print(f"  Puerto: {args.port}  |  Baudios: {args.baud}  |  Device: {args.device}")
    print(f"  Backend: {args.backend}")
    print("=" * 90)
    print()

    # Abrir puerto serial
    try:
        ser = serial.Serial(args.port, args.baud, timeout=2.0)
    except serial.SerialException as e:
        print(f"[ERROR] No se pudo abrir {args.port}: {e}")
        print("Usa --list para ver los puertos disponibles.")
        print("Asegurate de que Proteus este corriendo con el COMPIM en COM1.")
        sys.exit(2)

    print(f"[OK] Puerto {args.port} abierto correctamente.")
    print("[INFO] Esperando datos del Arduino...\n")

    # Delay para que Arduino termine su reset
    time.sleep(2)
    ser.reset_input_buffer()

    # Cliente HTTP (puede ser None si httpx no esta instalado)
    client = httpx.Client() if httpx else None
    lecturas_recibidas = 0

    # La base de datos de una instalacion nueva no trae parcelas privadas.
    # Conservamos el ID solicitado y volvemos a consultar hasta que el usuario
    # cree una parcela desde el frontend; no es necesario reiniciar el bridge.
    device_solicitado = args.device
    device_registrado = resolver_device(client, args.backend, device_solicitado)

    try:
        while True:
            try:
                raw = ser.readline()
                if not raw:
                    continue

                try:
                    linea = raw.decode("utf-8", errors="replace")
                except Exception:
                    print(f"  [warn] no se pudo decodificar: {raw!r}")
                    continue

                if device_registrado is None:
                    device_registrado = resolver_device(
                        client, args.backend, device_solicitado
                    )

                payload = payload_desde_linea(
                    linea, device_registrado or device_solicitado
                )
                if payload is None:
                    continue

                lecturas_recibidas += 1
                marca = datetime.now().strftime("%H:%M:%S")

                # Intentar enviar al backend
                if device_registrado is None:
                    respuesta = {
                        "_error": (
                            "Lectura no guardada: crea una parcela con Device ID "
                            f"'{device_solicitado}' en http://localhost:3000"
                        )
                    }
                else:
                    respuesta = enviar(client, args.backend, args.api_key, payload)
                    # Si la parcela fue eliminada mientras el bridge funcionaba,
                    # volver a la espera y detectar automaticamente otra parcela.
                    if respuesta and respuesta.get("_status") == 404:
                        device_registrado = None

                # Siempre imprimir la lectura recibida
                imprimir_lectura(marca, payload, respuesta)

                # Si hay respuesta valida del backend, enviar orden al Arduino
                if respuesta and "_error" not in respuesta:
                    orden = formato_orden(respuesta)
                    ser.write(orden.encode("utf-8"))

            except serial.SerialException as e:
                print(f"\n[ERROR] Se perdio la conexion serial: {e}")
                print("Verifica que Proteus siga corriendo.")
                break

    except KeyboardInterrupt:
        print(f"\n[SIRA bridge] Interrumpido. Se recibieron {lecturas_recibidas} lecturas.")
    finally:
        ser.close()
        if client:
            client.close()
        print("[OK] Puerto serial cerrado.")


def main() -> None:
    p = argparse.ArgumentParser(description="Bridge Serial->HTTP para SIRA")
    p.add_argument("--port", help="Puerto COM del Arduino (ej. COM3)")
    p.add_argument("--baud", type=int, default=9600, help="Velocidad serial (9600)")
    p.add_argument("--device", default="ESP32-001", help="device_id de la parcela registrada")
    p.add_argument("--backend", default="http://127.0.0.1:8000", help="URL del backend")
    p.add_argument("--api-key", default="cambia-este-token-largo-y-secreto")
    p.add_argument("--list", action="store_true", help="Lista los puertos COM y sale")
    args = p.parse_args()

    if args.list:
        listar_puertos()
        return

    if not args.port:
        print("[ERROR] Falta --port. Usa --list para ver los puertos disponibles.")
        sys.exit(1)

    try:
        loop(args)
    except KeyboardInterrupt:
        print("\n[SIRA bridge] Interrumpido por el usuario.")


if __name__ == "__main__":
    main()
