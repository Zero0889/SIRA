"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowRight,
  ArrowsClockwise,
  Broadcast,
  CheckCircle,
  ClockCountdown,
  Drop,
  Gauge,
  MapTrifold,
  Plus,
  WarningCircle,
} from "@phosphor-icons/react";
import { fetcher } from "@/lib/api";
import { cropImage, cropImagePosition } from "@/lib/crop-images";
import { OperationsTrendChart } from "@/components/OperationsTrendChart";
import { PortfolioChart } from "@/components/PortfolioChart";
import type {
  OperationalAlert,
  OperationalHealth,
  OperationalParcel,
  OperationsOverview,
} from "@/lib/types";

const ParcelMap = dynamic(() => import("@/components/Map").then((module) => module.Map), {
  ssr: false,
  loading: () => <div className="skeleton h-[22rem]" />,
});

const STATUS_COPY = {
  operational: { label: "Operación estable", detail: "Todos los sistemas reportan dentro de los límites esperados." },
  attention: { label: "Atención recomendada", detail: "Hay condiciones que conviene revisar durante la jornada." },
  critical: { label: "Prioridad de campo", detail: "SIRA detectó una condición que requiere intervención." },
};

export default function ResumenPage() {
  const { data, error, mutate, isValidating } = useSWR<OperationsOverview>(
    "/operations/overview?days=14",
    fetcher,
    { refreshInterval: 10_000, keepPreviousData: true },
  );

  const loading = !data && !error;
  const status = STATUS_COPY[data?.status ?? "operational"];
  const parcels = data?.parcelas.map((item) => item.parcela) ?? [];
  const updatedAt = data
    ? new Date(data.generated_at).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "Esperando datos";

  return (
    <div className="space-y-6">
      <header className="overview-hero">
        <div className="grid min-h-[22rem] lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,.95fr)]">
          <div className="overview-hero-copy flex flex-col justify-center p-7 sm:p-9 lg:p-10">
            <span className={`operation-status operation-status-${error ? "critical" : data?.status ?? "operational"}`}>
              <span aria-hidden="true" />
              {error ? "Conexión por revisar" : status.label}
            </span>
            <h1 className="overview-hero-title mt-8 max-w-xl text-4xl font-bold leading-[1.04] tracking-[-0.04em] sm:text-5xl">
              Revisa primero lo que necesita atención.
            </h1>
            <p className="overview-hero-description mt-4 max-w-xl text-sm leading-relaxed sm:text-base">
              Estado, consumo y prioridades de todas tus parcelas en una sola vista.
            </p>
            <div className="overview-hero-actions mt-7 flex flex-wrap gap-3">
              <Link href="/parcelas" className="overview-hero-primary"><Plus size={17} weight="bold" /> Registrar parcela</Link>
              <Link href="/documentacion" className="overview-hero-secondary">Entender el cálculo <ArrowRight size={16} /></Link>
            </div>
          </div>
          <div className="overview-hero-image relative min-h-[19rem] lg:min-h-full">
            <Image src="/images/sira-andes-irrigation.webp" alt="Terrazas agrícolas andinas supervisadas con un nodo SIRA" fill priority sizes="(min-width:1280px) 520px, 100vw" className="object-cover" />
            <span className="overview-hero-image-blend" aria-hidden="true" />
          </div>
        </div>
      </header>

      <section className="operation-strip" aria-label="Estado del sistema">
        <SystemDatum icon={Broadcast} label="Estado" value={error ? "Sin conexión" : status.label} detail={error ? "El backend no respondió." : status.detail} tone={data?.status} />
        <SystemDatum icon={ClockCountdown} label="Última actualización" value={updatedAt} detail={isValidating ? "Actualizando en segundo plano" : "Actualización automática cada 10 s"} />
        <SystemDatum icon={Gauge} label="Nodos conectados" value={data ? `${data.metrics.nodos_online} de ${data.metrics.parcelas_total}` : "Consultando"} detail={data ? `${data.metrics.nodos_offline} sin conexión reciente` : "Leyendo telemetría"} />
      </section>

      {error && (
        <section className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-950 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <div className="flex gap-3">
            <WarningCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-red-700" />
            <div><strong>No pudimos actualizar el centro de operaciones.</strong><p className="mt-0.5 text-red-900/75">Comprueba que la API de SIRA esté activa en el puerto 8000.</p></div>
          </div>
          <button type="button" onClick={() => void mutate()} disabled={isValidating} aria-busy={isValidating} className="button-secondary shrink-0">
            <ArrowsClockwise size={17} className={isValidating ? "animate-spin" : ""} aria-hidden="true" />
            {isValidating ? "Reintentando" : "Reintentar"}
          </button>
        </section>
      )}

      <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4" aria-label="Indicadores principales">
        <MetricCard icon={MapTrifold} label="Parcelas" value={data?.metrics.parcelas_total} detail={data ? `${(data.metrics.area_total_m2 / 10_000).toLocaleString("es-PE", { maximumFractionDigits: 2 })} ha registradas` : "Calculando superficie"} />
        <MetricCard icon={Drop} label="Riego necesario" value={data?.metrics.parcelas_riego_necesario} detail="Parcelas con humedad de suelo menor a 30%" emphasis={Boolean(data?.metrics.parcelas_riego_necesario)} />
        <MetricCard icon={WarningCircle} label="Alertas activas" value={data?.metrics.alertas_activas} detail={data ? `${data.metrics.alertas_criticas} de prioridad alta` : "Evaluando condiciones"} danger={Boolean(data?.metrics.alertas_criticas)} />
        <MetricCard icon={Broadcast} label="Nodos en línea" value={data?.metrics.nodos_online} detail={data ? `${data.metrics.nodos_offline} sin conexión reciente` : "Consultando dispositivos"} />
      </section>

      <section className="panel overflow-hidden" aria-labelledby="trend-title">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 id="trend-title" className="section-title">Actividad de riego durante 14 días</h2>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">Volumen ejecutado y minutos planificados en todo el portafolio.</p>
          </div>
          <div className="grid grid-cols-2 gap-6 text-right">
            <HeaderMetric label="Agua ejecutada" value={data ? `${data.metrics.agua_ejecutada_l.toLocaleString("es-PE")} L` : "Sin datos"} />
            <HeaderMetric label="Humedad media" value={data?.metrics.humedad_media_pct != null ? `${data.metrics.humedad_media_pct.toFixed(1)}%` : "Sin lecturas"} />
          </div>
        </div>
        {loading ? <div className="p-5"><div className="skeleton h-[19rem]" /></div> : data ? <div className="p-4 sm:p-5"><OperationsTrendChart data={data.tendencia} /></div> : <EmptyState title="Sin tendencia disponible" detail="Cuando vuelva la conexión, SIRA reconstruirá la actividad reciente." />}
      </section>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.55fr)]">
        <section className="panel overflow-hidden" aria-labelledby="moisture-title">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
            <div><h2 id="moisture-title" className="section-title">Superficie y humedad actual</h2><p className="mt-1 text-xs text-[var(--ink-muted)]">Área registrada y última lectura disponible por parcela.</p></div>
            <div className="flex flex-wrap gap-3 text-xs font-semibold text-[var(--ink-muted)]"><span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--brand-soft)] ring-1 ring-[var(--brand)]" /> Superficie</span><span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-[var(--chart-soil)]" /> Humedad</span></div>
          </div>
          {loading ? <div className="p-5"><div className="skeleton h-[18rem]" /></div> : data?.parcelas.length ? <div className="p-4 sm:p-5"><PortfolioChart parcelas={data.parcelas} /></div> : <EmptyState title="Aún no hay lecturas" detail="Registra una parcela y conecta su nodo para comparar la humedad." />}
        </section>

        <section className="panel overflow-hidden" aria-labelledby="alerts-title">
          <div className="border-b px-5 py-4"><h2 id="alerts-title" className="section-title">Prioridades detectadas</h2><p className="mt-1 text-xs text-[var(--ink-muted)]">Ordenadas por gravedad y listas para revisar.</p></div>
          {loading ? <div className="space-y-3 p-4">{[0, 1, 2, 3].map((item) => <div key={item} className="skeleton h-16" />)}</div> : data?.alertas.length ? <div className="divide-y">{data.alertas.slice(0, 7).map((item) => <AlertRow key={item.id} item={item} />)}</div> : <div className="px-5 py-10 text-center"><CheckCircle size={32} weight="duotone" className="mx-auto text-emerald-700" /><p className="mt-3 font-semibold text-[var(--ink)]">Sin alertas activas</p><p className="mt-1 text-sm text-[var(--ink-muted)]">Los nodos reportan dentro de los límites configurados.</p></div>}
        </section>
      </div>

      <section className="panel overflow-hidden" aria-labelledby="map-overview-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div><h2 id="map-overview-title" className="section-title">Territorio monitoreado</h2><p className="mt-1 text-xs text-[var(--ink-muted)]">Ubicación y superficie aproximada de las parcelas registradas.</p></div>
          <Link href="/parcelas" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[var(--brand-strong)] transition hover:bg-[var(--brand-soft)]">Abrir mapa <ArrowRight size={16} weight="bold" /></Link>
        </div>
        <div className="p-3"><ParcelMap parcelas={parcels} height="22rem" showSavedAreas /></div>
      </section>

      <section aria-labelledby="parcels-overview-title">
        <div className="mb-3 flex items-end justify-between gap-3"><div><h2 id="parcels-overview-title" className="section-title">Salud por parcela</h2><p className="mt-1 text-xs text-[var(--ink-muted)]">Lectura más reciente, cultivo y prioridad operativa.</p></div><Link href="/parcelas" className="text-sm font-semibold text-[var(--brand-strong)] hover:underline">Ver todas</Link></div>
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {data?.parcelas.slice(0, 6).map((item) => <ParcelCard key={item.parcela.id} item={item} />)}
          {!loading && data?.parcelas.length === 0 && <div className="panel col-span-full"><EmptyState title="Registra la primera parcela" detail="Selecciona una ubicación en el mapa para empezar a supervisar el campo." /></div>}
        </div>
      </section>
    </div>
  );
}

