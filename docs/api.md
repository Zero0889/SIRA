# Guía de la API de SIRA

## Para qué sirve

Una API es un contrato para que programas distintos intercambien datos. En SIRA une tres actores: el nodo de campo —ESP32, STM32 u otro controlador— envía sensores, el dashboard consulta resultados y el backend centraliza la lógica agronómica. La interfaz interactiva está en `http://localhost:8000/docs` cuando el backend está encendido.

## Rutas principales

| Método y ruta | Finalidad | Autenticación |
|---|---|---|
| `GET /health` | Comprueba que el backend responde | No |
| `GET /cultivos` | Lista cultivos y Kc por etapa | No |
| `GET /parcelas` | Lista parcelas | No |
| `POST /parcelas` | Registra una parcela | No |
| `POST /parcelas/device-identifiers/generate` | Genera un identificador de nodo disponible | No |
| `GET /parcelas/{id}/resumen` | Devuelve estado y cálculo resumido | No |
| `GET /weather/forecast` | Pronóstico por coordenadas | No |
| `GET /weather/eto` | ETo calculada para lugar y fecha | No |
| `POST /ingest` | Recibe una lectura y decide el riego | `X-API-Key` |
| `GET /notifications/status` | Estado seguro de la integración SMS | No |
| `GET /notifications/history` | Últimos intentos de envío con números ocultos | No |
| `POST /notifications/test` | Envía un SMS de prueba | `X-API-Key` |

La ausencia de autenticación en las rutas administrativas es aceptable solo para demostración local. Antes de exponer el sistema a Internet se debe agregar autenticación, limitar CORS y usar HTTPS.

## Ejemplo de lectura de un ESP32 o STM32

```http
POST /ingest HTTP/1.1
Host: localhost:8000
Content-Type: application/json
X-API-Key: la-clave-definida-en-env

{
  "device_id": "SIRA-7K3M-Q9TX-4NWP-H2DR-8FCV",
  "temperatura_c": 22.5,
  "humedad_rel": 65,
  "humedad_suelo_pct": 40,
  "nivel_tanque_pct": 70,
  "llovio": false,
  "luz_lux": 30000
}
```

Respuesta típica:

```json
{
  "ok": true,
  "lectura_id": 42,
  "accion": "regar",
  "minutos_riego": 18.5,
  "razon": "Etapa media, Kc=1.15 ..."
}
```

## Seguridad

`INGEST_API_KEY` es un secreto compartido entre backend y dispositivo. También protege la prueba de SMS. No debe quedar publicado en el repositorio ni enviarse como parámetro de URL. `SMSGATE_USERNAME` y `SMSGATE_PASSWORD` solo deben existir en `.env` y nunca en el frontend. Para producción también se recomienda rotación de claves por dispositivo, límites de frecuencia, autenticación de usuarios y registro de intentos fallidos.

## Compatibilidad de controladores y MQTT

SIRA no depende de instrucciones exclusivas del ESP32. Un STM32 puede integrarse si dispone de conectividad —por ejemplo Ethernet, Wi-Fi o un módem celular— y de una pila TCP/IP capaz de realizar la solicitud HTTP con JSON. El firmware debe conservar el `device_id` generado por SIRA y enviar la cabecera `X-API-Key`.

La versión actual recibe telemetría mediante HTTP. MQTT todavía no está habilitado en el backend; cuando se añada un broker, el `device_id` podrá utilizarse en un tópico como `sira/nodos/{device_id}/telemetria` sin cambiar la identidad de la parcela.
