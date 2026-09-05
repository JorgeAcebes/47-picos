"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { peaks, type Peak } from "@/data/peaks";
import { countries, type Country } from "@/data/countries";
import { predefinedCategories, CustomExperience, ExperienceCategory } from "@/data/experiences";
import { regionsByCountryIsoA2, type Region } from "@/data/regions";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { AuthDialog } from "./auth-dialog";
import { ProfileSettings } from "./profile-settings";
import { InstallPrompt } from "./install-prompt";
import { ConfirmModal } from "./confirm-modal";
import PhotoEditor from "./photo-editor";
import { getIconComponent } from "./icons";
import { LocationSearch } from "./location-search";
import { Link as LinkIcon, Camera, MapPin, Briefcase, Video } from "lucide-react";
import { usePendingRequests } from "./use-pending-requests";

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

type Ascent = {
  summit_id: string;
  achieved_on: string;
  end_date?: string | null;
  notes: string | null;
  is_wishlist: boolean;
  record_id?: string;
  lat?: number | null;
  lng?: number | null;
  location_name?: string | null;
  sub_item_id?: string | null;
  link?: string | null;
  link_name?: string | null;
};
export type SelectedItem = {
  id: string;
  sub_item_id?: string;
  title: string;
  subtitle: string;
  label: string;
  detail: string;
  note: string;
  iconName?: string;
  subItems?: any;
};

export type SummitPhoto = {
  id: string;
  summit_id: string;
  public_url: string;
  taken_on: string;
  caption: string | null;
  created_at: string;
  storage_path: string;
};



export type HiddenItem = {
  id: string;
  user_id: string;
  item_id: string;
  item_type: 'category' | 'experience';
};

