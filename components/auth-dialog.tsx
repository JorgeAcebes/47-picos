"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function AuthDialog({ onClose }: { onClose: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) {
      setMessage("Supabase no está configurado. Verifica las variables de entorno.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = isRegister
        ? await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
          })
        : await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (result.error) {
        const errText = result.error.message || "";
        const errCode = ("code" in result.error ? (result.error as { code?: string }).code : "") || "";
        if (errText.toLowerCase().includes("failed to fetch")) {
          setMessage(
            "Error de conexión con Supabase. Comprueba tu conexión a internet o si tienes un bloqueador de anuncios activo."
          );
        } else if (errText.toLowerCase().includes("rate limit") || errCode === "over_email_send_rate_limit") {
          setMessage("Límite de correos alcanzado en Supabase. Espera unos minutos antes de volver a intentarlo.");
        } else {
          setMessage(errText);
        }
      } else if (isRegister) {
        setMessage("¡Cuenta creada! Revisa tu correo para confirmarla.");
      } else {
        onClose();
      }
    } catch (err: unknown) {
      setBusy(false);
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessage(errMsg);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Acceso a 47 Picos"
      >
        <button className="icon-button" aria-label="Cerrar" onClick={onClose}>
          <IconClose />
        </button>
        <span className="eyebrow">TU RETO, TU HISTORIA</span>
        <h2>{isRegister ? "Crea tu cuenta" : "Bienvenido de vuelta"}</h2>
        <p>
          {isRegister
            ? "Guarda cada cima y recupera tu mapa desde cualquier dispositivo."
            : "Entra para ver tu progreso personal."}
        </p>
        <form onSubmit={submit} className="auth-form">
          <label>
            Correo electrónico
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@ejemplo.com"
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </label>
          {message && <p className="form-message">{message}</p>}
          <button className="button button--green button--wide" disabled={busy}>
            {busy
              ? "Un momento…"
              : isRegister
                ? "Crear mi cuenta"
                : "Entrar"}
          </button>
        </form>
        <button
          className="link-button"
          onClick={() => {
            setIsRegister(!isRegister);
            setMessage("");
          }}
        >
          {isRegister ? "Ya tengo una cuenta" : "Quiero crear una cuenta"}
        </button>
      </section>
    </div>
  );
}
