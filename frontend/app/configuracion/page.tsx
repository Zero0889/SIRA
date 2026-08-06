"use client";

import useSWR from "swr";
import {
  BellRinging,
  CheckCircle,
  DeviceMobile,
  Key,
  LinkSimple,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { fetcher } from "@/lib/api";
import type { NotificationHistoryItem, NotificationStatus } from "@/lib/types";

const stateContent = {
  ready: { label: "Listo para enviar", tone: "bg-emerald-50 text-emerald-800", icon: CheckCircle },
  disabled: { label: "Alertas SMS desactivadas", tone: "bg-[var(--surface-muted)] text-[var(--ink-muted)]", icon: ShieldCheck },
  incomplete: { label: "Configuración incompleta", tone: "bg-amber-50 text-amber-900", icon: WarningCircle },
};

export default function ConfiguracionPage() {
  const { data: status, error } = useSWR<NotificationStatus>("/notifications/status", fetcher);
  const { data: history } = useSWR<NotificationHistoryItem[]>("/notifications/history", fetcher);
  const current = status ? stateContent[status.state] : null;
  const StatusIcon = current?.icon ?? BellRinging;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="border-b pb-6">
        <p className="eyebrow">Canales y preferencias</p>
        <h1 className="page-title mt-1">Configuración de SIRA</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ink-muted)]">
          Supervisa las alertas móviles sin guardar secretos en el navegador. El idioma y los accesos técnicos se administran desde el botón superior.
        </p>
      </header>

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
              <DeviceMobile size={23} weight="duotone" />
            </span>
            <div>
              <h2 className="section-title">Alertas con SMS Gateway for Android</h2>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">Un Android dedicado recibe las alertas de SIRA y las envía mediante su propia SIM.</p>
            </div>
          </div>
          {current && (
            <span className={`inline-flex min-h-9 w-fit items-center gap-2 rounded-lg px-3 text-xs font-bold ${current.tone}`}>
              <StatusIcon size={17} weight="fill" />{current.label}
            </span>
          )}
        </div>

        {error ? (
          <div className="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-900" role="alert">No se pudo consultar la API. Inicia SIRA y vuelve a intentarlo.</div>
        ) : !status ? (
          <div className="space-y-3 p-5"><div className="skeleton h-16" /><div className="skeleton h-32" /></div>
        ) : (
          <div className="grid gap-px bg-[var(--line)] sm:grid-cols-3">
            <SettingDatum label="Proveedor" value={status.provider === "disabled" ? "No seleccionado" : "SMSGate"} />
            <SettingDatum label="Modo" value={modeLabel(status.mode)} />
            <SettingDatum label="Destinatario" value={status.recipient || "Sin configurar"} />
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="panel p-5">
          <h2 className="section-title">Cómo activarlo</h2>
          <ol className="mt-5 space-y-5">
            <Step number="1" title="Prepara el Android">
              Instala SMS Gateway for Android, concede el permiso para SMS y comprueba que la SIM pueda enviar un mensaje normal.
            </Step>
            <Step number="2" title="Elige el modo">
              Usa <code>local</code> si SIRA y el Android comparten Wi-Fi, o <code>cloud</code> si están lejos. Copia de la aplicación el usuario y la contraseña de la sección correspondiente.
            </Step>
            <Step number="3" title="Configura SIRA">
              En <code>.env</code> define <code>SMS_PROVIDER=smsgate</code>, el modo, las credenciales y <code>SMS_TO</code> en formato internacional. En local agrega también la URL mostrada por el Android.
            </Step>
            <Step number="4" title="Reinicia y prueba">
              Reinicia SIRA, confirma aquí el estado “Listo para enviar” y luego envía una prueba desde la API.
            </Step>
            <Step number="5" title="Autoriza la prueba">
              Abre la API, usa <code>POST /notifications/test</code> e introduce <code>INGEST_API_KEY</code> en la cabecera <code>X-API-Key</code>.
            </Step>
          </ol>
          <a href="http://127.0.0.1:8000/docs#/notifications" target="_blank" rel="noreferrer" className="button-secondary mt-6">
            <LinkSimple size={17} /> Abrir prueba en la API
          </a>
        </section>

        <div className="space-y-5">
          <section className="panel p-5">
            <div className="flex items-center gap-2"><BellRinging size={19} className="text-[var(--brand)]" /><h2 className="section-title">Eventos configurados</h2></div>
            <div className="mt-4 space-y-2 text-sm">
              <Trigger label="Riego recomendado" enabled={status?.triggers.irrigation} />
              <Trigger label="Riesgo de helada (≤ 3 °C)" enabled={status?.triggers.frost} />
              <Trigger label="Tanque crítico (< 15 %)" enabled={status?.triggers.tank_low} />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-[var(--ink-muted)]">Las alertas iguales se limitan a una cada {status?.cooldown_minutes ?? 60} minutos por parcela para evitar mensajes repetidos.</p>
          </section>

          <section className="panel p-5">
            <div className="flex items-center gap-2"><Key size={19} className="text-[var(--brand)]" /><h2 className="section-title">Privacidad y costos</h2></div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--ink-muted)]">Las credenciales solo viven en el backend. El modo local no necesita Internet, pero ambos equipos deben compartir red; el modo cloud sí necesita Internet. El costo del SMS depende del plan de la SIM.</p>
          </section>
        </div>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b px-5 py-4"><h2 className="section-title">Actividad reciente</h2><p className="mt-1 text-xs text-[var(--ink-muted)]">Registro local de intentos de envío, con números ocultos.</p></div>
        {!history?.length ? <p className="px-5 py-9 text-center text-sm text-[var(--ink-muted)]">Todavía no hay mensajes registrados.</p> : (
          <div className="divide-y">
            {history.map((item) => <div key={item.id} className="flex flex-col gap-1 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><span className="font-semibold text-[var(--ink)]">{item.message}</span><p className="mt-0.5 text-xs text-[var(--ink-muted)]">{item.recipient} · {new Date(item.created_at).toLocaleString("es-PE")}</p></div><span className={item.status === "sent" ? "text-emerald-700" : "text-red-700"}>{item.status === "sent" ? "Enviado" : "Falló"}</span></div>)}
          </div>
        )}
      </section>
    </div>
  );
}

function SettingDatum({ label, value }: { label: string; value: string }) { return <div className="bg-[var(--surface)] p-5"><div className="text-xs font-semibold text-[var(--ink-muted)]">{label}</div><div className="mt-1 font-bold capitalize text-[var(--ink)]">{value}</div></div>; }
function Step({ number, title, children }: { number: string; title: string; children: React.ReactNode }) { return <li className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand-strong)]">{number}</span><div><h3 className="text-sm font-bold text-[var(--ink)]">{title}</h3><p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">{children}</p></div></li>; }
function Trigger({ label, enabled }: { label: string; enabled?: boolean }) { return <div className="flex items-center justify-between gap-3 rounded-lg bg-[var(--surface-muted)] px-3 py-2"><span>{label}</span><span className={`text-xs font-bold ${enabled ? "text-emerald-700" : "text-[var(--ink-muted)]"}`}>{enabled ? "Activo" : "Inactivo"}</span></div>; }
function modeLabel(mode: NotificationStatus["mode"]) { return { local: "Local", cloud: "Nube", private: "Servidor privado", invalid: "No válido" }[mode]; }