function SystemDatum({ icon: Icon, label, value, detail, tone }: { icon: typeof Broadcast; label: string; value: string; detail: string; tone?: OperationsOverview["status"] }) {
  const color = tone === "critical" ? "text-red-700 bg-red-50" : tone === "attention" ? "text-amber-900 bg-amber-50" : "text-[var(--brand-strong)] bg-[var(--brand-soft)]";
  return <div className="flex min-w-0 items-start gap-3 px-5 py-4"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${color}`}><Icon size={19} weight="duotone" /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">{label}</p><strong className="mt-0.5 block truncate text-sm text-[var(--ink)]">{value}</strong><p className="mt-0.5 line-clamp-2 text-xs text-[var(--ink-muted)]">{detail}</p></div></div>;
}

function MetricCard({ icon: Icon, label, value, detail, emphasis = false, danger = false }: { icon: typeof MapTrifold; label: string; value?: number; detail: string; emphasis?: boolean; danger?: boolean }) {
  const tone = danger ? "text-red-700 bg-red-50" : emphasis ? "text-amber-900 bg-amber-50" : "text-[var(--brand-strong)] bg-[var(--brand-soft)]";
  return <article className="dashboard-card p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.07em] text-[var(--ink-muted)]">{label}</p><p className={`metric-value mt-2 text-3xl font-bold ${danger ? "text-red-700" : "text-[var(--ink)]"}`}>{value ?? "Sin dato"}</p></div><span className={`grid h-10 w-10 place-items-center rounded-[0.65rem] ${tone}`}><Icon size={21} weight="duotone" /></span></div><p className="mt-3 text-xs leading-relaxed text-[var(--ink-muted)]">{detail}</p></article>;
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--ink-muted)]">{label}</p><strong className="metric-value mt-1 block text-lg text-[var(--ink)]">{value}</strong></div>;
}

function AlertRow({ item }: { item: OperationalAlert }) {
  const tones = { critical: "bg-red-50 text-red-700", warning: "bg-amber-50 text-amber-900", info: "bg-[var(--surface-muted)] text-[var(--ink-muted)]" };
  return <Link href={`/parcelas/${item.parcela_id}`} className="group flex gap-3 px-4 py-3.5 transition hover:bg-[var(--surface-muted)]"><span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tones[item.nivel]}`}><WarningCircle size={17} weight={item.nivel === "critical" ? "fill" : "duotone"} /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[var(--ink)]">{item.titulo}</p><p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[var(--ink-muted)]">{item.parcela_nombre}: {item.detalle}</p></div><ArrowRight size={15} className="mt-2 shrink-0 text-[var(--ink-muted)] transition-transform group-hover:translate-x-0.5" /></Link>;
}

