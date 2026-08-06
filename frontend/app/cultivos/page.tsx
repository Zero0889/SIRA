"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  ArrowSquareOut,
  BookOpenText,
  CalendarBlank,
  CheckCircle,
  Drop,
  MagnifyingGlass,
  Ruler,
  WarningCircle,
} from "@phosphor-icons/react";
import { CropKcChart } from "@/components/CropKcChart";
import { fetcher } from "@/lib/api";
import { cropImage, cropImagePosition } from "@/lib/crop-images";
import type { Cultivo, KcEtapa } from "@/lib/types";

type Evidencia = "local" | "fao" | "provisional";
type Filtro = "todos" | Evidencia;

const LOCALES = new Set(["Quinua", "Oca"]);
const PROVISIONALES = new Set(["Cañihua", "Kiwicha"]);
const ETAPA_LABEL: Record<KcEtapa["etapa"], string> = {
  inicial: "Inicial (emergencia)",
  desarrollo: "Desarrollo vegetativo",
  media: "Media (producción)",
  final: "Final (maduración)",
};

const EVIDENCIA: Record<Evidencia, { label: string; tone: string; fuente: string; contexto: string }> = {
  local: { label: "Estudio peruano", tone: "bg-emerald-50 text-emerald-800", fuente: "Investigación local", contexto: "Curva observada bajo condiciones peruanas." },
  fao: { label: "Referencia FAO-56", tone: "bg-sky-50 text-sky-800", fuente: "FAO-56, Tabla 12", contexto: "Condición estándar sin estrés hídrico." },
  provisional: { label: "Valor provisional", tone: "bg-amber-50 text-amber-900", fuente: "Analogía agronómica", contexto: "Debe calibrarse localmente antes de automatizar." },
};

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function evidenciaDe(nombre: string): Evidencia {
  if (LOCALES.has(nombre)) return "local";
  if (PROVISIONALES.has(nombre)) return "provisional";
  return "fao";
}

