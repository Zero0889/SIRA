"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { LanguageNotice } from "@/components/LanguageNotice";
import { useAuth } from "@/components/AuthProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const publicRoute = pathname.startsWith("/ingresar");

  useEffect(() => {
    if (user === null && !publicRoute) router.replace("/ingresar");
    if (user && publicRoute) router.replace("/resumen");
  }, [publicRoute, router, user]);

  if (publicRoute) return <main id="contenido" className="auth-main">{children}</main>;
  if (!user) {
    return (
      <main id="contenido" className="grid min-h-dvh place-items-center bg-[var(--canvas)]" aria-label="Comprobando sesión">
        <div className="text-center"><span className="mx-auto block h-9 w-9 animate-spin rounded-full border-2 border-[var(--brand-soft)] border-t-[var(--brand)]" /><p className="mt-3 text-sm font-semibold text-[var(--ink-muted)]">Preparando SIRA</p></div>
      </main>
    );
  }

  return (
    <>
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <AppHeader />
      <LanguageNotice />
      <main id="contenido" className="app-main sira-wide min-h-[calc(100dvh-4.5rem-1px)] px-5 py-7 sm:px-8 lg:py-9">{children}</main>
    </>
  );
}
