# Simulador ESP32 para SIRA

Emula al firmware del ESP32 mientras no tienes el hardware físico.
Genera lecturas realistas de temperatura, humedad, suelo y tanque, y las envía
al backend por `POST /ingest` cada N segundos.

## Uso

```bash
# 1. Asegúrate de que el backend esté corriendo (docker + uvicorn)

# 2. Crea una parcela primero (una vez):
curl -X POST http://127.0.0.1:8000/parcelas \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Papa Demo",
    "device_id": "ESP32-DEMO-001",
    "latitud": -12.05,
    "longitud": -77.04,
    "altitud_m": 154,
    "area_m2": 100,
    "caudal_emisor_l_h": 4,
    "n_emisores": 50,
    "cultivo_id": 1,
    "fecha_siembra": "2026-05-25"
  }'

# 3. Corre el simulador:
python simulator.py --device ESP32-DEMO-001 --interval 5
```

## Modos de simulación

```bash
# Riego normal (agua baja lentamente en suelo, sube tras riego)
python simulator.py

# Simular sequía (suelo se seca rápido)
python simulator.py --escenario sequia

# Simular lluvia (activa sensor de lluvia)
python simulator.py --escenario lluvia

# Simular tanque vacío
python simulator.py --escenario tanque_vacio
```
