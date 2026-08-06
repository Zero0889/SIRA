"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OperationalParcel } from "@/lib/types";

export function PortfolioChart({ parcelas }: { parcelas: OperationalParcel[] }) {
  const data = parcelas.slice(0, 7).map((item) => {
    const parcela = item.parcela;
    return {
      nombre: parcela.nombre.length > 12 ? `${parcela.nombre.slice(0, 11)}…` : parcela.nombre,
      area: Number((parcela.area_m2 / 10_000).toFixed(2)),
      humedad: item.ultima_lectura?.humedad_suelo_pct ?? null,
    };
  });

  return (
    <div className="h-[18rem] w-full" role="img" aria-label="Superficie y humedad actual por parcela">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 16, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="nombre" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} tickLine={false} axisLine={{ stroke: "var(--chart-grid)" }} />
          <YAxis yAxisId="area" tick={{ fill: "var(--chart-axis)", fontSize: 10 }} tickLine={false} axisLine={false} unit=" ha" />
          <YAxis yAxisId="humidity" orientation="right" domain={[0, 100]} hide />
          <Tooltip
            contentStyle={{ borderRadius: 8, borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 12 }}
            formatter={(value, name) => [name === "humedad" ? `${Number(value).toFixed(1)}%` : `${Number(value).toFixed(2)} ha`, name === "humedad" ? "Humedad" : "Superficie"]}
          />
          <Bar yAxisId="area" dataKey="area" fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={48} />
          <Line yAxisId="humidity" type="monotone" dataKey="humedad" stroke="var(--chart-soil)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--chart-soil)" }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
