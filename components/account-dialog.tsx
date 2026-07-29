"use client";

import { FormEvent, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const AVATARS = ["👤", "🧗", "🌍", "⛰️", "🏕️", "🧭", "📸", "🚀"];

export function AccountDialog({ user, onClose, onSignOut }: { user: User; onClose: () => void; onSignOut: () => void }) {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatar, setAvatar] = useState(user.user_metadata?.avatar || "👤");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("theme-dark"));
  }, []);

  async function updatePassword(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    if (password.length < 6) {
      setMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage("Error al actualizar la contraseña: " + error.message);
    } else {
      setMessage("¡Contraseña actualizada correctamente!");
      setPassword("");
    }
  }

  async function selectAvatar(selected: string) {
    if (selected === avatar || !supabase) return;
    setAvatar(selected);
    await supabase.auth.updateUser({ data: { avatar: selected } });
  }

  function toggleTheme() {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("theme-dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("theme-dark");
      localStorage.setItem("theme", "light");
    }
  }

  async function deleteAccount() {
    if (!confirm("⚠️ ¡ADVERTENCIA! Vas a borrar tu cuenta de forma IRREVERSIBLE.\n\nPerderás todos tus registros, cimas, países y fotos almacenadas.\n\n¿Estás completamente seguro de querer continuar?")) {
      return;
    }
    setBusy(true);
    setMessage("Borrando cuenta...");
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Authorization": `Bearer ${session?.access_token}` }
      });
      if (!res.ok) {
        throw new Error("Error en el servidor al intentar borrar la cuenta.");
      }
      await supabase!.auth.signOut();
      window.location.reload();
    } catch (err: any) {
      setMessage(err.message || "Error al borrar la cuenta.");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="dialog-overlay" onClick={onClose} />
      <div className="auth-dialog" style={{ maxWidth: 450 }}>
        <button className="dialog-close" onClick={onClose} aria-label="Cerrar">
          <IconClose />
        </button>

        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{avatar}</div>
          <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>Gestionar mi Cuenta</h2>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>{user.email}</p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600 }}>Avatar</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => selectAvatar(a)}
                style={{
                  fontSize: 24, padding: "8px", background: avatar === a ? "var(--line)" : "transparent",
                  border: "none", borderRadius: "50%", cursor: "pointer", transition: "var(--transition)"
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={updatePassword} style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600 }}>Cambiar contraseña</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="password"
              className="input"
              placeholder="Nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              style={{ flex: 1 }}
            />
            <button type="submit" className="button button--green" disabled={busy || !password}>
              Actualizar
            </button>
          </div>
        </form>

        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Modo Oscuro</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>Cambiar entre modo claro y oscuro</div>
          </div>
          <button className={`button ${isDark ? "button--purple" : "button--outline"}`} onClick={toggleTheme}>
            {isDark ? "Desactivar" : "Activar"}
          </button>
        </div>

        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <button className="button button--outline" onClick={onSignOut} style={{ width: "100%" }}>
            Cerrar Sesión
          </button>
          <button className="button" onClick={deleteAccount} style={{ width: "100%", background: "#fff0f0", color: "var(--danger)", borderColor: "#ffd6d6" }}>
            Borrar mi cuenta definitivamente
          </button>
        </div>

        {message && (
          <p style={{ marginTop: 16, fontSize: 13, textAlign: "center", color: message.includes("Error") ? "var(--danger)" : "var(--pine)" }}>
            {message}
          </p>
        )}
      </div>
    </>
  );
}
