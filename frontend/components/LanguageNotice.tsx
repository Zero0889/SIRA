"use client";

import Link from "next/link";
import { Info } from "@phosphor-icons/react";
import { usePreferences } from "@/components/PreferencesProvider";

export function LanguageNotice() {
  const { locale } = usePreferences();
  if (locale !== "quz") return null;
  return (
    <div className="border-b border-sky-200 bg-sky-50">
      <div className="sira-wide flex gap-2 px-5 py-2.5 text-xs leading-relaxed text-sky-900 sm:px-8">
        <Info size={17} weight="fill" className="mt-0.5 shrink-0" />
        <p>
          <strong>Qhichwa sureño · prueba:</strong> navegación principal traducida. El contenido técnico continúa en español hasta una revisión lingüística especializada. <Link href="/configuracion" className="font-bold underline underline-offset-2">Astawan willakuy</Link>
        </p>
      </div>
    </div>
  );
}
