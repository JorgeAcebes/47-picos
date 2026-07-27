"use client";

import dynamic from "next/dynamic";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { peaks, type Peak } from "@/data/peaks";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { AuthDialog } from "./auth-dialog";

const SpainMap = dynamic(
  () => import("./spain-map").then((module) => module.SpainMap),
  {
    ssr: false,
    loading: () => <div className="map map-loading">Cargando el mapa de los 52 territorios…</div>,
  },
);

type Ascent = { summit_id: string; achieved_on: string; notes: string | null };
type SummitPhoto = {
  id: string;
  summit_id: string;
  public_url: string;
  taken_on: string;
  created_at: string;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

/* ── SVG icon components ────────────────── */
function IconMountain({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3l4 8 5-5 2 4H2L8 3z" />
      <path d="M4.14 15.08l2.6-3.51L8 13l4-5.5 4 5.5 2.74-2.42L21.86 15.08" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function SummitTracker() {
  const [session, setSession] = useState<Session | null>(null);
  const [ascents, setAscents] = useState<Ascent[]>([]);
  const [photos, setPhotos] = useState<SummitPhoto[]>([]);
  const [selected, setSelected] = useState<Peak | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [climbDate, setClimbDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxCaption, setLightboxCaption] = useState("");

  /* ── Auto-dismiss toast ───────────────── */
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  /* ── Auth ──────────────────────────────── */
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => setSession(nextSession),
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  /* ── Load progress ────────────────────── */
  useEffect(() => {
    async function loadProgress() {
      if (!supabase || !session) {
        setAscents([]);
        setPhotos([]);
        return;
      }
      const [ascentResult, photoResult] = await Promise.all([
        supabase
          .from("ascents")
          .select("summit_id, achieved_on, notes")
          .order("achieved_on", { ascending: false }),
        supabase
          .from("summit_photos")
          .select("id, summit_id, public_url, taken_on, created_at")
          .order("taken_on", { ascending: false }),
      ]);
      if (ascentResult.data) setAscents(ascentResult.data as Ascent[]);
      if (photoResult.data) setPhotos(photoResult.data as SummitPhoto[]);
    }
    loadProgress();
  }, [session]);

  /* ── Derived state ────────────────────── */
  const completedCodes = useMemo(
    () =>
      new Set(
        ascents
          .map((a) => peaks.find((p) => p.id === a.summit_id)?.code)
          .filter(Boolean) as string[],
      ),
    [ascents],
  );

  const selectedAscent = selected
    ? ascents.find((a) => a.summit_id === selected.id)
    : undefined;
  const selectedPhotos = selected
    ? photos.filter((p) => p.summit_id === selected.id)
    : [];
  const completion = Math.round((ascents.length / peaks.length) * 100);

  /* ── Handlers ─────────────────────────── */
  const openInformation = useCallback((peak: Peak) => {
    setSelected(peak);
    setRecordOpen(false);
    setNotice("");
  }, []);

  const openRecord = useCallback(
    (peak: Peak) => {
      if (!session) {
        setAuthOpen(true);
        return;
      }
      setSelected(peak);
      setClimbDate(
        ascents.find((a) => a.summit_id === peak.id)?.achieved_on ??
          new Date().toISOString().slice(0, 10),
      );
      setNotes(ascents.find((a) => a.summit_id === peak.id)?.notes ?? "");
      setFiles([]);
      setNotice("");
      setRecordOpen(true);
    },
    [session, ascents],
  );

  function onFilesChanged(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    setFiles(nextFiles);
    if (nextFiles[0]?.lastModified)
      setClimbDate(
        new Date(nextFiles[0].lastModified).toISOString().slice(0, 10),
      );
  }

  async function saveAscent() {
    if (!supabase || !session || !selected) return;
    setSaving(true);
    setNotice("");
    const ascentResult = await supabase.from("ascents").upsert(
      {
        user_id: session.user.id,
        summit_id: selected.id,
        achieved_on: climbDate,
        notes: notes || null,
      },
      { onConflict: "user_id,summit_id" },
    );
    if (ascentResult.error) {
      setNotice(ascentResult.error.message);
      setSaving(false);
      return;
    }
    const uploaded: SummitPhoto[] = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const path = `${session.user.id}/${selected.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const upload = await supabase.storage
        .from("summit-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upload.error) {
        setNotice(
          `Ascensión guardada, pero una foto no pudo subirse: ${upload.error.message}`,
        );
        continue;
      }
      const { data } = supabase.storage.from("summit-photos").getPublicUrl(path);
      const photoResult = await supabase
        .from("summit_photos")
        .insert({
          user_id: session.user.id,
          summit_id: selected.id,
          storage_path: path,
          public_url: data.publicUrl,
          taken_on: climbDate,
        })
        .select()
        .single();
      if (photoResult.data) uploaded.push(photoResult.data as SummitPhoto);
    }
    setAscents((previous) => {
      const withoutSelected = previous.filter(
        (a) => a.summit_id !== selected.id,
      );
      return [
        { summit_id: selected.id, achieved_on: climbDate, notes: notes || null },
        ...withoutSelected,
      ];
    });
    if (uploaded.length) setPhotos((previous) => [...uploaded, ...previous]);
    setFiles([]);
    setSaving(false);
    setRecordOpen(false);
    setNotice("Registro guardado. ¡Una provincia menos en el mapa!");
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setSelected(null);
  }

  function closePanel() {
    setSelected(null);
    setRecordOpen(false);
  }

  /* ── Render ───────────────────────────── */
  return (
    <main>
      {/* ── Topbar ──────────────────────── */}
      <header className="topbar">
        <a className="brand" href="#inicio">
          <IconMountain className="brand-icon" />
          <span>
            47 <b>PICOS</b>
          </span>
        </a>
        <nav>
          <a href="#mapa">Mapa</a>
          <a href="#reto">El reto</a>
        </nav>
        {session ? (
          <button className="account-button" onClick={signOut}>
            <span className="account-avatar">
              {session.user.email?.slice(0, 1).toUpperCase()}
            </span>
            <span>{session.user.email?.split("@")[0]}</span>
            <small>Salir</small>
          </button>
        ) : (
          <button
            className="button button--outline"
            onClick={() => setAuthOpen(true)}
          >
            Entrar / Registrarme
          </button>
        )}
      </header>

      {/* ── Hero ────────────────────────── */}
      <section id="inicio" className="hero">
        <div>
          <span className="eyebrow">UN RETO, 47 PICOS</span>
          <h1>
            Sube alto.
            <br />
            <em>Déjalo escrito.</em>
          </h1>
          <p>
            El mapa para conquistar el techo de cada provincia española.
          </p>
          <div className="hero-actions">
            <a className="button button--green" href="#mapa">
              Explorar el mapa <span>↓</span>
            </a>
            {!session && (
              <button
                className="button button--quiet"
                onClick={() => setAuthOpen(true)}
              >
                Crear mi registro
              </button>
            )}
          </div>
        </div>
        <aside className="hero-stat">
          <span className="mountain-art">△</span>
          <strong>
            {ascents.length}
            <small>/47</small>
          </strong>
          <span>cimas conquistadas</span>
          <div className="progress">
            <span style={{ width: `${completion}%` }} />
          </div>
          <b>{completion}% de tu reto</b>
        </aside>
      </section>

      {/* ── Config warning ──────────────── */}
      {!isSupabaseConfigured && (
        <section className="configuration-note">
          <strong>Configuración pendiente.</strong> El diseño está listo; añade
          las dos variables de Supabase del archivo <code>.env.example</code>{" "}
          para activar cuentas, progreso y fotos.
        </section>
      )}

      {/* ── Map ─────────────────────────── */}
      <section id="mapa" className="map-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">TU PROGRESO</span>
            <h2>Tu mapa de cumbres</h2>
            <p>
              Selecciona cualquier marcador para conocer el pico o registrar una
              ascensión.
            </p>
          </div>
          <div className="map-legend">
            <span>
              <i className="legend-pin">▲</i> Pendiente
            </span>
            <span>
              <i className="legend-done">✓</i> Completada
            </span>
          </div>
        </div>
        <SpainMap
          completed={completedCodes}
          onInformation={openInformation}
          onComplete={openRecord}
        />
      </section>

      {/* ── Challenge summary ───────────── */}
      <section id="reto" className="challenge-summary">
        <div>
          <span className="eyebrow">EL RETO COMPLETO</span>
          <h2>
            Un país por descubrir,
            <br />
            una cima cada vez.
          </h2>
        </div>
      </section>

      {/* ── Peak list ───────────────────── */}
      <section className="peak-list-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">52 Territorios - 47 Picos</span>
            <h2>Todas las cumbres</h2>
            <p>Ordenadas por altitud, de mayor a menor.</p>
          </div>
        </div>
        <div className="peak-list-grid">
          {[...peaks]
            .sort((a, b) => b.altitude - a.altitude)
            .map((peak) => {
              const done = completedCodes.has(peak.code);
              return (
                <button
                  key={peak.id}
                  className={`peak-list-item${done ? " peak-list-item--done" : ""}`}
                  onClick={() => openInformation(peak)}
                >
                  <span className="item-check">{done && <IconCheck />}</span>
                  <span>
                    <span className="item-province">{peak.province}</span>
                    <br />
                    <span className="item-name">{peak.name}</span>
                  </span>
                  <span className="item-alt">
                    {peak.altitude.toLocaleString("es-ES")} m
                  </span>
                </button>
              );
            })}
        </div>
      </section>

      {/* ── Footer ──────────────────────── */}
      <footer className="site-footer">
        <span>
          47 Picos · Datos de altitudes según{" "}
          <a
            href="https://es.wikipedia.org/wiki/Anexo:Puntos_m%C3%A1s_altos_de_las_provincias_de_Espa%C3%B1a"
            target="_blank"
            rel="noopener noreferrer"
          >
            Wikipedia
          </a>
        </span>
        <span>
          Mapa ©{" "}
          <a
            href="https://www.openstreetmap.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            OpenStreetMap
          </a>
        </span>
      </footer>

      {/* ── Info panel ──────────────────── */}
      {selected && (
        <aside
          className="info-panel"
          aria-label={`Información sobre ${selected.name}`}
        >
          <button className="icon-button" onClick={closePanel} aria-label="Cerrar">
            <IconClose />
          </button>
          <span className="eyebrow">{selected.province.toUpperCase()}</span>
          <h2>{selected.name}</h2>
          <div className="altitude">
            {selected.altitude.toLocaleString("es-ES")} <span>m</span>
          </div>
          <p className="range">{selected.range}</p>
          <p>{selected.note}</p>

          {selectedAscent ? (
            <div className="completed-card">
              <span>✓ Ascensión registrada</span>
              <b>{formatDate(selectedAscent.achieved_on)}</b>
              {selectedAscent.notes && <p>&ldquo;{selectedAscent.notes}&rdquo;</p>}
            </div>
          ) : (
            <div className="pending-card">
              Aún no has registrado esta cima.
            </div>
          )}

          <div className="panel-actions">
            <button
              className="button button--green button--wide"
              onClick={() => openRecord(selected)}
            >
              {selectedAscent
                ? "Editar registro y fotos"
                : "Marcar como completado"}
            </button>
          </div>

          <div className="photo-section">
            <h3>
              Recuerdos <small>{selectedPhotos.length}</small>
            </h3>
            {selectedPhotos.length ? (
              <div className="photo-grid">
                {selectedPhotos.map((photo) => (
                  <figure
                    key={photo.id}
                    onClick={() => {
                      setLightboxUrl(photo.public_url);
                      setLightboxCaption(
                        `${selected.name} · ${formatDate(photo.taken_on)}`,
                      );
                    }}
                  >
                    <img
                      src={photo.public_url}
                      alt={`Ascensión a ${selected.name}`}
                      loading="lazy"
                    />
                    <figcaption>{formatDate(photo.taken_on)}</figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="muted">
                Las fotos de esta cumbre aparecerán aquí.
              </p>
            )}
          </div>
        </aside>
      )}

      {/* ── Record dialog ───────────────── */}
      {recordOpen && selected && (
        <div className="modal-backdrop">
          <section
            className="record-dialog"
            role="dialog"
            aria-modal="true"
          >
            <button
              className="icon-button"
              onClick={() => setRecordOpen(false)}
              aria-label="Cerrar"
            >
              <IconClose />
            </button>
            <span className="eyebrow">REGISTRAR ASCENSIÓN</span>
            <h2>{selected.name}</h2>
            <p>
              {selected.province} ·{" "}
              {selected.altitude.toLocaleString("es-ES")} m
            </p>

            <label className="field-label">
              Fecha de la ascensión / fotos
              <input
                type="date"
                value={climbDate}
                onChange={(e) => setClimbDate(e.target.value)}
              />
            </label>

            <label className="field-label">
              Añadir fotos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onFilesChanged}
              />
              <span className="input-help">
                Al elegirlas se propone automáticamente la fecha de captura de la
                primera foto; puedes modificarla.
              </span>
            </label>

            {files.length > 0 && (
              <p className="file-count">
                {files.length} foto{files.length > 1 ? "s" : ""} preparada
                {files.length > 1 ? "s" : ""}.
              </p>
            )}

            <label className="field-label">
              Notas (opcional)
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Ruta, compañía, el momento que recuerdas…"
              />
            </label>

            <button
              className="button button--green button--wide"
              disabled={saving}
              onClick={saveAscent}
            >
              {saving ? "Guardando…" : "Guardar en mi mapa"}
            </button>
          </section>
        </div>
      )}

      {/* ── Auth dialog ─────────────────── */}
      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} />}

      {/* ── Toast ───────────────────────── */}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}

      {/* ── Lightbox ────────────────────── */}
      {lightboxUrl && (
        <div
          className="lightbox-backdrop"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="lightbox-close"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxUrl(null);
            }}
            aria-label="Cerrar imagen"
          >
            <IconClose />
          </button>
          <img
            src={lightboxUrl}
            alt={lightboxCaption}
            onClick={(e) => e.stopPropagation()}
          />
          {lightboxCaption && (
            <span className="lightbox-caption">{lightboxCaption}</span>
          )}
        </div>
      )}
    </main>
  );
}
