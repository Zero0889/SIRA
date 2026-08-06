/**
 * Cliente HTTP simple hacia el backend FastAPI.
 * En dev usa el rewrite de Next (/api/* → http://127.0.0.1:8000/*).
 */

const BASE = "/api";

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!r.ok) {
    const detail = await r.text();
    throw new Error(`HTTP ${r.status}: ${detail}`);
  }
  if (r.status === 204) return undefined as T;
  return r.json();
}

// SWR fetcher
export const fetcher = <T>(url: string) => jsonFetch<T>(url.replace(BASE, ""));

export const api = {
  me: () => jsonFetch<import("./types").AuthUser>("/auth/me"),
  login: (data: { email: string; password: string }) =>
    jsonFetch<import("./types").AuthUser>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  register: (data: { nombre: string; email: string; password: string }) =>
    jsonFetch<import("./types").AuthUser>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  logout: () => jsonFetch<void>("/auth/logout", { method: "POST" }),
  cultivos: () => jsonFetch<import("./types").Cultivo[]>("/cultivos"),
  parcelas: () => jsonFetch<import("./types").Parcela[]>("/parcelas"),
  parcela: (id: number) => jsonFetch<import("./types").Parcela>(`/parcelas/${id}`),
  generarIdentificadorNodo: () =>
    jsonFetch<{ device_id: string }>("/parcelas/device-identifiers/generate", {
      method: "POST",
    }),
  crearParcela: (data: Partial<import("./types").Parcela>) =>
    jsonFetch<import("./types").Parcela>("/parcelas", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  eliminarParcela: async (id: number) => {
    const r = await fetch(`${BASE}/parcelas/${id}`, { method: "DELETE" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  },
  control: (id: number) => jsonFetch<import("./types").IrrigationControl>(`/parcelas/${id}/control`),
  actualizarControl: (id: number, data: Partial<import("./types").IrrigationControl>) =>
    jsonFetch<{ ok: boolean; modo: import("./types").IrrigationMode }>(`/parcelas/${id}/control`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  crearOrdenRiego: (id: number, data: { accion: "iniciar" | "detener"; duracion_min?: number }) =>
    jsonFetch<import("./types").IrrigationCommand>(`/parcelas/${id}/control/commands`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  rotarCredencialNodo: (id: number) =>
    jsonFetch<import("./types").DeviceProvisioning>(`/parcelas/${id}/device-credential/rotate`, {
      method: "POST",
    }),
  resumen: (id: number) => jsonFetch<import("./types").ResumenParcela>(`/parcelas/${id}/resumen`),
  lecturas: (id: number, horas = 24) =>
    jsonFetch<import("./types").Lectura[]>(`/parcelas/${id}/lecturas?horas=${horas}`),
  riegos: (id: number) => jsonFetch<import("./types").EventoRiego[]>(`/parcelas/${id}/riegos`),
  forecast: (lat: number, lon: number, dias = 7) =>
    jsonFetch<import("./types").ForecastDay[]>(
      `/weather/forecast?lat=${lat}&lon=${lon}&dias=${dias}`
    ),
  elevacion: (lat: number, lon: number) =>
    jsonFetch<{ altitud_m: number }>(`/weather/elevation?lat=${lat}&lon=${lon}`),
  notificationStatus: () =>
    jsonFetch<import("./types").NotificationStatus>("/notifications/status"),
  notificationHistory: () =>
    jsonFetch<import("./types").NotificationHistoryItem[]>("/notifications/history"),
};
