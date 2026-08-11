"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Parse URL hash for errors (e.g. if the link expired)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash && hash.includes("error=access_denied")) {
        if (hash.includes("otp_expired")) {
          setError("El enlace de recuperación ha caducado o ya ha sido utilizado. Por favor, solicita uno nuevo.");
        } else {
          setError("Ocurrió un error con el enlace de recuperación.");
        }
      }
    }
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    
    setBusy(true);
    setMessage("");
    setError("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage("Contraseña actualizada correctamente. Redirigiendo...");
        setTimeout(() => {
          router.push("/");
        }, 2000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <section className="auth-dialog" style={{ width: "100%", maxWidth: "400px", margin: "0 auto", position: "relative" }}>
        <span className="eyebrow">RECUPERACIÓN</span>
        <h2>Nueva contraseña</h2>
        
        {error ? (
          <div style={{ marginTop: "1rem" }}>
            <p className="form-message" style={{ color: "var(--red, #e74c3c)", marginBottom: "1rem" }}>{error}</p>
            <Link href="/" className="button button--green button--wide" style={{ textAlign: "center", display: "block" }}>
              Volver al inicio
            </Link>
          </div>
        ) : message ? (
          <div style={{ marginTop: "1rem" }}>
            <p className="form-message" style={{ color: "var(--green, #2ecc71)" }}>{message}</p>
          </div>
        ) : (
          <>
            <p>Introduce tu nueva contraseña.</p>
            <form onSubmit={submit} className="auth-form">
              <label>
                Nueva contraseña
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </label>
              
              <button className="button button--green button--wide" disabled={busy}>
                {busy ? "Guardando..." : "Guardar contraseña"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