function ParcelCard({ item }: { item: OperationalParcel }) {
  const reading = item.ultima_lectura;
  return <Link href={`/parcelas/${item.parcela.id}`} className="dashboard-card group overflow-hidden active:translate-y-px"><div className="flex min-h-[7.5rem]"><div className="relative w-28 shrink-0 bg-[var(--surface-muted)]"><Image src={cropImage(item.cultivo_nombre ?? undefined)} alt={`Cultivo de ${item.cultivo_nombre ?? item.parcela.nombre}`} fill sizes="112px" className="object-cover transition duration-300 group-hover:scale-105" style={{ objectPosition: cropImagePosition(item.cultivo_nombre ?? undefined) }} /></div><div className="min-w-0 flex-1 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-sm text-[var(--ink)]">{item.parcela.nombre}</strong><p className="mt-1 truncate text-xs text-[var(--ink-muted)]">{item.cultivo_nombre ?? "Cultivo sin asignar"}</p></div><HealthMark health={item.salud} /></div><div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--ink-muted)]"><span>Suelo <strong className="text-[var(--ink)]">{reading?.humedad_suelo_pct != null ? `${reading.humedad_suelo_pct.toFixed(1)}%` : "sin lectura"}</strong></span><span>{item.alertas.length} alertas</span></div></div></div></Link>;
}

function HealthMark({ health }: { health: OperationalHealth }) {
  const copy = { healthy: ["Estable", "bg-emerald-50 text-emerald-800"], warning: ["Revisar", "bg-amber-50 text-amber-900"], critical: ["Prioridad", "bg-red-50 text-red-700"], unknown: ["Sin datos", "bg-[var(--surface-muted)] text-[var(--ink-muted)]"] } as const;
  return <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold ${copy[health][1]}`}>{copy[health][0]}</span>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="px-5 py-12 text-center"><Gauge size={30} weight="duotone" className="mx-auto text-[var(--brand)]" /><p className="mt-3 font-semibold text-[var(--ink)]">{title}</p><p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-[var(--ink-muted)]">{detail}</p></div>;
}