export type ExperienceRecord = {
  id: string;
  user_id: string;
  experience_id: string;
  sub_item_id?: string;
  lat: number;
  lng: number;
  achieved_on: string;
  notes?: string;
  link?: string;
  link_name?: string;
  is_wishlist: boolean;
  location_name?: string | null;
  created_at: string;
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
  onNavigate?: (tab: string) => void;
  isActive?: boolean;
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
    month: "short",
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
      <path className="logo-mountain-1" d="M12 52 L36 12 L48 32.75 Z" fill="url(#logoGradGreen)" />
      <path className="logo-mountain-2" d="M24 60 L44 26 L60 52 Z" fill="url(#logoGradPurple)" />
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

function IconEdit(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
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

export function SummitTracker({ mode: initialModeProp, targetProfile, onSwitchMode, onNavigate, isActive = true }: Props) {
  const router = useRouter();
  const [currentMode, setCurrentMode] = useState<ChallengeMode>(initialModeProp);
  const isPeaks = currentMode === "peaks";
  const isReadOnly = !!targetProfile;
  const hasPendingRequests = usePendingRequests();

  useEffect(() => {
    if (!isActive) return;
    const handlePopState = () => {
      if (window.location.pathname === "/picos") setCurrentMode("peaks");
      else if (window.location.pathname === "/") setCurrentMode("countries");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isActive]);

  const [session, setSession] = useState<Session | null>(null);
  const [myProfile, setMyProfile] = useState<{ username: string; avatar_url: string | null; enable_regions?: boolean; enable_experiences?: boolean } | null>(null);
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
  const [link, setLink] = useState("");
  const [linkName, setLinkName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [listFilter, setListFilter] = useState<string>("all");
  const [selectedPhotoFiles, setSelectedPhotoFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<SummitPhoto | null>(null);
  const [lightboxMenuOpen, setLightboxMenuOpen] = useState(false);
  const [lightboxCaptionModalOpen, setLightboxCaptionModalOpen] = useState(false);
  const [lightboxDateModalOpen, setLightboxDateModalOpen] = useState(false);

  const [lightboxNewCaption, setLightboxNewCaption] = useState("");
  const [lightboxNewDate, setLightboxNewDate] = useState<string | null>(null);
  const [selectedPhotosForEdit, setSelectedPhotosForEdit] = useState<string[]>([]);

  useEffect(() => {
    if (lightboxPhoto !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightboxPhoto]);

  // Experience features
  const [experienceRecords, setExperienceRecords] = useState<ExperienceRecord[]>([]);
  const [customExperiences, setCustomExperiences] = useState<any[]>([]); // We use any[] for now or import CustomExperience
  const [customCategories, setCustomCategories] = useState<any[]>([]);
  const [hiddenItems, setHiddenItems] = useState<HiddenItem[]>([]);
  const [editingCustomCategory, setEditingCustomCategory] = useState<any>(null); // null, 'new', or existing category object
  const [editingCustomExp, setEditingCustomExp] = useState<any>(null); // null, 'new', or existing custom experience
  const [confirmAction, setConfirmAction] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [creatingCustomExp, setCreatingCustomExp] = useState(false);
  const [customExpName, setCustomExpName] = useState("");
  const [customExpIcon, setCustomExpIcon] = useState("star");
  const [selectingLocationForExp, setSelectingLocationForExp] = useState<string | null>(null);
  const [selectingCategoryForNewExp, setSelectingCategoryForNewExp] = useState(false);
  const [expSelectorOpen, setExpSelectorOpen] = useState(false);
  const [expandedExpCategory, setExpandedExpCategory] = useState<string | null>(null);
  const [selectedLatLng, setSelectedLatLng] = useState<{ lat: number, lng: number } | null>(null);
  const [editingExpRecordId, setEditingExpRecordId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState("");

  const [assignToRecordModalOpen, setAssignToRecordModalOpen] = useState(false);
  const [editorPhoto, setEditorPhoto] = useState<SummitPhoto | null>(null);
  const [diffMode, setDiffMode] = useState(false);
  const [regionsMode, setRegionsMode] = useState(false);
  const [experiencesMode, setExperiencesMode] = useState(false);
  const [isEditingExperiences, setIsEditingExperiences] = useState(false);
  const [iconDropdownOpen, setIconDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isReadOnly) {
      const savedExp = localStorage.getItem("myExperiencesMode");
      if (savedExp === "true") setExperiencesMode(true);
      const savedReg = localStorage.getItem("myRegionsMode");
      if (savedReg === "true") setRegionsMode(true);
    }
  }, [isReadOnly]);

  useEffect(() => {
    if (!isReadOnly) {
      localStorage.setItem("myExperiencesMode", experiencesMode.toString());
    }
  }, [experiencesMode, isReadOnly]);

  useEffect(() => {
    if (!isReadOnly) {
      localStorage.setItem("myRegionsMode", regionsMode.toString());
    }
  }, [regionsMode, isReadOnly]);
  const [expandedCountryId, setExpandedCountryId] = useState<string | null>(null);
  const [ascentsSortOrder, setAscentsSortOrder] = useState<"asc" | "desc">("asc");
  const [myAscents, setMyAscents] = useState<Ascent[]>([]);

  const touchStartX = useRef<number | null>(null);

  const currentPhotoGroup = useMemo(() => {
    if (!lightboxPhoto || !selected) return [];
    const registeredDates = new Set(ascents.filter(a => a.summit_id === selected.id && !a.is_wishlist).map(a => a.achieved_on));
    const isRegistered = registeredDates.has(lightboxPhoto.taken_on);

    if (isRegistered) {
      return photos.filter(p => p.summit_id === selected.id && p.taken_on === lightboxPhoto.taken_on);
    } else {
      return photos.filter(p => p.summit_id === selected.id && !registeredDates.has(p.taken_on));
    }
  }, [lightboxPhoto, selected, ascents, photos]);

  const lightboxIndex = lightboxPhoto ? currentPhotoGroup.findIndex(p => p.id === lightboxPhoto.id) : -1;
  const hasPrevPhoto = lightboxIndex > 0;
  const hasNextPhoto = lightboxIndex !== -1 && lightboxIndex < currentPhotoGroup.length - 1;

  const showPrevPhoto = useCallback(() => {
    if (hasPrevPhoto) {
      setLightboxPhoto(currentPhotoGroup[lightboxIndex - 1]);
    }
  }, [hasPrevPhoto, currentPhotoGroup, lightboxIndex]);

  const showNextPhoto = useCallback(() => {
    if (hasNextPhoto) {
      setLightboxPhoto(currentPhotoGroup[lightboxIndex + 1]);
    }
  }, [hasNextPhoto, currentPhotoGroup, lightboxIndex]);

  useEffect(() => {
    if (!lightboxPhoto || !isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") showPrevPhoto();
      else if (e.key === "ArrowRight") showNextPhoto();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxPhoto, showPrevPhoto, showNextPhoto, isActive]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const distance = touchStartX.current - touchEndX;

    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      showNextPhoto();
    } else if (distance < -minSwipeDistance) {
      showPrevPhoto();
    }
    touchStartX.current = null;
  };

  useEffect(() => {
    if (session) {
      supabase?.from("profiles").select("username, avatar_url, enable_regions, enable_experiences").eq("id", session.user.id).single().then(({ data }) => {
        if (data) setMyProfile(data);
      });
    }
  }, [session]);

  // Handle back button to close panels
  useEffect(() => {
    if (!isActive) return;
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === "#editor") {
        // Let it stay open
      } else if (hash === "#lightbox") {
        setEditorPhoto(null);
      } else if (hash.startsWith("#panel")) {
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
    window.addEventListener("popstate", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) {
      document.body.classList.remove("mode-experiences");
      document.body.classList.remove("mode-countries");
      return;
    }
    setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
    if (experiencesMode && !isPeaks) {
      document.body.classList.add("mode-experiences");
      document.body.classList.remove("mode-countries");
    } else if (isPeaks) {
      document.body.classList.remove("mode-experiences");
      document.body.classList.remove("mode-countries");
    } else {
      document.body.classList.add("mode-countries");
      document.body.classList.remove("mode-experiences");
    }
  }, [experiencesMode, isPeaks, isActive]);

  // ── Mode config ────────────────────────────
  const isExp = experiencesMode && !isPeaks;
  const dynamicCategories = useMemo(() => {
    const hiddenCategoryIds = new Set(hiddenItems.filter(h => h.item_type === 'category').map(h => h.item_id));
    const hiddenExperienceIds = new Set(hiddenItems.filter(h => h.item_type === 'experience').map(h => h.item_id));

    const visiblePredefined = predefinedCategories
      .filter(cat => !hiddenCategoryIds.has(cat.id))
      .map(cat => {
        const override = customCategories.find(c => c.static_id === cat.id);
        const name = override ? override.name : cat.name;
        const iconName = override ? override.icon_name : cat.iconName;

        const linkedCustomExps = customExperiences
          .filter(ce => ce.static_category_id === cat.id)
          .map(ce => ({ id: ce.id, name: ce.name, subItems: ce.sub_items }));

        return {
          ...cat,
          name,
          iconName,
          experiences: [
            ...cat.experiences.filter(exp => !hiddenExperienceIds.has(exp.id)),
            ...linkedCustomExps.filter(exp => !hiddenExperienceIds.has(exp.id))
          ]
        };
      });

    const customCats: ExperienceCategory[] = customCategories
      .filter(cat => !cat.static_id && !hiddenCategoryIds.has(cat.id))
      .map(cat => ({
      id: cat.id,
      name: cat.name,
      iconName: cat.icon_name,
      experiences: customExperiences
        .filter(ce => ce.category_id === cat.id && !hiddenExperienceIds.has(ce.id))
        .map(ce => ({
          id: ce.id,
          name: ce.name,
          subItems: ce.sub_items
        }))
    }));

    // Group any orphaned experiences (no custom category, no static category)
    const orphanedExperiences = customExperiences.filter(ce => !ce.category_id && !ce.static_category_id && !hiddenExperienceIds.has(ce.id));
    if (orphanedExperiences.length > 0) {
      const orphansCat = orphanedExperiences.reduce((acc: ExperienceCategory[], ce) => {
        const icon = ce.icon_name || "star";
        let c = acc.find(x => x.iconName === icon);
        if (!c) {
          c = { id: `cat-custom-${icon}`, name: `Personalizadas (${icon})`, iconName: icon, experiences: [] };
          acc.push(c);
        }
        c.experiences.push({ id: ce.id, name: ce.name, subItems: ce.sub_items } as any);
        return acc;
      }, []);
      customCats.push(...orphansCat);
    }

    return [...visiblePredefined, ...customCats];
  }, [customExperiences, customCategories, hiddenItems]);

  const allItems = useMemo(() => isPeaks
    ? peaks.map(peakToItem)
    : isExp
      ? dynamicCategories.flatMap(cat =>
        cat.experiences.map(exp => ({
          id: exp.id,
          title: exp.name,
          subtitle: "",
          label: "",
          detail: cat.name,
          note: "",
          iconName: cat.iconName,
          subItems: exp.subItems
        }))
      )
      : countries.map(countryToItem), [isPeaks, isExp, dynamicCategories]);

  const totalCount = isPeaks ? 47 : allItems.length;
  const modeLabel = isPeaks ? "47 PICOS" : "196 PAÍSES";
  const modeLabelShort = isPeaks ? "47" : "196";
  const modeLabelBold = isPeaks ? "PICOS" : "PAÍSES";
  const modeUnit = isPeaks ? "cimas conquistadas" : isExp ? "experiencias registradas" : "países visitados";
  const modeUnitSingular = isPeaks ? "cima" : isExp ? "experiencia" : "país";
  const modeHeroEyebrow = isPeaks ? "UN RETO, 47 PICOS" : isExp ? "UN RETO, EXPERIENCIAS GLOBALES" : "UN RETO, 196 PAÍSES";
  const modeHeroSubtitle = isPeaks
    ? "El mapa para conquistar el techo de cada provincia española."
    : isExp
      ? "El mapa para registrar todas las experiencias de tu vida."
      : "El mapa para registrar cada país del mundo que has visitado.";
  const modeChallengeTitle = isPeaks
    ? <>Un país por descubrir,<br />una cima cada vez.</>
    : isExp
      ? <>Un mundo por explorar,<br />una experiencia cada vez.</>
      : <>Un mundo por explorar,<br />un país cada vez.</>;

  const modeListEyebrow = isPeaks ? "52 Territorios - 47 Picos" : isExp ? `${totalCount} Experiencias` : "196 Países del mundo";
  const modeListTitle = isPeaks ? "Todas las cumbres" : isExp ? (isReadOnly ? "Todas sus experiencias" : "Todas tus experiencias") : "Todos los países";
  const modeListSubtitle = isPeaks
    ? "Ordenadas por altitud, de mayor a menor."
    : isExp
      ? "Agrupadas por categoría."
      : "Ordenados alfabéticamente.";

  // IDs válidos para este modo (para filtrar ascents de Supabase)
  const validIds = useMemo(
    () => {
      const ids = new Set(allItems.map((i) => i.id));
      if (!isPeaks) {
        Object.values(regionsByCountryIsoA2).flat().forEach((r) => ids.add(r.id));
        if (isExp) {
          countries.forEach((c) => ids.add(c.id));
        }
      }
      return ids;
    },
    [allItems, isPeaks, isExp],
  );

  // Filtrar ascents por modo
  const modeAscents = useMemo(() => {
    const regularAscents = ascents.filter((a) => validIds.has(a.summit_id));
    if (isExp) {
      const expAscents = experienceRecords.map(r => ({
        summit_id: r.experience_id,
        achieved_on: r.achieved_on,
        end_date: null,
        notes: r.notes || null,
        is_wishlist: r.is_wishlist,
        record_id: r.id,
        lat: r.lat,
        lng: r.lng,
        location_name: r.location_name,
        sub_item_id: r.sub_item_id
      }));
      return [...regularAscents, ...expAscents].filter((a) => validIds.has(a.summit_id));
    }
    return regularAscents;
  }, [ascents, validIds, isExp, experienceRecords]);

  const completedModeAscents = useMemo(
    () => modeAscents.filter((a) => !a.is_wishlist),
    [modeAscents],
  );

  // Restore selection on load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#panel=")) {
      const id = hash.substring(7);
      if (id) {
        let item = allItems.find((i) => i.id === id);
        if (!item && !isPeaks) {
          for (const [countryId, regions] of Object.entries(regionsByCountryIsoA2)) {
            const region = regions.find((r) => r.id === id);
            if (region) {
              const country = countries.find((c) => c.iso_a2 === countryId);
              if (country) {
                item = regionToItem(region, country);
                break;
              }
            }
          }
        }
        if (item && (!selected || selected.id !== item.id)) {
          setSelected(item);
        }
      }
    }
  }, [allItems, isPeaks, selected]);

  // Contar únicas
  const achievedCount = useMemo(() => {
    if (isExp) {
      let count = 0;
      for (const item of allItems) {
        if (!item.subItems || item.subItems.length === 0) {
           if (completedModeAscents.some(a => a.summit_id === item.id)) count++;
        } else {
           const subItemIds = item.subItems.map((s: any) => s.id);
           const completedSubItems = new Set(
             completedModeAscents.filter(a => a.summit_id === item.id && a.sub_item_id).map(a => a.sub_item_id)
           );
           if (subItemIds.length > 0 && subItemIds.every((id: string) => completedSubItems.has(id))) {
             count++;
           }
        }
      }
      return count;
    }
    if (!isPeaks) {
      const uniqueCountries = new Set(completedModeAscents.filter((a) => a.summit_id.startsWith("country-")).map(a => a.summit_id));
      return uniqueCountries.size;
    }
    // Para picos, contamos los nombres únicos ya que hay provincias que comparten cima
    const uniquePeakNames = new Set(
      completedModeAscents.map((a) => peaks.find((p) => p.id === a.summit_id)?.name).filter(Boolean)
    );
    return uniquePeakNames.size;
  }, [isPeaks, isExp, completedModeAscents]);

  const wishlistCount = useMemo(() => {
    const w = modeAscents.filter(a => a.is_wishlist);
    if (isExp) {
      const uniqueExps = new Set(
        w.filter(a => !a.summit_id.startsWith('country-') && !a.summit_id.startsWith('region-'))
          .map(a => a.summit_id + (a.sub_item_id ? `::${a.sub_item_id}` : ''))
      );
      return uniqueExps.size;
    }
    if (!isPeaks) {
      const uniqueCountries = new Set(w.filter((a) => a.summit_id.startsWith("country-")).map(a => a.summit_id));
      return uniqueCountries.size;
    }
    const uniquePeakNames = new Set(
      w.map((a) => peaks.find((p) => p.id === a.summit_id)?.name).filter(Boolean)
    );
    return uniquePeakNames.size;
  }, [isPeaks, isExp, modeAscents]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path === "/" || path === "/picos") {
        localStorage.setItem("last_map_path", path);
      }
      localStorage.setItem("ranking_mode", currentMode);
    }
  }, [currentMode]);

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
      const [ascentResult, photoResult, expResult, customExpResult, customCatResult, hiddenItemsResult] = await Promise.all([
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
        supabase!
          .from("experience_records")
          .select("*")
          .eq("user_id", targetId),
        supabase!
          .from("custom_experiences")
          .select("*")
          .eq("user_id", targetId),
        supabase!
          .from("custom_experience_categories")
          .select("*")
          .eq("user_id", targetId),
        supabase!
          .from("hidden_items")
          .select("*")
          .eq("user_id", targetId)
      ]);
      if (ascentResult.data) setAscents(ascentResult.data as Ascent[]);
      if (photoResult.data) setPhotos(photoResult.data as SummitPhoto[]);
      if (expResult.data) setExperienceRecords(expResult.data as ExperienceRecord[]);
      if (customExpResult.data) setCustomExperiences(customExpResult.data);
      if (customCatResult.data) setCustomCategories(customCatResult.data);
      if (hiddenItemsResult.data) setHiddenItems(hiddenItemsResult.data as HiddenItem[]);

      if (!isReadOnly && !profileOpen) {
        // Ensure we have current user profile if session exists
        if (session && !myProfile) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url, enable_regions, enable_experiences")
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

    const allAscents = [
      ...ascents,
      ...experienceRecords.map(r => ({
        summit_id: r.experience_id,
        achieved_on: r.achieved_on,
        end_date: null,
        notes: r.notes || null,
        is_wishlist: r.is_wishlist,
        record_id: r.id,
        lat: r.lat,
        lng: r.lng,
        location_name: r.location_name,
        sub_item_id: r.sub_item_id
      }))
    ];

    return allAscents.filter((a) => a.summit_id === selected.id && !a.is_wishlist).sort((a, b) => {
      const order = ascentsSortOrder === "asc" ? 1 : -1;
      if (a.achieved_on !== b.achieved_on) {
        return a.achieved_on.localeCompare(b.achieved_on) * order;
      }
      const aEnd = a.end_date || a.achieved_on;
      const bEnd = b.end_date || b.achieved_on;
      return aEnd.localeCompare(bEnd) * order;
    });
  }, [selected, ascents, experienceRecords, ascentsSortOrder]);

  const selectedExperienceRecords = useMemo(() => {
    if (!selected) return [];
    return experienceRecords.filter((r) => r.experience_id === selected.id && !r.sub_item_id).sort((a, b) => {
      const order = ascentsSortOrder === "asc" ? 1 : -1;
      if (a.achieved_on !== b.achieved_on) {
        return a.achieved_on.localeCompare(b.achieved_on) * order;
      }
      return 0;
    });
  }, [selected, experienceRecords, ascentsSortOrder]);

  const hasWishlist = useMemo(() => {
    if (!selected) return false;
    const allAscents = [
      ...ascents,
      ...experienceRecords.map(r => ({
        summit_id: r.experience_id,
        is_wishlist: r.is_wishlist
      }))
    ];
    return allAscents.some(a => a.summit_id === selected.id && a.is_wishlist);
  }, [selected, ascents, experienceRecords]);
  const selectedPhotos = selected
    ? photos.filter((p) => p.summit_id === selected.id || p.summit_id.startsWith(selected.id + "::"))
    : [];
  const completion = Math.round((achievedCount / totalCount) * 100);

  /* ── Handlers ─────────────────────────── */
  const openInformation = useCallback((item: SelectedItem) => {
    window.location.hash = `panel=${item.id}`;
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
        summit_id: ascent.sub_item_id ? `${selected.id}::${ascent.sub_item_id}` : selected.id,
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

  function handleCancelSelectingLocationForExp() {
    if (!selectingLocationForExp) return;

    const [expId, subItemId] = selectingLocationForExp.split("::");
    let category = dynamicCategories.find(c => c.experiences.some(e => e.id === expId));
    let exp = category?.experiences.find(e => e.id === expId);

    if (exp && category) {
      const title = exp.name;
      const item: SelectedItem = {
        id: expId,
        sub_item_id: subItemId,
        title: title,
        subtitle: category.name,
        label: "",
        detail: category.name,
        note: "",
        iconName: category.iconName,
        subItems: exp.subItems
      };
      setSelectingLocationForExp(null);
      setSelected(item);
      setRecordOpen(true);
      setEditingExpRecordId(null);
    } else {
      setSelectingLocationForExp(null);
    }
  }

  async function handleMapClickForExp(lat: number, lng: number, placeNameArg?: string) {
    if (!selectingLocationForExp) return;

    const [expId, subItemId] = selectingLocationForExp.split("::");
    let category = dynamicCategories.find(c => c.experiences.some(e => e.id === expId));
    let exp = category?.experiences.find(e => e.id === expId);

    if (exp && category) {
      const title = exp.name;
      const item: SelectedItem = {
        id: expId,
        sub_item_id: subItemId,
        title: title,
        subtitle: category.name,
        label: "",
        detail: category.name,
        note: "",
        iconName: category.iconName,
        subItems: exp.subItems
      };
      let placeName = placeNameArg || "";
      if (!placeName) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=es`);
          const data = await res.json();
          if (data && data.address) {
            placeName = data.address.city || data.address.town || data.address.village || data.address.county || data.address.state || data.address.country || data.address.ocean || data.address.sea || "";
          }
        } catch (e) {
          console.warn("Reverse geocoding error:", e);
        }
      }

      setSelectingLocationForExp(null);
      setSelectedLatLng({ lat, lng });
      setLocationName(placeName || "");
      setEditingExpRecordId(null);
      openRecord(item);
    }
  }

  function handleExperienceClick(record: ExperienceRecord) {
    let category = dynamicCategories.find(c => c.experiences.some(e => e.id === record.experience_id));
    let exp = category?.experiences.find(e => e.id === record.experience_id);
    if (exp && category) {
      const title = exp.name;
      const item: SelectedItem = {
        id: record.experience_id,
        sub_item_id: record.sub_item_id,
        title: title,
        subtitle: category.name,
        label: "",
        detail: category.name,
        note: "",
        iconName: category.iconName,
        subItems: exp.subItems
      };
      openInformation(item);
    }
  }

  const openRecord = useCallback(
    (item?: SelectedItem | null, ascentToEdit?: Ascent | any) => {
      if (!session) {
        window.location.hash = "panel";
        setAuthOpen(true);
        return;
      }
      window.location.hash = item ? `panel=${item.id}` : "panel";
      setRecordOpen(true);
      if (!item) {
        setClimbDate(null);
        setClimbEndDate(null);
        setIsEndDateEnabled(false);
        setOriginalAchievedOn(null);
        setIsDateUnknown(true);
        setIsDateModified(false);
        setNotes("");
        setLink("");
        setLinkName("");
        setFiles([]);
      } else {
        setSelected(item);
        if (ascentToEdit) {
          const isExp = item.id.startsWith("exp-") || item.id.startsWith("cexp-");
          if (isExp) {
            const recId = (ascentToEdit as any).record_id || (ascentToEdit as any).id;
            if (recId) {
              setEditingExpRecordId(recId);
              setSelectedLatLng({ lat: (ascentToEdit as any).lat, lng: (ascentToEdit as any).lng });
              setLocationName((ascentToEdit as any).location_name || "");
            } else {
              setEditingExpRecordId(null);
            }
          } else {
            setEditingExpRecordId(null);
          }
          const date = ascentToEdit.achieved_on;
          setClimbDate(date && date !== "1900-01-01" ? new Date(date) : null);
          setClimbEndDate(ascentToEdit.end_date ? new Date(ascentToEdit.end_date) : null);
          setIsEndDateEnabled(!!ascentToEdit.end_date);
          setOriginalAchievedOn(date);
          setIsDateUnknown(!date || date === "1900-01-01");
          setIsDateModified(!!date && date !== "1900-01-01");
          setNotes(ascentToEdit.notes ?? "");
          setLink((ascentToEdit as any).link ?? "");
          setLinkName((ascentToEdit as any).link_name ?? "");
        } else {
          // Si no es ascentToEdit pero setSelectedLatLng ya se configuró (ej. click en mapa), no lo borramos.
          setEditingExpRecordId(null);
          if (!item.id.startsWith("exp-") && !item.id.startsWith("cexp-")) {
            setSelectedLatLng(null);
            setLocationName("");
          }
          setClimbDate(null);
          setClimbEndDate(null);
          setIsEndDateEnabled(false);
          setOriginalAchievedOn(null);
          setIsDateUnknown(true);
          setIsDateModified(false);
          setNotes("");
          setLink("");
          setLinkName("");
          // locationName is already set by handleMapClickForExp if coming from there
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
    const isExperience = selected.id.startsWith("exp-") || selected.id.startsWith("cexp-");
    if (isExperience && (!selectedLatLng || selectedLatLng.lat === undefined)) {
      setNotice("Debes registrar la experiencia en el mapa primero.");
      return;
    }

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

    let dbError = null;

    if (isExperience) {
      if (editingExpRecordId) {
        const { error } = await supabase.from("experience_records").update({
          achieved_on: finalDate,
          notes: notes || null,
          link: link || null,
          link_name: linkName || null,
          lat: selectedLatLng?.lat,
          lng: selectedLatLng?.lng,
          location_name: locationName || null
        }).eq("id", editingExpRecordId);
        dbError = error;
      } else {
        const { error } = await supabase.from("experience_records").insert({
          user_id: session.user.id,
          experience_id: selected.id,
          sub_item_id: selected.sub_item_id || null,
          achieved_on: finalDate,
          notes: notes || null,
          link: link || null,
          link_name: linkName || null,
          lat: selectedLatLng?.lat,
          lng: selectedLatLng?.lng,
          location_name: locationName || null
        });
        dbError = error;
      }
    } else {
      const ascentResult = await supabase.from("ascents").upsert(
        {
          user_id: session.user.id,
          summit_id: selected.id,
          achieved_on: finalDate,
          end_date: finalEndDate,
          notes: notes || null,
          link: link || null,
          link_name: linkName || null,
          is_wishlist: false,
        },
        { onConflict: "user_id,summit_id,achieved_on" },
      );
      dbError = ascentResult.error;

      // Remove wishlist if they register a real ascent
      if (!dbError && hasWishlist) {
        await supabase.from("ascents").delete().match({ user_id: session.user.id, summit_id: selected.id, is_wishlist: true });
      }
    }

    if (dbError) {
      setNotice(dbError.message);
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
          summit_id: selected.sub_item_id ? `${selected.id}::${selected.sub_item_id}` : selected.id,
          storage_path: path,
          public_url: data.publicUrl,
          taken_on: finalDate,
        })
        .select()
        .single();
      if (photoResult.data) uploaded.push(photoResult.data as SummitPhoto);
    }

    if (isExperience) {
      // Refresh experience records
      const { data } = await supabase.from("experience_records").select("*").eq("user_id", session.user.id);
      if (data) setExperienceRecords(data as ExperienceRecord[]);
    } else {
      setAscents((previous) => {
        const withoutThisAscentOrWishlist = previous.filter(
          (a) => !(a.summit_id === selected.id && (a.achieved_on === finalDate || a.achieved_on === originalAchievedOn || a.is_wishlist))
        );
        return [
          { summit_id: selected.id, achieved_on: finalDate, end_date: finalEndDate, notes: notes || null, is_wishlist: false },
          ...withoutThisAscentOrWishlist,
        ];
      });
    }

    if (uploaded.length) setPhotos((previous) => [...uploaded, ...previous]);
    if (selectedPhotosForEdit.length > 0) {
      await supabase.from("summit_photos").update({ taken_on: finalDate }).in("id", selectedPhotosForEdit).eq("user_id", session.user.id);
      setPhotos(prev => prev.map(p => selectedPhotosForEdit.includes(p.id) ? { ...p, taken_on: finalDate } : p));
      setSelectedPhotosForEdit([]);
    }
    setFiles([]);
    setSaving(false);
    setRecordOpen(false);
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

    const isExperience = selected.id.startsWith("exp-") || selected.id.startsWith("cexp-");

    let confirmMessage = isPeaks
      ? "¿Seguro que quieres eliminar esta ascensión?"
      : isExperience
        ? "¿Seguro que quieres eliminar esta experiencia?"
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

    const isExperience = selected.id.startsWith("exp-") || selected.id.startsWith("cexp-");
    let deleteError = null;

    if (isExperience && editingExpRecordId) {
      const { error } = await supabase.from("experience_records").delete().eq("id", editingExpRecordId);
      deleteError = error;
    } else {
      const deleteResult = await supabase
        .from("ascents")
        .delete()
        .match({ user_id: session.user.id, summit_id: selected.id, achieved_on: originalAchievedOn });
      deleteError = deleteResult.error;
    }

    if (deleteError) {
      setNotice(deleteError.message);
      setSaving(false);
      return;
    }

    if (remainingAscents.length === 0) {
      await supabase.from("summit_photos").delete().match({ user_id: session.user.id, summit_id: selected.id });
      setPhotos((prev) => prev.filter(p => p.summit_id !== selected.id));
    }

    if (isExperience) {
      const { data } = await supabase.from("experience_records").select("*").eq("user_id", session.user.id);
      if (data) setExperienceRecords(data as ExperienceRecord[]);
    } else {
      setAscents((previous) => previous.filter((a) => !(a.summit_id === selected.id && a.achieved_on === originalAchievedOn)));
    }

    setSaving(false);
    setRecordOpen(false);
    setNotice(
      isPeaks
        ? "Ascensión eliminada."
        : isExperience
          ? "Experiencia eliminada."
          : "País eliminado de tu lista."
    );
  }

  async function handleSaveCustomCategory() {
    if (!editingCustomCategory || !editingCustomCategory.name?.trim()) return;
    if (!supabase || !session) return;
    setSaving(true);

    if (editingCustomCategory.id === 'new' || editingCustomCategory.id.startsWith('cat-')) {
      const isOverride = editingCustomCategory.id.startsWith('cat-');
      const newCat = {
        user_id: session.user.id,
        name: editingCustomCategory.name.trim(),
        icon_name: editingCustomCategory.icon_name || "star",
        ...(isOverride ? { static_id: editingCustomCategory.id } : {})
      };
      const { data, error } = await supabase.from("custom_experience_categories").insert(newCat).select().single();
      if (error) setNotice(error.message);
      else if (data) {
        setCustomCategories(prev => [...prev, data]);
        setEditingCustomCategory(null);
      }
    } else {
      const updates = {
        name: editingCustomCategory.name.trim(),
        icon_name: editingCustomCategory.icon_name || "star"
      };
      const { data, error } = await supabase.from("custom_experience_categories").update(updates).eq('id', editingCustomCategory.id).select().single();
      if (error) setNotice(error.message);
      else if (data) {
        setCustomCategories(prev => prev.map(c => c.id === data.id ? data : c));
        setEditingCustomCategory(null);
      }
    }
    setSaving(false);
  }

  function handleDeleteCustomCategory(catId?: string | React.MouseEvent) {
    const targetId = typeof catId === 'string' ? catId : (editingCustomCategory && editingCustomCategory.id !== 'new' ? editingCustomCategory.id : null);
    if (!targetId) return;
    
    const catToDelete = customCategories.find(c => c.id === targetId);
    const itemToHide = catToDelete?.static_id ? catToDelete.static_id : targetId;

    setConfirmAction({
      message: "¿Estás seguro de que quieres eliminar esta categoría? Se eliminarán también todas sus experiencias asociadas.",
      onConfirm: async () => {
        if (!supabase || !session) return;
        setSaving(true);
        const { data, error } = await supabase.from('hidden_items').insert({
          user_id: session.user.id,
          item_id: itemToHide,
          item_type: 'category'
        }).select().single();
        if (error) {
          setNotice(error.message);
        } else if (data) {
          setHiddenItems(prev => [...prev, data as HiddenItem]);
          if (editingCustomCategory && editingCustomCategory.id === targetId) {
            setEditingCustomCategory(null);
          }
        }
        setSaving(false);
      }
    });
  }

  function handleDeleteCustomExperience(expId: string) {
    setConfirmAction({
      message: "¿Estás seguro de que quieres eliminar esta experiencia? Se eliminarán también todos los registros asociados.",
      onConfirm: async () => {
        if (!supabase || !session) return;
        setSaving(true);
        const { error } = await supabase.from("custom_experiences").delete().eq("id", expId);
        if (error) {
          setNotice(error.message);
        } else {
          setCustomExperiences(prev => prev.filter(ce => ce.id !== expId));
          setEditingCustomExp(null);
        }
        setSaving(false);
      }
    });
  }
  const handleHideItem = (itemId: string, itemType: 'category' | 'experience') => {
    setConfirmAction({
      message: itemType === 'category' 
        ? '¿Estás seguro de que quieres eliminar esta categoría? Se eliminarán también todas sus experiencias asociadas.'
        : '¿Estás seguro de que quieres eliminar esta experiencia?',
      onConfirm: async () => {
        const { data, error } = await supabase!.from('hidden_items').insert({
          user_id: session!.user.id,
          item_id: itemId,
          item_type: itemType
        }).select().single();
        if (!error && data) {
          setHiddenItems(prev => [...prev, data as HiddenItem]);
        } else if (error) {
          setNotice(`Error al ocultar: ${error.message}`);
          setTimeout(() => setNotice(""), 3000);
        }
      }
    });
  };

  async function handleRestoreHiddenItem(id: string) {
    if (!supabase || !session) return;
    setSaving(true);
    const { error } = await supabase.from('hidden_items').delete().eq('id', id);
    if (error) {
      setNotice(error.message);
    } else {
      setHiddenItems(prev => prev.filter(h => h.id !== id));
      setNotice("Elemento restaurado.");
    }
    setSaving(false);
  }

  async function handlePermanentDelete(item: HiddenItem) {
    setConfirmAction({
      message: "ATENCIÓN: Esto eliminará definitivamente este elemento y TODAS las experiencias registradas asociadas a él de la base de datos. Esta acción no se puede deshacer. ¿Continuar?",
      onConfirm: async () => {
        if (!supabase || !session) return;
        setSaving(true);
        try {
          if (item.item_type === 'category') {
            const staticCat = predefinedCategories.find(c => c.id === item.item_id);
            const expIds = staticCat ? staticCat.experiences.map(e => e.id) : [];
            const customExps = customExperiences.filter(c => c.category_id === item.item_id || c.static_category_id === item.item_id);
            expIds.push(...customExps.map(c => c.id));

            if (expIds.length > 0) {
              await supabase.from('experience_records').delete().in('experience_id', expIds);
            }
            
            const customExpIds = customExps.map(c => c.id);
            if (customExpIds.length > 0) {
              await supabase.from('custom_experiences').delete().in('id', customExpIds);
            }
            
            await supabase.from('custom_experience_categories').delete().eq('id', item.item_id);
            await supabase.from('custom_experience_categories').delete().eq('static_id', item.item_id);
            
            setCustomCategories(prev => prev.filter(c => c.id !== item.item_id && c.static_id !== item.item_id));
            setCustomExperiences(prev => prev.filter(c => c.category_id !== item.item_id));
          } else {
            await supabase.from('experience_records').delete().eq('experience_id', item.item_id);
            await supabase.from('custom_experiences').delete().eq('id', item.item_id);
            setCustomExperiences(prev => prev.filter(c => c.id !== item.item_id));
          }

          await supabase.from('hidden_items').delete().eq('id', item.id);
          setHiddenItems(prev => prev.filter(h => h.id !== item.id));
          
          setNotice("Elemento eliminado definitivamente.");
        } catch (e: any) {
          setNotice("Error: " + e.message);
        }
        setSaving(false);
      }
    });
  }
  async function handleSaveCustomExperience() {
    if (!editingCustomExp || !editingCustomExp.name?.trim()) return;
    if (!supabase || !session) return;
    setSaving(true);

    let subItems: { id: string, name: string }[] | undefined = undefined;
    if (editingCustomExp.sub_items_input !== undefined) {
      const lines = editingCustomExp.sub_items_input.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      if (lines.length > 0) {
        subItems = lines.map((line: string) => {
          const existing = (editingCustomExp.sub_items || []).find((s: any) => s.name === line);
          return existing ? existing : { id: `sub-${crypto.randomUUID()}`, name: line };
        });
      } else {
        subItems = [];
      }
    } else if (editingCustomExp.sub_items) {
      subItems = editingCustomExp.sub_items;
    }

    if (editingCustomExp.id === 'new') {
      const newExp = {
        user_id: session.user.id,
        name: editingCustomExp.name.trim(),
        category_id: editingCustomExp.category_id || null,
        static_category_id: editingCustomExp.static_category_id || null,
        sub_items: subItems || []
      };
      const { data, error } = await supabase.from("custom_experiences").insert(newExp).select().single();
      if (error) setNotice(error.message);
      else if (data) {
        setCustomExperiences(prev => [...prev, data]);
        setEditingCustomExp(null);
      }
    } else {
      const updates: any = { name: editingCustomExp.name.trim() };
      if (subItems !== undefined) updates.sub_items = subItems;

      const { data, error } = await supabase.from("custom_experiences").update(updates).eq('id', editingCustomExp.id).select().single();
      if (error) setNotice(error.message);
      else if (data) {
        setCustomExperiences(prev => prev.map(c => c.id === data.id ? data : c));
        setEditingCustomExp(null);
        setExpSelectorOpen(true);
      }
    }
    setSaving(false);
  }


  async function handleCreateCustomExperience() {
    if (!customExpName.trim()) return;
    if (!supabase || !session) return;
    setSaving(true);

    // In local UI we just generate a random UUID so we can optimistic update, or let DB do it
    const newExp = {
      user_id: session.user.id,
      name: customExpName.trim(),
      icon_name: customExpIcon
    };

    const { data, error } = await supabase.from("custom_experiences").insert(newExp).select().single();
    if (error) {
      setNotice(error.message);
    } else if (data) {
      setCustomExperiences(prev => [...prev, data]);
      setCreatingCustomExp(false);
      setCustomExpName("");
    }
    setSaving(false);
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
    setSelected(null);
    setRecordOpen(false);
    setProfileOpen(false);
    setAuthOpen(false);
    if (window.location.hash) {
      window.history.pushState(null, "", window.location.pathname + window.location.search);
      // Trigger a popstate manually if needed, or state update is enough
      // Since we just set states above, the UI will update correctly.
    }
  }

  function switchMode(target: ChallengeMode) {
    if (target === currentMode) return;

    // Clear panels explicitly without using history.back() 
    // to prevent race conditions with navigation.
    setSelected(null);
    setRecordOpen(false);
    setProfileOpen(false);
    setAuthOpen(false);

    setCurrentMode(target);

    if (onSwitchMode) {
      onSwitchMode(target);
      if (window.location.hash.startsWith("#panel")) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    } else {
      window.history.pushState(null, "", target === "peaks" ? "/picos" : "/");
    }
  }

  // Sorted items for the list
  const sortedItems = useMemo(() => {
    if (isPeaks) {
      return [...allItems]
        .sort((a, b) => parseInt(b.subtitle) - parseInt(a.subtitle)); // Fallback if we sort by altitude
    }
    if (isExp) {
      return allItems; // Ya están en orden de categoría
    }
    return [...allItems]
      .sort((a, b) => a.title.localeCompare(b.title, "es"));
  }, [allItems, isPeaks, isExp]);

  const renderExpRecord = (ascent: any) => {
    if (!selected) return null;
    const expectedSummitId = ascent.sub_item_id ? `${selected.id}::${ascent.sub_item_id}` : selected.id;
    const ascentPhotos = selectedPhotos.filter(p => p.taken_on === ascent.achieved_on && (p.summit_id === expectedSummitId || p.summit_id === selected.id));
    return (
      <div key={ascent.id} className="completed-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <b style={{ marginTop: '6px' }}>
            {formatDate(ascent.achieved_on)}
          </b>

          {!isReadOnly && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                title="Editar registro"
                className="button button--quiet button--small"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', flexShrink: 0, padding: 0, margin: 0 }}
                onClick={() => openRecord(selected, ascent)}
              >
                <IconEdit style={{ width: 14, height: 14 }} strokeWidth={1.5} />
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
                  onChange={(e) => handleAddPhotosToDate(e, ascent as any)}
                  style={{ display: 'none' }}
                  disabled={ascentPhotos.length >= 4}
                />
              </label>
            </div>
          )}
        </div>
        {ascent.location_name && (
          <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {ascent.location_name}
          </div>
        )}
        {ascent.notes && <p style={{ marginTop: '4px' }}>&ldquo;{ascent.notes}&rdquo;</p>}
        {ascent.link && (() => {
          let Icon = LinkIcon;
          const urlStr = ascent.link.toLowerCase();
          if (urlStr.includes("youtube.com") || urlStr.includes("youtu.be")) Icon = Video;
          else if (urlStr.includes("instagram.com")) Icon = Camera;
          else if (urlStr.includes("linkedin.com")) Icon = Briefcase;
          else if (urlStr.includes("google.com/maps") || urlStr.includes("wikiloc.com") || urlStr.includes("komoot.com") || urlStr.includes("strava.com")) Icon = MapPin;
          
          const displayName = (ascent as any).link_name || (
            urlStr.includes("youtube.com") || urlStr.includes("youtu.be") ? "Vídeo en YouTube" :
            urlStr.includes("instagram.com") ? "Publicación en Instagram" :
            urlStr.includes("linkedin.com") ? "Publicación en LinkedIn" :
            urlStr.includes("google.com/maps") ? "Ver en Google Maps" :
            urlStr.includes("wikiloc.com") ? "Ruta en Wikiloc" :
            urlStr.includes("strava.com") ? "Actividad en Strava" :
            urlStr.includes("komoot.com") ? "Ruta en Komoot" :
            "Enlace adjunto"
          );

          return (
            <a href={ascent.link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '12px', color: 'var(--pine)', textDecoration: 'none', fontWeight: 600, fontSize: '13px' }}>
              <Icon size={16} />
              <span style={{ textDecoration: 'underline' }}>{displayName}</span>
            </a>
          );
        })()}

        {ascentPhotos.length > 0 && (
          <div className="photo-section" style={{ marginTop: 16 }}>
            <div className="photo-grid">
              {ascentPhotos.map((photo) => {
                const publicUrl = photo.public_url || supabase?.storage.from("summit-photos").getPublicUrl(photo.storage_path).data.publicUrl;
                if (!publicUrl) return null;
                return (
                  <figure
                    key={photo.id}
                    onClick={() => handlePhotoClick(photo)}
                  >
                    <img src={publicUrl} alt="Foto de la experiencia" loading="lazy" />
                  </figure>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const expToggleSort = (
    <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(92, 155, 125, 0.1)', borderRadius: '20px', padding: '3px', position: 'relative', marginBottom: '16px', cursor: 'pointer', userSelect: 'none', width: 'fit-content' }} onClick={() => setAscentsSortOrder(o => o === "asc" ? "desc" : "asc")}>
      <div style={{ position: 'absolute', top: 3, bottom: 3, left: ascentsSortOrder === "asc" ? 3 : '50%', right: ascentsSortOrder === "asc" ? '50%' : 3, background: 'var(--pine)', borderRadius: '18px', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      <span style={{ position: 'relative', zIndex: 1, padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: ascentsSortOrder === "asc" ? 'white' : 'var(--pine)', transition: 'color 0.2s ease', flex: 1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Más antiguo</span>
      <span style={{ position: 'relative', zIndex: 1, padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: ascentsSortOrder === "desc" ? 'white' : 'var(--pine)', transition: 'color 0.2s ease', flex: 1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Más reciente</span>
    </div>
  );

  /* ── Render ───────────────────────────── */
  return (
    <main className={`${isPeaks ? "" : isExp ? "mode-experiences" : "mode-countries"} ${selected ? "panel-open" : ""}`}>
      {/* ── Topbar ──────────────────────── */}
      <header className="topbar">
        <a className="brand" href={isPeaks ? "#inicio" : "#inicio"} onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate(isPeaks ? "/picos" : "/"); } }}>
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
              <a href="/" onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate("/"); } }}>Mapa</a>
            </>
          ) : (
            <>
              <a href="#mapa" onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate(isPeaks ? "/picos" : "/"); } }}>Mapa</a>
            </>
          )}

          <a href="/social" style={{ position: 'relative' }} onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate("/social"); } }} onMouseEnter={() => { import('./social-tab'); }}>
            Social
            {hasPendingRequests ? (
              <span 
                style={{ 
                  position: 'absolute', 
                  top: '-4px', 
                  right: '-10px', 
                  width: '8px', 
                  height: '8px', 
                  backgroundColor: 'red', 
                  borderRadius: '50%'
                }} 
              />
            ) : null}
          </a>
          <a href="/ranking" onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate("/ranking"); } }} onMouseEnter={() => { import('./ranking-tab'); }}>Ranking</a>
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
            ) : experiencesMode ? (
              <>Vive experiencias.<br /><em>Márcalas en tu mapa.</em></>
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
              {!isPeaks && (myProfile?.enable_experiences || experiencesMode) && (
                <button
                  className={`diff-toggle${experiencesMode ? " diff-toggle--active" : ""}`}
                  onClick={() => setExperiencesMode(!experiencesMode)}
                  title="Ver experiencias"
                >
                  <svg className="diff-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="6" />
                    <circle cx="12" cy="12" r="2" />
                  </svg>
                  Experiencias
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
            {diffMode && (
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
            )}
            {!diffMode && (
              <div className="map-legend">
                <span>
                  <i className="legend-pin" style={{ paddingBottom: isPeaks ? 4 : isExp ? 2 : 0 }}>{isPeaks ? "△" : "◇"}</i> Pendiente
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gridTemplateRows: "1fr" }}>
          <div style={{
            gridArea: "1/1",
            visibility: isPeaks ? "visible" : "hidden",
            opacity: isPeaks ? 1 : 0,
            transition: "opacity 0.3s ease, visibility 0.3s",
            zIndex: isPeaks ? 2 : 1
          }}>
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
          </div>

          <div style={{
            gridArea: "1/1",
            visibility: !isPeaks ? "visible" : "hidden",
            opacity: !isPeaks ? 1 : 0,
            transition: "opacity 0.3s ease, visibility 0.3s",
            zIndex: !isPeaks ? 2 : 1
          }}>
            {!isReadOnly && !isPeaks && (myProfile?.enable_experiences || experiencesMode) && experiencesMode && (
              <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, pointerEvents: 'auto' }}>
                {!selectingLocationForExp && !selected && (
                  <button className="button button--purple" onClick={() => setExpSelectorOpen(true)} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    + Añadir Experiencia
                  </button>
                )}
              </div>
            )}
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
              experiencesMode={experiencesMode}
              experienceRecords={experienceRecords.map(r => {
                const cat = dynamicCategories.find(c => c.experiences.some(e => e.id === r.experience_id));
                return { ...r, icon_name: cat?.iconName || "telescope" };
              })}
              selectingLocation={!!selectingLocationForExp}
              onMapClick={handleMapClickForExp}
              onCancelSelectingLocation={handleCancelSelectingLocationForExp}
              onExperienceClick={handleExperienceClick}
              onAddExperience={() => setExpSelectorOpen(true)}
            />

          </div>
        </div>
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
              placeholder={isPeaks ? "Buscar pico o provincia..." : isExp ? "Buscar experiencia o categoría..." : "Buscar país o capital..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* ── Filter pills ──────────────── */}
        <div className="list-filters" style={{ overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex' }}>
          <button
            className={`list-filter-pill${listFilter === "all" ? " list-filter-pill--active" : ""}`}
            onClick={() => setListFilter("all")}
          >
            Todos <span className="pill-count">{totalCount}</span>
          </button>

          {isExp ? (
            <>
              {dynamicCategories.map(cat => {
                const isCustomCat = cat.id.startsWith('cat-custom-') || customCategories.some(c => c.id === cat.id);
                return (
                  <div key={cat.id} style={{ position: 'relative' }}>
                    <button
                      className={`list-filter-pill${listFilter === cat.name ? " list-filter-pill--active" : ""}`}
                      onClick={() => setListFilter(cat.name)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', height: '100%' }}
                    >
                      <span style={{ display: 'flex', width: 14, height: 14, alignItems: 'center', justifyContent: 'center' }}>
                        {getIconComponent(cat.iconName)}
                      </span>
                      {cat.name}
                    </button>
                    <button
                      className={`edit-action-btn ${isEditingExperiences ? 'is-active' : ''}`}
                      title="Editar categoría"
                      style={{ position: 'absolute', top: '-6px', right: '14px', background: 'var(--pine)', color: 'white', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', padding: 0, zIndex: 10 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // If it's a predefined category, customCategories.find might match on static_id
                        const existingOverride = customCategories.find(c => c.static_id === cat.id || c.id === cat.id);
                        setEditingCustomCategory(existingOverride || { id: cat.id, name: cat.name, icon_name: cat.iconName });
                      }}
                    >
                      <IconEdit style={{ width: 10, height: 10 }} strokeWidth={2.5} />
                    </button>
                    <button
                      className={`edit-action-btn ${isEditingExperiences ? 'is-active' : ''}`}
                      title="Eliminar categoría"
                      style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#e74c3c', color: 'white', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', padding: 0, zIndex: 10 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCustomCat) {
                          handleDeleteCustomCategory(cat.id);
                        } else {
                          handleHideItem(cat.id, 'category');
                        }
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                )
              })}
              {!isReadOnly && (
                <>
                  <button
                    className="list-filter-pill"
                    onClick={() => {
                      setEditingCustomCategory({ id: 'new', name: '', iconName: 'star' });
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, borderStyle: 'dashed' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Crear nueva categoría
                  </button>
                  <button
                    className={`list-filter-pill${isEditingExperiences ? " list-filter-pill--active" : ""}`}
                    onClick={() => setIsEditingExperiences(!isEditingExperiences)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', borderStyle: 'solid', borderColor: 'var(--pine)', color: isEditingExperiences ? '#fff' : 'var(--pine)', background: isEditingExperiences ? 'var(--pine)' : 'transparent' }}
                  >
                    <IconEdit style={{ width: 14, height: 14 }} />
                    Modificar experiencias
                  </button>
                  <button
                    className="list-filter-pill"
                    onClick={() => setShowTrashModal(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, borderStyle: 'solid', borderColor: '#e74c3c', color: '#e74c3c', background: 'transparent' }}
                  >
                    <IconTrash style={{ width: 14, height: 14 }} />
                    Papelera
                  </button>
                </>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        {isEditingExperiences && isExp && listFilter !== "all" && (
          <div style={{ display: 'flex', padding: '0 clamp(22px, 6vw, 92px)', marginBottom: 16 }}>
            <button
              className="button button--outline"
              style={{ width: '100%', borderStyle: 'dashed', color: 'var(--pine)', borderColor: 'var(--pine)' }}
              onClick={() => {
                const cat = dynamicCategories.find(c => c.name === listFilter);
                if (!cat) return;
                const isCustomCat = cat.id.startsWith('cat-custom-') || customCategories.some(c => c.id === cat.id);
                setEditingCustomExp(isCustomCat ? { id: 'new', name: '', category_id: cat.id } : { id: 'new', name: '', static_category_id: cat.id });
              }}
            >
              + Añadir experiencia a {listFilter}
            </button>
          </div>
        )}

        <div className="peak-list-grid">
          {isEditingExperiences && isExp && (
            <button
              className="peak-list-item peak-list-item--diff-none"
              style={{ borderStyle: 'dashed' }}
              onClick={() => {
                const cat = listFilter !== "all" ? dynamicCategories.find(c => c.name === listFilter) : undefined;
                if (cat) {
                  const isCustomCat = cat.id.startsWith('cat-custom-') || customCategories.some(c => c.id === cat.id);
                  setEditingCustomExp(isCustomCat ? { id: 'new', name: '', category_id: cat.id } : { id: 'new', name: '', static_category_id: cat.id });
                } else {
                  setSelectingCategoryForNewExp(true);
                }
              }}
            >
              <span style={{ flexShrink: 0, width: 20, display: 'flex', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--pine)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </span>
              <span className="item-info">
                <span className="item-name" style={{ color: 'var(--pine)', fontWeight: 600 }}>Crear nueva experiencia</span>
              </span>
            </button>
          )}
          {sortedItems.filter(item => {
            // Text search filter
            if (searchQuery) {
              const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
              const q = normalize(searchQuery);
              const matchesText = (
                normalize(item.title).includes(q) ||
                (item.label && normalize(item.label).includes(q)) ||
                (item.detail && normalize(item.detail).includes(q))
              );
              if (!matchesText) return false;
            }
            let done = false;
            if (isExp && item.subItems && item.subItems.length > 0) {
              const completedSubItems = new Set(
                completedModeAscents.filter(a => a.summit_id === item.id && a.sub_item_id).map(a => a.sub_item_id)
              );
              done = item.subItems.every((s: any) => completedSubItems.has(s.id));
            } else {
              done = completedModeAscents.some((a) => a.summit_id === item.id);
            }
            const wish = modeAscents.some((a) => a.summit_id === item.id && a.is_wishlist);
            if (isExp && listFilter !== "all" && item.detail !== listFilter) return false;
            if (!isExp) {
              if (listFilter === "done") return done;
              if (listFilter === "pending") return !done && !wish;
              if (listFilter === "wishlist") return wish;
            }
            return true;
          }).map((item, index) => {
            let done = false;
            if (isExp && item.subItems && item.subItems.length > 0) {
              const completedSubItems = new Set(
                completedModeAscents.filter(a => a.summit_id === item.id && a.sub_item_id).map(a => a.sub_item_id)
              );
              done = item.subItems.every((s: any) => completedSubItems.has(s.id));
            } else {
              done = completedModeAscents.some((a) => a.summit_id === item.id);
            }
            const wish = modeAscents.some((a) => a.summit_id === item.id && a.is_wishlist);

            // Diff class logic
            let diffClass = "";
            let diffSymbol: React.ReactNode = null;
            const effectiveDiffMode = diffMode && !isExp;
            if (effectiveDiffMode) {
              if (diffItemOnlyViewer.has(item.id)) {
                diffClass = " peak-list-item--diff-only-me";
                diffSymbol = "✓";
              } else if (diffItemOnlyTarget.has(item.id)) {
                diffClass = " peak-list-item--diff-only-them";
                diffSymbol = <span style={{ fontSize: 11, fontWeight: 700 }}>✗</span>;
              } else if (diffItemBoth.has(item.id)) {
                diffClass = " peak-list-item--diff-both";
                diffSymbol = "✓";
              } else {
                diffClass = " peak-list-item--diff-none";
              }
            }

            const itemClass = effectiveDiffMode
              ? `peak-list-item${diffClass}`
              : `peak-list-item${done ? " peak-list-item--done" : wish ? " peak-list-item--wishlist" : ""}`;

            const isCustomExp = isExp && customExperiences.some(c => c.id === item.id);

            return (
              <div key={`${item.id}-${index}`} style={{ position: 'relative' }}>
                <button
                  className={itemClass}
                  onClick={() => openInformation(item)}
                  style={{ width: '100%', height: '100%' }}
                >
                  <span style={{ flexShrink: 0, width: 20, display: 'flex', justifyContent: 'center' }}>
                    {effectiveDiffMode ? (
                      <span className="item-check">{diffSymbol}</span>
                    ) : done ? (
                      <i className="legend-done" style={{ margin: 0 }}>✓</i>
                    ) : wish ? (
                      <i className="legend-wishlist" style={{ margin: 0 }}>★</i>
                    ) : (
                      <i className="legend-pin" style={{ margin: 0, paddingBottom: isPeaks ? 4 : isExp ? 2 : 0 }}>{isPeaks ? "△" : "◇"}</i>
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
                {isExp && (
                  <>
                    <button
                      className={`edit-action-btn ${isEditingExperiences ? 'is-active' : ''}`}
                      title="Editar experiencia"
                      style={{ position: 'absolute', top: '4px', right: '24px', background: 'var(--pine)', color: 'white', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', padding: 0, zIndex: 10 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCustomExp(customExperiences.find(c => c.id === item.id) || { id: item.id, name: item.title, subItems: item.subItems });
                      }}
                    >
                      <IconEdit style={{ width: 10, height: 10 }} strokeWidth={2.5} />
                    </button>
                    <button
                      className={`edit-action-btn ${isEditingExperiences ? 'is-active' : ''}`}
                      title={isCustomExp ? "Eliminar experiencia" : "Ocultar experiencia"}
                      style={{ position: 'absolute', top: '4px', right: '4px', background: '#e74c3c', color: 'white', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', padding: 0, zIndex: 10 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCustomExp) {
                          handleDeleteCustomExperience(item.id);
                        } else {
                          handleHideItem(item.id, 'experience');
                        }
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </>
                )}
              </div>
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

          {(selected.id.startsWith("exp-") || selected.id.startsWith("cexp-")) ? (
            <>
              <span className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {selected.label && getIconComponent(selected.label) && (
                  <span style={{ display: 'flex', width: 14, height: 14, alignItems: 'center' }}>
                    {getIconComponent(selected.label)}
                  </span>
                )}
                {selected.detail ? selected.detail.toUpperCase() : "EXPERIENCIA"}
              </span>
              <h2>{selected.title}</h2>
              <div style={{ marginTop: '16px' }}>
                {(() => {
                  const cat = dynamicCategories.find(c => c.name === selected.detail);
                  const exp = cat?.experiences.find(e => e.id === selected.id);
                  if (exp?.subItems) {
                    return (
                      <div style={{ marginTop: 16 }}>
                        <h4 style={{ marginBottom: 8, fontSize: '0.9rem', color: 'var(--foreground)' }}>Desglose:</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {exp.subItems.map((item: any) => {
                            const subItemKey = `${exp.id}::${item.id}`;
                            const records = experienceRecords.filter(r => r.experience_id === exp.id && r.sub_item_id === item.id);
                            const hasRecords = records.length > 0;
                            const asc = hasRecords ? records[0] : null;
                            const subItemRegisteredDates = new Set(records.map(a => a.achieved_on));
                            const subItemOtherPhotos = selectedPhotos.filter(p => p.summit_id === subItemKey && !subItemRegisteredDates.has(p.taken_on));
                            
                            const isOpenable = hasRecords || subItemOtherPhotos.length > 0;
                            
                            if (!isOpenable) {
                              return (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, fontSize: '14px' }}>
                                    {item.name}
                                  </span>
                                  <button className="button button--purple button--small" style={{ margin: '-6px 0', padding: '4px 12px', minHeight: '28px', height: 'auto', lineHeight: '1.2' }} onClick={(e) => {
                                    e.preventDefault();
                                    setSelectingLocationForExp(subItemKey);
                                    window.location.hash = "mapa";
                                  }}>Registrar</button>
                                </div>
                              );
                            }

                            return (
                              <details key={item.id} className="subitem-details" style={{ display: 'flex', flexDirection: 'column', padding: '12px 12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', outline: 'none', fontWeight: 500, fontSize: '14px', listStyle: 'none' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <svg className="details-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', flexShrink: 0 }}>
                                      <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                    {item.name}
                                  </span>
                                  {!hasRecords ? (
                                    <button className="button button--purple button--small" style={{ margin: '-6px 0', padding: '4px 12px', minHeight: '28px', height: 'auto', lineHeight: '1.2' }} onClick={(e) => {
                                      e.preventDefault();
                                      setSelectingLocationForExp(subItemKey);
                                      window.location.hash = "mapa";
                                    }}>Registrar</button>
                                  ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <IconCheck style={{ color: 'var(--pine)', width: 16, height: 16 }} />
                                    </div>
                                  )}
                                </summary>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: 16 }}>
                                  {records.length > 1 && expToggleSort}
                                  {hasRecords ? (
                                    <>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {records.map(renderExpRecord)}
                                      </div>
                                      {!isReadOnly && (
                                        <button className="button button--purple button--small" onClick={(e) => {
                                          e.preventDefault();
                                          setSelectingLocationForExp(subItemKey);
                                          window.location.hash = "mapa";
                                        }} style={{ alignSelf: 'flex-start', padding: '4px 12px', minHeight: '28px', height: 'auto', lineHeight: '1.2', marginTop: '-8px' }}>Registrar otra vez</button>
                                      )}
                                    </>
                                  ) : null}

                                  {subItemOtherPhotos.length > 0 && (
                                    <div className="photo-section" style={{ marginTop: 8 }}>
                                      <h5 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--muted)' }}>Otras fotos <small>{subItemOtherPhotos.length}</small></h5>
                                      <div className="photo-grid">
                                        {subItemOtherPhotos.map((photo) => {
                                          const isSelected = selectedPhotosForEdit.includes(photo.id);
                                          return (
                                            <figure key={photo.id} className={isSelected ? 'selected' : ''} onClick={() => handlePhotoClick(photo)}>
                                              {!isReadOnly && (
                                                <button type="button" className={`photo-select-circle ${isSelected ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); togglePhotoSelection(photo.id); }} aria-label="Seleccionar foto">
                                                  {isSelected && <IconCheck />}
                                                </button>
                                              )}
                                              <img src={photo.public_url} alt="Foto de la experiencia" loading="lazy" />
                                              <figcaption>{photo.caption ? photo.caption : formatDate(photo.taken_on)}</figcaption>
                                            </figure>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </details>
                            )
                          })}
                        </div>
                        {(() => {
                          const allCompleted = exp.subItems.every((item: any) => experienceRecords.some(r => r.experience_id === exp.id && r.sub_item_id === item.id));
                          if (!allCompleted) {
                            return (
                              <div className="pending-card" style={{ marginTop: 16 }}>
                                {isReadOnly ? "Aún no ha completado esta experiencia." : "Aún no has completado esta experiencia."}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )
                  }
                  return (
                    <div className="button-group">
                      <button
                        className="button button--purple"
                        onClick={() => {
                          setSelectingLocationForExp(`${selected.id}::`);
                          window.location.hash = "mapa";
                        }}
                        style={{ width: '100%', marginBottom: 8 }}
                      >
                        Registrar experiencia
                      </button>
                    </div>
                  );
                })()}
              </div>
            </>
          ) : (
            <>
              <span className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {selected.label ? selected.label.toUpperCase() : ""}
              </span>
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
            </>
          )}

          {!(selected.id.startsWith("exp-") || selected.id.startsWith("cexp-")) && (
            <>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <b style={{ marginTop: '6px' }}>
                          {formatDate(ascent.achieved_on)}
                          {ascent.end_date && ` - ${formatDate(ascent.end_date)}`}
                        </b>

                        {!isReadOnly && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button
                              title="Editar registro"
                              className="button button--quiet button--small"
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', flexShrink: 0, padding: 0, margin: 0 }}
                              onClick={() => openRecord(selected, ascent)}
                            >
                              <IconEdit style={{ width: 14, height: 14 }} strokeWidth={1.5} />
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
                      </div>
                      {ascent.location_name && (
                        <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }}>
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {ascent.location_name}
                        </div>
                      )}
                      {ascent.notes && <p style={{ marginTop: '4px' }}>&ldquo;{ascent.notes}&rdquo;</p>}

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
                                  <img src={photo.public_url} alt={`Foto en ${selected.title}`} loading="lazy" />
                                  <figcaption>{photo.caption ? photo.caption : formatDate(photo.taken_on)}</figcaption>
                                </figure>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : hasWishlist && !isExp ? (
                <div className="pending-card" style={{ background: "var(--amber-bg)", color: "#a67c29", borderColor: "#ecd9a5" }}>
                  ★ En tu lista de deseos
                </div>
              ) : (
                <div className="pending-card">
                  {isPeaks
                    ? (isReadOnly ? "Aún no ha registrado esta cima." : "Aún no has registrado esta cima.")
                    : (selected.id.startsWith("exp-") || selected.id.startsWith("cexp-"))
                      ? (isReadOnly ? "Aún no ha vivido esta experiencia." : "Aún no has vivido esta experiencia.")
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
                      : isPeaks ? "Marcar como completado" : (selected.id.startsWith("exp-") || selected.id.startsWith("cexp-")) ? "Registrar la experiencia" : "Marcar como visitado"}
                  </button>
                )}
                {(!selectedAscents.length || hasWishlist) && !isReadOnly && !isExp && (
                  <button
                    className="button button--quiet button--wide"
                    style={{ marginTop: 8 }}
                    onClick={() => saveWishlist()}
                  >
                    {hasWishlist ? "Quitar de mi lista de deseos" : "Añadir a mi lista de deseos"}
                  </button>
                )}
              </div>
            </>
          )}

          {(selected.id.startsWith("exp-") || selected.id.startsWith("cexp-")) && (
            <>
              {(() => {
                if (selected.subItems && selected.subItems.length > 0) {
                  return null;
                }

                if (selectedExperienceRecords.length === 0) {
                  return (
                    <div className="pending-card">
                      {isReadOnly ? "Aún no ha vivido esta experiencia." : "Aún no has vivido esta experiencia."}
                    </div>
                  );
                }

                return (
                  <>
                    {selectedExperienceRecords.length > 1 && expToggleSort}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {selectedExperienceRecords.map(renderExpRecord)}
                    </div>
                  </>
                );
              })()}

              {/* Otras fotos (experiencias) */}
              {(() => {
                const registeredDates = new Set(selectedExperienceRecords.map(a => a.achieved_on));
                // Only show photos that belong to the parent (not a specific sub-item) and whose date is not registered
                const otherPhotos = selectedPhotos.filter(p => !registeredDates.has(p.taken_on) && p.summit_id === selected.id);
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
            </>
          )}
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
              {isPeaks ? "REGISTRAR ASCENSIÓN" : (selected.id.startsWith("exp-") || selected.id.startsWith("cexp-") ? "REGISTRAR EXPERIENCIA" : "REGISTRAR VISITA")}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              {(selected.id.startsWith("exp-") || selected.id.startsWith("cexp-")) && selected.iconName && (
                <span style={{ color: 'var(--foreground)' }}>
                  {getIconComponent(selected.iconName, 26)}
                </span>
              )}
              <h2 style={{ margin: 0, fontSize: '1.35rem', lineHeight: '1.2' }}>{selected.title}</h2>
            </div>
            <p>
              {(selected.id.startsWith("exp-") || selected.id.startsWith("cexp-")) ? selected.subtitle : `${selected.label} · ${selected.subtitle}`}
            </p>
            {(selected.id.startsWith("exp-") || selected.id.startsWith("cexp-")) && (
              <div style={{ marginBottom: 16, zIndex: 50 }}>
                <div style={{ marginBottom: 8 }}>
                  <label className="field-label" style={{ display: 'block', marginBottom: 4 }}>Ubicación</label>
                  <LocationSearch
                    value={locationName}
                    onChange={setLocationName}
                    onSelect={(lat, lng, name) => {
                      setSelectedLatLng({ lat, lng });
                      setLocationName(name);
                    }}
                    placeholder="Buscar país, región, ciudad..."
                    className="notes-input"
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: -4 }}>
                  <button
                    type="button"
                    className="button button--quiet button--small"
                    onClick={() => {
                      setSelectingLocationForExp(selected.sub_item_id ? `${selected.id}::${selected.sub_item_id}` : `${selected.id}::`);
                      setRecordOpen(false);
                      window.location.hash = "mapa";
                    }}
                    style={{ color: 'var(--pine)', padding: '4px 8px' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, marginRight: 6 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    Modificar ubicación
                  </button>
                </div>
              </div>
            )}

            <div className="field-label" style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span>{isPeaks ? "Fecha de la ascensión" : (selected.id.startsWith("exp-") || selected.id.startsWith("cexp-") ? "Fecha de la experiencia" : "Fecha de la visita")}</span>
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

            <label className="field-label" style={{ marginBottom: 16 }}>
              Notas
              <textarea
                placeholder={(selected.id.startsWith("exp-") || selected.id.startsWith("cexp-")) ? "Acompañantes, sensaciones ..." : "Ciudades visitadas, experiencias, lo que quieras recordar..."}
                value={notes || ""}
                onChange={(e) => {
                  setNotes(e.target.value);
                }}
                rows={3}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: 16 }}>
              <label className="field-label">
                Enlace
                <input
                  type="url"
                  placeholder="https://..."
                  value={link || ""}
                  onChange={(e) => {
                    setLink(e.target.value);
                    if (!e.target.value) setLinkName("");
                  }}
                />
              </label>
              <label className="field-label" style={{ opacity: !link ? 0.5 : 1 }}>
                Texto del enlace
                <input
                  type="text"
                  placeholder="Ej: Vídeo de la ruta"
                  value={linkName || ""}
                  onChange={(e) => setLinkName(e.target.value)}
                  disabled={!link}
                  title={!link ? "Añade un enlace primero" : ""}
                />
              </label>
            </div>

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
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {hasPrevPhoto && (
            <button className="lightbox-nav lightbox-nav--prev" onClick={(e) => { e.stopPropagation(); showPrevPhoto(); }} aria-label="Foto anterior">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          )}
          {hasNextPhoto && (
            <button className="lightbox-nav lightbox-nav--next" onClick={(e) => { e.stopPropagation(); showNextPhoto(); }} aria-label="Foto siguiente">
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          )}
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
            key={lightboxPhoto.id}
            className="lightbox-image"
            src={lightboxPhoto.public_url}
            alt={`${isPeaks ? "Ascensión a" : "Visita a"} ${selected?.title}`}
            onClick={(e) => {
              e.stopPropagation();
              setLightboxMenuOpen(false);
            }}
          />
          <div style={{ position: 'fixed', bottom: '24px', left: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', zIndex: 10002 }}>
            <span className="lightbox-caption" style={{ position: 'relative', bottom: 'auto', left: 'auto', transform: 'none', width: '90%', textAlign: 'center', zIndex: 10001 }}>
              {lightboxPhoto.caption && (
                <strong style={{ display: 'block', fontSize: '15px', marginBottom: '2px', color: 'white' }}>{lightboxPhoto.caption}</strong>
              )}
              <span style={{ opacity: lightboxPhoto.caption ? 0.7 : 1 }}>
                {selected?.title}
                {(() => {
                  let dateStr = "";
                  if (!lightboxPhoto.taken_on.startsWith("1900-01-01")) {
                    const relatedAscent = ascents.find(a => a.summit_id === selected?.id && a.achieved_on === lightboxPhoto.taken_on);
                    dateStr = ` · ${formatShortDate(lightboxPhoto.taken_on)}${relatedAscent?.end_date ? ` - ${formatShortDate(relatedAscent.end_date)}` : ""}`;
                  }
                  const pageStr = currentPhotoGroup.length > 1 ? ` · ${lightboxIndex + 1} de ${currentPhotoGroup.length}` : "";
                  return dateStr + pageStr;
                })()}
              </span>
            </span>

            {currentPhotoGroup.length > 1 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {currentPhotoGroup.map((photo: any, idx: number) => (
                  <div 
                    key={photo.id || idx} 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setLightboxPhoto(photo); 
                    }}
                    style={{ 
                      width: idx === lightboxIndex ? '18px' : '8px', 
                      height: '8px', 
                      borderRadius: '4px', 
                      backgroundColor: idx === lightboxIndex ? 'white' : 'rgba(255,255,255,0.4)', 
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }} 
                  />
                ))}
              </div>
            )}
          </div>

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
      {/* ── Experience Selector Modal ───── */}
      {expSelectorOpen && (
        <div className="modal-backdrop" onClick={() => setExpSelectorOpen(false)}>
          <div className="auth-dialog" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, padding: 0 }}>
            <div className="modal-header" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, paddingRight: 32 }}>Elige una categoría</h3>
              <button className="icon-button" onClick={() => setExpSelectorOpen(false)}><IconClose /></button>
            </div>
            <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 24px 20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dynamicCategories.map(cat => {
                const isCustom = cat.id.startsWith('cat-custom-') || customCategories.some(c => c.id === cat.id);
                const isExpanded = expandedExpCategory === cat.id;
                return (
                  <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <button
                      className="button button--outline"
                      style={{ 
                        justifyContent: 'flex-start', 
                        padding: '12px 16px', 
                        fontWeight: 500,
                        width: '100%' 
                      }}
                      onClick={() => setExpandedExpCategory(isExpanded ? null : cat.id)}
                    >
                      <span style={{ marginRight: 12, color: 'var(--pine)', display: 'flex' }}>
                        {cat.iconName && getIconComponent(cat.iconName, 18)}
                      </span>
                      {cat.name}
                    </button>

                    {isExpanded && (
                      <div style={{ padding: '4px 0 12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {cat.experiences.map(exp => {
                            const isCustomExp = exp.id.startsWith('exp-') === false && exp.id.startsWith('cexp-') === false || customExperiences.some(c => c.id === exp.id);
                            return (
                              <div key={exp.id} style={{ marginBottom: '8px' }}>
                                {!exp.subItems ? (
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                      className="button"
                                      style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', padding: '12px 16px', background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: '8px', fontWeight: 500, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s ease' }}
                                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--pine)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.05)'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}
                                      onClick={() => {
                                        setSelectingLocationForExp(`${exp.id}::`);
                                        setExpSelectorOpen(false);
                                      }}
                                    >
                                      {exp.name}
                                      <svg viewBox="0 0 24 24" fill="none" stroke="var(--pine)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, opacity: 0.7 }}>
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 16 16 12 12 8"></polyline>
                                        <line x1="8" y1="12" x2="16" y2="12"></line>
                                      </svg>
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ padding: '14px', border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--background)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                      <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--foreground)' }}>{exp.name}</div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                                      {exp.subItems.map((item: any) => (
                                        <button
                                          key={item.id}
                                          className="button button--outline button--small"
                                          style={{ justifyContent: 'center', transition: 'all 0.2s' }}
                                          onClick={() => {
                                            setSelectingLocationForExp(`${exp.id}::${item.id}`);
                                            setExpSelectorOpen(false);
                                          }}
                                        >
                                          {item.name}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showTrashModal && (
        <div className="modal-backdrop" onClick={() => setShowTrashModal(false)}>
          <div className="auth-dialog" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 500, padding: 0 }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Papelera</h3>
              <button className="icon-button" onClick={() => setShowTrashModal(false)}><IconClose /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
              {hiddenItems.length === 0 ? (
                <p style={{ color: 'var(--muted)', textAlign: 'center' }}>La papelera está vacía.</p>
              ) : (
                hiddenItems.map(item => {
                  let name = "Desconocido";
                  let icon = "help-circle";
                  if (item.item_type === 'category') {
                    const staticCat = predefinedCategories.find(c => c.id === item.item_id);
                    const customCat = customCategories.find(c => c.id === item.item_id || c.static_id === item.item_id);
                    name = customCat ? customCat.name : (staticCat ? staticCat.name : item.item_id);
                    icon = customCat ? customCat.icon_name : (staticCat ? staticCat.iconName : 'star');
                  } else {
                    const customExp = customExperiences.find(e => e.id === item.item_id);
                    if (customExp) name = customExp.name;
                    else {
                      for (const c of predefinedCategories) {
                        const ex = c.experiences.find(e => e.id === item.item_id);
                        if (ex) { name = ex.name; break; }
                      }
                    }
                  }
                  
                  return (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {item.item_type === 'category' ? getIconComponent(icon) : <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--border)', display: 'inline-block' }} />}
                        <div>
                          <div style={{ fontWeight: 500 }}>{name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{item.item_type === 'category' ? 'Categoría' : 'Experiencia'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="button button--quiet button--small" disabled={saving} onClick={() => handleRestoreHiddenItem(item.id)}>Restaurar</button>
                        <button className="button button--quiet button--small" disabled={saving} style={{ color: 'var(--danger, #a34f3d)' }} onClick={() => handlePermanentDelete(item)}>Eliminar</button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {editingCustomCategory && (
        <div className="modal-backdrop" onClick={() => { setEditingCustomCategory(null); }}>
          <div className="auth-dialog" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, padding: 0 }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{editingCustomCategory.id === 'new' ? "Crear Categoría" : "Editar Categoría"}</h3>
              <button className="icon-button" onClick={() => { setEditingCustomCategory(null); }}><IconClose /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Nombre de la Categoría</label>
                <input
                  type="text"
                  value={editingCustomCategory.name || ""}
                  onChange={e => setEditingCustomCategory({ ...editingCustomCategory, name: e.target.value })}
                  placeholder="Ej. Deporte, Hitos personales..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Icono</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(44px, 1fr))', gap: 10 }}>
                  {[
                    'star', 'tent', 'mountain', 'compass', 'paw', 'camera', 'building', 'telescope', 'user', 'heart', 'tree', 'home', 'dumbbell', 'plane', 'rocket', 'waves', 'sun', 'utensils', 'map', 'castle', 'store', 'book'
                  ].map(iconValue => (
                    <button
                      key={iconValue}
                      type="button"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '100%', aspectRatio: '1', borderRadius: 10,
                        border: (editingCustomCategory.icon_name || "star") === iconValue ? '2px solid var(--pine)' : '1px solid var(--border)',
                        background: (editingCustomCategory.icon_name || "star") === iconValue ? 'var(--surface)' : 'var(--background)',
                        color: (editingCustomCategory.icon_name || "star") === iconValue ? 'var(--pine)' : 'var(--foreground)',
                        cursor: 'pointer', transition: 'all 0.2s ease'
                      }}
                      onClick={() => setEditingCustomCategory({ ...editingCustomCategory, icon_name: iconValue })}
                      onMouseEnter={e => { if ((editingCustomCategory.icon_name || "star") !== iconValue) e.currentTarget.style.borderColor = 'var(--pine)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                      onMouseLeave={e => { if ((editingCustomCategory.icon_name || "star") !== iconValue) e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
                    >
                      <span style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {getIconComponent(iconValue)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              {editingCustomCategory.id !== 'new' ? (
                <button className="button button--quiet" style={{ color: 'var(--danger, #a34f3d)' }} disabled={saving} onClick={handleDeleteCustomCategory}>Eliminar</button>
              ) : <div></div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="button button--outline" onClick={() => { setEditingCustomCategory(null); }}>Cancelar</button>
                <button className="button" disabled={saving || !editingCustomCategory.name?.trim()} onClick={handleSaveCustomCategory}>
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectingCategoryForNewExp && (
        <div className="modal-backdrop" onClick={() => setSelectingCategoryForNewExp(false)}>
          <div className="auth-dialog" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, padding: 0 }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Elige una categoría</h3>
              <button className="icon-button" onClick={() => setSelectingCategoryForNewExp(false)}><IconClose /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '20px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
              {dynamicCategories.map(cat => (
                <button
                  key={cat.id}
                  className="button button--outline"
                  style={{ justifyContent: 'flex-start', padding: '12px 16px', fontWeight: 500 }}
                  onClick={() => {
                    const isCustomCat = cat.id.startsWith('cat-custom-') || customCategories.some(c => c.id === cat.id);
                    setEditingCustomExp(isCustomCat ? { id: 'new', name: '', category_id: cat.id } : { id: 'new', name: '', static_category_id: cat.id });
                    setSelectingCategoryForNewExp(false);
                  }}
                >
                  <span style={{ marginRight: 12, color: 'var(--pine)', display: 'flex' }}>
                    {cat.iconName && getIconComponent(cat.iconName, 18)}
                  </span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {editingCustomExp && (
        <div className="modal-backdrop" onClick={() => { setEditingCustomExp(null); }}>
          <div className="auth-dialog" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, padding: 0 }}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{editingCustomExp.id === 'new' ? "Crear Experiencia" : "Editar Experiencia"}</h3>
              <button className="icon-button" onClick={() => { setEditingCustomExp(null); }}><IconClose /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Nombre</label>
                <input
                  type="text"
                  value={editingCustomExp.name || ""}
                  onChange={e => setEditingCustomExp({ ...editingCustomExp, name: e.target.value })}
                  placeholder="Ej. Bucear con tiburones..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ margin: 0, fontWeight: 500 }}>Mini-experiencias</label>
                  <button
                    type="button"
                    onClick={() => {
                      const current = editingCustomExp.sub_items_input !== undefined
                        ? editingCustomExp.sub_items_input
                        : (editingCustomExp.subItems || editingCustomExp.sub_items ? (editingCustomExp.subItems || editingCustomExp.sub_items).map((s: any) => s.name).join('\n') : "");
                      const hasMiniExperiences = editingCustomExp.has_sub_items !== undefined ? editingCustomExp.has_sub_items : current.length > 0;

                      if (hasMiniExperiences) {
                        setEditingCustomExp({ ...editingCustomExp, has_sub_items: false, sub_items_input: "" });
                      } else {
                        setEditingCustomExp({ ...editingCustomExp, has_sub_items: true, sub_items_input: "" });
                      }
                    }}
                    style={{
                      width: 44, height: 24, borderRadius: 12,
                      background: (editingCustomExp.has_sub_items !== undefined ? editingCustomExp.has_sub_items : (editingCustomExp.sub_items_input !== undefined ? editingCustomExp.sub_items_input : (editingCustomExp.subItems || editingCustomExp.sub_items ? (editingCustomExp.subItems || editingCustomExp.sub_items).map((s: any) => s.name).join('\n') : "")).length > 0) ? 'var(--pine)' : '#71717a',
                      position: 'relative', border: 'none', cursor: 'pointer', transition: 'background 0.2s'
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 2,
                      left: (editingCustomExp.has_sub_items !== undefined ? editingCustomExp.has_sub_items : (editingCustomExp.sub_items_input !== undefined ? editingCustomExp.sub_items_input : (editingCustomExp.subItems || editingCustomExp.sub_items ? (editingCustomExp.subItems || editingCustomExp.sub_items).map((s: any) => s.name).join('\n') : "")).length > 0) ? 22 : 2,
                      width: 20, height: 20, background: 'white', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </button>
                </div>

                {(() => {
                  const currentSubItemsStr = editingCustomExp.sub_items_input !== undefined
                    ? editingCustomExp.sub_items_input
                    : (editingCustomExp.subItems || editingCustomExp.sub_items ? (editingCustomExp.subItems || editingCustomExp.sub_items).map((s: any) => s.name).join('\n') : "");
                  const hasMiniExperiences = editingCustomExp.has_sub_items !== undefined ? editingCustomExp.has_sub_items : currentSubItemsStr.length > 0;
                  const miniExpList = hasMiniExperiences ? (currentSubItemsStr ? currentSubItemsStr.split('\n') : [""]) : [];

                  if (!hasMiniExperiences) return null;

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                      {miniExpList.map((item: string, idx: number) => (
                        <div key={idx} style={{ display: 'flex', gap: 8 }}>
                          <input
                            type="text"
                            value={item}
                            placeholder={`Mini-experiencia ${idx + 1}`}
                            onChange={e => {
                              const newList = [...miniExpList];
                              newList[idx] = e.target.value;
                              setEditingCustomExp({ ...editingCustomExp, sub_items_input: newList.join('\n'), has_sub_items: true });
                            }}
                            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newList = [...miniExpList];
                              newList.splice(idx, 1);
                              setEditingCustomExp({ ...editingCustomExp, sub_items_input: newList.join('\n'), has_sub_items: true });
                            }}
                            style={{ width: 36, height: 36, color: 'var(--danger, #a34f3d)', flexShrink: 0, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Eliminar mini experiencia"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const newList = [...miniExpList, ""];
                          setEditingCustomExp({ ...editingCustomExp, sub_items_input: newList.join('\n'), has_sub_items: true });
                        }}
                        className="button button--outline button--small"
                        style={{ alignSelf: 'flex-start', marginTop: 4 }}
                      >
                        + Añadir mini experiencia
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'space-between' }}>
              {editingCustomExp.id !== 'new' ? (
                <button className="button button--quiet" style={{ color: 'var(--danger, #a34f3d)' }} disabled={saving} onClick={() => handleDeleteCustomExperience(editingCustomExp.id)}>Eliminar</button>
              ) : <div></div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="button button--outline" onClick={() => { setEditingCustomExp(null); }}>Cancelar</button>
                <button className="button" disabled={saving || !editingCustomExp.name?.trim()} onClick={handleSaveCustomExperience}>
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="modal-backdrop" onClick={() => setConfirmAction(null)}>
          <div className="auth-dialog" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 400, padding: 0 }}>
            <div className="modal-header" style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button className="icon-button" onClick={() => setConfirmAction(null)}><IconClose /></button>
            </div>
            <div style={{ padding: '10px 24px 20px', fontSize: '16px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontWeight: 600 }}>{confirmAction.message}</p>
            </div>
            <div className="modal-footer" style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="button button--outline" onClick={() => setConfirmAction(null)}>Cancelar</button>
              <button className="button" style={{ background: 'var(--danger, #a34f3d)', color: 'white', border: 'none' }} onClick={() => {
                confirmAction.onConfirm();
                setConfirmAction(null);
              }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
