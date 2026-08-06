from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from app.models.cultivo import EtapaFenologica
from app.models.riego import EstadoRiego


# ---------- Cultivos ----------

class KcEtapaOut(BaseModel):
    etapa: EtapaFenologica
    orden: int
    duracion_dias: int
    kc: float

    model_config = {"from_attributes": True}


class CultivoOut(BaseModel):
    id: int
    nombre_comun: str
    nombre_cientifico: Optional[str] = None
    familia: Optional[str] = None
    profundidad_raiz_m: float
    agotamiento_permisible: float
    kc_etapas: List[KcEtapaOut] = []

    model_config = {"from_attributes": True}


# ---------- Parcelas ----------

class ParcelaCreate(BaseModel):
    nombre: str
    device_id: str = Field(
        ...,
        min_length=6,
        max_length=64,
        pattern=r"^[A-Z0-9][A-Z0-9-]*$",
        description="Identificador único del nodo, independiente del fabricante del controlador.",
    )
    latitud: float = Field(..., ge=-90, le=90)
    longitud: float = Field(..., ge=-180, le=180)
    altitud_m: float = 0.0
    area_m2: float = 0.0
    caudal_emisor_l_h: float = 4.0
    n_emisores: int = 0
    cultivo_id: Optional[int] = None
    fecha_siembra: Optional[date] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "nombre": "Papa - Chacra Norte",
                "device_id": "SIRA-7K3M-Q9TX-4NWP-H2DR-8FCV",
                "latitud": -15.6059,
                "longitud": -71.4549,
                "altitud_m": 4449,
                "area_m2": 100,
                "caudal_emisor_l_h": 4,
                "n_emisores": 50,
                "cultivo_id": 1,
                "fecha_siembra": "2026-05-26",
            }
        }
    }


class DeviceIdentifierOut(BaseModel):
    device_id: str


class ParcelaOut(ParcelaCreate):
    id: int
    creado: datetime

    model_config = {"from_attributes": True}


# ---------- Ingest ----------

class IngestPayload(BaseModel):
    """Payload que envía el ESP32."""
    device_id: str
    timestamp: Optional[datetime] = None
    temperatura_c: Optional[float] = None
    humedad_rel: Optional[float] = Field(None, ge=0, le=100)
    presion_hpa: Optional[float] = None
    humedad_suelo_pct: Optional[float] = Field(None, ge=0, le=100)
    nivel_tanque_pct: Optional[float] = Field(None, ge=0, le=100)
    llovio: Optional[bool] = None
    luz_lux: Optional[float] = None
    bateria_pct: Optional[float] = Field(None, ge=0, le=100)
    senal_dbm: Optional[float] = Field(None, ge=-150, le=0)
    firmware_version: Optional[str] = Field(None, max_length=32)
    modo_conexion: str = Field("serial", max_length=20)
    modo_operacion: str = Field("recomendacion", max_length=20)
    lecturas_pendientes: int = Field(0, ge=0)
    simulado: bool = True

    model_config = {
        "json_schema_extra": {
            "example": {
                "device_id": "ESP32-001",
                "temperatura_c": 22.5,
                "humedad_rel": 65,
                "humedad_suelo_pct": 40,
                "nivel_tanque_pct": 70,
                "llovio": False,
                "luz_lux": 30000,
            }
        }
    }


class IngestResponse(BaseModel):
    ok: bool
    lectura_id: int
    accion: str  # "regar", "esperar", "cancelar_por_lluvia"
    minutos_riego: float = 0.0
    razon: str


# ---------- Riego ----------

class EventoRiegoOut(BaseModel):
    id: int
    parcela_id: int
    inicio: datetime
    fin: Optional[datetime]
    estado: EstadoRiego
    minutos_planificados: float
    minutos_ejecutados: float
    eto_mm: Optional[float]
    kc: Optional[float]
    etc_mm: Optional[float]
    lamina_mm: Optional[float]
    razon: Optional[str]

    model_config = {"from_attributes": True}


# ---------- Centro de operaciones ----------

class OperationalReadingOut(BaseModel):
    id: int
    timestamp: datetime
    temperatura_c: Optional[float] = None
    humedad_rel: Optional[float] = None
    presion_hpa: Optional[float] = None
    humedad_suelo_pct: Optional[float] = None
    nivel_tanque_pct: Optional[float] = None
    llovio: Optional[bool] = None
    luz_lux: Optional[float] = None

    model_config = {"from_attributes": True}


class OperationalDeviceOut(BaseModel):
    ultima_conexion: datetime
    segundos_sin_conexion: int
    firmware_version: Optional[str] = None
    modo_conexion: str
    modo_operacion: str
    bateria_pct: Optional[float] = None
    senal_dbm: Optional[float] = None
    lecturas_pendientes: int
    simulado: bool


class OperationalAlertOut(BaseModel):
    id: str
    parcela_id: int
    parcela_nombre: str
    codigo: str
    nivel: Literal["critical", "warning", "info"]
    titulo: str
    detalle: str


class OperationalParcelOut(BaseModel):
    parcela: ParcelaOut
    cultivo_nombre: Optional[str] = None
    ultima_lectura: Optional[OperationalReadingOut] = None
    ultimo_riego: Optional[EventoRiegoOut] = None
    dispositivo: Optional[OperationalDeviceOut] = None
    salud: Literal["healthy", "warning", "critical", "unknown"]
    alertas: list[OperationalAlertOut]


class OperationalMetricsOut(BaseModel):
    parcelas_total: int
    area_total_m2: float
    nodos_online: int
    nodos_offline: int
    parcelas_riego_necesario: int
    alertas_activas: int
    alertas_criticas: int
    humedad_media_pct: Optional[float] = None
    agua_ejecutada_l: float


class OperationalTrendPointOut(BaseModel):
    fecha: date
    eventos: int
    minutos_planificados: float
    minutos_ejecutados: float
    volumen_planificado_l: float
    volumen_ejecutado_l: float


class OperationsOverviewOut(BaseModel):
    generated_at: datetime
    status: Literal["operational", "attention", "critical"]
    metrics: OperationalMetricsOut
    parcelas: list[OperationalParcelOut]
    alertas: list[OperationalAlertOut]
    tendencia: list[OperationalTrendPointOut]
