"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import {
  ArrowLeft,
  BatteryMedium,
  Broadcast,
  CaretDown,
  CloudRain,
  Check,
  Copy,
  Cpu,
  Drop,
  Flask,
  Gauge,
  MapPin,
  SpinnerGap,
  Thermometer,
  Trash,
  WarningCircle,
  Waves,
} from "@phosphor-icons/react";
import { api, fetcher } from "@/lib/api";
import { cropImage, cropImagePosition } from "@/lib/crop-images";
import { StatCard } from "@/components/StatCard";
import { DecisionBadge } from "@/components/DecisionBadge";
import { SoilChart } from "@/components/SoilChart";
import { IrrigationControlPanel } from "@/components/IrrigationControlPanel";
import type {
  EventoRiego,
  Cultivo,
  ForecastDay,
  Lectura,
  Parcela,
  ResumenParcela,
} from "@/lib/types";

interface EtoDetalle {
  fecha: string;
  clima_fuente: string;
  eto_mm: number;
  eto_reportada_por_fuente_mm: number | null;
  detalle: {
    delta: number;
    gamma: number;
    rn_mj_m2: number;
    ra_mj_m2: number;
    rso_mj_m2: number;
    es_kpa: number;
    ea_kpa: number;
  };
  entradas: {
    t_max_c: number;
    t_min_c: number;
    hr_media_pct: number;
    viento_2m_ms: number;
    radiacion_mj_m2_dia: number;
    presion_kpa: number;
  };
}

function currentCropStage(plantingDate: string, crop: Cultivo) {
  const plantedAt = new Date(`${plantingDate}T12:00:00`);
  const days = Math.max(0, Math.floor((Date.now() - plantedAt.getTime()) / 86_400_000));
  let accumulated = 0;
  const labels = { inicial: "inicial", desarrollo: "de desarrollo", media: "media", final: "final" };
  for (const stage of [...crop.kc_etapas].sort((first, second) => first.orden - second.orden)) {
    accumulated += stage.duracion_dias;
    if (days <= accumulated) return labels[stage.etapa];
  }
  return "final";
}

function Dato({ label, value, unit }: { label: string; value: React.ReactNode; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-mono font-medium text-gray-800">
        {value}
        {unit ? ` ${unit}` : ""}
      </span>
    </div>
  );
}