export default function CultivosPage() {
  const { data: cultivos, error, mutate } = useSWR<Cultivo[]>("/cultivos", fetcher);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const visibles = useMemo(() => {
    if (!cultivos) return undefined;
    const termino = normalizar(busqueda.trim());
    return [...cultivos]
      .filter((cultivo) => filtro === "todos" || evidenciaDe(cultivo.nombre_comun) === filtro)
      .filter((cultivo) => !termino || normalizar([cultivo.nombre_comun, cultivo.nombre_cientifico, cultivo.familia].filter(Boolean).join(" ")).includes(termino))
      .sort((a, b) => a.nombre_comun.localeCompare(b.nombre_comun, "es"));
  }, [busqueda, cultivos, filtro]);

  const selected = visibles?.find((cultivo) => cultivo.id === selectedId) ?? visibles?.[0];
  const conteos = useMemo(() => {
    const base = { todos: cultivos?.length ?? 0, local: 0, fao: 0, provisional: 0 };
    cultivos?.forEach((cultivo) => base[evidenciaDe(cultivo.nombre_comun)]++);
    return base;
  }, [cultivos]);
  const filtros: Array<{ value: Filtro; label: string }> = [
    { value: "todos", label: "Todos" },
    { value: "fao", label: "FAO-56" },
    { value: "local", label: "Estudios Perú" },
    { value: "provisional", label: "Provisionales" },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Biblioteca agronómica</p>
          <h1 className="page-title mt-1">Catálogo de cultivos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ink-muted)]">Parámetros de evapotranspiración, profundidad radicular y coeficientes Kc con trazabilidad de su fuente.</p>
        </div>
        <div className="flex gap-7">
          <HeaderMetric label="Cultivos" value={conteos.todos} />
          <HeaderMetric label="Estudio local" value={conteos.local} />
          <HeaderMetric label="Provisionales" value={conteos.provisional} />
        </div>
      </header>

      <section className="panel flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between" aria-label="Herramientas del catálogo">
        <div className="hide-scrollbar flex gap-2 overflow-x-auto" role="group" aria-label="Filtrar por evidencia">
          {filtros.map((item) => (
            <button key={item.value} type="button" onClick={() => setFiltro(item.value)} aria-pressed={filtro === item.value} className={`min-h-10 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition active:translate-y-px ${filtro === item.value ? "bg-[var(--brand)] text-white" : "bg-[var(--surface-muted)] text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>
              {item.label} <span className="ml-1 opacity-65">{conteos[item.value]}</span>
            </button>
          ))}
        </div>
        <label className="relative block w-full lg:max-w-sm">
          <span className="sr-only">Buscar cultivo</span>
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar cultivo, especie o familia" className="field-control pl-10" />
        </label>
      </section>

      {!cultivos && !error && <CatalogSkeleton />}
      {error && <ErrorState onRetry={() => mutate()} />}
      {visibles?.length === 0 && <EmptySearch />}

      {visibles && visibles.length > 0 && selected && (
        <div className="grid items-start gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="panel overflow-hidden xl:sticky xl:top-24" aria-label="Seleccionar cultivo">
            <div className="border-b px-4 py-3.5"><p className="text-xs font-bold uppercase tracking-[0.07em] text-[var(--ink-muted)]">Seleccionar cultivo</p><p className="mt-1 text-xs text-[var(--ink-muted)]">{visibles.length} resultados disponibles</p></div>
            <div className="max-h-[18rem] space-y-1 overflow-y-auto p-2 xl:max-h-[44rem]">
              {visibles.map((cultivo) => {
                const active = cultivo.id === selected.id;
                const evidencia = EVIDENCIA[evidenciaDe(cultivo.nombre_comun)];
                return (
                  <button key={cultivo.id} type="button" onClick={() => setSelectedId(cultivo.id)} aria-pressed={active} className={`group flex w-full items-center gap-3 rounded-[0.65rem] p-2 text-left transition ${active ? "bg-[var(--brand-soft)] ring-1 ring-[var(--brand)]/35" : "hover:bg-[var(--surface-muted)]"}`}>
                    <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-muted)]"><Image src={cropImage(cultivo.nombre_comun)} alt={`Cultivo de ${cultivo.nombre_comun}`} fill sizes="64px" className="object-cover transition duration-300 group-hover:scale-105" style={{ objectPosition: cropImagePosition(cultivo.nombre_comun) }} /></span>
                    <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[var(--ink)]">{cultivo.nombre_comun}</strong><em className="mt-0.5 block truncate text-xs text-[var(--ink-muted)]">{cultivo.nombre_cientifico || "Especie no registrada"}</em><span className="mt-1 block truncate text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--brand-strong)]">{evidencia.label}</span></span>
                    {active && <CheckCircle size={19} weight="fill" className="shrink-0 text-[var(--brand)]" />}
                  </button>
                );
              })}
            </div>
          </aside>

          <CropDetail cultivo={selected} />
        </div>
      )}

      <aside className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">
        <BookOpenText size={22} weight="duotone" className="mt-0.5 shrink-0" />
        <div><strong>Criterio técnico.</strong> Los Kc de referencia describen cultivos bien manejados y sin estrés. Ajusta la curva según variedad, calendario, suelo, altura, viento y método de riego antes de usarla en producción.</div>
      </aside>
    </div>
  );
}

function CropDetail({ cultivo }: { cultivo: Cultivo }) {
  const evidencia = EVIDENCIA[evidenciaDe(cultivo.nombre_comun)];
  const etapas = [...cultivo.kc_etapas].sort((a, b) => a.orden - b.orden);
  const ciclo = etapas.reduce((total, etapa) => total + etapa.duracion_dias, 0);
  const acumulados = etapas.reduce<number[]>((values, etapa) => [...values, (values.at(-1) ?? 0) + etapa.duracion_dias], []);

  return (
    <article className="crop-detail min-w-0 space-y-5">
      <section className="crop-profile">
        <figure className="crop-profile-media">
          <Image src={cropImage(cultivo.nombre_comun)} alt={`Fotografía agronómica de ${cultivo.nombre_comun}`} fill priority sizes="(min-width:1280px) 420px, 100vw" className="object-cover" style={{ objectPosition: cropImagePosition(cultivo.nombre_comun) }} />
          <figcaption className="crop-photo-caption">Vista de campo · encuadre agronómico</figcaption>
        </figure>
        <div className="flex min-w-0 flex-col justify-between p-6 sm:p-8">
          <div>
            <span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-bold ${evidencia.tone}`}>{evidencia.label}</span>
            <h2 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-gray-950 sm:text-5xl">{cultivo.nombre_comun}</h2>
            <p className="mt-2 text-sm italic text-gray-500">{cultivo.nombre_cientifico || "Nombre científico no registrado"}{cultivo.familia ? ` · ${cultivo.familia}` : ""}</p>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-[var(--ink-muted)]">Ficha técnica para estimar la demanda hídrica por etapa, dimensionar la zona radicular y revisar la fuente antes de aplicar el cálculo en campo.</p>
          </div>
          <a href="https://www.fao.org/4/x0490e/x0490e0b.htm" target="_blank" rel="noopener noreferrer" className="button-secondary mt-7 w-fit text-xs">Consultar fuente técnica <ArrowSquareOut size={15} /></a>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Parámetros principales">
        <Parameter icon={Ruler} label="Profundidad radicular" value={`${cultivo.profundidad_raiz_m} m`} detail="Rango efectivo para riego" />
        <Parameter icon={Drop} label="Agotamiento permisible" value={cultivo.agotamiento_permisible.toFixed(2)} detail="Fracción de agua disponible" />
        <Parameter icon={CalendarBlank} label="Ciclo de referencia" value={`${ciclo} días`} detail="Desde emergencia a cosecha" />
      </section>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4"><div><h3 className="section-title">Etapas del coeficiente Kc</h3><p className="mt-1 text-xs text-[var(--ink-muted)]">Duración y demanda relativa de agua por fase.</p></div><span className="rounded-md bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-muted)]">{evidencia.fuente}</span></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[38rem] text-sm">
            <thead><tr className="bg-[var(--surface-muted)] text-left text-xs font-bold text-[var(--ink-muted)]"><th className="px-5 py-3">Etapa de crecimiento</th><th className="px-4 py-3">Kc</th><th className="px-4 py-3">Duración</th><th className="px-5 py-3 text-right">Acumulado</th></tr></thead>
            <tbody className="divide-y">{etapas.map((etapa, index) => <tr key={etapa.orden} className={etapa.etapa === "media" ? "bg-[var(--brand-soft)]/55" : "transition hover:bg-[var(--surface-muted)]"}><td className="px-5 py-4 font-semibold text-[var(--ink)]">{ETAPA_LABEL[etapa.etapa]}</td><td className="metric-value px-4 py-4 text-lg font-bold text-[var(--brand-strong)]">{etapa.kc.toFixed(2)}</td><td className="px-4 py-4 text-[var(--ink-muted)]">{etapa.duracion_dias} días</td><td className="px-5 py-4 text-right font-medium text-[var(--ink)]">{acumulados[index]} días</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="panel p-5">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-3"><div><h3 className="section-title">Curva fenológica Kc</h3><p className="mt-1 text-xs text-[var(--ink-muted)]">Variación del coeficiente durante el ciclo de referencia.</p></div><div className="text-right text-xs text-[var(--ink-muted)]"><strong className="block text-[var(--ink)]">{evidencia.fuente}</strong>{evidencia.contexto}</div></div>
        <CropKcChart etapas={etapas} nombre={cultivo.nombre_comun} />
      </section>
    </article>
  );
}

function Parameter({ icon: Icon, label, value, detail }: { icon: typeof Ruler; label: string; value: string; detail: string }) {
  return <div className="dashboard-card p-4"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-strong)]"><Icon size={19} weight="duotone" /></span><p className="mt-4 text-xs font-bold uppercase tracking-[0.06em] text-[var(--ink-muted)]">{label}</p><p className="metric-value mt-1 text-2xl font-bold text-[var(--ink)]">{value}</p><p className="mt-1 text-xs text-[var(--ink-muted)]">{detail}</p></div>;
}

