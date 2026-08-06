# Protocolo de control para ESP32 y STM32

Cada nodo guarda dos valores generados desde el detalle de la parcela:

```c
#define SIRA_DEVICE_ID    "SIRA-XXXX-XXXX-XXXX-XXXX-XXXX"
#define SIRA_DEVICE_TOKEN "sira_dev_REEMPLAZAR"
```

El token es secreto. No debe imprimirse en logs de producción ni incluirse en capturas.

## Telemetría

```http
POST /api/ingest
Content-Type: application/json
X-Device-Token: sira_dev_REEMPLAZAR

{"device_id":"SIRA-...","humedad_suelo_pct":38,"nivel_tanque_pct":75,"llovio":false}
```

## Consultar órdenes

El nodo consulta periódicamente, con espera progresiva si no hay conexión:

```http
GET /api/devices/SIRA-.../commands/next
X-Device-Token: sira_dev_REEMPLAZAR
```

Respuesta sin trabajo:

```json
{"command": null, "server_time": "2026-08-06T12:00:00Z"}
```

Respuesta de inicio:

```json
{"command":{"id":17,"action":"iniciar","duration_seconds":600,"expires_at":"..."}}
```

El firmware debe rechazar órdenes expiradas, limitar `duration_seconds` localmente y arrancar un watchdog antes de activar la salida.

## Confirmación

```http
POST /api/devices/SIRA-.../commands/17/ack
Content-Type: application/json
X-Device-Token: sira_dev_REEMPLAZAR

{"estado":"ejecutando"}
```

Al finalizar:

```json
{"estado":"completada","minutos_ejecutados":9.8,"detalle":"Caudal estable"}
```

También se aceptan `fallida`, `rechazada` y `cancelada`. Una orden `detener` debe tener prioridad sobre cualquier inicio pendiente.

En STM32 puede implementarse con STM32Cube HAL + LwIP y un cliente HTTP/TLS. En ESP32 puede utilizarse `WiFiClientSecure` y un cliente HTTP. La lógica de estados es idéntica para ambos.
