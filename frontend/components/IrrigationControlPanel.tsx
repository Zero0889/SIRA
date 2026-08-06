"use client";

import { useState } from "react";
import useSWR from "swr";
import { ArrowsClockwise, Check, Copy, Drop, HandTap, Key, Play, Power, Robot, ShieldCheck, SpinnerGap, Stop, WarningCircle } from "@phosphor-icons/react";
import { api, fetcher } from "@/lib/api";
import type { DeviceProvisioning, IrrigationCommand, IrrigationControl, IrrigationMode } from "@/lib/types";

const MODES: Array<{ value: IrrigationMode; label: string; detail: string; icon: typeof Power }> = [
  { value: "apagado", label: "Apagado", detail: "No acepta órdenes de inicio.", icon: Power },
  { value: "manual", label: "Manual", detail: "Tú decides cuándo y cuánto.", icon: HandTap },
  { value: "automatico", label: "Automático", detail: "SIRA decide con sensores y FAO-56.", icon: Robot },
];

export function IrrigationControlPanel({ parcelaId }: { parcelaId: number }) {
  const { data, error, mutate } = useSWR<IrrigationControl>(`/parcelas/${parcelaId}/control`, fetcher, { refreshInterval: 3000 });
  const [duration, setDuration] = useState(10);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<"start" | "rotate" | null>(null);
  const [provisioning, setProvisioning] = useState<DeviceProvisioning | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function changeMode(mode: IrrigationMode) {
    setBusy(`mode-${mode}`);
    setFeedback(null);
    try {
      await api.actualizarControl(parcelaId, { modo: mode });
      await mutate();
      setFeedback({ tone: "ok", text: `Modo ${mode === "automatico" ? "automático" : mode} activado.` });
    } catch {
      setFeedback({ tone: "error", text: "No pudimos cambiar el modo de operación." });
    } finally {
      setBusy(null);
    }
  }

  async function sendCommand(action: "iniciar" | "detener") {
    setBusy(action);
    setFeedback(null);
    try {
      await api.crearOrdenRiego(parcelaId, { accion: action, duracion_min: action === "iniciar" ? duration : 0 });
      await mutate();
      setConfirmAction(null);
      setFeedback({ tone: "ok", text: action === "iniciar" ? "Orden enviada al nodo. Esperando confirmación." : "Orden de detención enviada con prioridad." });
    } catch (caught) {
      const raw = caught instanceof Error ? caught.message : "";
      const detail = raw.match(/"detail":"([^"]+)"/)?.[1];
      setFeedback({ tone: "error", text: detail ?? "La orden fue bloqueada por una condición de seguridad." });
    } finally {
      setBusy(null);
    }
  }

  async function rotateCredential() {
    setBusy("credential");
    setFeedback(null);
    try {
      setProvisioning(await api.rotarCredencialNodo(parcelaId));
      setConfirmAction(null);
    } catch {
      setFeedback({ tone: "error", text: "No pudimos generar una credencial nueva para el nodo." });
    } finally {
      setBusy(null);
    }
  }

  async function copyValue(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
  }

  const active = data?.ordenes.find((command) => ["pendiente", "entregada", "ejecutando"].includes(command.estado));

  return (
    <section className="control-panel" aria-labelledby="control-title">
      <header className="control-panel-header">
        <div>
          <p className="eyebrow">Operación remota</p>
          <h2 id="control-title">Control de riego</h2>
          <p>El servidor valida sensores y límites antes de aceptar cualquier encendido.</p>
        </div>
        <span className="control-safety"><ShieldCheck size={19} weight="duotone" />Protecciones activas</span>
      </header>

      {error ? <ControlMessage tone="error" text="No pudimos consultar el estado del control." /> : !data ? <div className="skeleton h-52" /> : (
        <>
          <div className="control-modes" role="radiogroup" aria-label="Modo de riego">
            {MODES.map(({ value, label, detail, icon: Icon }) => {
              const selected = data.modo === value;
              return (
                <button key={value} type="button" role="radio" aria-checked={selected} onClick={() => void changeMode(value)} disabled={busy !== null} className={selected ? "is-selected" : ""}>
                  <span><Icon size={20} weight={selected ? "fill" : "duotone"} /></span>
                  <strong>{label}</strong><small>{detail}</small>
                  {busy === `mode-${value}` && <SpinnerGap size={16} className="animate-spin" />}
                </button>
              );
            })}
          </div>

          <div className="control-grid">
            <section className="control-manual" aria-labelledby="manual-title">
              <div className="control-section-heading"><div><h3 id="manual-title">Riego manual</h3><p>Duración limitada a {data.duracion_maxima_min.toLocaleString("es-PE")} minutos.</p></div><Drop size={21} weight="duotone" /></div>
              <label className="control-duration">Duración<input type="number" min={1} max={data.duracion_maxima_min} value={duration} onChange={(event) => setDuration(Math.max(1, Math.min(data.duracion_maxima_min, Number(event.target.value) || 1)))} disabled={data.modo !== "manual"} /><span>min</span></label>
              {confirmAction === "start" ? (
                <div className="control-confirm" role="alert"><p>¿Confirmas el riego durante <strong>{duration} minutos</strong>?</p><div><button type="button" className="button-secondary" onClick={() => setConfirmAction(null)}>Cancelar</button><button type="button" className="button-primary" onClick={() => void sendCommand("iniciar")} disabled={busy !== null}>{busy === "iniciar" ? <SpinnerGap size={17} className="animate-spin" /> : <Play size={17} weight="fill" />}Confirmar inicio</button></div></div>
              ) : (
                <div className="control-actions"><button type="button" className="button-primary" disabled={data.modo !== "manual" || busy !== null || Boolean(active)} onClick={() => setConfirmAction("start")}><Play size={17} weight="fill" />Iniciar riego</button><button type="button" className="control-stop" disabled={busy !== null} onClick={() => void sendCommand("detener")}>{busy === "detener" ? <SpinnerGap size={17} className="animate-spin" /> : <Stop size={17} weight="fill" />}Detener</button></div>
              )}
              {data.modo !== "manual" && <p className="control-hint">Selecciona el modo manual para habilitar el encendido desde la web.</p>}
            </section>

            <section className="control-command" aria-labelledby="command-title">
              <div className="control-section-heading"><div><h3 id="command-title">Última orden</h3><p>Seguimiento desde el servidor hasta el actuador.</p></div>{active ? <span className={`command-dot is-${active.estado}`} /> : <Check size={20} className="text-[var(--brand)]" />}</div>
              {data.ordenes[0] ? <CommandStatus command={data.ordenes[0]} /> : <div className="control-empty"><Check size={21} />Todavía no se enviaron órdenes.</div>}
            </section>
          </div>

          {feedback && <ControlMessage tone={feedback.tone} text={feedback.text} />}

          <details className="control-credential">
            <summary><span><Key size={18} weight="duotone" /><span><strong>Credencial privada del nodo</strong><small>Autentica al ESP32 o STM32 de esta parcela.</small></span></span><ArrowsClockwise size={17} /></summary>
            <div>
              {provisioning ? (
                <div className="provisioning-box" role="status"><p>{provisioning.warning}</p><CredentialRow label="Identificador" value={provisioning.device_id} copied={copied === "id"} onCopy={() => void copyValue("id", provisioning.device_id)} /><CredentialRow label="Token privado" value={provisioning.device_token} copied={copied === "token"} onCopy={() => void copyValue("token", provisioning.device_token)} /><button type="button" className="button-secondary" onClick={() => { setProvisioning(null); setCopied(null); }}>Ya guardé la credencial</button></div>
              ) : confirmAction === "rotate" ? (
                <div className="control-confirm"><p>La credencial anterior dejará de funcionar inmediatamente.</p><div><button type="button" className="button-secondary" onClick={() => setConfirmAction(null)}>Conservar actual</button><button type="button" className="button-primary" onClick={() => void rotateCredential()} disabled={busy !== null}>{busy === "credential" ? <SpinnerGap size={17} className="animate-spin" /> : <Key size={17} />}Generar y reemplazar</button></div></div>
              ) : (
                <div className="credential-intro"><p>Genera una nueva solamente durante la instalación o si crees que la anterior se expuso.</p><button type="button" className="button-secondary" onClick={() => setConfirmAction("rotate")}><ArrowsClockwise size={17} />Rotar credencial</button></div>
              )}
            </div>
          </details>
        </>
      )}
    </section>
  );
}

