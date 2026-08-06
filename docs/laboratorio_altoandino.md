# Laboratorio altoandino sin sensores físicos

Esta etapa permite desarrollar y probar la plataforma antes de adquirir un ESP32. Proteus representa el nodo de campo y `serial_bridge.py` adapta sus lecturas al contrato futuro del dispositivo.

## Qué se simula

- conexión serial del nodo;
- firmware identificado como `proteus-uno-1.0`;
- modo de operación `recomendacion`;
- batería de laboratorio al 100 %;
- ausencia de lecturas pendientes;
- condición explícita `simulado=true`.

Las mediciones de temperatura, humedad, suelo, tanque y lluvia continúan procediendo del circuito de Proteus. La plataforma nunca presenta la telemetría simulada como si fuera una instalación física.

## Ejecución

1. Crear una parcela y usar el mismo `device_id` en el bridge.
2. Iniciar SIRA.
3. Ejecutar la simulación en Proteus.
4. Abrir el detalle de la parcela.
5. Revisar el panel **Nodo de campo altoandino**.

El panel muestra conexión, altitud, batería, medio de comunicación, modo de operación, cola pendiente y alertas.

## Alertas disponibles

| Código | Condición actual |
|---|---|
| `sin_conexion` | más de 5 minutos sin telemetría |
| `bateria_baja` | batería menor de 25 % |
| `riesgo_helada` | lectura ambiental igual o menor de 3 °C |
| `tanque_bajo` | nivel menor de 15 % |
| `sin_telemetria` | parcela que todavía no reportó estado de nodo |

El umbral de 3 °C es únicamente una alerta preventiva de laboratorio. En campo debe reemplazarse por umbrales según cultivo, variedad y etapa fenológica.

## API preparada

- `POST /ingest` acepta telemetría opcional junto con los sensores.
- `POST /devices/{device_id}/heartbeat` permite reportar estado sin crear una lectura agronómica.
- `GET /parcelas/{id}/resumen` incluye `dispositivo` y `contexto_altoandino`.

## Transición futura al ESP32

Cuando exista hardware, el ESP32 enviará los mismos campos con `simulado=false`. Se conservarán el backend y el frontend; solamente se sustituirá el bridge de Proteus por firmware Wi-Fi, LoRa o 4G.

