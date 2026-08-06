"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRight, CheckCircle, LockKey, Plant, SpinnerGap } from "@phosphor-icons/react";
import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

type Mode = "login" | "register";

export default function SignInPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useAuth();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "register") await api.register({ nombre: name.trim(), email: email.trim(), password });
      else await api.login({ email: email.trim(), password });
      await refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "No pudimos completar el acceso.";
      setError(message.includes("401") ? "El correo o la contraseña no son correctos." : message.includes("409") ? "Ese correo ya está registrado." : "No pudimos completar el acceso. Revisa los datos e inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-story" aria-label="Presentación de SIRA">
        <div className="auth-brand">
          <span><Image src="/sira-mark-inverse.svg" alt="" width={38} height={38} /></span>
          <div><strong>SIRA</strong><small>Riego inteligente</small></div>
        </div>
        <div className="auth-story-copy">
          <p className="auth-kicker"><Plant size={17} weight="fill" /> Agricultura conectada</p>
          <h1>Tu cultivo, visible y protegido desde cualquier lugar.</h1>
          <p>Supervisa sensores, comprende la demanda hídrica y controla el riego con trazabilidad desde una sola plataforma.</p>
          <ul>
            <li><CheckCircle size={18} weight="fill" /> Estado de parcelas y nodos en tiempo real</li>
            <li><CheckCircle size={18} weight="fill" /> Decisiones explicadas con metodología FAO-56</li>
            <li><CheckCircle size={18} weight="fill" /> Control manual y automático con límites de seguridad</li>
          </ul>
        </div>
        <p className="auth-story-foot">SIRA · Proyecto FIEE UNMSM</p>
      </section>

      <section className="auth-form-side">
        <div className="auth-form-card">
          <span className="auth-lock"><LockKey size={22} weight="duotone" /></span>
          <p className="eyebrow">Acceso seguro</p>
          <h2>{mode === "login" ? "Bienvenido a SIRA" : "Crea tu cuenta"}</h2>
          <p className="auth-form-intro">{mode === "login" ? "Ingresa para consultar y operar únicamente tus parcelas." : "Comienza registrando tu primera parcela y su nodo de campo."}</p>

          <div className="auth-mode" role="tablist" aria-label="Tipo de acceso">
            <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => { setMode("login"); setError(null); }}>Iniciar sesión</button>
            <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => { setMode("register"); setError(null); }}>Crear cuenta</button>
          </div>

          <form onSubmit={submit} className="auth-form">
            {mode === "register" && <label>Nombre completo<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={120} autoComplete="name" required /></label>}
            <label>Correo electrónico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="nombre@correo.com" required /></label>
            <label>Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={10} placeholder="Mínimo 10 caracteres" required /></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button type="submit" className="button-primary auth-submit" disabled={loading}>
              {loading ? <SpinnerGap size={18} className="animate-spin" /> : null}
              {loading ? "Procesando" : mode === "login" ? "Entrar a SIRA" : "Crear mi cuenta"}
              {!loading && <ArrowRight size={18} weight="bold" />}
            </button>
          </form>
          <p className="auth-privacy">La sesión se conserva en una cookie protegida. SIRA no guarda la contraseña en texto legible.</p>
        </div>
      </section>
    </div>
  );
}
