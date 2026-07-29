"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { peaks, type Peak } from "@/data/peaks";
import { countries, type Country } from "@/data/countries";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { AuthDialog } from "./auth-dialog";



const SpainMap = dynamic(
  () => import("./spain-map").then((module) => module.SpainMap),
  {
    ssr: false,
    loading: () => <div className="map map-loading">Cargando el mapa de los 52 territorios…</div>,
  },
);

const WorldMap = dynamic(
  () => import("./world-map").then((module) => module.WorldMap),
  {
    ssr: false,
    loading: () => <div className="map map-loading">Cargando el mapa del mundo…</div>,
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

type ChallengeMode = "peaks" | "countries";

type Props = { mode: ChallengeMode };

// Tipo unificado para item seleccionado
type SelectedItem = {
  id: string;
  label: string;       // Provincia o Nombre del país
  title: string;       // Nombre del pico o del país
  subtitle: string;    // "2428 m" o "Capital: Madrid"
  detail: string;      // Sierra o Continente
  note: string;        // Nota o texto complementario
};

function peakToItem(peak: Peak): SelectedItem {
  return {
    id: peak.id,
    label: peak.province,
    title: peak.name,
    subtitle: `${peak.altitude.toLocaleString("es-ES")} m`,
    detail: peak.range,
    note: peak.note,
  };
}

function countryToItem(country: Country): SelectedItem {
  return {
    id: country.id,
    label: country.continent,
    title: country.name,
    subtitle: country.capital,
    detail: country.continent,
    note: `${country.name} · ${country.capital}`,
  };
}

function formatDate(date: string) {
  if (date === "1900-01-01") return "Fecha desconocida";
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

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
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

function IconSearch({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

function IconGithub() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="footer-icon">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3-.3 6-1.5 6-6.5a5.5 5.5 0 0 0-1.5-3.8 5.5 5.5 0 0 0-.1-3.8s-1.2-.4-3.9 1.4a13.4 13.4 0 0 0-7 0C6.2 1.5 5 1.5 5 1.5a5.5 5.5 0 0 0-.1 3.8A5.5 5.5 0 0 0 3.4 9c0 5 3 6.2 6 6.5a4.8 4.8 0 0 0-1 3.2v4"></path>
    </svg>
  );
}

function IconLinkedin() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="footer-icon">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
      <rect x="2" y="9" width="4" height="12"></rect>
      <circle cx="4" cy="4" r="2"></circle>
    </svg>
  );
}

export function SummitTracker({ mode }: Props) {
  const router = useRouter();
  const isPeaks = mode === "peaks";

  const [session, setSession] = useState<Session | null>(null);
  const [ascents, setAscents] = useState<Ascent[]>([]);
  const [photos, setPhotos] = useState<SummitPhoto[]>([]);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [climbDate, setClimbDate] = useState<Date | null>(new Date());
  const [isDateUnknown, setIsDateUnknown] = useState(false);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhotoFiles, setSelectedPhotoFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxCaption, setLightboxCaption] = useState("");

  // ── Mode config ────────────────────────────
  const allItems = isPeaks
    ? peaks.map(peakToItem)
    : countries.map(countryToItem);
  const totalCount = isPeaks ? 47 : allItems.length;
  const modeLabel = isPeaks ? "47 PICOS" : "196 PAÍSES";
  const modeLabelShort = isPeaks ? "47" : "196";
  const modeLabelBold = isPeaks ? "PICOS" : "PAÍSES";
  const modeUnit = isPeaks ? "cimas conquistadas" : "países visitados";
  const modeUnitSingular = isPeaks ? "cima" : "país";
  const modeHeroEyebrow = isPeaks ? "UN RETO, 47 PICOS" : "UN RETO, 196 PAÍSES";
  const modeHeroSubtitle = isPeaks
    ? "El mapa para conquistar el techo de cada provincia española."
    : "El mapa para registrar cada país del mundo que has visitado.";
  const modeChallengeTitle = isPeaks
    ? <>Un país por descubrir,<br />una cima cada vez.</>
    : <>Un mundo por explorar,<br />un país cada vez.</>;
  const modeListEyebrow = isPeaks ? "52 Territorios - 47 Picos" : "196 Países del mundo";
  const modeListTitle = isPeaks ? "Todas las cumbres" : "Todos los países";
  const modeListSubtitle = isPeaks
    ? "Ordenadas por altitud, de mayor a menor."
    : "Ordenados alfabéticamente.";

  // IDs válidos para este modo (para filtrar ascents de Supabase)
  const validIds = useMemo(
    () => new Set(allItems.map((i) => i.id)),
    [allItems],
  );

  // Filtrar ascents por modo
  const modeAscents = useMemo(
    () => ascents.filter((a) => validIds.has(a.summit_id)),
    [ascents, validIds],
  );

  // Contar únicas
  const achievedCount = useMemo(() => {
    if (!isPeaks) return modeAscents.length;
    // Para picos, contamos los nombres únicos ya que hay provincias que comparten cima
    const uniquePeakNames = new Set(
      modeAscents.map((a) => peaks.find((p) => p.id === a.summit_id)?.name).filter(Boolean)
    );
    return uniquePeakNames.size;
  }, [isPeaks, modeAscents]);

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
  // Completed set for SpainMap (province codes)
  const completedPeakCodes = useMemo(
    () =>
      new Set(
        ascents
          .map((a) => peaks.find((p) => p.id === a.summit_id)?.code)
          .filter(Boolean) as string[],
      ),
    [ascents],
  );

  // Completed set for WorldMap (country ids)
  const completedCountryIds = useMemo(
    () => new Set(ascents.filter((a) => a.summit_id.startsWith("country-")).map((a) => a.summit_id)),
    [ascents],
  );

  const selectedAscent = selected
    ? modeAscents.find((a) => a.summit_id === selected.id)
    : undefined;
  const selectedPhotos = selected
    ? photos.filter((p) => p.summit_id === selected.id)
    : [];
  const completion = Math.round((achievedCount / totalCount) * 100);

  /* ── Handlers ─────────────────────────── */
  const openInformation = useCallback((item: SelectedItem) => {
    setSelected(item);
    setRecordOpen(false);
    setNotice("");
  }, []);

  const openPeakInformation = useCallback((peak: Peak) => {
    openInformation(peakToItem(peak));
  }, [openInformation]);

  const openCountryInformation = useCallback((country: Country) => {
    openInformation(countryToItem(country));
  }, [openInformation]);

  const openRecord = useCallback(
    (item?: SelectedItem | null) => {
      if (!session) {
        setAuthOpen(true);
        return;
      }
      setRecordOpen(true);
      if (!item) {
        setClimbDate(new Date());
        setIsDateUnknown(false);
        setNotes("");
        setFiles([]);
      } else {
        setSelected(item);
        const date = modeAscents.find((a) => a.summit_id === item.id)?.achieved_on;
        setClimbDate(date && date !== "1900-01-01" ? new Date(date) : new Date());
        setIsDateUnknown(date === "1900-01-01");
        setNotes(modeAscents.find((a) => a.summit_id === item.id)?.notes ?? "");
        setFiles([]);
      }
      setNotice("");
    },
    [session, modeAscents]
  );

  const openPeakRecord = useCallback((peak: Peak) => {
    openRecord(peakToItem(peak));
  }, [openRecord]);

  const openCountryRecord = useCallback((country: Country) => {
    openRecord(countryToItem(country));
  }, [openRecord]);

  function onFilesChanged(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);
    setFiles(nextFiles);
    if (!isDateUnknown && nextFiles[0]?.lastModified)
      setClimbDate(new Date(nextFiles[0].lastModified));
  }

  async function saveAscent() {
    if (!supabase || !session || !selected) return;
    setSaving(true);
    setNotice("");
    const finalDate = isDateUnknown ? "1900-01-01" : (climbDate?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    const ascentResult = await supabase.from("ascents").upsert(
      {
        user_id: session.user.id,
        summit_id: selected.id,
        achieved_on: finalDate,
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
          `Registro guardado, pero una foto no pudo subirse: ${upload.error.message}`,
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
          taken_on: finalDate,
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
        { summit_id: selected.id, achieved_on: finalDate, notes: notes || null },
        ...withoutSelected,
      ];
    });
    if (uploaded.length) setPhotos((previous) => [...uploaded, ...previous]);
    setFiles([]);
    setSaving(false);
    setRecordOpen(false);
    setNotice(
      isPeaks
        ? "Registro guardado. ¡Una provincia menos en el mapa!"
        : "Registro guardado. ¡Un país más en tu lista!",
    );
  }

  async function deleteAscent() {
    if (!supabase || !session || !selected) return;
    const confirmMessage = isPeaks
      ? "¿Seguro que quieres eliminar esta ascensión?"
      : "¿Seguro que quieres eliminar la visita a este país?";
    if (!window.confirm(confirmMessage)) return;

    setSaving(true);
    setNotice("");

    const deleteResult = await supabase
      .from("ascents")
      .delete()
      .match({ user_id: session.user.id, summit_id: selected.id });

    if (deleteResult.error) {
      setNotice(deleteResult.error.message);
      setSaving(false);
      return;
    }

    setAscents((previous) => previous.filter((a) => a.summit_id !== selected.id));
    setSaving(false);
    setRecordOpen(false);
    setNotice(
      isPeaks
        ? "Ascensión eliminada."
        : "País eliminado de tu lista."
    );
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setSelected(null);
  }

  function closePanel() {
    setSelected(null);
    setRecordOpen(false);
  }

  function switchMode(target: ChallengeMode) {
    if (target === mode) return;
    setSelected(null);
    setRecordOpen(false);
    router.push(target === "peaks" ? "/" : "/paises");
  }

  // Sorted items for the list
  const sortedItems = useMemo(() => {
    if (isPeaks) {
      return [...peaks]
        .sort((a, b) => b.altitude - a.altitude)
        .map(peakToItem);
    }
    return [...countries]
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
      .map(countryToItem);
  }, [isPeaks]);

  /* ── Render ───────────────────────────── */
  return (
    <main className={isPeaks ? "" : "mode-countries"}>
      {/* ── Topbar ──────────────────────── */}
      <header className="topbar">
        <a className="brand" href={isPeaks ? "#inicio" : "#inicio"}>
          {isPeaks
            ? <IconMountain className="brand-icon" />
            : <IconGlobe className="brand-icon" />
          }
          <span>
            {modeLabelShort} <b>{modeLabelBold}</b>
          </span>
        </a>

        {/* ── Mode selector ──────────────── */}
        {/* Movido a la sección del mapa */}

        <nav>
          <a href="#mapa">Mapa</a>
          <a href="#reto">El reto</a>
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
        </nav>
      </header>

      {/* ── Hero ────────────────────────── */}
      <section id="inicio" className="hero">
        <div>
          <span className="eyebrow">{modeHeroEyebrow}</span>
          <h1>
            {isPeaks ? (
              <>Sube alto.<br /><em>Déjalo escrito.</em></>
            ) : (
              <>Explora el mundo.<br /><em>Márcalo en tu mapa.</em></>
            )}
          </h1>
          <p>{modeHeroSubtitle}</p>
          <div className="hero-actions">
            <a className={`button ${isPeaks ? "button--green" : "button--purple"}`} href="#mapa">
              Explorar el mapa
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
          <span className="mountain-art">{isPeaks ? "△" : "◉"}</span>
          <strong>
            {achievedCount}
            <small>/{totalCount}</small>
          </strong>
          <span>{modeUnit}</span>
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
        {/* ── Mode selector ──────────────── */}
        <div className="mode-selector">
          <button
            className={`mode-tab ${isPeaks ? "mode-tab--active" : ""}`}
            onClick={() => switchMode("peaks")}
          >
            <IconMountain className="mode-tab-icon" />
            47 Picos
          </button>
          <button
            className={`mode-tab ${!isPeaks ? "mode-tab--active" : ""}`}
            onClick={() => switchMode("countries")}
          >
            <IconGlobe className="mode-tab-icon" />
            196 Países
          </button>
        </div>

        <div className="section-heading">
          <div>
            <span className="eyebrow">TU PROGRESO</span>
            <h2>{isPeaks ? "Tu mapa de cumbres" : "Tu mapa del mundo"}</h2>
            <p>
              {isPeaks
                ? "Selecciona cualquier marcador para conocer el pico o registrar una ascensión."
                : "Haz clic en cualquier país para ver su información o marcarlo como visitado."}
            </p>
          </div>
          <div className="map-legend">
            <span>
              <i className="legend-pin">{isPeaks ? "▲" : "◆"}</i> Pendiente
            </span>
            <span>
              <i className="legend-done">✓</i> {isPeaks ? "Completada" : "Visitado"}
            </span>
          </div>
        </div>
        {isPeaks ? (
          <SpainMap
            completed={completedPeakCodes}
            onInformation={openPeakInformation}
            onComplete={openPeakRecord}
          />
        ) : (
          <WorldMap
            completed={completedCountryIds}
            onInformation={openCountryInformation}
            onComplete={openCountryRecord}
          />
        )}
      </section>

      {/* ── Challenge summary ───────────── */}
      <section id="reto" className="challenge-summary">
        <div>
          <span className="eyebrow">EL RETO COMPLETO</span>
          <h2>{modeChallengeTitle}</h2>
        </div>
      </section>

      {/* ── Item list ───────────────────── */}
      <section className="peak-list-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{modeListEyebrow}</span>
            <h2>{modeListTitle}</h2>
            <p>{modeListSubtitle}</p>
          </div>
          <div className="search-input-container">
            <IconSearch className="search-icon" />
            <input 
              type="search" 
              placeholder={isPeaks ? "Buscar pico o provincia..." : "Buscar país o capital..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="peak-list-grid">
          {sortedItems.filter(item => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return (
              item.title.toLowerCase().includes(q) ||
              (item.label && item.label.toLowerCase().includes(q)) ||
              (item.detail && item.detail.toLowerCase().includes(q))
            );
          }).map((item) => {
            const done = modeAscents.some((a) => a.summit_id === item.id);
            return (
              <button
                key={item.id}
                className={`peak-list-item${done ? " peak-list-item--done" : ""}`}
                onClick={() => openInformation(item)}
              >
                <span className="item-check">{done && <IconCheck />}</span>
                <span className="item-info">
                  <span className="item-province">
                    {isPeaks ? item.label : item.detail}
                  </span>
                  <br />
                  <span className="item-name">{item.title}</span>
                </span>
                <span className="item-alt">{item.subtitle}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Footer ──────────────────────── */}
      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-left">
            {isPeaks ? "47 Picos" : "196 Países"} · Datos {isPeaks ? "de altitudes según " : "según "}
            <a href={isPeaks ? "https://es.wikipedia.org/wiki/Anexo:Puntos_m%C3%A1s_altos_de_las_provincias_de_Espa%C3%B1a" : "https://es.wikipedia.org/wiki/Anexo:Pa%C3%ADses"} target="_blank" rel="noopener noreferrer">Wikipedia</a>
          </div>

          <div className="footer-center">
            Desarrollado por Jorge Acebes
            <a href="https://github.com/JorgeAcebes" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><IconGithub /></a>
            <a href="https://www.linkedin.com/in/jorge-acebes" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><IconLinkedin /></a>
          </div>

          <div className="footer-right">
            Mapa © <a href="https://www.openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-disclaimer">
            Toda la información personal y datos de progreso de los usuarios se almacenan y procesan de forma segura en los servidores de <a href="https://supabase.com/" target="_blank" rel="noopener noreferrer">Supabase</a>.<br />
            &copy; {new Date().getFullYear()} Jorge Acebes. Todos los derechos reservados. El uso de esta web es únicamente con fines de entretenimiento y seguimiento personal.
          </div>
        </div>
      </footer>

      {/* ── Info panel ──────────────────── */}
      {selected && (
        <aside
          className="info-panel"
          aria-label={`Información sobre ${selected.title}`}
        >
          <button className="icon-button" onClick={closePanel} aria-label="Cerrar">
            <IconClose />
          </button>
          <span className="eyebrow">{selected.label.toUpperCase()}</span>
          <h2>{selected.title}</h2>
          {isPeaks ? (
            <>
              <div className="altitude">
                {selected.subtitle.replace(" m", "")} <span>m</span>
              </div>
              <p className="range">{selected.detail}</p>
            </>
          ) : (
            <>
              <div className="country-capital">{selected.subtitle}</div>
              <p className="range">{selected.detail}</p>
            </>
          )}
          <p>{selected.note}</p>

          {selectedAscent ? (
            <div className="completed-card">
              <span>✓ {isPeaks ? "Ascensión registrada" : "Visita registrada"}</span>
              <b>{formatDate(selectedAscent.achieved_on)}</b>
              {selectedAscent.notes && <p>&ldquo;{selectedAscent.notes}&rdquo;</p>}
            </div>
          ) : (
            <div className="pending-card">
              {isPeaks
                ? "Aún no has registrado esta cima."
                : "Aún no has registrado este país."}
            </div>
          )}

          <div className="panel-actions">
            <button
              className={`button ${isPeaks ? "button--green" : "button--purple"} button--wide`}
              onClick={() => openRecord(selected)}
            >
              {selectedAscent
                ? "Editar registro y fotos"
                : isPeaks ? "Marcar como completado" : "Marcar como visitado"}
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
                        `${selected.title} · ${formatDate(photo.taken_on)}`,
                      );
                    }}
                  >
                    <img
                      src={photo.public_url}
                      alt={`${isPeaks ? "Ascensión a" : "Visita a"} ${selected.title}`}
                      loading="lazy"
                    />
                    <figcaption>{formatDate(photo.taken_on)}</figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="muted">
                {isPeaks
                  ? "Las fotos de esta cumbre aparecerán aquí."
                  : "Las fotos de este país aparecerán aquí."}
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
            <span className="eyebrow">
              {isPeaks ? "REGISTRAR ASCENSIÓN" : "REGISTRAR VISITA"}
            </span>
            <h2>{selected.title}</h2>
            <p>
              {selected.label} · {selected.subtitle}
            </p>

            <label className="field-label" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {isPeaks ? "Fecha de la ascensión / fotos" : "Fecha de la visita / fotos"}
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: "normal" }}>
                <input
                  type="checkbox"
                  checked={isDateUnknown}
                  onChange={(e) => setIsDateUnknown(e.target.checked)}
                />
                No recuerdo la fecha
              </label>
              {!isDateUnknown && (
                <input
                  type="date"
                  value={climbDate ? (climbDate.toISOString().slice(0, 10)) : ""}
                  onChange={(e) => setClimbDate(e.target.value ? new Date(e.target.value) : new Date())}
                  max={new Date().toISOString().slice(0, 10)}
                />
              )}
            </label>

            <label className="field-label">
              Añadir fotos
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onFilesChanged}
              />
              {!isDateUnknown && (
                <span className="input-help">
                  Al elegirlas se propone automáticamente la fecha de captura de la
                  primera foto; puedes modificarla.
                </span>
              )}
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
                placeholder={isPeaks
                  ? "Ruta, compañía, el momento que recuerdas…"
                  : "Ciudades visitadas, experiencias, lo que quieras recordar…"
                }
              />
            </label>

            <button
              className={`button ${isPeaks ? "button--green" : "button--purple"} button--wide`}
              disabled={saving}
              onClick={saveAscent}
            >
              {saving ? "Guardando…" : "Guardar en mi mapa"}
            </button>
            {selectedAscent && (
              <button
                className="button button--quiet button--wide"
                style={{ marginTop: 8, color: "var(--danger, #a34f3d)" }}
                disabled={saving}
                onClick={deleteAscent}
              >
                Eliminar registro
              </button>
            )}
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
