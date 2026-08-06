"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { KcEtapa } from "@/lib/types";

const labels: Record<KcEtapa["etapa"], string> = {
  inicial: "Inicial",
  desarrollo: "Desarrollo",
  media: "Media",
  final: "Final",
};

export function CropKcChart({ etapas, nombre }: { etapas: KcEtapa[]; nombre: string }) {
  const data = [...etapas]
    .sort((a, b) => a.orden - b.orden)
    .reduce<Array<{ etapa: string; kc: number; dia: number }>>((rows, etapa) => {
      const dia = (rows.at(-1)?.dia ?? 0) + etapa.duracion_dias;
      return [...rows, { etapa: labels[etapa.etapa], kc: etapa.kc, dia }];
    }, []);

  return (
    <div className="h-64 w-full" role="img" aria-label={`Curva del coeficiente Kc para ${nombre}`}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 14, right: 20, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="cropKcFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="etapa" tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--chart-grid)" }} />
          <YAxis domain={[0, "auto"]} tick={{ fill: "var(--chart-axis)", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ borderRadius: 8, borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)", fontSize: 12 }}
            formatter={(value) => [Number(value).toFixed(2), "Kc"]}
            labelFormatter={(label, payload) => payload[0] ? `${label} · día ${payload[0].payload.dia}` : String(label)}
          />
          <Area type="monotone" dataKey="kc" stroke="var(--brand)" strokeWidth={3} fill="url(#cropKcFill)" activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
