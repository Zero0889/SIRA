export type EtapaFenologica = "inicial" | "desarrollo" | "media" | "final";

export interface AuthUser {
  id: number;
  email: string;
  nombre: string;
}

export type IrrigationMode = "apagado" | "manual" | "automatico";
export type IrrigationCommandStatus = "pendiente" | "entregada" | "ejecutando" | "completada" | "cancelada" | "rechazada" | "fallida" | "expirada";

export interface IrrigationCommand {
  id: number;
  origen: "manual" | "automatico";
  accion: "iniciar" | "detener";
  estado: IrrigationCommandStatus;
  duracion_min: number;
  razon: string;
  creado: string;
  expira: string;
  entregado: string | null;
  actualizado: string | null;
  completado: string | null;
  detalle_dispositivo: string | null;
}

export interface IrrigationControl {
  modo: IrrigationMode;
  duracion_maxima_min: number;
  humedad_bloqueo_pct: number;
  tanque_minimo_pct: number;
  credencial_configurada: boolean;
  ordenes: IrrigationCommand[];
}

export interface DeviceProvisioning {
  device_id: string;
  device_token: string;
  warning: string;
}

export interface KcEtapa {
  etapa: EtapaFenologica;
  orden: number;
  duracion_dias: number;
  kc: number;
}

export interface Cultivo {
  id: number;
  nombre_comun: string;
  nombre_cientifico: string | null;
  familia: string | null;
  profundidad_raiz_m: number;
  agotamiento_permisible: number;
  kc_etapas: KcEtapa[];
}

export interface Parcela {
  id: number;
  nombre: string;
  device_id: string;
  latitud: number;
  longitud: number;
  altitud_m: number;
  area_m2: number;
  caudal_emisor_l_h: number;
  n_emisores: number;
  cultivo_id: number | null;
  fecha_siembra: string | null;
  creado: string;
}

export interface Lectura {
  id: number;
  timestamp: string;
  temperatura_c: number | null;
  humedad_rel: number | null;
  presion_hpa: number | null;
  humedad_suelo_pct: number | null;
  nivel_tanque_pct: number | null;
  llovio: boolean | null;
  luz_lux: number | null;
}

export interface EventoRiego {
  id: number;
  inicio: string;
  fin: string | null;
  estado: string;
  minutos_planificados: number;
  minutos_ejecutados: number;
  eto_mm: number | null;
  kc: number | null;
  etc_mm: number | null;
  lamina_mm: number | null;
  razon: string | null;
}

export interface ResumenParcela {
  parcela: { id: number; nombre: string; device_id: string; latitud: number; longitud: number };
  ultima_lectura: Lectura | null;
  ultimo_riego: EventoRiego | null;
  dispositivo: {
    ultima_conexion: string;
    segundos_sin_conexion: number;
    firmware_version: string | null;
    modo_conexion: string;
    modo_operacion: string;
    bateria_pct: number | null;
    senal_dbm: number | null;
    lecturas_pendientes: number;
    simulado: boolean;
  } | null;
  contexto_altoandino: {
    activo: boolean;
    altitud_m: number;
    alertas: Array<{ nivel: "aviso" | "alerta"; codigo: string; mensaje: string }>;
  };
}

export interface ForecastDay {
  fecha: string;
  t_max_c: number;
  t_min_c: number;
  precipitacion_mm: number;
  prob_precipitacion_pct: number | null;
  eto_mm: number | null;
}

export interface NotificationStatus {
  provider: string;
  mode: "local" | "cloud" | "private" | "invalid";
  state: "disabled" | "incomplete" | "ready";
  configured: boolean;
  recipient: string;
  sender: string;
  cooldown_minutes: number;
  triggers: { irrigation: boolean; frost: boolean; tank_low: boolean };
}

export interface NotificationHistoryItem {
  id: number;
  event: string;
  provider: string;
  recipient: string;
  message: string;
  status: "sent" | "failed";
  created_at: string;
}

export type OperationalHealth = "healthy" | "warning" | "critical" | "unknown";
export type OperationalAlertLevel = "critical" | "warning" | "info";

export interface OperationalAlert {
  id: string;
  parcela_id: number;
  parcela_nombre: string;
  codigo: string;
  nivel: OperationalAlertLevel;
  titulo: string;
  detalle: string;
}

export interface OperationalDevice {
  ultima_conexion: string;
  segundos_sin_conexion: number;
  firmware_version: string | null;
  modo_conexion: string;
  modo_operacion: string;
  bateria_pct: number | null;
  senal_dbm: number | null;
  lecturas_pendientes: number;
  simulado: boolean;
}

export interface OperationalIrrigation extends EventoRiego {
  parcela_id: number;
}

export interface OperationalParcel {
  parcela: Parcela;
  cultivo_nombre: string | null;
  ultima_lectura: Lectura | null;
  ultimo_riego: OperationalIrrigation | null;
  dispositivo: OperationalDevice | null;
  salud: OperationalHealth;
  alertas: OperationalAlert[];
}

export interface OperationalMetrics {
  parcelas_total: number;
  area_total_m2: number;
  nodos_online: number;
  nodos_offline: number;
  parcelas_riego_necesario: number;
  alertas_activas: number;
  alertas_criticas: number;
  humedad_media_pct: number | null;
  agua_ejecutada_l: number;
}

export interface OperationalTrendPoint {
  fecha: string;
  eventos: number;
  minutos_planificados: number;
  minutos_ejecutados: number;
  volumen_planificado_l: number;
  volumen_ejecutado_l: number;
}

export interface OperationsOverview {
  generated_at: string;
  status: "operational" | "attention" | "critical";
  metrics: OperationalMetrics;
  parcelas: OperationalParcel[];
  alertas: OperationalAlert[];
  tendencia: OperationalTrendPoint[];
}
