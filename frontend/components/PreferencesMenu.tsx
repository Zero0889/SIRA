"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookOpenText, Check, GearSix, SignOut, Translate, UserCircle, X } from "@phosphor-icons/react";
import { usePreferences } from "@/components/PreferencesProvider";
import { useAuth } from "@/components/AuthProvider";
import type { Locale } from "@/lib/i18n";

export function PreferencesMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { locale, setLocale, t } = usePreferences();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button type="button" onClick={() => setOpen((value) => !value)} className="profile-trigger" aria-label="Abrir menú del operador" aria-expanded={open} aria-haspopup="dialog">
        <span className="profile-trigger-icon"><UserCircle size={22} weight="duotone" aria-hidden="true" /></span>
        <span className="hidden text-left lg:block">
          <strong className="block max-w-32 truncate text-xs leading-none text-[var(--ink)]">{user?.nombre ?? "Operador"}</strong>
          <span className="mt-1 block text-[10px] font-semibold text-[var(--ink-muted)]">Sesión protegida</span>
        </span>
      </button>

      {open && (
        <div role="dialog" aria-label="Cuenta y preferencias" className="account-menu">
          <div className="flex items-start justify-between gap-4 border-b p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--brand)] text-white"><UserCircle size={25} weight="fill" /></span>
              <div className="min-w-0">
                <strong className="block truncate text-sm text-[var(--ink)]">{user?.nombre ?? "Operador SIRA"}</strong>
                <span className="mt-1 block truncate text-[11px] font-semibold text-[var(--ink-muted)]">{user?.email}</span>
              </div>
            </div>
            <button type="button" className="icon-button-small -mr-2 -mt-2" onClick={() => setOpen(false)} aria-label={t("close")}><X size={16} /></button>
          </div>

          <section className="p-3">
            <h2 className="mb-2 flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--ink-subtle)]"><Translate size={15} />Idioma</h2>
            <div className="grid grid-cols-2 gap-1.5">
              <LanguageOption value="es" current={locale} label={t("spanish")} onSelect={setLocale} />
              <LanguageOption value="quz" current={locale} label={`${t("quechua")} · ${t("beta")}`} onSelect={setLocale} />
            </div>
          </section>

          <nav className="border-t p-2" aria-label="Accesos del operador">
            <MenuLink href="/configuracion" icon={<GearSix size={18} />} label={t("settings")} onSelect={() => setOpen(false)} />
            <MenuLink href="/documentacion" icon={<BookOpenText size={18} />} label="Documentación" onSelect={() => setOpen(false)} />
            <button type="button" className="account-menu-link w-full" onClick={() => void signOut()}><SignOut size={18} />Cerrar sesión</button>
          </nav>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, label, onSelect }: { href: string; icon: React.ReactNode; label: string; onSelect: () => void }) {
  return <Link href={href} onClick={onSelect} className="account-menu-link">{icon}{label}</Link>;
}

function LanguageOption({ value, current, label, onSelect }: { value: Locale; current: Locale; label: string; onSelect: (value: Locale) => void }) {
  const selected = current === value;
  return (
    <button type="button" onClick={() => onSelect(value)} className={`flex min-h-10 items-center justify-between rounded-lg px-3 text-left text-xs font-semibold transition ${selected ? "bg-[var(--brand-soft)] text-[var(--brand-strong)]" : "bg-[var(--surface-muted)] text-[var(--ink-muted)] hover:text-[var(--ink)]"}`} aria-pressed={selected}>
      {label}{selected && <Check size={15} weight="bold" />}
    </button>
  );
}
