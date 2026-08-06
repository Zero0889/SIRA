# Arquitectura y flujo de SIRA

## Vista general

```text
Nodo ESP32 / STM32 / simulador ── POST /ingest ──> FastAPI ──> SQLite
                                         │
Dashboard Next.js <──── API REST ────────┤
                                         ├── Open-Meteo: actual y pronóstico
                                         ├── NASA POWER: histórico
                                         └── SENAMHI WIS2: contraste regional
```

## Responsabilidades

- **Nodo de campo:** puede usar ESP32, STM32 u otro controlador capaz de enviar JSON por HTTP. Mide el entorno y transmite datos, pero no contiene la lógica agronómica principal.
- **Backend:** valida la clave, guarda lecturas, calcula Kc/ETo/ETc, aplica reglas y registra riegos planificados.
- **Base de datos:** conserva cultivos, etapas, parcelas, lecturas y eventos.
- **Frontend:** presenta la información y permite administrar parcelas.
- **Proveedores meteorológicos:** entregan las variables necesarias para el cálculo y el pronóstico.

## Flujo de una lectura

1. SIRA genera al registrar la parcela un `device_id` neutral, único y fácil de copiar.
2. El mismo valor se coloca como constante en el firmware del ESP32, STM32 u otro nodo.
3. `POST /ingest` identifica la parcela mediante ese `device_id`.
4. La lectura se almacena.
5. Se cancela anticipadamente si el tanque está bajo, el suelo supera el umbral o el sensor reporta lluvia.
6. Se obtiene el Kc correspondiente a los días transcurridos desde la siembra.
7. Se consulta el clima y se calcula ETo diaria.
8. Se calcula `ETc = Kc × ETo` y se descuenta la precipitación.
9. La lámina se convierte a minutos mediante área y caudal total.
10. La API responde con acción, minutos y razón; si corresponde, registra un evento planificado.

El `device_id` identifica el nodo, pero no es una contraseña. La autenticación actual sigue usando `X-API-Key`. MQTT puede incorporarse después como transporte alternativo conservando exactamente el mismo identificador y contrato de datos.

## Límites del prototipo

- La humedad de suelo utiliza un umbral global de 60 %, no un balance de agua por textura y profundidad efectiva.
- El tiempo de riego no incorpora todavía una eficiencia de aplicación menor que 100 %.
- Un evento queda como `PLANIFICADO`; falta cerrar el lazo con confirmación física de bomba y caudal.
- La caída de un proveedor meteorológico hace que el motor espere; falta una caché o estrategia de respaldo completa.
- SENAMHI WIS2 se consulta como contraste, pero actualmente no reemplaza a Open-Meteo porque no aporta todas las variables de radiación y pronóstico requeridas.
