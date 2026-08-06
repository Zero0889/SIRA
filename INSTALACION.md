# Instalación de SIRA en Windows

## Antes de comenzar

Instala **Python 3.11 o superior** desde <https://www.python.org/downloads/> (activa `Add Python to PATH`) y **Node.js 20 LTS o superior** desde <https://nodejs.org/>. Proteus 8 y com0com solo son necesarios para simular el circuito y el puerto serial.

## Instalación automática

1. Extrae completamente `SIRA_para_compartir.zip`.
2. Abre la carpeta extraída y haz doble clic en `INSTALAR_SIRA.bat`.
3. Espera mientras se descargan los paquetes, se crea la base de datos y se compila la web. La primera instalación necesita Internet.
4. Al finalizar, abre **Iniciar SIRA** desde el escritorio.

## Primer inicio obligatorio

La copia compartible comienza sin parcelas ni coordenadas privadas. Entra a <http://localhost:3000>, crea una parcela y usa `ESP32-001` como **Device ID**. El puente serial la detectará automáticamente y empezará a guardar las lecturas sin reiniciarse.

El instalador puede ejecutarse otra vez sin eliminar la configuración ni la base de datos de esa computadora.

## Uso

- `iniciar_sira.bat`: inicia backend, web y puente serial. Permite elegir el puerto COM; Enter usa COM2.
- `detener_sira.bat`: detiene los servicios.
- Dashboard: <http://localhost:3000>
- API: <http://localhost:8000/docs>
- Configuración de apariencia, idioma y SMS: <http://localhost:3000/configuracion>

## Alertas SMS opcionales

SIRA no envía SMS tras la instalación. Para activarlos necesitas un Android con SIM, la aplicación SMS Gateway for Android y completar las variables `SMS_*` y `SMSGATE_*` de `.env`. Sigue la guía `docs/notificaciones_sms.md`, reinicia SIRA y envía primero un mensaje de prueba desde la API.

## Privacidad

Esta copia compartible no contiene el `.env`, la base de datos, parcelas, coordenadas ni lecturas del autor. Cada usuario genera sus propios archivos locales. Nunca compartas `.env` si luego agregas tokens, credenciales de SMSGate u otros secretos.

## Problemas frecuentes

- Si no reconoce Python o Node después de instalarlos, reinicia Windows o vuelve a abrir la carpeta.
- Si no aparece el COM, comprueba com0com y que Proteus esté ejecutándose.
- Si los puertos 3000 u 8000 están ocupados, ejecuta `detener_sira.bat` y vuelve a intentar.
- Si falla una descarga, revisa Internet y ejecuta otra vez el instalador.
