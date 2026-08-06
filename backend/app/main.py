from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import Base, engine
from app.routers import auth, control, cultivos, devices, ingest, lecturas, notifications, operations, parcelas, weather
from app import models  # noqa: F401 - registra todos los modelos en Base.metadata
from app.services.bootstrap import ensure_bootstrap_user

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.validate_runtime()
    # Crear tablas automáticamente (SQLite no necesita Alembic para dev)
    if settings.app_env == "development":
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    await ensure_bootstrap_user()
    yield


DESCRIPCION = """
**SIRA — Sistema Inteligente de Riego Agrícola.** API del modelo agronómico FAO-56 (Kc + ETo).

### Cómo usar esta página
1. Abre un endpoint, pulsa **Try it out**, completa los campos (ya vienen con ejemplos) y pulsa **Execute**.
2. Verás la respuesta real del servidor abajo, en *Response body*.

### Grupos de endpoints
- **cultivos** — catálogo de cultivos con sus coeficientes Kc por etapa.
- **parcelas** — crear/consultar parcelas y ver su resumen, lecturas y riegos.
- **weather** — clima y evapotranspiración (ETo) para cualquier coordenada.
- **ingest** — recibe las lecturas del sensor/ESP32 y decide el riego.
- **notifications** — estado, historial y prueba segura de alertas SMS.

### Nota sobre `POST /ingest`
Requiere la cabecera **`X-API-Key`**. Si la dejas vacía obtendrás un error 422 (es normal, es la
seguridad). El valor está en el archivo `.env` como `INGEST_API_KEY`.
"""

app = FastAPI(
    title="SIRA API",
    description=DESCRIPCION,
    version="1.0.0",
    lifespan=lifespan,
    contact={"name": "Proyecto SIRA — FIEE UNMSM"},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok", "env": settings.app_env}


app.include_router(cultivos.router)
app.include_router(auth.router)
app.include_router(parcelas.router)
app.include_router(control.router)
app.include_router(lecturas.router)
app.include_router(weather.router)
app.include_router(ingest.router)
app.include_router(devices.router)
app.include_router(notifications.router)
app.include_router(operations.router)
