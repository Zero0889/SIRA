"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  ArrowLeft,
  ArrowRight,
  Drop,
  MagnifyingGlass,
  MapTrifold,
  Plus,
  Thermometer,
  WarningCircle,
} from "@phosphor-icons/react";
import { ParcelRegistrationWizard } from "@/components/ParcelRegistrationWizard";
import { fetcher } from "@/lib/api";
import { cropImage, cropImagePosition } from "@/lib/crop-images";
import type { Cultivo, OperationalParcel, OperationsOverview } from "@/lib/types";

const Map = dynamic(() => import("@/components/Map").then((module) => module.Map), {
  ssr: false,
  loading: () => <div className="skeleton h-[min(68vh,43rem)] min-h-[25rem]" />,
});

type Filter = "all" | "operational" | "offline";
type MapMode = "view" | "register" | null;

export default function HomePage() {
  const { data, error: overviewError, mutate, isLoading } = useSWR<OperationsOverview>(
    "/operations/overview?days=14",
    fetcher,
    { refreshInterval: 10_000, keepPreviousData: true },
  );
  const { data: cultivos, error: cultivosError } = useSWR<Cultivo[]>("/cultivos", fetcher);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [mapMode, setMapMode] = useState<MapMode>(null);

  const parcelas = useMemo(() => data?.parcelas ?? [], [data?.parcelas]);
  const hasError = Boolean(overviewError || cultivosError);
  const counts = useMemo(
    () => ({
      all: parcelas.length,
      operational: parcelas.filter((item) => item.salud === "healthy" && !isOffline(item)).length,
      offline: parcelas.filter(isOffline).length,
    }),
    [parcelas],
  );

  const visible = useMemo(() => {
    const term = normalize(search);
    return parcelas.filter((item) => {
      if (filter === "operational" && (item.salud !== "healthy" || isOffline(item))) return false;
      if (filter === "offline" && !isOffline(item)) return false;
      if (!term) return true;
      return normalize(
        [item.parcela.nombre, item.parcela.device_id, item.cultivo_nombre].filter(Boolean).join(" "),
      ).includes(term);
    });
  }, [filter, parcelas, search]);

  function openWorkspace(mode: Exclude<MapMode, null>) {
    setMapMode(mode);
    window.scrollTo({ top: 0 });
  }

  function closeWorkspace() {
    setMapMode(null);
    window.scrollTo({ top: 0 });
  }

  if (mapMode === "register") {
    return (
      <ParcelRegistrationWizard
        cultivos={cultivos ?? []}
        onCancel={closeWorkspace}
        onSaved={() => {
          closeWorkspace();
          void mutate();
        }}
      />
    );
  }

  if (mapMode === "view") {
    return <MapWorkspace parcelas={parcelas} onClose={closeWorkspace} />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Gestión territorial</p>
          <h1 className="page-title mt-1">Parcelas y nodos de riego</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ink-muted)]">
            Revisa el cultivo, los sensores, el nodo y la superficie de cada parcela desde un solo lugar.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-x-7 gap-y-3">
          <Summary label="Parcelas" value={data?.metrics.parcelas_total ?? null} />
          <Summary label="Superficie" value={data ? formatArea(data.metrics.area_total_m2) : null} />
          <Summary
            label="Nodos en línea"
            value={data ? `${data.metrics.nodos_online}/${data.metrics.parcelas_total}` : null}
            alert={Boolean(data?.metrics.nodos_offline)}
          />
          <button type="button" onClick={() => openWorkspace("register")} className="button-primary">
            <Plus size={17} weight="bold" />Registrar parcela
          </button>
        </div>
      </header>

      {hasError && <ErrorState onRetry={() => void mutate()} />}

      <section className="parcel-toolbar" aria-label="Buscar y filtrar parcelas">
        <label className="relative min-w-0 flex-1 lg:max-w-md">
          <span className="sr-only">Buscar parcela</span>
          <MagnifyingGlass size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            type="search"
            placeholder="Buscar parcela, cultivo o nodo"
            className="field-control pl-10"
          />
        </label>
        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto" role="group" aria-label="Filtrar por estado">
          <FilterButton active={filter === "all"} onClick={() => setFilter("all")} label="Todas" count={counts.all} />
          <FilterButton active={filter === "operational"} onClick={() => setFilter("operational")} label="Operativas" count={counts.operational} />
          <FilterButton active={filter === "offline"} onClick={() => setFilter("offline")} label="Sin conexión" count={counts.offline} />
        </div>
        <button type="button" onClick={() => openWorkspace("view")} className="map-text-action">
          <MapTrifold size={19} weight="duotone" />Ver mapa
        </button>
      </section>

      <section className="parcel-grid" aria-label="Parcelas registradas">
        <AddParcelTile onClick={() => openWorkspace("register")} />
        {isLoading && !data && [0, 1, 2].map((item) => <ParcelSkeleton key={item} />)}
        {visible.map((item) => <ParcelBlock key={item.parcela.id} item={item} />)}
      </section>

      {data && visible.length === 0 && parcelas.length > 0 && (
        <div className="rounded-xl bg-[var(--surface-muted)] px-5 py-8 text-center">
          <p className="font-semibold text-[var(--ink)]">No encontramos parcelas con este filtro.</p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Prueba otro término o vuelve a ver todas.</p>
        </div>
      )}
    </div>
  );
}