function HeaderMetric({ label, value }: { label: string; value: number }) {
  return <div className="min-w-[5rem]"><div className="text-xs font-medium text-[var(--ink-muted)]">{label}</div><div className="metric-value mt-0.5 text-lg font-bold text-[var(--ink)]">{value}</div></div>;
}

function CatalogSkeleton() {
  return <div className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]" aria-label="Cargando cultivos"><div className="skeleton h-[32rem]" /><div className="space-y-4"><div className="skeleton h-80" /><div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((item) => <div key={item} className="skeleton h-36" />)}</div></div></div>;
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <div className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between" role="alert"><div className="flex gap-3"><WarningCircle size={21} weight="fill" className="shrink-0" /><span>No pudimos cargar el catálogo. Comprueba que el backend esté activo.</span></div><button type="button" onClick={onRetry} className="button-secondary">Reintentar</button></div>;
}

function EmptySearch() {
  return <div className="panel px-6 py-14 text-center"><MagnifyingGlass size={26} className="mx-auto text-[var(--ink-muted)]" /><p className="mt-3 font-semibold text-[var(--ink)]">No encontramos ese cultivo</p><p className="mt-1 text-sm text-[var(--ink-muted)]">Prueba otro nombre o cambia el filtro de evidencia.</p></div>;
}
