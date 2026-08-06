"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenText,
  CaretRight,
  GearSix,
  GridFour,
  MapTrifold,
  Plant,
} from "@phosphor-icons/react";
import { PreferencesMenu } from "@/components/PreferencesMenu";

const PRIMARY_LINKS = [
  { href: "/resumen", label: "Resumen", icon: GridFour },
  { href: "/parcelas", label: "Parcelas", icon: MapTrifold },
  { href: "/cultivos", label: "Cultivos", icon: Plant },
];

const SECONDARY_LINKS = [
  { href: "/documentacion", label: "Documentación", icon: BookOpenText },
  { href: "/configuracion", label: "Configuración", icon: GearSix },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function currentSection(pathname: string) {
  if (pathname.startsWith("/parcelas/")) return { label: "Detalle de parcela", parent: "Parcelas" };
  const item = [...PRIMARY_LINKS, ...SECONDARY_LINKS].find((link) => isActive(pathname, link.href));
  return { label: item?.label ?? "SIRA", parent: "Control de campo" };
}

export function AppHeader() {
  const pathname = usePathname();
  const section = currentSection(pathname);

  return (
    <>
      <header className="sira-header">
        <div className="sira-header-inner">
          <Link
            href="/resumen"
            className="header-brand group flex min-w-0 shrink-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/55"
            aria-label="Ir al resumen de SIRA"
          >
            <span className="brand-mark-shell">
              <Image src="/sira-mark.svg" width={42} height={42} alt="" className="h-full w-full object-contain" priority />
            </span>
            <span className="min-w-0">
              <span className="header-brand-name block text-xl font-extrabold leading-none tracking-[-0.04em]">SIRA</span>
              <span className="header-brand-tagline mt-1 hidden text-[9px] font-bold uppercase tracking-[0.18em] sm:block">riego inteligente</span>
            </span>
          </Link>

          <nav className="hide-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto xl:hidden" aria-label="Navegación principal">
            {PRIMARY_LINKS.map((link) => {
              const active = isActive(pathname, link.href);
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`top-nav-link ${active ? "top-nav-link-active" : ""}`}>
                  <Icon size={18} weight={active ? "fill" : "regular"} className="sm:hidden" aria-hidden="true" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="header-location hidden min-w-0 items-center gap-2 xl:flex" aria-label="Ubicación actual">
            <span className="header-breadcrumb-parent text-sm font-medium">{section.parent}</span>
            <CaretRight size={14} className="header-breadcrumb-caret" aria-hidden="true" />
            <strong className="header-breadcrumb-current truncate text-sm font-semibold">{section.label}</strong>
          </div>

          <PreferencesMenu />
        </div>
      </header>

      <aside className="app-sidebar" aria-label="Panel lateral">
        <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ink-subtle)]">Navegación</p>
        <nav className="mt-3 space-y-1" aria-label="Secciones de SIRA">
          {[...PRIMARY_LINKS, ...SECONDARY_LINKS].map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`side-nav-link ${active ? "side-nav-link-active" : ""}`}>
                <Icon size={20} weight={active ? "fill" : "regular"} aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
        </nav>

      </aside>
    </>
  );
}
