import {
  CheckCircle,
  Drop,
  PauseCircle,
  XCircle,
} from "@phosphor-icons/react";

export function DecisionBadge({
  estado,
  razon,
  minutos,
}: {
  estado: string | null | undefined;
  razon: string | null | undefined;
  minutos?: number | null;
}) {
  if (!estado) return null;

  const config = {
    planificado: {
      label: "Riego planificado",
      className: "border-sky-200 bg-sky-50 text-sky-950",
      iconClass: "bg-sky-100 text-sky-800",
      icon: Drop,
    },
    ejecutando: {
      label: "Riego en curso",
      className: "border-emerald-200 bg-emerald-50 text-emerald-950",
      iconClass: "bg-emerald-100 text-emerald-800",
      icon: Drop,
    },
    completado: {
      label: "Riego completado",
      className: "border-emerald-200 bg-white text-gray-950",
      iconClass: "bg-emerald-50 text-emerald-800",
      icon: CheckCircle,
    },
    cancelado: {
      label: "Riego cancelado",
      className: "border-gray-200 bg-gray-50 text-gray-950",
      iconClass: "bg-gray-200 text-gray-700",
      icon: XCircle,
    },
  } as const;

  const current = config[estado as keyof typeof config] ?? {
    label: "Decisión registrada",
    className: "border-gray-200 bg-white text-gray-950",
    iconClass: "bg-gray-100 text-gray-700",
    icon: PauseCircle,
  };
  const Icon = current.icon;

  return (
    <section className={`rounded-xl border p-4 ${current.className}`} aria-label="Última decisión de riego">
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${current.iconClass}`}>
          <Icon size={22} weight="fill" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="font-bold">{current.label}</h2>
            {minutos != null && minutos > 0 && (
              <span className="text-sm font-semibold">{minutos.toFixed(1)} minutos</span>
            )}
          </div>
          {razon && <p className="mt-1 text-sm leading-relaxed opacity-80">{razon}</p>}
        </div>
      </div>
    </section>
  );
}
