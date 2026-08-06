"use client";

import Link from "next/link";
import { ArrowsClockwise, WarningCircle } from "@phosphor-icons/react";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-13rem)] max-w-2xl items-center py-10" role="alert">
      <div className="w-full rounded-xl border border-red-200 bg-red-50 p-6 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-red-700">
          <WarningCircle size={25} weight="duotone" aria-hidden="true" />
        </span>
        <p className="mt-6 text-sm font-semibold text-red-800">No pudimos mostrar esta pantalla</p>
        <h1 className="mt-1 text-2xl font-bold tracking-[-0.03em] text-red-950">SIRA encontró un problema inesperado.</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-red-900">
          Tus datos no se modificaron. Vuelve a intentarlo y, si el problema continúa, regresa al resumen para comprobar el estado del sistema.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="button-primary"><ArrowsClockwise size={17} aria-hidden="true" /> Reintentar</button>
          <Link href="/resumen" className="button-secondary">Volver al resumen</Link>
        </div>
      </div>
    </section>
  );
}