function MapWorkspace({ parcelas, onClose }: { parcelas: OperationalParcel[]; onClose: () => void }) {
  const [showAreas, setShowAreas] = useState(true);
  const baseParcelas = parcelas.map((item) => item.parcela);
  return (
    <div className="space-y-5">
      <header className="border-b pb-5">
        <button type="button" onClick={onClose} className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-[var(--ink-muted)] transition hover:text-[var(--ink)]">
          <ArrowLeft size={17} />Volver a las parcelas
        </button>
        <h1 className="page-title mt-4">Mapa de parcelas</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">Explora la ubicación y superficie aproximada de cada unidad registrada.</p>
      </header>
      <section className="min-w-0 space-y-3" aria-label="Ubicación de las parcelas">
        <Map parcelas={baseParcelas} height="min(68vh,700px)" showSavedAreas={showAreas} />
        <div className="panel max-w-xl overflow-hidden">
          <MapControl
            title="Superficies registradas"
            description="Muestra la extensión aproximada guardada para cada parcela."
            checked={showAreas}
            onChange={setShowAreas}
          />
        </div>
      </section>
    </div>
  );
}

function ParcelBlock({ item }: { item: OperationalParcel }) {
  const reading = item.ultima_lectura;
  const state = parcelState(item);
  return (
    <Link href={`/parcelas/${item.parcela.id}`} className="parcel-block group" aria-label={`Abrir parcela ${item.parcela.nombre}`}>
      <div className="parcel-block-media">
        <Image
          src={cropImage(item.cultivo_nombre ?? undefined)}
          alt={`Cultivo de ${item.cultivo_nombre ?? item.parcela.nombre}`}
          fill
          sizes="(min-width:1536px) 300px, (min-width:1024px) 320px, 100vw"
          className="object-cover transition duration-500 group-hover:scale-[1.025]"
          style={{ objectPosition: cropImagePosition(item.cultivo_nombre ?? undefined) }}
        />
        <span className={`parcel-state ${state.tone}`}><span />{state.label}</span>
      </div>
      <div className="parcel-block-heading">
        <h2>{item.parcela.nombre}</h2>
        <p>{item.cultivo_nombre ?? "Cultivo sin asignar"}</p>
      </div>
      <dl className="parcel-readings">
        <Reading icon={Drop} label="Humedad" value={reading?.humedad_suelo_pct != null ? `${reading.humedad_suelo_pct.toFixed(1)}%` : "Sin dato"} />
        <Reading icon={Thermometer} label="Temperatura" value={reading?.temperatura_c != null ? `${reading.temperatura_c.toFixed(1)} °C` : "Sin dato"} />
      </dl>
      <div className="parcel-block-meta">
        <span>Área <strong>{formatArea(item.parcela.area_m2)}</strong></span>
        <span>Altitud <strong>{item.parcela.altitud_m.toLocaleString("es-PE")} m</strong></span>
      </div>
      <span className="parcel-open-link">Ver parcela <ArrowRight size={16} /></span>
    </Link>
  );
}

