"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { messages, type Locale, type MessageKey } from "@/lib/i18n";

export type ThemePreference = "light" | "dark";

type PreferencesContextValue = {
  theme: ThemePreference;
  resolvedTheme: "light" | "dark";
  locale: Locale;
  setTheme: (theme: ThemePreference) => void;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function applyTheme(theme: ThemePreference) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  return theme;
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("light");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [locale, setLocaleState] = useState<Locale>("es");

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const storedLocale = localStorage.getItem("sira-locale");
      const initialTheme: ThemePreference = "light";
      localStorage.setItem("sira-theme", initialTheme);
      setThemeState(initialTheme);
      setResolvedTheme(applyTheme(initialTheme));
      if (storedLocale === "es" || storedLocale === "quz") setLocaleState(storedLocale);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<PreferencesContextValue>(() => ({
    theme,
    resolvedTheme,
    locale,
    setTheme(next) {
      localStorage.setItem("sira-theme", next);
      setResolvedTheme(applyTheme(next));
      setThemeState(next);
    },
    setLocale(next) {
      localStorage.setItem("sira-locale", next);
      setLocaleState(next);
    },
    t: (key) => messages[locale][key],
  }), [theme, resolvedTheme, locale]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences debe usarse dentro de PreferencesProvider");
  return context;
}
