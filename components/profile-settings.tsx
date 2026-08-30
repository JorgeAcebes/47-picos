"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_public: boolean;
  enable_regions?: boolean;
  enable_experiences?: boolean;
};

export function ProfileSettings({ session, onClose, onProfileUpdate }: { session: Session; onClose: () => void; onProfileUpdate?: (profile: any) => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [enableRegions, setEnableRegions] = useState(false);
  const [enableExperiences, setEnableExperiences] = useState(false);
  const [sharePhotos, setSharePhotos] = useState(true);
  const [shareNotes, setShareNotes] = useState(true);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadProfile() {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      
      if (data) {
        setProfile(data);
        setUsername(data.username);
        setIsPublic(data.is_public);
        setEnableRegions(data.enable_regions ?? false);
        setEnableExperiences(data.enable_experiences ?? false);
        setSharePhotos(data.share_photos ?? true);
        setShareNotes(data.share_notes ?? true);
        if (data.avatar_url) setAvatarPreview(data.avatar_url);
      }
      setLoading(false);
    }
    loadProfile();
  }, [session]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setError("");
    setSuccess("");

    if (!username.match(/^[a-zA-Z0-9_]{3,20}$/)) {
      setError("El nombre de usuario debe tener entre 3 y 20 caracteres y solo letras, números o guiones bajos.");
      setSaving(false);
      return;
    }

    let avatarUrl = profile?.avatar_url || null;

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop();
      const path = `${session.user.id}/avatar_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("summit-photos")
        .upload(path, avatarFile, { upsert: true });
        
      if (uploadError) {
        setError("Error al subir la foto de perfil: " + uploadError.message);
        setSaving(false);
        return;
      }
      
      const { data } = supabase.storage.from("summit-photos").getPublicUrl(path);
      avatarUrl = data.publicUrl;
    }

    const updates = {
      id: session.user.id,
      username: username.toLowerCase(),
      avatar_url: avatarUrl,
      is_public: isPublic,
      enable_regions: enableRegions,
      enable_experiences: enableExperiences,
      share_photos: sharePhotos,
      share_notes: shareNotes,
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from("profiles").upsert(updates);

    if (error) {
      setError(error.message.includes("unique") ? "Ese nombre de usuario ya está en uso." : error.message);
    } else {
      setSuccess("Perfil guardado correctamente.");
      if (onProfileUpdate) {
        onProfileUpdate(updates);
      }
      setTimeout(() => {
        onClose();
      }, 750);
    }
    setSaving(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section className="auth-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <button className="icon-button" aria-label="Cerrar" onClick={onClose} style={{ position: "absolute", right: "20px", top: "20px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 24, height: 24 }}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <h2 style={{ marginBottom: "1.5rem", textAlign: "center" }}>Perfil</h2>
        
        {loading ? (
          <p>Cargando...</p>
        ) : (
          <form onSubmit={saveProfile} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#ccc", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative", cursor: "pointer" }}>
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "2rem", color: "white" }}>{username.charAt(0).toUpperCase() || "?"}</span>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setAvatarFile(file);
                      setAvatarPreview(URL.createObjectURL(file));
                    }
                  }}
                  style={{ position: "absolute", width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                />
              </div>
              <small style={{ color: "#666" }}>Toca para cambiar foto</small>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>Nombre de usuario</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: "0.5rem", top: "50%", transform: "translateY(-50%)", color: "#666" }}>@</span>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value.replace(/^@/, ''))}
                  placeholder="tu_usuario"
                  style={{ width: "100%", padding: "0.5rem 0.5rem 0.5rem 1.7rem", borderRadius: "4px", border: "1px solid #ccc" }}
                  required
                />
              </div>
            </div>
            
            <div style={{ background: "#f5f5f5", padding: "0.75rem", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "bold", fontSize: "0.9rem" }}>Perfil Público</span>
                <label className="custom-toggle">
                  <input 
                    type="checkbox" 
                    checked={isPublic} 
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                  <div className="toggle-switch"></div>
                </label>
              </div>
              <p style={{ fontSize: "0.75rem", color: "#666", margin: 0, lineHeight: 1.2 }}>
                {isPublic 
                  ? "Cualquiera podrá buscarte y ver tu actividad." 
                  : "Solo los usuarios que aceptes podrán ver tu actividad."}
              </p>
            </div>

            <div style={{ background: "#f5f5f5", padding: "0.75rem", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <span style={{ fontWeight: "bold", fontSize: "0.9rem" }}>Privacidad de datos</span>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.9rem" }}>Mostrar mis fotos</span>
                <label className="custom-toggle">
                  <input 
                    type="checkbox" 
                    checked={sharePhotos} 
                    onChange={(e) => setSharePhotos(e.target.checked)}
                  />
                  <div className="toggle-switch"></div>
                </label>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.9rem" }}>Mostrar mis notas</span>
                <label className="custom-toggle">
                  <input 
                    type="checkbox" 
                    checked={shareNotes} 
                    onChange={(e) => setShareNotes(e.target.checked)}
                  />
                  <div className="toggle-switch"></div>
                </label>
              </div>
            </div>

            <div style={{ background: "#f5f5f5", padding: "0.75rem", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <span style={{ fontWeight: "bold", fontSize: "0.9rem" }}>Modos de la app</span>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.9rem" }}>Habilitar modo experiencias</span>
                <label className="custom-toggle">
                  <input 
                    type="checkbox" 
                    checked={enableExperiences} 
                    onChange={(e) => setEnableExperiences(e.target.checked)}
                  />
                  <div className="toggle-switch"></div>
                </label>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.9rem" }}>Habilitar modo regiones</span>
                <label className="custom-toggle">
                  <input 
                    type="checkbox" 
                    checked={enableRegions} 
                    onChange={(e) => setEnableRegions(e.target.checked)}
                  />
                  <div className="toggle-switch"></div>
                </label>
              </div>
            </div>
            
            {error && <p style={{ color: "red", margin: 0, fontSize: "0.9rem" }}>{error}</p>}
            {success && <p style={{ color: "green", margin: 0, fontSize: "0.9rem" }}>{success}</p>}
            
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button type="submit" className="button button--green" disabled={saving} style={{ flex: 1 }}>
                {saving ? "Guardando..." : "Guardar Perfil"}
              </button>
              <button 
                type="button" 
                className="button button--outline" 
                onClick={async () => {
                  await supabase?.auth.signOut();
                  onClose();
                }}
              >
                Cerrar Sesión
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