function AddParcelTile({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="add-parcel-tile">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--brand-soft)] text-[var(--brand-strong)]"><Plus size={23} weight="bold" /></span>
      <span><strong>Registrar parcela</strong><small>Ubica el sembrío, vincula su nodo y asigna el cultivo.</small></span>
    </button>
  );
}

function Reading({ icon: Icon, label, value }: { icon: typeof Drop; label: string; value: string }) {
  return <div><dt><Icon size={14} />{label}</dt><dd>{value}</dd></div>;
}

function FilterButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`min-h-10 whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition ${active ? "bg-[var(--brand)] text-white" : "bg-[var(--surface-muted)] text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>{label}<span className="ml-1.5 opacity-65">{count}</span></button>;
}

function Summary({ label, value, alert = false }: { label: string; value: string | number | null; alert?: boolean }) {
  return <div className="min-w-[5.5rem]"><div className="text-xs font-medium text-[var(--ink-muted)]">{label}</div><div className={`mt-0.5 text-sm font-bold ${alert ? "text-red-700" : "text-[var(--ink)]"}`}>{value ?? "Cargando"}</div></div>;
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <section className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-950 sm:flex-row sm:items-center sm:justify-between" role="alert"><div className="flex gap-3"><WarningCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-red-700" /><div><p className="font-semibold">No pudimos consultar las parcelas.</p><p className="mt-0.5 text-red-900/75">Comprueba que la API de SIRA esté disponible.</p></div></div><button type="button" onClick={onRetry} className="button-secondary shrink-0">Reintentar</button></section>;
}

function ParcelSkeleton() {
  return <div className="parcel-block" aria-hidden="true"><div className="skeleton h-full rounded-none" /></div>;
}

function MapControl({ title, description, checked, onChange }: { title: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <section className="flex min-h-24 items-center gap-3 px-4 py-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand-strong)]"><MapTrifold size={19} weight="duotone" /></span><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-[var(--ink)]">{title}</div><p className="mt-0.5 text-xs leading-relaxed text-[var(--ink-muted)]">{description}</p></div><label className="cursor-pointer"><span className="sr-only">Mostrar superficies</span><span className="relative inline-flex h-6 w-11 shrink-0"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" /><span className="absolute inset-0 rounded-full bg-gray-300 transition-colors peer-checked:bg-[#17643a] peer-focus-visible:ring-2 peer-focus-visible:ring-sira-green peer-focus-visible:ring-offset-2" /><span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" /></span></label></section>;
}

function parcelState(item: OperationalParcel): { label: string; tone: string } {
  if (isOffline(item)) return { label: "Sin conexión", tone: "parcel-state-offline" };
  if (item.salud === "healthy") return { label: "Operativa", tone: "parcel-state-online" };
  if (item.salud === "critical") return { label: "Prioridad", tone: "parcel-state-critical" };
  return { label: "Revisar", tone: "parcel-state-warning" };
}

function isOffline(item: OperationalParcel) {
  return !item.dispositivo || item.dispositivo.segundos_sin_conexion > 300;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function formatArea(areaM2: number) {
  return areaM2 >= 10_000
    ? `${(areaM2 / 10_000).toLocaleString("es-PE", { maximumFractionDigits: 2 })} ha`
    : `${areaM2.toLocaleString("es-PE")} m²`;
}
