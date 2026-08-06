"use client";

import { ChartLine } from "@phosphor-icons/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Lectura } from "@/lib/types";

export function SoilChart({ lecturas }: { lecturas: Lectura[] }) {
  const data = [...lecturas]
    .reverse()
    .filter((lectura) => lectura.humedad_suelo_pct != null)
    .map((lectura) => ({
      hora: new Date(lectura.timestamp).toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      suelo: lectura.humedad_suelo_pct,
      tanque: lectura.nivel_tanque_pct,
    }));

  if (data.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg bg-emerald-950/[0.025] px-6 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-white text-gray-500 ring-1 ring-emerald-950/10">
          <ChartLine size={22} aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm font-semibold text-gray-800">Aún no hay lecturas</p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-gray-500">
          Inicia el simulador o conecta el ESP32 para ver la humedad del suelo y el nivel del tanque.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-4 text-xs font-medium text-gray-600" aria-hidden="true">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 bg-[#765548]" />
          Humedad de suelo
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 bg-[#23648f]" />
          Nivel del tanque
        </span>
      </div>
      <div
        className="h-64 w-full"
        role="img"
        aria-label="Gráfico de humedad del suelo y nivel del tanque durante las últimas 24 horas"
      >
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 18, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 5" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="hora"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "var(--chart-grid)" }}
              interval="preserveStartEnd"
              tick={{ fill: "var(--chart-axis)" }}
            />
            <YAxis
              fontSize={11}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tick={{ fill: "var(--chart-axis)" }}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                borderColor: "var(--line)",
                background: "var(--surface)",
                color: "var(--ink)",
                boxShadow: "0 4px 8px rgb(20 49 31 / 0.1)",
              }}
              formatter={(value, name) => {
                const numericValue = typeof value === "number" ? value : Number(value ?? 0);
                return [
                  `${numericValue.toFixed(1)}%`,
                  name === "suelo" ? "Humedad de suelo" : "Nivel del tanque",
                ];
              }}
            />
            <ReferenceLine
              y={60}
              stroke="var(--chart-threshold)"
              strokeDasharray="4 4"
              label={{ value: "Umbral 60%", fontSize: 10, fill: "var(--chart-threshold)", position: "insideTopRight" }}
            />
            <Line
              type="monotone"
              dataKey="suelo"
              stroke="var(--chart-soil)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="tanque"
              stroke="var(--chart-water)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
