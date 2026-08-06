# SIRA — Sistema Inteligente de Riego Agrícola

SIRA es un prototipo de riego automatizado que combina sensores, datos meteorológicos y el método FAO-56 para estimar la demanda de agua de un cultivo y convertirla en tiempo de riego.

## Qué hace

1. El nodo de campo —ESP32, STM32 u otro controlador compatible— o el simulador envía humedad del suelo, nivel del tanque y otras mediciones.
2. El backend determina la etapa fenológica y su coeficiente de cultivo (Kc).
3. Calcula la evapotranspiración de referencia (ETo) con Penman-Monteith FAO-56.
4. Obtiene `ETc = Kc × ETo`, descuenta la lluvia y aplica reglas de seguridad.
5. Devuelve la decisión y los minutos de riego; el dashboard muestra el resultado y su justificación.
6. Opcionalmente, envía alertas SMS de riego, helada o tanque bajo mediante un Android con SMS Gateway for Android.

## Componentes

| Carpeta | Función | Tecnología |
|---|---|---|
| `backend/` | API, base de datos y motor agronómico | FastAPI, SQLAlchemy, SQLite |
| `frontend/` | Dashboard y documentación web | Next.js, TypeScript, Tailwind |
| `firmware/` | Lectura de sensores y comunicación | ESP32, STM32, Arduino |
| `simulator/` | Pruebas sin hardware físico | Python |
| `docs/` | Documentación técnica y fuentes | Markdown |

## Inicio rápido en Windows

La opción normal es ejecutar `iniciar_sira.bat`. Para levantar cada componente manualmente:

```powershell
# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m app.scripts.seed_cultivos
uvicorn app.main:app --reload
```

```powershell
# Frontend, en otra terminal
cd frontend
npm install
npm run dev
```

Abre el dashboard en <http://localhost:3000>, la documentación interactiva de la API en <http://localhost:8000/docs> y el control de salud en <http://localhost:8000/health>.

## Configuración

1. Copia `.env.example` como `.env`.
2. Cambia `INGEST_API_KEY`; debe coincidir con la clave enviada por el nodo o simulador.
3. Mantén `CORS_ORIGINS=http://localhost:3000` durante desarrollo local.

El tema claro/oscuro y el idioma se cambian desde el botón de preferencias del encabezado. La opción de quechua sureño está marcada como beta: la navegación esencial está traducida, mientras que la documentación agronómica permanece en español hasta contar con revisión lingüística especializada.

Las alertas SMS están desactivadas por defecto. Consulta [la guía de notificaciones SMS](docs/notificaciones_sms.md) antes de activarlas; nunca pongas las credenciales de SMSGate en el frontend.

Open-Meteo, NASA POWER y el servicio WIS2 de SENAMHI no requieren una clave en la configuración actual.

## Documentación

- [Arquitectura y flujo](docs/arquitectura.md)
- [Guía de la API](docs/api.md)
- [Alertas SMS con SMS Gateway for Android](docs/notificaciones_sms.md)
- [Kc, ETo y metodología para incorporar cultivos](docs/agronomia.md)
- [Fuentes bibliográficas de Kc](docs/kc_fuentes.md)
- [Referencias oficiales adjuntas: SENAMHI, ANA y FAO](docs/referencias_oficiales.md)
- [Laboratorio altoandino con Proteus](docs/laboratorio_altoandino.md)
- [Simulador](simulator/README.md)
- [Montaje en Proteus](firmware/PROTEUS_SETUP.md)
- [Publicación web con PostgreSQL y HTTPS](docs/DESPLIEGUE_WEB.md)
- [Despliegue gratuito con Vercel, Render y Supabase](docs/VERCEL_RENDER_SUPABASE.md)
- [Protocolo de control para ESP32 y STM32](firmware/PROTOCOLO_CONTROL_SIRA.md)

## Estado y límites actuales

Es un prototipo en desarrollo. El cálculo ETo tiene pruebas contra ejemplos de FAO-56, pero una instalación real aún requiere calibrar sensores, caudales, eficiencia de aplicación y Kc bajo las condiciones locales. Los Kc de cañihua y kiwicha están marcados como provisionales y no deben presentarse como valores peruanos validados.
