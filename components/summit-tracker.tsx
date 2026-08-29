"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { peaks, type Peak } from "@/data/peaks";
import { countries, type Country } from "@/data/countries";
import { regionsByCountryIsoA2, type Region } from "@/data/regions";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { AuthDialog } from "./auth-dialog";
import { ProfileSettings } from "./profile-settings";
import { InstallPrompt } from "./install-prompt";
import { ConfirmModal } from "./confirm-modal";
import PhotoEditor from "./photo-editor";



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

type Ascent = { summit_id: string; achieved_on: string; end_date?: string | null; notes: string | null; is_wishlist: boolean };
type SummitPhoto = {
  id: string;
  summit_id: string;
  public_url: string;
  taken_on: string;
  caption?: string | null;
  created_at: string;
  storage_path: string;
};

type ChallengeMode = "peaks" | "countries";

type TargetProfile = {
  id: string;
  username: string;
};

type Props = {
  mode: ChallengeMode;
  targetProfile?: TargetProfile;
  onSwitchMode?: (mode: ChallengeMode) => void;
};

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

function regionToItem(region: Region, country: Country): SelectedItem {
  return {
    id: region.id,
    label: country.name,
    title: region.name,
    subtitle: country.name,
    detail: "Región",
    note: `${region.name} · ${country.name}`,
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

function formatShortDate(date: string) {
  if (date === "1900-01-01") return "Desconocida";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

/* ── SVG icon components ────────────────── */
function IconLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 52 L36 12 L48 32.75 Z" fill="url(#logoGradGreen)" />
      <path d="M24 60 L44 26 L60 52 Z" fill="url(#logoGradPurple)" style={{ mixBlendMode: 'multiply' }} />
      <defs>
        <linearGradient id="logoGradGreen" x1="12" y1="12" x2="48" y2="52">
          <stop stopColor="#5c9b7d" />
          <stop offset="1" stopColor="#245f52" />
        </linearGradient>
        <linearGradient id="logoGradPurple" x1="24" y1="26" x2="60" y2="60">
          <stop stopColor="#9570c7" />
          <stop offset="1" stopColor="#5b3a8c" />
        </linearGradient>
      </defs>
    </svg>
  );
}

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


function IconClose({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconCalendar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconTrash({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function IconFolderMove({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <polyline points="12 11 12 17" />
      <polyline points="9 14 12 11 15 14" />
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

function IconCheck({ style }: { style?: React.CSSProperties } = {}) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconCamera(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
      <circle cx="12" cy="13" r="4"></circle>
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

export function SummitTracker({ mode, targetProfile, onSwitchMode }: Props) {
  const router = useRouter();
  const isPeaks = mode === "peaks";
  const isReadOnly = !!targetProfile;

  const [session, setSession] = useState<Session | null>(null);
  const [myProfile, setMyProfile] = useState<{ username: string; avatar_url: string | null; enable_regions?: boolean } | null>(null);
  const [ascents, setAscents] = useState<Ascent[]>([]);
  const [photos, setPhotos] = useState<SummitPhoto[]>([]);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [climbDate, setClimbDate] = useState<Date | null>(new Date());
  const [climbEndDate, setClimbEndDate] = useState<Date | null>(null);
  const [isEndDateEnabled, setIsEndDateEnabled] = useState(false);
  const [originalAchievedOn, setOriginalAchievedOn] = useState<string | null>(null);
  const [isDateUnknown, setIsDateUnknown] = useState(false);
  const [isDateModified, setIsDateModified] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [listFilter, setListFilter] = useState<"all" | "done" | "pending" | "wishlist">("all");
  const [selectedPhotoFiles, setSelectedPhotoFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [lightboxPhoto, setLightboxPhoto] = useState<SummitPhoto | null>(null);
  const [lightboxMenuOpen, setLightboxMenuOpen] = useState(false);
  const [lightboxCaptionModalOpen, setLightboxCaptionModalOpen] = useState(false);
  const [lightboxDateModalOpen, setLightboxDateModalOpen] = useState(false);

  const [lightboxNewCaption, setLightboxNewCaption] = useState("");
  const [lightboxNewDate, setLightboxNewDate] = useState<string | null>(null);

  // Selección múltiple estilo Google Photos
  const [selectedPhotosForEdit, setSelectedPhotosForEdit] = useState<string[]>([]);

  const [assignToRecordModalOpen, setAssignToRecordModalOpen] = useState(false);
  const [editorPhoto, setEditorPhoto] = useState<SummitPhoto | null>(null);
  const [diffMode, setDiffMode] = useState(false);
  const [regionsMode, setRegionsMode] = useState(false);
  const [expandedCountryId, setExpandedCountryId] = useState<string | null>(null);
  const [ascentsSortOrder, setAscentsSortOrder] = useState<"asc" | "desc">("asc");
  const [myAscents, setMyAscents] = useState<Ascent[]>([]);

  useEffect(() => {
    if (session) {
      supabase?.from("profiles").select("username, avatar_url, enable_regions").eq("id", session.user.id).single().then(({ data }) => {
        if (data) setMyProfile(data);
      });
    }
  }, [session]);

  // Handle back button to close panels
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#editor") {
        // Let it stay open
      } else if (hash === "#lightbox") {
        setEditorPhoto(null);
      } else if (hash === "#panel") {
        setEditorPhoto(null);
        setLightboxPhoto(null);
      } else {
        setEditorPhoto(null);
        setLightboxPhoto(null);
        setSelected(null);
        setRecordOpen(false);
        setProfileOpen(false);
        setAuthOpen(false);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

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
    () => {
      const ids = new Set(allItems.map((i) => i.id));
      if (!isPeaks) {
        Object.values(regionsByCountryIsoA2).flat().forEach((r) => ids.add(r.id));
      }
      return ids;
    },
    [allItems, isPeaks],
  );

  // Filtrar ascents por modo
  const modeAscents = useMemo(
    () => ascents.filter((a) => validIds.has(a.summit_id)),
    [ascents, validIds],
  );

  const completedModeAscents = useMemo(
    () => modeAscents.filter((a) => !a.is_wishlist),
    [modeAscents],
  );

  // Contar únicas
  const achievedCount = useMemo(() => {
    if (!isPeaks) {
      const uniqueCountries = new Set(completedModeAscents.filter((a) => a.summit_id.startsWith("country-")).map(a => a.summit_id));
      return uniqueCountries.size;
    }
    // Para picos, contamos los nombres únicos ya que hay provincias que comparten cima
    const uniquePeakNames = new Set(
      completedModeAscents.map((a) => peaks.find((p) => p.id === a.summit_id)?.name).filter(Boolean)
    );
    return uniquePeakNames.size;
  }, [isPeaks, completedModeAscents]);

  const wishlistCount = useMemo(() => {
    const w = modeAscents.filter(a => a.is_wishlist);
    if (!isPeaks) {
      const uniqueCountries = new Set(w.filter((a) => a.summit_id.startsWith("country-")).map(a => a.summit_id));
      return uniqueCountries.size;
    }
    const uniquePeakNames = new Set(
      w.map((a) => peaks.find((p) => p.id === a.summit_id)?.name).filter(Boolean)
    );
    return uniquePeakNames.size;
  }, [isPeaks, modeAscents]);

  /* ── Save Last Path for Social Tab ────── */
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("last_map_path", window.location.pathname);
      localStorage.setItem("ranking_mode", mode);
    }
  }, [mode]);

  /* ── Auto-dismiss toast ───────────────── */
  useEffect(() => {
    // Reset selection when changing panel
    setSelectedPhotosForEdit([]);
  }, [selected]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (notice) {
      timeout = setTimeout(() => {
        setNotice("");
      }, 4000);
    }
    return () => clearTimeout(timeout);
  }, [notice]);

  function handlePhotoClick(photo: SummitPhoto) {
    if (selectedPhotosForEdit.length > 0) {
      togglePhotoSelection(photo.id);
    } else {
      setLightboxPhoto(photo);
      window.history.pushState(null, "", "#lightbox");
    }
  }

  function togglePhotoSelection(photoId: string) {
    setSelectedPhotosForEdit(prev =>
      prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId]
    );
  }

  async function handleSaveCaption() {
    if (!session || !lightboxPhoto) return;

    setSaving(true);
    const { error } = await supabase!
      .from("summit_photos")
      .update({ caption: lightboxNewCaption || null })
      .eq("id", lightboxPhoto.id)
      .eq("user_id", session.user.id);

    if (error) {
      setNotice(`Error: ${error.message}`);
    } else {
      setPhotos(prev => prev.map(p => p.id === lightboxPhoto.id ? { ...p, caption: lightboxNewCaption || null } : p));
      setLightboxPhoto(prev => prev ? { ...prev, caption: lightboxNewCaption || null } : null);
      setLightboxCaptionModalOpen(false);
      setNotice("Descripción guardada correctamente.");
    }
    setSaving(false);
  }

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
      const targetId = targetProfile ? targetProfile.id : session.user.id;
      const [ascentResult, photoResult] = await Promise.all([
        supabase!
          .from("ascents")
          .select("summit_id, achieved_on, end_date, notes, is_wishlist")
          .eq("user_id", targetId)
          .order("achieved_on", { ascending: false }),
        supabase!
          .from("summit_photos")
          .select("id, summit_id, public_url, taken_on, caption, created_at, storage_path")
          .eq("user_id", targetId)
          .order("taken_on", { ascending: false }),
      ]);
      if (ascentResult.data) setAscents(ascentResult.data as Ascent[]);
      if (photoResult.data) setPhotos(photoResult.data as SummitPhoto[]);

      if (!isReadOnly && !profileOpen) {
        // Ensure we have current user profile if session exists
        if (session && !myProfile) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url, enable_regions")
            .eq("id", session.user.id)
            .single();
          if (profile) setMyProfile(profile);
        }
      }

      // Load viewer's own ascents for diff comparison
      if (isReadOnly && session) {
        const { data: myData } = await supabase!
          .from("ascents")
          .select("summit_id, achieved_on, end_date, notes, is_wishlist")
          .eq("user_id", session.user.id);
        if (myData) setMyAscents(myData as Ascent[]);
      }
    }
    loadProgress();
  }, [session, profileOpen, isReadOnly, targetProfile]);

  /* ── Derived state ────────────────────── */
  // Completed set for SpainMap (province codes)
  const completedPeakCodes = useMemo(
    () =>
      new Set(
        ascents
          .filter((a) => !a.is_wishlist)
          .flatMap((a) => peaks.filter((p) => p.id === a.summit_id).map((p) => p.code))
      ),
    [ascents],
  );
  const wishlistPeakCodes = useMemo(
    () =>
      new Set(
        ascents
          .filter((a) => a.is_wishlist)
          .flatMap((a) => peaks.filter((p) => p.id === a.summit_id).map((p) => p.code))
      ),
    [ascents],
  );

  // Completed set for WorldMap (country ids)
  const completedCountryIds = useMemo(
    () => new Set(ascents.filter((a) => a.summit_id.startsWith("country-") && !a.is_wishlist).map((a) => a.summit_id)),
    [ascents],
  );
  const wishlistCountryIds = useMemo(
    () => new Set(ascents.filter((a) => a.summit_id.startsWith("country-") && a.is_wishlist).map((a) => a.summit_id)),
    [ascents],
  );

  const completedRegionIds = useMemo(
    () => new Set(ascents.filter((a) => a.summit_id.startsWith("region-") && !a.is_wishlist).map((a) => a.summit_id)),
    [ascents],
  );

  /* ── Diff comparison sets ────────────── */
  const myCompletedPeakCodes = useMemo(
    () =>
      new Set(
        myAscents
          .filter((a) => !a.is_wishlist)
          .flatMap((a) => peaks.filter((p) => p.id === a.summit_id).map((p) => p.code))
      ),
    [myAscents],
  );
  const myCompletedCountryIds = useMemo(
    () => new Set(myAscents.filter((a) => a.summit_id.startsWith("country-") && !a.is_wishlist).map((a) => a.summit_id)),
    [myAscents],
  );
  const myCompletedIds = useMemo(
    () => new Set(myAscents.filter((a) => !a.is_wishlist).map((a) => a.summit_id)),
    [myAscents],
  );

  // Diff sets for peaks (province codes)
  const diffPeakOnlyViewer = useMemo(
    () => new Set([...myCompletedPeakCodes].filter((c) => !completedPeakCodes.has(c))),
    [myCompletedPeakCodes, completedPeakCodes],
  );
  const diffPeakOnlyTarget = useMemo(
    () => new Set([...completedPeakCodes].filter((c) => !myCompletedPeakCodes.has(c))),
    [completedPeakCodes, myCompletedPeakCodes],
  );
  const diffPeakBoth = useMemo(
    () => new Set([...completedPeakCodes].filter((c) => myCompletedPeakCodes.has(c))),
    [completedPeakCodes, myCompletedPeakCodes],
  );

  // Diff sets for countries (country ids)
  const diffCountryOnlyViewer = useMemo(
    () => new Set([...myCompletedCountryIds].filter((c) => !completedCountryIds.has(c))),
    [myCompletedCountryIds, completedCountryIds],
  );
  const diffCountryOnlyTarget = useMemo(
    () => new Set([...completedCountryIds].filter((c) => !myCompletedCountryIds.has(c))),
    [completedCountryIds, myCompletedCountryIds],
  );
  const diffCountryBoth = useMemo(
    () => new Set([...completedCountryIds].filter((c) => myCompletedCountryIds.has(c))),
    [completedCountryIds, myCompletedCountryIds],
  );

  // Diff sets for the list (summit ids)
  const diffItemOnlyViewer = useMemo(
    () => {
      const targetCompleted = new Set(completedModeAscents.map((a) => a.summit_id));
      return new Set([...myCompletedIds].filter((id) => validIds.has(id) && !targetCompleted.has(id)));
    },
    [myCompletedIds, completedModeAscents, validIds],
  );
  const diffItemOnlyTarget = useMemo(
    () => {
      return new Set(completedModeAscents.map((a) => a.summit_id).filter((id) => !myCompletedIds.has(id)));
    },
    [completedModeAscents, myCompletedIds],
  );
  const diffItemBoth = useMemo(
    () => {
      return new Set(completedModeAscents.map((a) => a.summit_id).filter((id) => myCompletedIds.has(id)));
    },
    [completedModeAscents, myCompletedIds],
  );

  const selectedAscents = useMemo(() => {
    if (!selected) return [];
    return modeAscents.filter((a) => a.summit_id === selected.id && !a.is_wishlist).sort((a, b) => {
      const order = ascentsSortOrder === "asc" ? 1 : -1;
      if (a.achieved_on !== b.achieved_on) {
        return a.achieved_on.localeCompare(b.achieved_on) * order;
      }
      const aEnd = a.end_date || a.achieved_on;
      const bEnd = b.end_date || b.achieved_on;
      return aEnd.localeCompare(bEnd) * order;
    });
  }, [selected, modeAscents, ascentsSortOrder]);

  const hasWishlist = useMemo(() => {
    if (!selected) return false;
    return modeAscents.some(a => a.summit_id === selected.id && a.is_wishlist);
  }, [selected, modeAscents]);
  const selectedPhotos = selected
    ? photos.filter((p) => p.summit_id === selected.id)
    : [];
  const completion = Math.round((achievedCount / totalCount) * 100);

  /* ── Handlers ─────────────────────────── */
  const openInformation = useCallback((item: SelectedItem) => {
    window.location.hash = "panel";
    setSelected(item);
    setRecordOpen(false);
    setNotice("");
  }, []);

  async function handleAddPhotosToDate(event: ChangeEvent<HTMLInputElement>, ascent: Ascent) {
    const nextFiles = Array.from(event.target.files ?? []);
    if (!supabase || !session || !selected) return;

    const existingPhotos = selectedPhotos.filter(p => p.taken_on === ascent.achieved_on);
    if (existingPhotos.length + nextFiles.length > 4) {
      setNotice(`Máximo 4 fotos por registro. Ya tienes ${existingPhotos.length} en este registro.`);
      event.target.value = "";
      return;
    }

    const MAX_MB = 5;
    for (const file of nextFiles) {
      if (file.size > MAX_MB * 1024 * 1024) {
        setNotice(`Cada foto debe ocupar máximo ${MAX_MB} MB.`);
        event.target.value = "";
        return;
      }
    }

    setSaving(true);
    setNotice("Subiendo fotos...");

    const uploaded: SummitPhoto[] = [];
    for (const file of nextFiles) {
      if (!file.type.startsWith("image/")) continue;
      const path = `${session.user.id}/${selected.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const upload = await supabase.storage.from("summit-photos").upload(path, file, { contentType: file.type, upsert: false });
      if (upload.error) {
        setNotice(`Error al subir ${file.name}: ${upload.error.message}`);
        continue;
      }
      const { data } = supabase.storage.from("summit-photos").getPublicUrl(path);
      const photoResult = await supabase.from("summit_photos").insert({
        user_id: session.user.id,
        summit_id: selected.id,
        storage_path: path,
        public_url: data.publicUrl,
        taken_on: ascent.achieved_on,
      }).select().single();

      if (photoResult.data) uploaded.push(photoResult.data as SummitPhoto);
    }

    if (uploaded.length) setPhotos(prev => [...uploaded, ...prev]);
    event.target.value = "";
    setSaving(false);
    setNotice(uploaded.length > 0 ? "Fotos subidas correctamente." : "No se subieron fotos.");
  }

  const openPeakInformation = useCallback((peak: Peak) => {
    openInformation(peakToItem(peak));
  }, [openInformation]);

  const openCountryInformation = useCallback((country: Country) => {
    openInformation(countryToItem(country));
  }, [openInformation]);

  const handleRegionInformation = useCallback((regionId: string, regionName: string, isoA2: string) => {
    const country = countries.find(c => c.iso_a2 === isoA2);
    if (!country) return;
    const region: Region = { id: regionId, name: regionName };
    const item = regionToItem(region, country);
    openInformation(item);
  }, [openInformation]);

  const openRecord = useCallback(
    (item?: SelectedItem | null, ascentToEdit?: Ascent) => {
      if (!session) {
        window.location.hash = "panel";
        setAuthOpen(true);
        return;
      }
      window.location.hash = "panel";
      setRecordOpen(true);
      if (!item) {
        setClimbDate(null);
        setClimbEndDate(null);
        setIsEndDateEnabled(false);
        setOriginalAchievedOn(null);
        setIsDateUnknown(true);
        setIsDateModified(false);
        setNotes("");
        setFiles([]);
      } else {
        setSelected(item);
        if (ascentToEdit) {
          const date = ascentToEdit.achieved_on;
          setClimbDate(date && date !== "1900-01-01" ? new Date(date) : null);
          setClimbEndDate(ascentToEdit.end_date ? new Date(ascentToEdit.end_date) : null);
          setIsEndDateEnabled(!!ascentToEdit.end_date);
          setOriginalAchievedOn(date);
          setIsDateUnknown(!date || date === "1900-01-01");
          setIsDateModified(!!date && date !== "1900-01-01");
          setNotes(ascentToEdit.notes ?? "");
        } else {
          setClimbDate(null);
          setClimbEndDate(null);
          setIsEndDateEnabled(false);
          setOriginalAchievedOn(null);
          setIsDateUnknown(true);
          setIsDateModified(false);
          setNotes("");
        }
        setFiles([]);
      }
      setNotice("");
    },
    [session]
  );

  const openPeakRecord = useCallback((peak: Peak) => {
    openRecord(peakToItem(peak));
  }, [openRecord]);

  const openCountryRecord = useCallback((country: Country) => {
    openRecord(countryToItem(country));
  }, [openRecord]);

  function onFilesChanged(event: ChangeEvent<HTMLInputElement>) {
    const nextFiles = Array.from(event.target.files ?? []);

    const MAX_MB = 5;
    for (const file of nextFiles) {
      if (file.size > MAX_MB * 1024 * 1024) {
        setNotice(`Cada foto debe ocupar máximo ${MAX_MB} MB.`);
        event.target.value = "";
        return;
      }
    }

    if (files.length + selectedPhotosForEdit.length + nextFiles.length > 4) {
      setNotice(`Máximo 4 fotos por registro. Selecciona menos imágenes.`);
      event.target.value = "";
      return;
    }

    setFiles(prev => [...prev, ...nextFiles]);
    if (!isDateUnknown && !isDateModified && nextFiles[0]?.lastModified) {
      setClimbDate(new Date(nextFiles[0].lastModified));
    }
  }

  async function saveWishlist() {
    if (!supabase || !session || !selected) {
      window.location.hash = "panel";
      setAuthOpen(true);
      return;
    }
    setNotice("");

    if (hasWishlist) {
      const deleteResult = await supabase
        .from("ascents")
        .delete()
        .match({ user_id: session.user.id, summit_id: selected.id, is_wishlist: true });

      if (deleteResult.error) {
        setNotice(deleteResult.error.message);
        return;
      }
      setAscents((previous) => previous.filter((a) => !(a.summit_id === selected.id && a.is_wishlist)));
      setNotice("Eliminado de tu lista de deseos.");
    } else {
      const finalDate = new Date().toISOString().slice(0, 10);
      const ascentResult = await supabase.from("ascents").upsert(
        {
          user_id: session.user.id,
          summit_id: selected.id,
          achieved_on: finalDate,
          end_date: null,
          notes: null,
          is_wishlist: true,
        },
        { onConflict: "user_id,summit_id,achieved_on" },
      );

      if (ascentResult.error) {
        setNotice(ascentResult.error.message);
        return;
      }
      setAscents((previous) => [
        { summit_id: selected.id, achieved_on: finalDate, end_date: null, notes: null, is_wishlist: true },
        ...previous.filter((a) => !(a.summit_id === selected.id && a.is_wishlist)),
      ]);
      setNotice("¡Añadido a tu lista de deseos!");
    }
  }

  async function saveAscent() {
    if (!supabase || !session || !selected) return;
    setSaving(true);
    setNotice("");
    const finalDate = isDateUnknown ? "1900-01-01" : (climbDate?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10));
    // If they changed the date of an existing ascent, we should delete the old one first,
    // otherwise upsert creates a new entry instead of updating the old date.
    if (originalAchievedOn && originalAchievedOn !== finalDate) {
      await supabase.from("ascents").delete().match({ user_id: session.user.id, summit_id: selected.id, achieved_on: originalAchievedOn });
      // Update photos date
      await supabase.from("summit_photos").update({ taken_on: finalDate }).match({ user_id: session.user.id, summit_id: selected.id, taken_on: originalAchievedOn });
      setPhotos(prev => prev.map(p => p.summit_id === selected.id && p.taken_on === originalAchievedOn ? { ...p, taken_on: finalDate } : p));
    }

    const finalEndDate = isEndDateEnabled && climbEndDate ? climbEndDate.toISOString().slice(0, 10) : null;
    const ascentResult = await supabase.from("ascents").upsert(
      {
        user_id: session.user.id,
        summit_id: selected.id,
        achieved_on: finalDate,
        end_date: finalEndDate,
        notes: notes || null,
        is_wishlist: false,
      },
      { onConflict: "user_id,summit_id,achieved_on" },
    );

    // Remove wishlist if they register a real ascent
    if (!ascentResult.error && hasWishlist) {
      await supabase.from("ascents").delete().match({ user_id: session.user.id, summit_id: selected.id, is_wishlist: true });
    }

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
      const withoutThisAscentOrWishlist = previous.filter(
        (a) => !(a.summit_id === selected.id && (a.achieved_on === finalDate || a.achieved_on === originalAchievedOn || a.is_wishlist))
      );
      return [
        { summit_id: selected.id, achieved_on: finalDate, end_date: finalEndDate, notes: notes || null, is_wishlist: false },
        ...withoutThisAscentOrWishlist,
      ];
    });
    if (uploaded.length) setPhotos((previous) => [...uploaded, ...previous]);
    if (selectedPhotosForEdit.length > 0) {
      await supabase.from("summit_photos").update({ taken_on: finalDate }).in("id", selectedPhotosForEdit).eq("user_id", session.user.id);
      setPhotos(prev => prev.map(p => selectedPhotosForEdit.includes(p.id) ? { ...p, taken_on: finalDate } : p));
      setSelectedPhotosForEdit([]);
    }
    setFiles([]);
    setSaving(false);
    closePanel();
    setNotice(
      isPeaks
        ? "Registro guardado. ¡Una provincia menos en el mapa!"
        : "Registro guardado. ¡Un país más en tu lista!",
    );
  }

  function deleteAscent() {
    if (!supabase || !session || !selected || !originalAchievedOn) return;

    const remainingAscents = ascents.filter(a => a.summit_id === selected.id && a.achieved_on !== originalAchievedOn && !a.is_wishlist);

    const selectedAscentsForCheck = ascents.filter(a => a.summit_id === selected.id && !a.is_wishlist);
    const registeredDates = new Set(selectedAscentsForCheck.map(a => a.achieved_on));
    const hasOtherPhotos = photos.some(p => p.summit_id === selected.id && !registeredDates.has(p.taken_on));

    let confirmMessage = isPeaks
      ? "¿Seguro que quieres eliminar esta ascensión?"
      : "¿Seguro que quieres eliminar la visita a este país?";

    if (remainingAscents.length === 0 && hasOtherPhotos) {
      confirmMessage += ' Se eliminarán también las fotos de "Otras fotos".';
    }

    setConfirmConfig({
      isOpen: true,
      message: confirmMessage,
      onConfirm: performDeleteAscent,
    });
  }

  async function performDeleteAscent() {
    if (!supabase || !session || !selected || !originalAchievedOn) return;

    setSaving(true);
    setNotice("");

    const remainingAscents = ascents.filter(a => a.summit_id === selected.id && a.achieved_on !== originalAchievedOn && !a.is_wishlist);

    const deleteResult = await supabase
      .from("ascents")
      .delete()
      .match({ user_id: session.user.id, summit_id: selected.id, achieved_on: originalAchievedOn });

    if (deleteResult.error) {
      setNotice(deleteResult.error.message);
      setSaving(false);
      return;
    }

    if (remainingAscents.length === 0) {
      await supabase.from("summit_photos").delete().match({ user_id: session.user.id, summit_id: selected.id });
      setPhotos((prev) => prev.filter(p => p.summit_id !== selected.id));
    }

    setAscents((previous) => previous.filter((a) => !(a.summit_id === selected.id && a.achieved_on === originalAchievedOn)));
    setSaving(false);
    closePanel();
    setNotice(
      isPeaks
        ? "Ascensión eliminada."
        : "País eliminado de tu lista."
    );
  }

  function deletePhoto(photo: SummitPhoto) {
    if (!supabase || !session) return;

    setConfirmConfig({
      isOpen: true,
      message: "¿Seguro que quieres eliminar esta foto?",
      onConfirm: () => performDeletePhoto(photo),
    });
  }

  async function performDeletePhoto(photo: SummitPhoto) {
    if (!supabase || !session) return;
    setSaving(true);
    setNotice("Eliminando foto...");

    const { error: storageError } = await supabase.storage.from("summit-photos").remove([photo.storage_path]);
    if (storageError) {
      setNotice(`Error al eliminar la imagen: ${storageError.message}`);
      setSaving(false);
      return;
    }

    const { error: dbError } = await supabase.from("summit_photos").delete().eq("id", photo.id);
    if (dbError) {
      setNotice(dbError.message);
      setSaving(false);
      return;
    }

    setPhotos((previous) => previous.filter((p) => p.id !== photo.id));
    setLightboxPhoto(null);
    setSaving(false);
    setNotice("Foto eliminada correctamente.");
  }

  function handleBatchDeletePhotos() {
    if (!supabase || !session || selectedPhotosForEdit.length === 0) return;

    setConfirmConfig({
      isOpen: true,
      message: `¿Seguro que quieres eliminar ${selectedPhotosForEdit.length === 1 ? '1 foto' : `${selectedPhotosForEdit.length} fotos`}?`,
      onConfirm: () => performBatchDeletePhotos(),
    });
  }

  async function performBatchDeletePhotos() {
    if (!supabase || !session) return;
    setSaving(true);
    setNotice("Eliminando fotos...");

    const photosToDelete = photos.filter(p => selectedPhotosForEdit.includes(p.id));
    const storagePaths = photosToDelete.map(p => p.storage_path);

    const { error: storageError } = await supabase.storage.from("summit-photos").remove(storagePaths);
    if (storageError) {
      setNotice(`Error al eliminar las imágenes: ${storageError.message}`);
      setSaving(false);
      return;
    }

    const { error: dbError } = await supabase.from("summit_photos").delete().in("id", selectedPhotosForEdit);
    if (dbError) {
      setNotice(dbError.message);
      setSaving(false);
      return;
    }

    setPhotos((previous) => previous.filter((p) => !selectedPhotosForEdit.includes(p.id)));
    setSelectedPhotosForEdit([]);
    setSaving(false);
    setNotice("Fotos eliminadas correctamente.");
  }

  async function handleAssignPhotosToRecord(targetDate: string) {
    if (!session || selectedPhotosForEdit.length === 0) return;

    const existingPhotosCount = photos.filter(p => p.summit_id === selected?.id && p.taken_on === targetDate).length;
    if (existingPhotosCount + selectedPhotosForEdit.length > 4) {
      setNotice("No puede haber más de 4 fotos en total en un solo registro.");
      setTimeout(() => setNotice(""), 4000);
      return;
    }

    setSaving(true);
    setNotice("Asignando fotos al registro...");

    const { error } = await supabase!
      .from("summit_photos")
      .update({ taken_on: targetDate })
      .in("id", selectedPhotosForEdit)
      .eq("user_id", session.user.id);

    if (error) {
      setNotice(`Error: ${error.message}`);
    } else {
      setPhotos(prev => prev.map(p => selectedPhotosForEdit.includes(p.id) ? { ...p, taken_on: targetDate } : p));
      setNotice(`Fotos asignadas al registro del ${formatDate(targetDate)}.`);
      setAssignToRecordModalOpen(false);
      setSelectedPhotosForEdit([]);
    }
    setSaving(false);
  }

  async function handleChangeDate() {
    if (!lightboxPhoto || !lightboxNewDate || !supabase || !session) return;
    setSaving(true);
    const { error } = await supabase.from("summit_photos").update({ taken_on: lightboxNewDate }).eq("id", lightboxPhoto.id);
    if (!error) {
      setPhotos(prev => prev.map(p => p.id === lightboxPhoto.id ? { ...p, taken_on: lightboxNewDate } : p));
      setLightboxPhoto(prev => prev ? { ...prev, taken_on: lightboxNewDate } : null);
      setNotice("Fecha cambiada correctamente.");
    } else {
      setNotice("Error al cambiar la fecha.");
    }
    setTimeout(() => setNotice(""), 3000);
    setLightboxDateModalOpen(false);
    setSaving(false);
  }

  async function handleSaveEditedPhoto(blob: Blob) {
    if (!editorPhoto || !supabase || !session) return;

    // Close editor immediately for fluid UX
    window.history.back();

    const tempUrl = URL.createObjectURL(blob);
    // Optimistically update UI
    setPhotos(prev => prev.map(p => p.id === editorPhoto.id ? { ...p, public_url: tempUrl } : p));
    if (lightboxPhoto?.id === editorPhoto.id) {
      setLightboxPhoto(prev => prev ? { ...prev, public_url: tempUrl } : null);
    }

    setSaving(true);
    const newPath = `${session.user.id}/${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from("summit-photos").upload(newPath, blob, { upsert: true });

    if (uploadError) {
      setSaving(false);
      setNotice("Error al subir la imagen editada.");
      setTimeout(() => setNotice(""), 3000);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("summit-photos").getPublicUrl(newPath);
    const { error: dbError } = await supabase.from("summit_photos").update({ storage_path: newPath, public_url: publicUrl }).eq("id", editorPhoto.id);

    if (!dbError) {
      await supabase.storage.from("summit-photos").remove([editorPhoto.storage_path]);
      setPhotos(prev => prev.map(p => p.id === editorPhoto.id ? { ...p, storage_path: newPath, public_url: publicUrl } : p));
      setLightboxPhoto(prev => prev && prev.id === editorPhoto.id ? { ...prev, storage_path: newPath, public_url: publicUrl } : prev);
      setNotice("Foto editada correctamente.");
    } else {
      setNotice("Error al actualizar la base de datos.");
    }
    setTimeout(() => setNotice(""), 3000);
    setEditorPhoto(null);
    setSaving(false);
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setSelected(null);
  }

  function closePanel() {
    if (window.location.hash === "#panel") {
      window.history.back();
    } else {
      setSelected(null);
      setRecordOpen(false);
      setProfileOpen(false);
      setAuthOpen(false);
    }
  }

  function switchMode(target: ChallengeMode) {
    if (target === mode) return;

    // Clear panels explicitly without using history.back() 
    // to prevent race conditions with navigation.
    setSelected(null);
    setRecordOpen(false);
    setProfileOpen(false);
    setAuthOpen(false);

    if (onSwitchMode) {
      onSwitchMode(target);
      if (window.location.hash === "#panel") {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    } else {
      router.push(target === "peaks" ? "/picos" : "/");
    }
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
          <IconLogo className="brand-icon" />
          <span>
            {modeLabelShort} <b>{modeLabelBold}</b>
          </span>
        </a>

        {/* ── Mode selector ──────────────── */}
        {/* Movido a la sección del mapa */}

        <nav>
          {isReadOnly ? (
            <>
              <a href="/">Mapa</a>
            </>
          ) : (
            <>
              <a href="#mapa">Mapa</a>
            </>
          )}
          <a href="/social">Social</a>
          <a href="/ranking">Ranking</a>
          {session ? (
            <button className="account-button" onClick={() => {
              window.location.hash = "panel";
              setProfileOpen(true);
            }}>
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="Mi Perfil" className="account-avatar" style={{ objectFit: "cover" }} />
              ) : (
                <span className="account-avatar">
                  {myProfile?.username?.slice(0, 1).toUpperCase() || session.user.email?.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="account-username">{myProfile?.username || session.user.email?.split("@")[0]}</span>
            </button>
          ) : (
            <button
              className="button button--outline"
              onClick={() => {
                window.location.hash = "panel";
                setAuthOpen(true);
              }}
            >
              Entrar
            </button>
          )}
        </nav>
      </header>

      {/* ── Hero ────────────────────────── */}
      <section id="inicio" className="hero">
        <div>
          <span className="eyebrow">{modeHeroEyebrow}</span>
          <h1>
            {targetProfile ? (
              <>El mapa de <br /><em>@{targetProfile.username}</em></>
            ) : isPeaks ? (
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
            {!session && !targetProfile && (
              <button
                className="button button--quiet"
                onClick={() => {
                  window.location.hash = "panel";
                  setAuthOpen(true);
                }}
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

        {/* ── Mobile stat card ───────────── */}
        <div className="hero-stat-mobile">
          <div className="hero-stat-mobile__numbers">
            <strong>{achievedCount}</strong>
            <span className="hero-stat-mobile__sep">/</span>
            <span className="hero-stat-mobile__total">{totalCount}</span>
          </div>
          <div className="hero-stat-mobile__right">
            <span className="hero-stat-mobile__label">{modeUnit}</span>
            <div className="progress hero-stat-mobile__progress">
              <span style={{ width: `${completion}%` }} />
            </div>
            <b className="hero-stat-mobile__pct">{completion}%</b>
          </div>
        </div>
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
      <section className="map-section">
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

        <div id="mapa" className="section-heading map-heading-row">
          <div>
            <span className="eyebrow">{isReadOnly ? "SU PROGRESO" : "TU PROGRESO"}</span>
            <h2>{isPeaks
              ? (isReadOnly ? "Su mapa de cumbres" : "Tu mapa de cumbres")
              : (isReadOnly ? "Su mapa del mundo" : "Tu mapa del mundo")}</h2>
            <p>
              {isPeaks
                ? (isReadOnly ? "Selecciona cualquier marcador para conocer el pico o ver el registro." : "Selecciona cualquier marcador para conocer el pico o registrar una ascensión.")
                : (isReadOnly ? "Haz clic en cualquier país para ver su información o ver su registro." : "Haz clic en cualquier país para ver su información o marcarlo como visitado.")}
            </p>
          </div>
          <div className="map-legend-area">
            <div className="diff-toggle-wrap">
              {isReadOnly && session && (
                <button
                  className={`diff-toggle${diffMode ? " diff-toggle--active" : ""}`}
                  onClick={() => setDiffMode(!diffMode)}
                  title="Compara tu progreso con el suyo"
                >
                  <svg className="diff-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  {diffMode ? "Comparando" : "Comparar conmigo"}
                </button>
              )}
              {!isPeaks && myProfile?.enable_regions && (
                <button
                  className={`diff-toggle${regionsMode ? " diff-toggle--active" : ""}`}
                  onClick={() => setRegionsMode(!regionsMode)}
                  title="Ver divisiones territoriales"
                >
                  <svg className="diff-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <line x1="3" y1="9" x2="21" y2="9" />
                    <line x1="9" y1="21" x2="9" y2="9" />
                  </svg>
                  Regiones
                </button>
              )}
            </div>
            {diffMode ? (
              <div className="diff-legend">
                <span>
                  <i className="legend-diff-dot legend-diff-dot--only-me" /> Solo tú
                </span>
                <span>
                  <i className="legend-diff-dot legend-diff-dot--only-them" /> Solo @{targetProfile?.username}
                </span>
                <span>
                  <i className="legend-diff-dot legend-diff-dot--both" /> Ambos
                </span>
                <span>
                  <i className="legend-diff-dot legend-diff-dot--none" /> Ninguno
                </span>
              </div>
            ) : (
              <div className="map-legend">
                <span>
                  <i className="legend-pin">{isPeaks ? "△" : "◇"}</i> Pendiente
                </span>
                <span>
                  <i className="legend-wishlist">★</i> Quiero ir
                </span>
                <span>
                  <i className="legend-done">✓</i> {isPeaks ? "Completada" : "Visitado"}
                </span>
              </div>
            )}
          </div>
        </div>
        {isPeaks ? (
          <SpainMap
            completed={completedPeakCodes}
            wishlist={wishlistPeakCodes}
            onInformation={openPeakInformation}
            onComplete={openPeakRecord}
            diffMode={diffMode}
            diffOnlyViewer={diffPeakOnlyViewer}
            diffOnlyTarget={diffPeakOnlyTarget}
            diffBoth={diffPeakBoth}
            activeId={selected?.id}
          />
        ) : (
          <WorldMap
            completed={completedCountryIds}
            wishlist={wishlistCountryIds}
            onInformation={openCountryInformation}
            onRegionInformation={handleRegionInformation}
            onComplete={openCountryRecord}
            diffMode={diffMode}
            diffOnlyViewer={diffItemOnlyViewer}
            diffOnlyTarget={diffItemOnlyTarget}
            diffBoth={diffItemBoth}
            regionsMode={regionsMode}
            completedRegions={completedRegionIds}
            activeId={selected?.id}
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

        {/* ── Filter pills ──────────────── */}
        <div className="list-filters">
          <button
            className={`list-filter-pill${listFilter === "all" ? " list-filter-pill--active" : ""}`}
            onClick={() => setListFilter("all")}
          >
            Todos <span className="pill-count">{totalCount}</span>
          </button>
          <button
            className={`list-filter-pill${listFilter === "done" ? " list-filter-pill--active" : ""}`}
            onClick={() => setListFilter("done")}
          >
            {isPeaks ? "Completadas" : "Visitados"} <span className="pill-count">{achievedCount}</span>
          </button>
          <button
            className={`list-filter-pill${listFilter === "pending" ? " list-filter-pill--active" : ""}`}
            onClick={() => setListFilter("pending")}
          >
            Pendientes <span className="pill-count">{totalCount - achievedCount - wishlistCount}</span>
          </button>
          <button
            className={`list-filter-pill${listFilter === "wishlist" ? " list-filter-pill--active" : ""}`}
            onClick={() => setListFilter("wishlist")}
          >
            Quiero ir <span className="pill-count">{wishlistCount}</span>
          </button>
        </div>
        <div className="peak-list-grid">
          {sortedItems.filter(item => {
            // Text search filter
            if (searchQuery) {
              const q = searchQuery.toLowerCase();
              const matchesText = (
                item.title.toLowerCase().includes(q) ||
                (item.label && item.label.toLowerCase().includes(q)) ||
                (item.detail && item.detail.toLowerCase().includes(q))
              );
              if (!matchesText) return false;
            }
            // Status filter
            const done = completedModeAscents.some((a) => a.summit_id === item.id);
            const wish = modeAscents.some((a) => a.summit_id === item.id && a.is_wishlist);
            if (listFilter === "done") return done;
            if (listFilter === "pending") return !done && !wish;
            if (listFilter === "wishlist") return wish;
            return true;
          }).map((item, index) => {
            const done = completedModeAscents.some((a) => a.summit_id === item.id);
            const wish = modeAscents.some((a) => a.summit_id === item.id && a.is_wishlist);

            // Diff class logic
            let diffClass = "";
            let diffSymbol: React.ReactNode = null;
            if (diffMode) {
              if (diffItemOnlyViewer.has(item.id)) {
                diffClass = " peak-list-item--diff-only-me";
                diffSymbol = <IconCheck />;
              } else if (diffItemOnlyTarget.has(item.id)) {
                diffClass = " peak-list-item--diff-only-them";
                diffSymbol = <span style={{ fontSize: 11, fontWeight: 700 }}>✗</span>;
              } else if (diffItemBoth.has(item.id)) {
                diffClass = " peak-list-item--diff-both";
                diffSymbol = <IconCheck />;
              } else {
                diffClass = " peak-list-item--diff-none";
              }
            }

            const itemClass = diffMode
              ? `peak-list-item${diffClass}`
              : `peak-list-item${done ? " peak-list-item--done" : wish ? " peak-list-item--wishlist" : ""}`;

            return (
              <button
                key={`${item.id}-${index}`}
                className={itemClass}
                onClick={() => openInformation(item)}
              >
                <span className="item-check">
                  {diffMode ? diffSymbol : (
                    <>
                      {done && <IconCheck />}
                      {wish && <span className="item-wish-star">★</span>}
                    </>
                  )}
                </span>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 19 }}>
                <div className="altitude" style={{ marginTop: 0 }}>
                  {selected.subtitle.replace(" m", "")} <span>m</span>
                </div>
              </div>
              <p className="range">{selected.detail}</p>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 19 }}>
                <div className="country-capital" style={{ marginTop: 0 }}>{selected.subtitle}</div>
              </div>
              <p className="range">{selected.detail}</p>
            </>
          )}
          <p>{selected.note}</p>

          {selectedAscents.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(92, 155, 125, 0.1)', borderRadius: '20px', padding: '3px', position: 'relative', marginBottom: '16px', cursor: 'pointer', userSelect: 'none', width: 'fit-content' }} onClick={() => setAscentsSortOrder(o => o === "asc" ? "desc" : "asc")}>
              <div style={{ position: 'absolute', top: 3, bottom: 3, left: ascentsSortOrder === "asc" ? 3 : '50%', right: ascentsSortOrder === "asc" ? '50%' : 3, background: 'var(--pine)', borderRadius: '18px', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }} />
              <span style={{ position: 'relative', zIndex: 1, padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: ascentsSortOrder === "asc" ? 'white' : 'var(--pine)', transition: 'color 0.2s ease', flex: 1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Más antiguo</span>
              <span style={{ position: 'relative', zIndex: 1, padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: ascentsSortOrder === "desc" ? 'white' : 'var(--pine)', transition: 'color 0.2s ease', flex: 1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Más reciente</span>
            </div>
          )}

          {selectedAscents.length > 0 ? (
            selectedAscents.map(ascent => {
              const ascentPhotos = selectedPhotos.filter(p => p.taken_on === ascent.achieved_on);
              return (
                <div key={ascent.achieved_on} className="completed-card">
                  <span>✓ {isPeaks ? "Ascensión registrada" : "Visita registrada"}</span>
                  <b>
                    {formatDate(ascent.achieved_on)}
                    {ascent.end_date && ` - ${formatDate(ascent.end_date)}`}
                  </b>
                  {ascent.notes && <p>&ldquo;{ascent.notes}&rdquo;</p>}

                  {!isReadOnly && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 12 }}>
                      <button className="button button--quiet button--small" style={{ margin: 0, padding: '0 12px', height: '32px' }} onClick={() => openRecord(selected, ascent)}>
                        Editar registro
                      </button>
                      <label
                        title="Añadir fotos a esta fecha"
                        className="button button--quiet button--small"
                        onClick={(e) => {
                          if (ascentPhotos.length >= 4) {
                            e.preventDefault();
                            setNotice("Máximo 4 fotos por registro. Ya has alcanzado el límite.");
                            setTimeout(() => setNotice(""), 4000);
                          }
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: '32px', height: '32px', flexShrink: 0, padding: 0, margin: 0,
                          cursor: ascentPhotos.length >= 4 ? 'not-allowed' : 'pointer',
                          opacity: ascentPhotos.length >= 4 ? 0.5 : 1
                        }}
                      >
                        <IconCamera style={{ width: 14, height: 14 }} strokeWidth={1.5} />
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleAddPhotosToDate(e, ascent)}
                          style={{ display: 'none' }}
                          disabled={ascentPhotos.length >= 4}
                        />
                      </label>
                    </div>
                  )}

                  {ascentPhotos.length > 0 && (
                    <div className="photo-section" style={{ marginTop: 16 }}>
                      <div className="photo-grid">
                        {ascentPhotos.map((photo) => {
                          const isSelected = selectedPhotosForEdit.includes(photo.id);
                          return (
                            <figure key={photo.id} className={isSelected ? 'selected' : ''} onClick={() => handlePhotoClick(photo)}>
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  className={`photo-select-circle ${isSelected ? 'active' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); togglePhotoSelection(photo.id); }}
                                  aria-label="Seleccionar foto"
                                >
                                  {isSelected && <IconCheck />}
                                </button>
                              )}
                              <img src={photo.public_url} alt={`${isPeaks ? "Ascensión a" : "Visita a"} ${selected.title}`} loading="lazy" />
                              {photo.caption && <figcaption>{photo.caption}</figcaption>}
                            </figure>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : hasWishlist ? (
            <div className="pending-card" style={{ background: "var(--amber-bg)", color: "#a67c29", borderColor: "#ecd9a5" }}>
              ★ En tu lista de deseos
            </div>
          ) : (
            <div className="pending-card">
              {isPeaks
                ? (isReadOnly ? "Aún no ha registrado esta cima." : "Aún no has registrado esta cima.")
                : (isReadOnly ? "Aún no ha registrado este país." : "Aún no has registrado este país.")}
            </div>
          )}

          {/* Other photos that don't match any registered date */}
          {(() => {
            const registeredDates = new Set(selectedAscents.map(a => a.achieved_on));
            const otherPhotos = selectedPhotos.filter(p => !registeredDates.has(p.taken_on));
            if (otherPhotos.length === 0) return null;
            return (
              <div className="photo-section" style={{ marginTop: 24 }}>
                <h3>Otras fotos <small>{otherPhotos.length}</small></h3>
                <div className="photo-grid">
                  {otherPhotos.map((photo) => {
                    const isSelected = selectedPhotosForEdit.includes(photo.id);
                    return (
                      <figure key={photo.id} className={isSelected ? 'selected' : ''} onClick={() => handlePhotoClick(photo)}>
                        {!isReadOnly && (
                          <button
                            type="button"
                            className={`photo-select-circle ${isSelected ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); togglePhotoSelection(photo.id); }}
                            aria-label="Seleccionar foto"
                          >
                            {isSelected && <IconCheck />}
                          </button>
                        )}
                        <img src={photo.public_url} alt={`Foto en ${selected.title}`} loading="lazy" />
                        <figcaption>{photo.caption ? photo.caption : formatDate(photo.taken_on)}</figcaption>
                      </figure>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="panel-actions">
            {!isReadOnly && (
              <button
                className={`button ${isPeaks ? "button--green" : "button--purple"} button--wide`}
                onClick={() => openRecord(selected)}
              >
                {selectedAscents.length > 0
                  ? "Registrar otra fecha"
                  : isPeaks ? "Marcar como completado" : "Marcar como visitado"}
              </button>
            )}
            {(!selectedAscents.length || hasWishlist) && !isReadOnly && (
              <button
                className="button button--quiet button--wide"
                style={{ marginTop: 8 }}
                onClick={() => saveWishlist()}
              >
                {hasWishlist ? "Quitar de mi lista de deseos" : "Añadir a mi lista de deseos"}
              </button>
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

            <div className="field-label" style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span>{isPeaks ? "Fecha de la ascensión" : "Fecha de la visita"}</span>
                {!isDateUnknown && !isEndDateEnabled && (
                  <button
                    type="button"
                    className="diff-toggle"
                    style={{ fontSize: "0.85em", padding: "4px 8px", height: "auto" }}
                    onClick={() => {
                      setIsEndDateEnabled(true);
                      if (!climbEndDate && climbDate) {
                        setClimbEndDate(new Date(climbDate));
                        setIsDateModified(true);
                      }
                    }}
                  >
                    <svg className="diff-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    Fecha finalización
                  </button>
                )}
              </div>
              {isDateUnknown ? (
                <button
                  type="button"
                  className="button button--outline button--wide"
                  onClick={() => { setIsDateUnknown(false); setClimbDate(new Date()); setIsDateModified(true); }}
                >
                  Establecer fecha
                </button>
              ) : (
                isEndDateEnabled ? (
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginTop: 4 }}>
                    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 4 }}>
                      <label style={{ fontSize: "0.8em", color: "var(--muted)" }}>Comienzo</label>
                      <input
                        type="date"
                        value={climbDate ? (climbDate.toISOString().slice(0, 10)) : ""}
                        onChange={(e) => {
                          setClimbDate(e.target.value ? new Date(e.target.value) : new Date());
                          setIsDateModified(true);
                        }}
                        max={new Date().toISOString().slice(0, 10)}
                        style={{ padding: "0 12px", margin: 0, height: "35px", boxSizing: "border-box" }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label style={{ fontSize: "0.8em", color: "var(--muted)" }}>Fin</label>
                        <button
                          type="button"
                          className="button button--quiet"
                          style={{ padding: 0, height: 16, minWidth: "auto", border: "none" }}
                          onClick={() => { setIsEndDateEnabled(false); setClimbEndDate(null); }}
                          title="Quitar fecha finalización"
                        >
                          <IconClose style={{ width: 12, height: 12 }} />
                        </button>
                      </div>
                      <input
                        type="date"
                        value={climbEndDate ? (climbEndDate.toISOString().slice(0, 10)) : ""}
                        onChange={(e) => {
                          setClimbEndDate(e.target.value ? new Date(e.target.value) : new Date());
                          setIsDateModified(true);
                        }}
                        min={climbDate ? (climbDate.toISOString().slice(0, 10)) : ""}
                        max={new Date().toISOString().slice(0, 10)}
                        style={{ padding: "0 12px", margin: 0, height: "35px", boxSizing: "border-box" }}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: "0.8em", visibility: "hidden" }}>X</label>
                      <button
                        type="button"
                        className="button button--quiet"
                        onClick={() => { setIsDateUnknown(true); setClimbDate(null); setClimbEndDate(null); setIsEndDateEnabled(false); setIsDateModified(true); }}
                        title="Quitar fechas"
                        style={{ padding: 0, minWidth: "auto", width: "35px", height: "35px", display: "flex", alignItems: "center", justifyContent: "center", margin: 0 }}
                      >
                        <IconClose style={{ width: 16, height: 16 }} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: 4 }}>
                    <input
                      type="date"
                      value={climbDate ? (climbDate.toISOString().slice(0, 10)) : ""}
                      onChange={(e) => {
                        setClimbDate(e.target.value ? new Date(e.target.value) : new Date());
                        setIsDateModified(true);
                      }}
                      max={new Date().toISOString().slice(0, 10)}
                      style={{ flex: 1, padding: "0 12px", margin: 0, height: "35px", boxSizing: "border-box" }}
                    />
                    <button
                      type="button"
                      className="button button--quiet"
                      onClick={() => { setIsDateUnknown(true); setClimbDate(null); setIsDateModified(true); }}
                      title="Quitar fecha"
                      style={{ padding: 0, minWidth: "auto", width: "35px", height: "35px", display: "flex", alignItems: "center", justifyContent: "center", margin: 0 }}
                    >
                      <IconClose style={{ width: 16, height: 16 }} />
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="field-label" style={{ marginBottom: 18 }}>
              <span>Añadir fotos</span>
              <label className="file-dropzone">
                <IconCamera />
                <span className="file-dropzone-text">
                  <span className="hide-on-mobile">Sube o arrastra tus fotos aquí</span>
                  <span className="show-on-mobile">Sube tus fotos aquí</span>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onFilesChanged}
                />
              </label>
            </div>

            {(files.length > 0 || selectedPhotosForEdit.length > 0) && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                {Array.from(files).map((file, i) => (
                  <div key={`local-${i}`} style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={URL.createObjectURL(file)} alt="preview local" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} />
                    <button 
                      onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                      title="Quitar imagen"
                      style={{ position: 'absolute', top: '2px', right: '2px', background: '#e74c3c', color: 'white', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', padding: 0, zIndex: 10 }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                ))}
                {selectedPhotosForEdit.map(id => {
                  const p = photos.find(x => x.id === id);
                  return p ? (
                    <div key={id} style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={p.public_url} alt="preview galeria" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} />
                      <button 
                        onClick={() => setSelectedPhotosForEdit(prev => prev.filter(x => x !== id))}
                        title="Quitar imagen"
                        style={{ position: 'absolute', top: '2px', right: '2px', background: '#e74c3c', color: 'white', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', padding: 0, zIndex: 10 }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
            )}
            {(files.length > 0 || selectedPhotosForEdit.length > 0) && (
              <p className="file-count" style={{ marginTop: '4px', color: 'var(--sage)', fontSize: '12px' }}>
                {files.length + selectedPhotosForEdit.length} foto{(files.length + selectedPhotosForEdit.length) !== 1 ? "s" : ""} preparada{(files.length + selectedPhotosForEdit.length) !== 1 ? "s" : ""} para adjuntar.
              </p>
            )}

            <label className="field-label">
              Notas
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
            {originalAchievedOn && (
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
      {lightboxPhoto && (
        <div
          className="lightbox-backdrop"
          onClick={() => window.history.back()}
        >
          <button
            className="lightbox-close"
            onClick={(e) => {
              e.stopPropagation();
              window.history.back();
            }}
            aria-label="Cerrar imagen"
          >
            <IconClose />
          </button>
          {!isReadOnly && (
            <>
              <button
                className="lightbox-menu-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxMenuOpen(!lightboxMenuOpen);
                }}
                aria-label="Opciones"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <circle cx="12" cy="5" r="2"></circle>
                  <circle cx="12" cy="12" r="2"></circle>
                  <circle cx="12" cy="19" r="2"></circle>
                </svg>
              </button>
              {lightboxMenuOpen && (
                <div className="lightbox-dropdown">
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setLightboxMenuOpen(false);
                    setEditorPhoto(lightboxPhoto);
                    window.history.pushState(null, "", "#editor");
                  }}>Editar foto</button>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setLightboxMenuOpen(false);
                    setLightboxNewCaption(lightboxPhoto.caption || "");
                    setLightboxCaptionModalOpen(true);
                  }}>Descripción</button>

                  <button className="danger" onClick={(e) => {
                    e.stopPropagation();
                    setLightboxMenuOpen(false);
                    deletePhoto(lightboxPhoto);
                  }}>Eliminar</button>
                </div>
              )}
            </>
          )}
          <img
            src={lightboxPhoto.public_url}
            alt={`${isPeaks ? "Ascensión a" : "Visita a"} ${selected?.title}`}
            onClick={(e) => {
              e.stopPropagation();
              setLightboxMenuOpen(false);
            }}
          />
          <span className="lightbox-caption">
            {lightboxPhoto.caption && (
              <strong style={{ display: 'block', fontSize: '15px', marginBottom: '2px', color: 'white' }}>{lightboxPhoto.caption}</strong>
            )}
            <span style={{ opacity: lightboxPhoto.caption ? 0.7 : 1 }}>
              {selected?.title}
              {(() => {
                if (lightboxPhoto.taken_on.startsWith("1900-01-01")) return "";
                const relatedAscent = ascents.find(a => a.summit_id === selected?.id && a.achieved_on === lightboxPhoto.taken_on);
                return ` · ${formatShortDate(lightboxPhoto.taken_on)}${relatedAscent?.end_date ? ` - ${formatShortDate(relatedAscent.end_date)}` : ""}`;
              })()}
            </span>
          </span>

          {lightboxCaptionModalOpen && (
            <div className="lightbox-date-modal" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>Añadir descripción</h3>

              <div style={{ marginTop: 12 }}>
                <textarea placeholder="Añade una descripción..." value={lightboxNewCaption} onChange={(e) => setLightboxNewCaption(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #dce4da', minHeight: '100px', resize: 'vertical' }} />
              </div>

              <div className="lightbox-date-modal-actions" style={{ marginTop: 16 }}>
                <button className="cancel" onClick={() => setLightboxCaptionModalOpen(false)}>Cancelar</button>
                <button className="save" onClick={handleSaveCaption} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
              </div>
            </div>
          )}

        </div>
      )}

      {selectedPhotosForEdit.length > 0 && (
        <div className="photo-batch-bar" style={{ position: 'fixed', bottom: '25px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: '#18342d', padding: '12px 24px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', color: 'white', animation: 'fadeUp 0.3s ease' }}>
          <span style={{ fontSize: '14px', fontWeight: 500 }}><span className="hide-on-mobile">Seleccionadas: </span>{selectedPhotosForEdit.length}</span>

          {selectedAscents.length > 0 && (
            <button
              title="Asignar a registro"
              onClick={() => {
                if (selectedPhotosForEdit.length > 4) {
                  setNotice("No puedes asignar más de 4 fotos a un registro.");
                  setTimeout(() => setNotice(""), 3000);
                  return;
                }
                setAssignToRecordModalOpen(true);
              }}
              className="photo-batch-action"
              style={selectedPhotosForEdit.length > 4 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <IconFolderMove style={{ width: 16, height: 16 }} />
              <span className="hide-on-mobile">Asignar</span>
            </button>
          )}
          <button title="Eliminar" onClick={handleBatchDeletePhotos} className="photo-batch-action danger-icon">
            <IconTrash style={{ width: 16, height: 16 }} />
            <span className="hide-on-mobile">Eliminar</span>
          </button>
          <button title="Cancelar" onClick={() => setSelectedPhotosForEdit([])} className="photo-batch-action ghost">
            <IconClose style={{ width: 18, height: 18 }} />
            <span className="hide-on-mobile">Cancelar</span>
          </button>
        </div>
      )}

      {assignToRecordModalOpen && (
        <div className="modal-backdrop" onClick={() => setAssignToRecordModalOpen(false)} style={{ zIndex: 200 }}>
          <div className="auth-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Asignar a registro</h2>
            <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "20px" }}>Selecciona el registro al que asignar {selectedPhotosForEdit.length} foto{selectedPhotosForEdit.length !== 1 ? 's' : ''}:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedAscents.map(ascent => (
                <button
                  key={ascent.achieved_on}
                  className="button button--outline button--wide"
                  style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                  onClick={() => handleAssignPhotosToRecord(ascent.achieved_on)}
                  disabled={saving}
                >
                  ✓ {formatDate(ascent.achieved_on)}
                </button>
              ))}
              <button
                className="button button--outline button--wide"
                style={{ textAlign: 'left', justifyContent: 'flex-start', borderStyle: 'dashed' }}
                onClick={() => { setAssignToRecordModalOpen(false); openRecord(selected, undefined); }}
                disabled={saving}
              >
                + Crear nuevo registro
              </button>
            </div>
            <button className="button button--quiet button--wide" style={{ marginTop: '16px' }} onClick={() => setAssignToRecordModalOpen(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {editorPhoto && (
        <PhotoEditor
          imageUrl={editorPhoto.public_url}
          onSave={handleSaveEditedPhoto}
          onCancel={() => window.history.back()}
        />
      )}

      {/* ── Modals ──────────────────────── */}
      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} />}
      {profileOpen && session && <ProfileSettings session={session} onProfileUpdate={(p) => {
        setMyProfile(prev => ({ ...prev, ...p }));
        if (p.enable_regions === false) setRegionsMode(false);
      }} onClose={() => setProfileOpen(false)} />}
      <ConfirmModal
        isOpen={!!confirmConfig?.isOpen}
        message={confirmConfig?.message || ""}
        onConfirm={() => {
          if (confirmConfig?.onConfirm) confirmConfig.onConfirm();
          setConfirmConfig(null);
        }}
        onCancel={() => setConfirmConfig(null)}
      />

      {/* ── PWA Install Prompt ────────── */}
      <InstallPrompt />
    </main>
  );
}
