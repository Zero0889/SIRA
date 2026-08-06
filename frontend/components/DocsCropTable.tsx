"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/api";
import type { Cultivo } from "@/lib/types";

const LOCAL = new Set(["Quinua", "Oca"]);
const PROVISIONAL = new Set(["Cañihua", "Kiwicha"]);

export function DocsCropTable() {
  const { data, error } = useSWR<Cultivo[]>("/cultivos", fetcher);

  if (error) return <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">No se pudo cargar la tabla desde la API.</p>;
  if (!data) return <div className="skeleton h-52" aria-label="Cargando tabla de cultivos" />;

  return (
    <div className="max-h-[36rem] overflow-auto rounded-xl border border-emerald-950/10 bg-white">
      <table className="w-full min-w-[42rem] border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-[#edf4ef] text-left text-xs font-bold text-emerald-950/65">
          <tr>
            <th className="px-4 py-3">Cultivo</th>
            <th className="px-3 py-3">Kc inicial</th>
            <th className="px-3 py-3">Kc medio</th>
            <th className="px-3 py-3">Kc final</th>
            <th className="px-3 py-3">Ciclo ref.</th>
            <th className="px-4 py-3">Evidencia</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-950/[0.07] text-gray-700">
          {[...data].sort((a, b) => a.nombre_comun.localeCompare(b.nombre_comun, "es")).map((cultivo) => {
            const etapas = [...cultivo.kc_etapas].sort((a, b) => a.orden - b.orden);
            const inicial = etapas.find((e) => e.etapa === "inicial")?.kc;
            const media = etapas.find((e) => e.etapa === "media")?.kc;
            const final = etapas.find((e) => e.etapa === "final")?.kc;
            const ciclo = etapas.reduce((suma, etapa) => suma + etapa.duracion_dias, 0);
            const evidencia = LOCAL.has(cultivo.nombre_comun) ? "Estudio peruano" : PROVISIONAL.has(cultivo.nombre_comun) ? "Provisional" : "FAO-56";
            return (
              <tr key={cultivo.id} className="hover:bg-emerald-50/40">
                <td className="px-4 py-2.5"><strong className="block text-gray-900">{cultivo.nombre_comun}</strong><span className="text-xs italic text-gray-400">{cultivo.nombre_cientifico}</span></td>
                <td className="px-3 py-2.5 font-mono">{inicial?.toFixed(2) ?? "Sin dato"}</td>
                <td className="px-3 py-2.5 font-mono font-bold text-emerald-800">{media?.toFixed(2) ?? "Sin dato"}</td>
                <td className="px-3 py-2.5 font-mono">{final?.toFixed(2) ?? "Sin dato"}</td>
                <td className="px-3 py-2.5">{ciclo} días</td>
                <td className="px-4 py-2.5"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${evidencia === "Provisional" ? "bg-amber-100 text-amber-900" : evidencia === "Estudio peruano" ? "bg-emerald-100 text-emerald-900" : "bg-sky-100 text-sky-900"}`}>{evidencia}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
