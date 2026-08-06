"use client";

import Image from "next/image";
import Link from "next/link";
import { usePreferences } from "@/components/PreferencesProvider";

export function AppFooter() {
  const { t } = usePreferences();
  return (
    <footer className="app-footer mt-10 border-t bg-[var(--surface)]">
      <div className="sira-wide flex flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Link href="/" className="flex w-fit items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sira-green/30">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white">
            <Image src="/sira-mark.svg" width={36} height={36} alt="" className="h-9 w-9 object-contain" />
          </span>
          <span>
            <strong className="block text-sm tracking-tight text-[var(--ink)]">SIRA</strong>
            <span className="block text-xs text-[var(--ink-muted)]">{t("prototype")}</span>
          </span>
        </Link>
        <div className="max-w-xl text-xs leading-relaxed text-[var(--ink-muted)] sm:text-right">
          <p>{t("traceability")}</p>
          <p className="mt-1">{t("calibration")}</p>
        </div>
      </div>
    </footer>
  );
}
