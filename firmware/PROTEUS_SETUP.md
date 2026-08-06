# Cómo conectar tu Arduino en Proteus al backend SIRA

Esta guía asume que ya tienes:
- Proteus 8 (o superior) instalado.
- El backend SIRA corriendo (`docker compose up -d db` + `uvicorn ...`).
- El circuito del proyecto en Proteus con Arduino Uno y sensores (el de tu imagen).

Objetivo: que el Arduino de tu simulación envíe lecturas al backend y reciba
las órdenes de riego, sin necesidad del ESP32 físico todavía.

---

## Paso 1 · Crear un par de puertos COM virtuales en Windows

Un puerto COM virtual conecta dos "puertas" del PC:
- Proteus habla por una (ej. COM4).
- Nuestro `serial_bridge.py` escucha por la otra (ej. COM5).

Descarga e instala **com0com** (gratis, open source):
- <https://sourceforge.net/projects/com0com/> (Windows 10/11).

Después de instalar:
1. Abre "Setup Command Prompt" del com0com (viene en el menú Inicio).
2. Ejecuta:
   ```
   install PortName=COM4 PortName=COM5
   ```
   Esto crea el par COM4 ↔ COM5.
3. Verifica en el Administrador de dispositivos → Puertos (COM y LPT) que
   aparezcan ambos.

> Alternativa comercial: **Virtual Serial Port Driver** (Eltima).
> Alternativa nativa Proteus 8.15+: usar "VIRTUAL SERIAL PORT" directamente sin
> com0com — pero requiere licencia Professional.

---

## Paso 2 · Añadir el COMPIM al circuito de Proteus

1. En Proteus, abre tu diseño.
2. Modo Component (P) → escribe **COMPIM** → Add.
3. Coloca el COMPIM cerca del Arduino.
4. Conexiones:
   - TX del Arduino (pin 1, TXD) → **RXD** del COMPIM.
   - RX del Arduino (pin 0, RXD) → **TXD** del COMPIM.
   - GND del Arduino → GND del COMPIM.

> No conectes VCC del COMPIM — es un componente virtual sin alimentación.

5. Doble clic en el COMPIM para editar sus propiedades:
   - **Physical port**: COM4 (uno del par que creaste con com0com).
   - **Physical baud rate**: 9600.
   - **Physical data bits**: 8.
   - **Physical parity**: NONE.
   - **Virtual baud rate**: 9600 (igual que el sketch Arduino).
   - **Virtual data bits**: 8.
   - **Virtual parity**: NONE.

Aplica y cierra.

---

## Paso 3 · Cargar el sketch en tu Arduino de Proteus

1. Abre `firmware/arduino_sira/arduino_sira.ino` en el Arduino IDE.
2. Instala las librerías necesarias (Library Manager):
   - **DHT sensor library** (Adafruit)
   - **Adafruit Unified Sensor**
3. **Verify/Compile** — no subir, solo compilar. Se genera un archivo .hex en:
   `<carpeta_proyecto>/build/arduino.avr.uno/arduino_sira.ino.hex`
   (o donde el IDE reporte en la consola inferior).
4. En Proteus, doble clic en el Arduino Uno → **Program File** → apuntar al .hex.
5. Aplica.

Ajusta los pines si tu circuito difiere del que asume el sketch:
```
DHT11    -> pin 4
Suelo    -> A0
HC-SR04  -> trig=9, echo=10
Lluvia   -> pin 3
Relé     -> pin 8
```

---

## Paso 4 · Registrar la parcela en el backend

Antes de arrancar el bridge, asegúrate de que la parcela del ESP32 exista:

```bash
curl -X POST http://127.0.0.1:8000/parcelas \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Papa Proteus",
    "device_id": "ARDUINO-PROTEUS-01",
    "latitud": -12.05,
    "longitud": -77.04,
    "altitud_m": 154,
    "area_m2": 100,
    "caudal_emisor_l_h": 4,
    "n_emisores": 50,
    "cultivo_id": 1,
    "fecha_siembra": "2026-05-25"
  }'
```

O créala desde el frontend (`http://localhost:3000` → clic en el mapa).

---

## Paso 5 · Arrancar el bridge

En una terminal (con el venv activo):