export default function ParcelaDashboard() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [identifierCopied, setIdentifierCopied] = useState(false);

  const {
    data: resumen,
    error: resumenError,
    mutate: mutateResumen,
  } = useSWR<ResumenParcela>(
    Number.isFinite(id) ? `/parcelas/${id}/resumen` : null,
    fetcher,
    { refreshInterval: 5000 },
  );
  const { data: lecturas, error: lecturasError } = useSWR<Lectura[]>(
    Number.isFinite(id) ? `/parcelas/${id}/lecturas?horas=24` : null,
    fetcher,
    { refreshInterval: 10000 },
  );
  const { data: riegos, error: riegosError } = useSWR<EventoRiego[]>(
    Number.isFinite(id) ? `/parcelas/${id}/riegos` : null,
    fetcher,
    { refreshInterval: 15000 },
  );
  const { data: parcelaFull } = useSWR<Parcela>(
    Number.isFinite(id) ? `/parcelas/${id}` : null,
    fetcher,
  );
  const { data: cultivos } = useSWR<Cultivo[]>("/cultivos", fetcher);
  const { data: forecast, error: forecastError } = useSWR<ForecastDay[]>(
    resumen?.parcela
      ? `/weather/forecast?lat=${resumen.parcela.latitud}&lon=${resumen.parcela.longitud}&dias=5`
      : null,
    fetcher,
    { refreshInterval: 3600_000 },
  );
  const hoy = new Date().toISOString().slice(0, 10);
  const { data: eto, error: etoError } = useSWR<EtoDetalle>(
    parcelaFull
      ? `/weather/eto?lat=${parcelaFull.latitud}&lon=${parcelaFull.longitud}&altitud_m=${parcelaFull.altitud_m}&fecha=${hoy}`
      : null,
    fetcher,
    { refreshInterval: 3600_000 },
  );

  async function eliminarParcela() {
    setDeleteError(null);
    setEliminando(true);
    try {
      await api.eliminarParcela(id);
      router.push("/");
      router.refresh();
    } catch (caught) {
      setDeleteError(
        caught instanceof Error
          ? `No pudimos eliminar la parcela: ${caught.message}`
          : "No pudimos eliminar la parcela. Inténtalo otra vez.",
      );
      setEliminando(false);
    }
  }

  if (!Number.isFinite(id)) {
    return <PageError title="Parcela no válida" detail="El identificador de la ruta no es correcto." />;
  }

  if (resumenError) {
    return (
      <PageError
        title="No pudimos abrir esta parcela"
        detail="Comprueba que el backend esté activo y que la parcela todavía exista."
        onRetry={() => mutateResumen()}
      />
    );
  }

  if (!resumen) {
    return <DashboardSkeleton />;
  }

  const ultima = resumen.ultima_lectura;
  const ultimoRiego = resumen.ultimo_riego;
  const suelo = ultima?.humedad_suelo_pct;
  const tanque = ultima?.nivel_tanque_pct;
  const sueloTone = suelo == null ? "neutral" : suelo < 30 ? "alert" : suelo < 60 ? "warn" : "good";
  const tanqueTone = tanque == null ? "neutral" : tanque < 15 ? "alert" : tanque < 30 ? "warn" : "good";
  const dispositivo = resumen.dispositivo;
  const conectado = dispositivo != null && dispositivo.segundos_sin_conexion <= 300;
  const lastReading = ultima
    ? new Date(ultima.timestamp).toLocaleString("es-PE", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sin lecturas";
  const selectedCrop = cultivos?.find((crop) => crop.id === parcelaFull?.cultivo_id);
  const cropStage = selectedCrop && parcelaFull?.fecha_siembra
    ? currentCropStage(parcelaFull.fecha_siembra, selectedCrop)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-semibold text-gray-600 transition hover:text-emerald-800"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Volver a parcelas
        </Link>
        <span className="text-xs font-medium text-gray-500" aria-live="polite">
          Última lectura: {lastReading}
        </span>
      </div>

      <header className="overflow-hidden rounded-2xl border bg-white shadow-[0_4px_8px_rgb(19_32_24/0.06)]">
        <div className="grid min-h-[17rem] lg:grid-cols-[minmax(0,1.15fr)_minmax(22rem,.85fr)]">
        <div className="flex min-w-0 flex-col justify-center p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2"><StatusLabel connected={conectado} /><span className="rounded-full border bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">{selectedCrop?.nombre_comun ?? "Cultivo sin asignar"}</span>{cropStage && <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--brand-strong)]">Etapa {cropStage}</span>}</div>
          <h1 className="mt-5 truncate text-4xl font-bold tracking-[-0.04em] text-gray-950">{resumen.parcela.nombre}</h1>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Cpu size={16} aria-hidden="true" />
                {resumen.parcela.device_id}
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(resumen.parcela.device_id);
                    setIdentifierCopied(true);
                  }}
                  className="parcel-identifier-copy"
                  aria-label="Copiar identificador del nodo"
                  title="Copiar identificador"
                >
                  {identifierCopied ? <Check size={14} weight="bold" aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                </button>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={16} aria-hidden="true" />
                {resumen.parcela.latitud.toFixed(4)}, {resumen.parcela.longitud.toFixed(4)}
              </span>
              {parcelaFull && (
                <span>
                  {parcelaFull.area_m2.toLocaleString("es-PE")} m² · {parcelaFull.altitud_m.toFixed(0)} m s. n. m.
                </span>
              )}
          </div>
        </div>
        <div className="relative min-h-[18rem] border-t bg-[var(--surface-muted)] lg:min-h-[20rem] lg:border-l lg:border-t-0"><Image src={cropImage(selectedCrop?.nombre_comun)} alt="Cultivo monitoreado en la parcela" fill priority sizes="(min-width:1280px) 460px, 100vw" className="object-cover" style={{ objectPosition: cropImagePosition(selectedCrop?.nombre_comun) }} /></div>
        </div>
      </header>

      {ultimoRiego ? (
        <DecisionBadge
          estado={ultimoRiego.estado}
          minutos={ultimoRiego.minutos_planificados}
          razon={ultimoRiego.razon}
        />
      ) : (
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
          Todavía no hay una decisión de riego registrada para esta parcela.
        </section>
      )}

      <IrrigationControlPanel parcelaId={id} />

      <section aria-labelledby="sensores-title">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 id="sensores-title" className="section-title">Lecturas actuales</h2>
            <p className="mt-0.5 text-xs text-gray-500">Sensores del nodo y demanda agronómica calculada.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Humedad de suelo" value={suelo?.toFixed(1)} unit="%" tone={sueloTone} hint="Umbral configurado: 60%" icon={<Waves size={19} className="text-gray-500" />} />
          <StatCard label="Nivel del tanque" value={tanque?.toFixed(1)} unit="%" tone={tanqueTone} hint="Mínimo operativo: 15%" icon={<Gauge size={19} className="text-gray-500" />} />
          <StatCard label="Temperatura" value={ultima?.temperatura_c?.toFixed(1)} unit="°C" icon={<Thermometer size={19} className="text-gray-500" />} />
          <StatCard label="Humedad relativa" value={ultima?.humedad_rel?.toFixed(1)} unit="%" icon={<CloudRain size={19} className="text-gray-500" />} />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="ETo de hoy" value={ultimoRiego?.eto_mm?.toFixed(2)} unit="mm" hint="Penman-Monteith FAO-56" />
          <StatCard label="Kc actual" value={ultimoRiego?.kc?.toFixed(2)} hint="Según etapa fenológica" />
          <StatCard label="ETc" value={ultimoRiego?.etc_mm?.toFixed(2)} unit="mm" hint="Kc × ETo" />
        </div>
      </section>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.75fr)]">
        <section className="panel p-4 sm:p-5" aria-labelledby="chart-title">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="chart-title" className="section-title">Humedad durante las últimas 24 horas</h2>
              <p className="mt-0.5 text-xs text-gray-500">Comparación con el nivel disponible del tanque.</p>
            </div>
            <span className="rounded-md bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-muted)]">
              {lecturas?.length ?? 0} lecturas
            </span>
          </div>
          {lecturasError ? (
            <InlineError message="No pudimos cargar el historial de sensores." />
          ) : lecturas ? (
            <SoilChart lecturas={lecturas} />
          ) : (
            <div className="skeleton h-64" />
          )}
        </section>

        <NodePanel resumen={resumen} connected={conectado} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel overflow-hidden" aria-labelledby="forecast-title">
          <div className="flex items-center justify-between border-b border-emerald-950/10 px-4 py-4 sm:px-5">
            <div>
              <h2 id="forecast-title" className="section-title">Pronóstico de 5 días</h2>
              <p className="mt-0.5 text-xs text-gray-500">Lluvia y ETo previstas para la ubicación.</p>
            </div>
            <CloudRain size={21} className="text-gray-500" aria-hidden="true" />
          </div>
          {forecastError ? (
            <div className="p-4"><InlineError message="No pudimos cargar el pronóstico." /></div>
          ) : forecast ? (
            forecast.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-sm">
                  <thead>
                    <tr className="bg-[var(--surface-muted)] text-left text-xs font-semibold text-[var(--ink-muted)]">
                      <th className="px-4 py-2.5 sm:px-5">Día</th>
                      <th className="px-3 py-2.5">Máx. / mín.</th>
                      <th className="px-3 py-2.5">Lluvia</th>
                      <th className="px-3 py-2.5">Probabilidad</th>
                      <th className="px-4 py-2.5 text-right sm:px-5">ETo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-950/10">
                    {forecast.map((day) => (
                      <tr key={day.fecha}>
                        <td className="px-4 py-3 font-semibold text-gray-900 sm:px-5">
                          {new Date(`${day.fecha}T12:00:00`).toLocaleDateString("es-PE", {
                            weekday: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-3 py-3">{day.t_max_c.toFixed(0)}° / {day.t_min_c.toFixed(0)}°</td>
                        <td className="px-3 py-3">{day.precipitacion_mm.toFixed(1)} mm</td>
                        <td className="px-3 py-3">{day.prob_precipitacion_pct != null ? `${day.prob_precipitacion_pct}%` : "Sin dato"}</td>
                        <td className="px-4 py-3 text-right font-medium sm:px-5">{day.eto_mm != null ? `${day.eto_mm.toFixed(2)} mm` : "Sin dato"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyPanel message="No hay pronóstico disponible." />
            )
          ) : (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3].map((item) => <div key={item} className="skeleton h-8" />)}
            </div>
          )}
        </section>

        <section className="panel overflow-hidden" aria-labelledby="irrigation-title">
          <div className="flex items-center justify-between border-b border-emerald-950/10 px-4 py-4 sm:px-5">
            <div>
              <h2 id="irrigation-title" className="section-title">Historial de riego</h2>
              <p className="mt-0.5 text-xs text-gray-500">Últimas decisiones registradas por el motor.</p>
            </div>
            <Drop size={21} className="text-gray-500" aria-hidden="true" />
          </div>
          {riegosError ? (
            <div className="p-4"><InlineError message="No pudimos cargar el historial de riego." /></div>
          ) : riegos ? (
            riegos.length > 0 ? (
              <div className="max-h-[20rem] divide-y divide-emerald-950/10 overflow-y-auto">
                {riegos.slice(0, 10).map((evento) => (
                  <div key={evento.id} className="flex items-start justify-between gap-4 px-4 py-3 sm:px-5">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {new Date(evento.inicio).toLocaleString("es-PE", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Kc {evento.kc?.toFixed(2) ?? "sin dato"} · ETo {evento.eto_mm?.toFixed(2) ?? "sin dato"} mm · Lámina {evento.lamina_mm?.toFixed(2) ?? "sin dato"} mm
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-gray-900">
                      {evento.minutos_planificados.toFixed(1)} min
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel message="Aún no hay riegos registrados." />
            )
          ) : (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3].map((item) => <div key={item} className="skeleton h-10" />)}
            </div>
          )}
        </section>
      </div>

      <details className="group panel overflow-hidden">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-800">
              <Flask size={19} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h2 className="section-title">Desglose técnico de ETo</h2>
              <p className="mt-0.5 text-xs text-gray-500">Entradas y términos de Penman-Monteith FAO-56.</p>
            </div>
          </div>
          <CaretDown size={18} className="shrink-0 text-gray-500 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="border-t border-emerald-950/10 p-4 sm:p-5">
          {etoError ? (
            <InlineError message="No pudimos calcular el desglose meteorológico." />
          ) : eto ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
                <span>Fuente: <strong>{eto.clima_fuente}</strong></span>
                <span>{eto.fecha}</span>
              </div>
              <div className="grid gap-7 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Entradas meteorológicas</h3>
                  <div className="mt-2 divide-y divide-emerald-950/10">
                    <Dato label="Temperatura máxima" value={eto.entradas.t_max_c} unit="°C" />
                    <Dato label="Temperatura mínima" value={eto.entradas.t_min_c} unit="°C" />
                    <Dato label="Humedad relativa" value={eto.entradas.hr_media_pct} unit="%" />
                    <Dato label="Viento a 2 m" value={eto.entradas.viento_2m_ms.toFixed(2)} unit="m/s" />
                    <Dato label="Radiación solar" value={eto.entradas.radiacion_mj_m2_dia.toFixed(2)} unit="MJ/m²" />
                    <Dato label="Presión" value={eto.entradas.presion_kpa.toFixed(2)} unit="kPa" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Términos intermedios</h3>
                  <div className="mt-2 divide-y divide-emerald-950/10">
                    <Dato label="Δ pendiente de vapor" value={eto.detalle.delta.toFixed(4)} />
                    <Dato label="γ psicrométrica" value={eto.detalle.gamma.toFixed(4)} />
                    <Dato label="eₛ saturación" value={eto.detalle.es_kpa.toFixed(3)} unit="kPa" />
                    <Dato label="eₐ real" value={eto.detalle.ea_kpa.toFixed(3)} unit="kPa" />
                    <Dato label="Ra extraterrestre" value={eto.detalle.ra_mj_m2.toFixed(2)} unit="MJ/m²" />
                    <Dato label="Rₙ radiación neta" value={eto.detalle.rn_mj_m2.toFixed(2)} unit="MJ/m²" />
                  </div>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between gap-4 rounded-lg bg-[#17643a] px-4 py-3 text-white">
                <span className="text-sm font-semibold">ETo calculada</span>
                <span className="text-xl font-bold">{eto.eto_mm.toFixed(2)} mm/día</span>
              </div>
            </>
          ) : (
            <div className="skeleton h-52" />
          )}
        </div>
      </details>

      <section className="rounded-xl border border-red-200 bg-white p-4 sm:p-5" aria-labelledby="delete-title">
        {!confirmandoBorrado ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="delete-title" className="text-sm font-bold text-gray-950">Administrar parcela</h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                El borrado incluye las lecturas y los eventos de riego asociados.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmandoBorrado(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 active:translate-y-px"
            >
              <Trash size={17} aria-hidden="true" />
              Eliminar parcela
            </button>
          </div>
        ) : (
          <div role="alert">
            <div className="flex gap-3">
              <WarningCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-red-700" />
              <div>
                <h2 id="delete-title" className="font-bold text-red-950">Confirma el borrado de {resumen.parcela.nombre}</h2>
                <p className="mt-1 text-sm leading-relaxed text-red-900/75">
                  Esta acción elimina todas sus lecturas y eventos de riego. No se puede deshacer.
                </p>
              </div>
            </div>
            {deleteError && <p className="mt-3 text-sm font-medium text-red-800">{deleteError}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmandoBorrado(false);
                  setDeleteError(null);
                }}
                disabled={eliminando}
                className="button-secondary"
              >
                Conservar parcela
              </button>
              <button
                type="button"
                onClick={eliminarParcela}
                disabled={eliminando}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55"
              >
                {eliminando ? <SpinnerGap size={18} className="animate-spin" /> : <Trash size={17} />}
                {eliminando ? "Eliminando" : "Eliminar definitivamente"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusLabel({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${
        connected ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-600" : "bg-red-700"}`} aria-hidden="true" />
      {connected ? "Nodo conectado" : "Sin comunicación"}
    </span>
  );
}

function NodePanel({ resumen, connected }: { resumen: ResumenParcela; connected: boolean }) {
  const dispositivo = resumen.dispositivo;
  const contexto = resumen.contexto_altoandino;

  return (
    <section className="panel overflow-hidden" aria-labelledby="node-title">
      <div className="flex items-start justify-between gap-3 border-b border-emerald-950/10 px-4 py-4">
        <div>
          <h2 id="node-title" className="section-title">Nodo de campo</h2>
          <p className="mt-0.5 text-xs text-gray-500">Estado operativo del dispositivo.</p>
        </div>
        <Broadcast size={21} className={connected ? "text-emerald-700" : "text-red-700"} aria-hidden="true" />
      </div>
      <dl className="grid grid-cols-2 gap-px bg-emerald-950/10">
        <NodeDatum label="Altitud" value={`${contexto.altitud_m.toFixed(0)} m`} />
        <NodeDatum label="Batería" value={dispositivo?.bateria_pct != null ? `${dispositivo.bateria_pct.toFixed(0)}%` : "Sin dato"} icon={<BatteryMedium size={16} />} />
        <NodeDatum label="Conexión" value={dispositivo?.modo_conexion ?? "Sin dato"} />
        <NodeDatum label="Operación" value={dispositivo?.modo_operacion ?? "Sin dato"} />
        <NodeDatum label="Pendientes" value={`${dispositivo?.lecturas_pendientes ?? 0} lecturas`} />
        <NodeDatum label="Entorno" value={dispositivo?.simulado ? "Simulado" : "Campo"} />
      </dl>
      <div className="space-y-2 p-4">
        {contexto.alertas.length > 0 ? (
          contexto.alertas.map((alerta) => (
            <div
              key={alerta.codigo}
              className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                alerta.nivel === "alerta"
                  ? "bg-amber-50 text-amber-950"
                  : "bg-gray-50 text-gray-700"
              }`}
            >
              {alerta.mensaje}
            </div>
          ))
        ) : (
          <p className="text-sm leading-relaxed text-gray-600">
            Sin alertas operativas. El nodo está dentro de los límites configurados.
          </p>
        )}
        {dispositivo && (
          <p className="pt-1 text-xs leading-relaxed text-gray-400">
            Firmware {dispositivo.firmware_version ?? "sin identificar"} · última conexión{" "}
            {new Date(dispositivo.ultima_conexion).toLocaleString("es-PE")}
          </p>
        )}
      </div>
    </section>
  );
}

function NodeDatum({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white px-4 py-3">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-gray-500">{icon}{label}</dt>
      <dd className="mt-1 text-sm font-semibold capitalize text-gray-900">{value}</dd>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-900" role="alert">
      <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
      {message}
    </div>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return <div className="px-5 py-10 text-center text-sm text-gray-500">{message}</div>;
}

function PageError({
  title,
  detail,
  onRetry,
}: {
  title: string;
  detail: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-700">
        <WarningCircle size={25} weight="fill" aria-hidden="true" />
      </span>
      <h1 className="mt-4 text-xl font-bold text-gray-950">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-gray-500">{detail}</p>
      <div className="mt-5 flex justify-center gap-2">
        <Link href="/" className="button-secondary">Volver a parcelas</Link>
        {onRetry && <button type="button" onClick={onRetry} className="button-primary">Reintentar</button>}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-label="Cargando parcela">
      <div className="skeleton h-10 w-40" />
      <div className="panel space-y-3 p-5">
        <div className="skeleton h-8 w-56" />
        <div className="skeleton h-4 w-80 max-w-full" />
      </div>
      <div className="skeleton h-20" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="skeleton h-32" />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="skeleton h-80" />
        <div className="skeleton h-80" />
      </div>
    </div>
  );
}
