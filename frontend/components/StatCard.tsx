export function StatCard({
  label,
  value,
  unit,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string | number | null | undefined;
  unit?: string;
  hint?: string;
  tone?: "neutral" | "good" | "warn" | "alert";
  icon?: React.ReactNode;
}) {
  const toneClasses = {
    neutral: "bg-white text-gray-950",
    good: "bg-emerald-50 text-emerald-950",
    warn: "bg-amber-50 text-amber-950",
    alert: "bg-red-50 text-red-950",
  }[tone];

  const markerClasses = {
    neutral: "bg-gray-300",
    good: "bg-emerald-600",
    warn: "bg-amber-600",
    alert: "bg-red-700",
  }[tone];

  return (
    <div className={`rounded-xl border border-emerald-950/10 p-4 ${toneClasses}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-semibold text-gray-600">{label}</div>
        {icon ?? <span className={`mt-1 h-2 w-2 rounded-full ${markerClasses}`} aria-hidden="true" />}
      </div>
      <div className="mt-3 flex min-h-9 items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-[-0.035em]">
          {value ?? "Sin dato"}
        </span>
        {unit && value != null && <span className="text-sm font-medium text-gray-500">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-xs leading-relaxed text-gray-500">{hint}</div>}
    </div>
  );
}
