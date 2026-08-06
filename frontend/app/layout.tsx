import type { Metadata } from "next";
import { PreferencesProvider } from "@/components/PreferencesProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SIRA | Sistema Inteligente de Riego Agrícola",
    template: "%s | SIRA",
  },
  description:
    "Supervisión de riego agrícola con sensores, datos meteorológicos y metodología FAO-56.",
  icons: { icon: "/sira-mark.svg", apple: "/sira-mark.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeScript = `(() => { try { localStorage.setItem('sira-theme', 'light'); document.documentElement.classList.remove('dark'); document.documentElement.dataset.theme = 'light'; document.documentElement.style.colorScheme = 'light'; const l = localStorage.getItem('sira-locale'); if (l === 'quz') document.documentElement.lang = 'quz'; } catch {} })()`;
  return (
    <html lang="es" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <PreferencesProvider>
          <AuthProvider><AppShell>{children}</AppShell></AuthProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
}