function CommandStatus({ command }: { command: IrrigationCommand }) {
  const labels: Record<string, string> = { pendiente: "Esperando al nodo", entregada: "Recibida por el nodo", ejecutando: "Riego en ejecución", completada: "Completada", cancelada: "Cancelada", rechazada: "Rechazada por el nodo", fallida: "Fallida", expirada: "Expirada" };
  return <div className="command-status"><div><strong>{labels[command.estado] ?? command.estado}</strong><span>{command.origen === "automatico" ? "Automática" : "Manual"} · {command.accion === "iniciar" ? `${command.duracion_min.toLocaleString("es-PE")} min` : "Detener"}</span></div><p>{command.razon}</p><small>{new Date(command.creado).toLocaleString("es-PE")}</small></div>;
}

function ControlMessage({ tone, text }: { tone: "ok" | "error"; text: string }) {
  return <div className={`control-message is-${tone}`} role={tone === "error" ? "alert" : "status"}>{tone === "error" ? <WarningCircle size={18} weight="fill" /> : <Check size={18} weight="bold" />}{text}</div>;
}

function CredentialRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return <div className="credential-row"><span><small>{label}</small><code>{value}</code></span><button type="button" onClick={onCopy}>{copied ? <Check size={16} weight="bold" /> : <Copy size={16} />}{copied ? "Copiado" : "Copiar"}</button></div>;
}
