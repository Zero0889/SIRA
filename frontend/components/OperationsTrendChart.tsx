"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OperationalTrendPoint } from "@/lib/types";

export function OperationsTrendChart({ data }: { data: OperationalTrendPoint[] }) {
  const formatted = data.map((point) => ({
    ...point,
    dia: new Date(`${point.fecha}T12:00:00`).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
    }),
  }));

  return (
    <div className="h-[19rem] w-full" role="img" aria-label="Tendencia de riego planificado y ejecutado durante los últimos 14 días">
      <ResponsiveContainer>
        <ComposedChart data={formatted} margin={{ top: 12, right: 8, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id="water-volume" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.015} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="2 6" vertical={false} />
          <XAxis dataKey="dia" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "var(--chart-grid)" }} minTickGap={18} />
          <YAxis yAxisId="water" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} tickLine={false} axisLine={false} width={50} unit=" L" />
          <YAxis yAxisId="time" orientation="right" hide />
          <Tooltip
            contentStyle={{ borderRadius: 10, borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 12, boxShadow: "0 10px 26px rgb(19 32 24 / 0.08)" }}
            formatter={(value, name) => {
              if (name === "volumen_ejecutado_l") return [`${Number(value).toLocaleString("es-PE")} L`, "Agua ejecutada"];
              if (name === "minutos_planificados") return [`${Number(value).toFixed(1)} min`, "Tiempo planificado"];
              return [value, name];
            }}
          />
          <Area yAxisId="water" type="monotone" dataKey="volumen_ejecutado_l" stroke="var(--brand)" strokeWidth={2.4} fill="url(#water-volume)" />
          <Bar yAxisId="time" dataKey="minutos_planificados" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={26} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
