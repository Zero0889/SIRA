import Link from "next/link";
import { ArrowRight, MapTrifold } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[calc(100dvh-13rem)] max-w-2xl items-center py-10">
      <div className="w-full">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
          <MapTrifold size={24} weight="duotone" aria-hidden="true" />
        </span>
        <p className="eyebrow mt-6">Ruta no encontrada</p>
        <h1 className="page-title mt-1">Esta página no forma parte de SIRA.</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--ink-muted)]">
          La dirección puede haber cambiado o estar incompleta. Puedes volver al estado general del sistema o revisar las parcelas registradas.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/resumen" className="button-primary">Abrir resumen <ArrowRight size={17} aria-hidden="true" /></Link>
          <Link href="/" className="button-secondary">Ver parcelas</Link>
        </div>
      </div>
    </section>
  );
}
