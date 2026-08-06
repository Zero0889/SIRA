"use client";

import { useEffect, useState } from "react";
import {
  Check,
  MapPin,
  SpinnerGap,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import type { Cultivo, Parcela } from "@/lib/types";

export function ParcelaForm({
  cultivos,
  latInicial,
  lonInicial,
  onGuardado,
  onCancelar,
  areaM2,
  onAreaChange,
}: {
  cultivos: Cultivo[];
  latInicial: number;
  lonInicial: number;
  onGuardado: (parcela: Parcela) => void;
  onCancelar: () => void;
  areaM2: number;
  onAreaChange: (areaM2: number) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [altitud, setAltitud] = useState<number | null>(null);
  const [fechaSiembra] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 60);
    return date.toISOString().slice(0, 10);
  });
  const cargandoAltitud = altitud === null;

  useEffect(() => {
    if (!Number.isFinite(latInicial) || !Number.isFinite(lonInicial)) return;

    let active = true;
    api
      .elevacion(latInicial, lonInicial)
      .then((response) => {
        if (active) setAltitud(response.altitud_m);
      })
      .catch(() => {
        if (active) setAltitud(0);
      });

    return () => {
      active = false;
    };
  }, [latInicial, lonInicial]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    const data = new FormData(event.currentTarget);

    try {
      const nueva = await api.crearParcela({
        nombre: String(data.get("nombre") ?? "").trim(),
        device_id: String(data.get("device_id") ?? "").trim(),
        latitud: Number(data.get("latitud")),
        longitud: Number(data.get("longitud")),
        altitud_m: Number(data.get("altitud_m")) || 0,
        area_m2: Number(data.get("area_m2")),
        caudal_emisor_l_h: Number(data.get("caudal_emisor_l_h")) || 4,
        n_emisores: Number(data.get("n_emisores")) || 0,
        cultivo_id: Number(data.get("cultivo_id")),
        fecha_siembra: String(data.get("fecha_siembra") ?? ""),
      });
      onGuardado(nueva);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No pudimos guardar la parcela. Revisa la conexión e inténtalo otra vez.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-emerald-950/10 px-4 py-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin size={19} weight="fill" className="text-emerald-700" aria-hidden="true" />
            <h2 className="section-title">Nueva parcela</h2>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Completa los datos del punto seleccionado.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancelar}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-950 active:translate-y-px"
          aria-label="Cancelar creación de parcela"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-4 p-4">
        <Field label="Nombre de la parcela" name="nombre" placeholder="Chacra norte" required />
        <Field label="Identificador del dispositivo" name="device_id" placeholder="ESP32-001" required />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitud" name="latitud" type="number" step="0.00001" value={latInicial} readOnly required />
          <Field label="Longitud" name="longitud" type="number" step="0.00001" value={lonInicial} readOnly required />
        </div>

        <Field
          label="Altitud (m s. n. m.)"
          name="altitud_m"
          type="number"
          step="0.1"
          value={altitud ?? 0}
          onChange={(event) => setAltitud(Number(event.target.value) || 0)}
          helper={cargandoAltitud ? "Consultando elevación…" : "Puedes corregir el valor calculado."}
        />

        <div>
          <label htmlFor="cultivo_id" className="mb-1.5 block text-sm font-semibold text-gray-800">
            Cultivo
          </label>
          <select id="cultivo_id" name="cultivo_id" required className="field-control">
            <option value="">Selecciona un cultivo</option>
            {cultivos.map((cultivo) => (
              <option key={cultivo.id} value={cultivo.id}>
                {cultivo.nombre_comun}
              </option>
            ))}
          </select>
        </div>

        <Field
          label="Fecha de siembra"
          name="fecha_siembra"
          type="date"
          defaultValue={fechaSiembra}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Emisores" name="n_emisores" type="number" min="1" step="1" defaultValue={50} required />
          <Field label="Caudal por emisor" name="caudal_emisor_l_h" type="number" min="0.1" step="0.1" defaultValue={4} suffix="L/h" />
        </div>

        <Field
          label="Área del sembrío"
          name="area_m2"
          type="number"
          step="1"
          min="1"
          value={areaM2}
          onChange={(event) => onAreaChange(Math.max(1, Number(event.target.value) || 1))}
          suffix="m²"
          required
        />

        {error && (
          <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900" role="alert">
            <WarningCircle size={19} weight="fill" className="mt-0.5 shrink-0" />
            <span className="break-words">{error}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-emerald-950/10 bg-emerald-950/[0.02] p-4">
        <button type="button" onClick={onCancelar} className="button-secondary flex-1">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="button-primary flex-1">
          {saving ? (
            <>
              <SpinnerGap size={18} className="animate-spin" aria-hidden="true" />
              Guardando
            </>
          ) : (
            <>
              <Check size={18} weight="bold" aria-hidden="true" />
              Crear parcela
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  helper,
  suffix,
  name,
  ...props
}: {
  label: string;
  helper?: string;
  suffix?: string;
  name: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `field-${name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-gray-800">
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          id={id}
          name={name}
          className={`field-control ${suffix ? "pr-12" : ""}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">
            {suffix}
          </span>
        )}
      </div>
      {helper && <p className="mt-1 text-xs leading-relaxed text-gray-500">{helper}</p>}
    </div>
  );
}