```bash
cd C:/Users/zahir/Desktop/Proyectos/PROYECTO/simulator
../backend/.venv/Scripts/pip install pyserial
../backend/.venv/Scripts/python serial_bridge.py --list
```

Confirmarás que aparezcan COM4 y COM5. Luego arranca el bridge escuchando el
OTRO extremo del par (el que NO está usando Proteus):

```bash
../backend/.venv/Scripts/python serial_bridge.py --port COM5 --device ARDUINO-PROTEUS-01
```

---

## Paso 6 · Correr la simulación

1. En Proteus, botón **Play** (Run). El Arduino arranca.
2. Cada 15 segundos verás en la terminal del bridge:
   ```
   19:22:35  suelo=  45%  tanque=  80%  [REGAR]    Etapa media (día 60), Kc=1.15 · ETo=3.40mm...
   ```
3. Simultáneamente en `http://localhost:3000/parcelas/<id>` verás los datos actualizarse.
4. Cuando el backend decide regar, el bridge envía "ACCION:REGAR:45" al COM4 →
   el Arduino recibe → activa el relé (verás el LED / motor del circuito).

---

## Troubleshooting

| Problema | Causa | Solución |
|---|---|---|
| `serial.SerialException: could not open port 'COM5'` | Puerto ocupado o no existe | Cierra otras terminales que lo usen. Revisa com0com. |
| Bridge no recibe nada | Baudrates distintos | Que Arduino, COMPIM y bridge estén en 9600. |
| `linea no JSON` | Arduino imprime texto libre | Revisa que el sketch use `Serial.print(F("{"))` correcto. |
| Proteus se cuelga al abrir COMPIM | Puerto físico en uso por Windows | Usa otro par de com0com. |
| Backend responde 404 | `device_id` no registrado | Crea la parcela con ese `device_id` primero. |
| Backend responde 401 | `X-API-Key` incorrecto | Usa `--api-key` con el valor del `.env`. |

---

## Simular aumento automático de humedad durante el riego

Las flechas del componente visual `SOIL MOISTURE MODULE` son controles manuales de Proteus y el Arduino no puede moverlas. Para que la entrada A0 cambie físicamente con el motor se puede reemplazar la salida AO del módulo por un circuito RC.

### Componentes

- 1 transistor NPN 2N2222;
- 1 resistencia de 1 kΩ;
- 1 resistencia de 47 kΩ;
- 1 resistencia de 100 kΩ;
- 1 capacitor electrolítico de 470 µF;
- 1 voltímetro opcional sobre A0.

### Conexión

```text
5 V --- 100 kΩ ---+--- A0
                  |
                470 µF
                  |
                 GND

A0 --- 47 kΩ --- colector 2N2222
D8 --- 1 kΩ ---- base
GND ------------ emisor
```

El terminal negativo del capacitor va a GND. Al encender la bomba, D8 activa el transistor y el voltaje de A0 disminuye gradualmente, que el firmware interpreta como aumento de humedad. Al apagarla, A0 vuelve a subir lentamente y representa el secado.

La rapidez depende de `R × C`:

- mayor capacitor o resistencia: cambio más lento;
- menor capacitor o resistencia: cambio más rápido.

Para comenzar, usar 470 µF, 47 kΩ y 100 kΩ. Si el circuito cambia demasiado lento para la presentación, reducir el capacitor a 220 µF.

Cuando se utiliza el circuito RC, configurar en `arduino_sira.ino`:

```cpp
#define SIMULAR_HUMEDAD_POR_RIEGO 0
```

Así el efecto proviene del circuito y no se suma a la simulación por software.

---

## Diagrama del flujo completo

```
   [Arduino Uno virtual en Proteus]
              │ Serial 9600
              ▼
   [COMPIM en Proteus]  ── vinculado a  COM4 (com0com)
                                          ⇅  par virtual
                                          COM5 (com0com)
                                          ▲
                                          │
                          [serial_bridge.py]  --port COM5
                                          │
                                          ▼ HTTP POST /ingest
                                    [Backend FastAPI :8000]
                                          │
                                          ▼
                                    [Postgres :5432]
                                          ▲
                                          │ SWR polling cada 5s
                                          │
                          [Next.js frontend :3000] en el navegador
```
