import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { Link as LinkIcon, Video, Camera, Briefcase, MapPin, Share2 } from "lucide-react";
import { es } from "date-fns/locale";
import { countries } from "@/data/countries";
import { peaks } from "@/data/peaks";
import { predefinedCategories } from "@/data/experiences";

function isUnknownDate(dateVal: string | undefined | null): boolean {
  if (!dateVal) return true;
  if (typeof dateVal === "string") {
    const trimmed = dateVal.trim();
    if (trimmed.startsWith("1900-01-01") || trimmed.startsWith("1899-12-31")) return true;
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return true;
  return d.getFullYear() <= 1900;
}

function formatCustomDate(dateVal: string | undefined | null): string {
  if (!dateVal || isUnknownDate(dateVal)) return '';
  const trimmed = typeof dateVal === 'string' ? dateVal.split('T')[0] : '';
  const parts = trimmed.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day, 12, 0, 0);
    return format(d, "d MMM yyyy", { locale: es });
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  return format(d, "d MMM yyyy", { locale: es });
}

function formatRecordDateRange(startDateVal: string | undefined | null, endDateVal: string | undefined | null): string {
  const startStr = formatCustomDate(startDateVal);
  if (!startStr) return '';
  if (endDateVal && !isUnknownDate(endDateVal) && endDateVal !== startDateVal) {
    const endStr = formatCustomDate(endDateVal);
    if (endStr && endStr !== startStr) {
      return `${startStr} - ${endStr}`;
    }
  }
  return startStr;
}

function formatDateSafe(dateVal: string | undefined | null): string {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  try {
    return formatDistanceToNow(d, { addSuffix: true, locale: es });
  } catch {
    return '';
  }
}

function FeedItemCard({ item, session: _session, onAuthRequired: _onAuthRequired }: { item: any, session?: Session | null, onAuthRequired?: () => void }) {
  const router = useRouter();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const photos: any[] = (item.photos || []).filter((p: any) => p && p.public_url);
  const hasPhotos = photos.length > 0;
  const hasPrevPhoto = lightboxIndex !== null && lightboxIndex > 0;
  const hasNextPhoto = lightboxIndex !== null && lightboxIndex < photos.length - 1;

  const showPrevPhoto = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  const showNextPhoto = () => {
    if (lightboxIndex !== null && lightboxIndex < photos.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].clientX;
    touchStartY.current = e.changedTouches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || lightboxIndex === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const distanceX = touchStartX.current - touchEndX;
    const distanceY = touchStartY.current !== null ? Math.abs(touchStartY.current - touchEndY) : 0;
    const minSwipeDistance = 40;

    if (Math.abs(distanceX) > minSwipeDistance && Math.abs(distanceX) > distanceY) {
      if (distanceX > 0 && lightboxIndex < photos.length - 1) {
        setLightboxIndex(prev => (prev !== null ? prev + 1 : null));
      } else if (distanceX < 0 && lightboxIndex > 0) {
        setLightboxIndex(prev => (prev !== null ? prev - 1 : null));
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightboxIndex]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === "ArrowRight") {
        setLightboxIndex(prev => (prev !== null && prev < photos.length - 1 ? prev + 1 : prev));
      } else if (e.key === "Escape") {
        setLightboxIndex(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, photos.length]);

  let isCountry = false;
  let isPeak = false;
  let finalLocationName = item.location_name || 'Experiencia';

  if (item.type === "ascent") {
    const summitIdLower = (item.summit_id || '').toLowerCase();
    const country = countries.find(c => c.id === summitIdLower);
    const peak = peaks.find(p => p.id === summitIdLower);
    if (country) {
      isCountry = true;
      finalLocationName = country.name;
    } else if (peak) {
      isPeak = true;
      finalLocationName = peak.name;
    } else {
      finalLocationName = (item.summit_id || '').toUpperCase();
    }
  } else if (item.type === "experience") {
    if (item.experience_title) {
      if (item.sub_item_title) {
        finalLocationName = `${item.experience_title} (${item.sub_item_title})`;
      } else {
        finalLocationName = item.experience_title;
      }
    }
  }

  let title = "ha completado una experiencia";
  if (item.type === "ascent") {
    title = isPeak ? "ha registrado una ascensión" : "ha visitado un país";
  }

  const displayTitle = finalLocationName;
  const dateRangeStr = formatRecordDateRange(item.achieved_on, item.end_date);

  const username = item.profiles?.username;

  let recordChallenge = "countries";
  let recordId = "";

  if (item.type === "ascent") {
    const summitIdLower = (item.summit_id || '').toLowerCase();
    recordId = summitIdLower;
    recordChallenge = isPeak ? "peaks" : "countries";
  } else if (item.type === "experience") {
    recordChallenge = "experiences";
    if (item.experience_id) {
      recordId = item.sub_item_id
        ? `${item.experience_id}::${item.sub_item_id}`
        : item.experience_id;
    }
  }

  const profileBaseUrl = username ? `/perfil/${username}?challenge=${recordChallenge}` : "";
  const recordUrlWithHash = username && recordId ? `${profileBaseUrl}#panel=${encodeURIComponent(recordId)}` : profileBaseUrl;

  const handleTitleClick = (e: React.MouseEvent) => {
    if (!username || !recordId) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    try {
      sessionStorage.setItem("auto_open_panel", recordId);
    } catch (err) {
      console.warn("Could not set sessionStorage:", err);
    }
    router.push(profileBaseUrl);
  };

  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const shareUrl = username && recordId ? `${baseUrl}${recordUrlWithHash}` : `${baseUrl}/social`;

    const shareTitle = `${displayTitle} · ${username || '47 Picos'}`;
    let shareText = `${username ? `@${username}` : 'Usuario'} ${title}: ${displayTitle}`;
    if (dateRangeStr) {
      shareText += ` (${dateRangeStr})`;
    }
    if (item.notes) {
      shareText += `\n"${item.notes}"`;
    }
    shareText += `\n\n${shareUrl}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        const shareData: ShareData = {
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        };
        await navigator.share(shareData);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          } catch {}
        }
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {}
    }
  };

  return (
    <div className="feed-card">
      <div className="feed-card-header">
        <Link href={`/perfil/${item.profiles?.username}`} style={{ textDecoration: 'none' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--pine)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
            {item.profiles?.avatar_url ? (
              <img src={item.profiles.avatar_url} alt={item.profiles.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              item.profiles?.username?.charAt(0).toUpperCase()
            )}
          </div>
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', lineHeight: '1.2' }}>
            <Link href={`/perfil/${item.profiles?.username}`} style={{ fontWeight: 'bold', textDecoration: 'none', color: 'var(--ink)' }}>
              {item.profiles?.username}
            </Link>{' '}
            <span style={{ color: 'var(--muted)' }}>{title}</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', fontWeight: '500' }}>
            {dateRangeStr || formatDateSafe(item.created_at)}
          </div>
        </div>
        <button
          className="feed-share-btn"
          onClick={handleShare}
          title={copied ? "Enlace copiado al portapapeles" : "Compartir publicación"}
          aria-label="Compartir publicación"
          style={{
            background: "none",
            border: "none",
            color: copied ? "var(--pine)" : "var(--muted)",
            cursor: "pointer",
            padding: "8px",
            borderRadius: "50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s ease",
            flexShrink: 0,
          }}
        >
          {copied ? (
            <span style={{ fontSize: "11px", fontWeight: "bold", color: "var(--pine)" }}>¡Copiado!</span>
          ) : (
            <Share2 size={16} />
          )}
        </button>
      </div>

      <div className="feed-card-body" style={{ paddingBottom: hasPhotos ? '12px' : '16px', paddingTop: '0' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '18px' }}>
          {username && recordId ? (
            <Link
              href={recordUrlWithHash}
              onClick={handleTitleClick}
              className="feed-record-title"
              style={{
                color: 'var(--pine)',
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              {displayTitle}
            </Link>
          ) : (
            <span style={{ color: 'var(--pine)' }}>{displayTitle}</span>
          )}
        </h3>
        {item.notes && (
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--ink)', lineHeight: '1.5' }}>
            {item.notes}
          </p>
        )}
        {item.link &&
          (() => {
            let Icon = LinkIcon;
            const urlStr = item.link.toLowerCase();
            if (urlStr.includes("youtube.com") || urlStr.includes("youtu.be"))
              Icon = Video;
            else if (urlStr.includes("instagram.com")) Icon = Camera;
            else if (urlStr.includes("linkedin.com")) Icon = Briefcase;
            else if (
              urlStr.includes("google.com/maps") ||
              urlStr.includes("wikiloc.com") ||
              urlStr.includes("komoot.com") ||
              urlStr.includes("strava.com")
            )
              Icon = MapPin;

            const displayName =
              item.link_name ||
              (urlStr.includes("youtube.com") || urlStr.includes("youtu.be")
                ? "Vídeo en YouTube"
                : urlStr.includes("instagram.com")
                  ? "Publicación en Instagram"
                  : urlStr.includes("linkedin.com")
                    ? "Publicación en LinkedIn"
                    : urlStr.includes("google.com/maps")
                      ? "Ver en Google Maps"
                      : urlStr.includes("wikiloc.com")
                        ? "Ruta en Wikiloc"
                        : urlStr.includes("strava.com")
                          ? "Actividad en Strava"
                          : urlStr.includes("komoot.com")
                            ? "Ruta en Komoot"
                            : "Enlace adjunto");

            const href =
              item.link.startsWith("http://") || item.link.startsWith("https://")
                ? item.link
                : `https://${item.link}`;

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 8,
                  fontSize: "14px",
                  color: "var(--pine)",
                  textDecoration: "none",
                  fontWeight: 500,
                  padding: "4px 10px",
                  backgroundColor: "rgba(35, 78, 82, 0.05)",
                  borderRadius: 16,
                  border: "1px solid rgba(35, 78, 82, 0.1)",
                }}
              >
                <Icon size={14} />
                {displayName}
              </a>
            );
          })()}

      </div>

      {photos.length > 0 && (
        <div style={{ position: 'relative', width: '100%', marginBottom: '16px' }}>
          {photos.length === 1 ? (
            <img 
              src={photos[0].public_url} 
              onClick={() => setLightboxIndex(0)} 
              alt="Activity media" 
              className="feed-card-media" 
              loading="lazy"
              style={{ width: '100%', height: '300px', objectFit: 'cover', cursor: 'pointer', borderRadius: '12px' }} 
            />
          ) : photos.length === 3 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '4px', borderRadius: '12px', overflow: 'hidden', height: '300px', width: '100%' }}>
              <div style={{ gridRow: '1 / span 2', gridColumn: '1', position: 'relative', width: '100%', height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
                <img 
                  src={photos[0].public_url} 
                  onClick={() => setLightboxIndex(0)} 
                  alt="" 
                  loading="lazy"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer', display: 'block' }} 
                />
              </div>
              <div style={{ gridRow: '1', gridColumn: '2', position: 'relative', width: '100%', height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
                <img 
                  src={photos[1].public_url} 
                  onClick={() => setLightboxIndex(1)} 
                  alt="" 
                  loading="lazy"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer', display: 'block' }} 
                />
              </div>
              <div style={{ gridRow: '2', gridColumn: '2', position: 'relative', width: '100%', height: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
                <img 
                  src={photos[2].public_url} 
                  onClick={() => setLightboxIndex(2)} 
                  alt="" 
                  loading="lazy"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer', display: 'block' }} 
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', borderRadius: '12px', overflow: 'hidden', width: '100%' }}>
              {photos.slice(0, 4).map((photo: any, index: number) => {
                const isLast = index === 3;
                const hasMore = photos.length > 4;
                return (
                  <div key={photo.id || index} style={{ position: 'relative', aspectRatio: '1', width: '100%', minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
                    <img 
                      src={photo.public_url} 
                      onClick={() => setLightboxIndex(index)} 
                      alt="" 
                      loading="lazy"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer', display: 'block' }} 
                    />
                    {isLast && hasMore && (
                      <div 
                        onClick={() => setLightboxIndex(index)} 
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        +{photos.length - 4}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal con soporte de deslizamiento táctil y botones de navegación en ordenador */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div 
          className="lightbox-backdrop" 
          onClick={() => setLightboxIndex(null)} 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
        >
          {hasPrevPhoto && (
            <button 
              className="lightbox-nav lightbox-nav--prev" 
              onClick={(e) => { e.stopPropagation(); showPrevPhoto(); }} 
              aria-label="Foto anterior"
              style={{ zIndex: 10001 }}
            >
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          )}

          {hasNextPhoto && (
            <button 
              className="lightbox-nav lightbox-nav--next" 
              onClick={(e) => { e.stopPropagation(); showNextPhoto(); }} 
              aria-label="Foto siguiente"
              style={{ zIndex: 10001 }}
            >
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          )}

          <button 
            className="lightbox-close" 
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
            aria-label="Cerrar imagen"
            style={{ zIndex: 10001 }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <img 
            key={photos[lightboxIndex].id || lightboxIndex}
            className="lightbox-image"
            src={photos[lightboxIndex].public_url} 
            alt="Fullscreen" 
            style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain' }} 
            onClick={e => e.stopPropagation()} 
          />

          <div style={{ position: 'fixed', bottom: '24px', left: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', zIndex: 10002 }}>
            <span className="lightbox-caption" style={{ position: 'relative', bottom: 'auto', left: 'auto', transform: 'none', width: '90%', textAlign: 'center', zIndex: 10001 }}>
              {photos[lightboxIndex].caption && (
                <strong style={{ display: 'block', fontSize: '15px', marginBottom: '2px', color: 'white' }}>
                  {photos[lightboxIndex].caption}
                </strong>
              )}
              <span style={{ opacity: photos[lightboxIndex].caption ? 0.7 : 1 }}>
                {finalLocationName}
                
              </span>
            </span>

            {photos.length > 1 && (
              <div style={{ display: 'flex', gap: '8px' }}>
                {photos.map((_: any, idx: number) => (
                  <div 
                    key={idx} 
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
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
        </div>
      )}
    </div>
  );
}

let globalCachedFeedItems: any[] | null = null;
let globalFeedLastFetched = 0;
let isFetchingFeed = false;
const FEED_CACHE_TTL = 60 * 1000;

export function FeedTab({ session, isActive = true, onAuthRequired }: { session: Session | null; isActive?: boolean; onAuthRequired?: () => void }) {
  const [loading, setLoading] = useState(() => !globalCachedFeedItems || globalCachedFeedItems.length === 0);
  const [feedItems, setFeedItems] = useState<any[]>(() => globalCachedFeedItems || []);

  useEffect(() => {
    if (!isActive) return;

    async function fetchFeed() {
      if (!supabase || isFetchingFeed) return;
      const now = Date.now();
      if (globalCachedFeedItems && globalCachedFeedItems.length > 0 && (now - globalFeedLastFetched < FEED_CACHE_TTL)) {
        setFeedItems(globalCachedFeedItems);
        setLoading(false);
        return;
      }

      if (!globalCachedFeedItems || globalCachedFeedItems.length === 0) {
        setLoading(true);
      }
      isFetchingFeed = true;

      const limit = 200;
      let ascents: any[] = [];
      let expRecords: any[] = [];
      let fetchError = null;

      // Fetch ascents
      const { data: ascData, error: ascErr } = await supabase
        .from("ascents")
        .select("id, user_id, summit_id, created_at, achieved_on, end_date, notes, link, link_name, profiles!ascents_user_id_profiles_fkey(username, avatar_url, is_public, is_test)")
        .eq('is_wishlist', false)
        .or('summit_id.not.ilike.country-%,achieved_on.gt.1900-01-01')
        .order("created_at", { ascending: false })
        .limit(limit);

      if (ascErr) fetchError = ascErr.message;
      if (ascData) {
        ascents = ascData.filter((a: any) => {
          // Excluir perfiles de testeo / ocultos
          if (a.profiles?.is_test) return false;

          const summitIdLower = (a.summit_id || '').toLowerCase();
          if (summitIdLower.startsWith('region-')) return false;

          // Excluir cualquier registro que no tenga fecha establecida válida
          if (!a.achieved_on || isUnknownDate(a.achieved_on)) {
            return false;
          }

          return true;
        });
      }

      // Fetch experiences
      const { data: expData, error: expErr } = await supabase
        .from("experience_records")
        .select("id, user_id, experience_id, sub_item_id, created_at, achieved_on, notes, link, link_name, location_name, profiles!experience_records_user_id_profiles_fkey(username, avatar_url, is_public, is_test)")
        .eq('is_wishlist', false)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (expErr && !fetchError) fetchError = expErr.message;
      if (expData) {
        expRecords = expData.filter((e: any) => {
          // Excluir perfiles de testeo / ocultos
          if (e.profiles?.is_test) return false;

          // Excluir cualquier experiencia que no tenga fecha establecida válida
          if (!e.achieved_on || isUnknownDate(e.achieved_on)) {
            return false;
          }
          return true;
        });
      }

      if (fetchError) {
        console.error("Error fetching feed:", fetchError);
        if (!globalCachedFeedItems || globalCachedFeedItems.length === 0) {
          setFeedItems([{ type: 'error', notes: fetchError, id: 'error-1' }]);
        }
        setLoading(false);
        isFetchingFeed = false;
        return;
      }

      // Combinar y ordenar cronológicamente por la fecha real de la actividad
      const combinedBase = [
        ...ascents.map(a => ({
          ...a,
          type: "ascent",
          record_date: a.achieved_on
        })),
        ...expRecords.map(e => ({
          ...e,
          type: "experience",
          record_date: e.achieved_on
        }))
      ].filter(item => item.record_date && !isNaN(new Date(item.record_date).getTime()))
       .sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime())
       .slice(0, limit);
       
      const customExpIds = combinedBase.filter(item => item.type === 'experience' && item.experience_id).map(item => item.experience_id);
      const customExperiences: Record<string, string> = {};
      if (customExpIds.length > 0) {
        const { data: customExpData } = await supabase.from('custom_experiences').select('id, name').in('id', customExpIds);
        if (customExpData) {
          customExpData.forEach(ce => { customExperiences[ce.id] = ce.name; });
        }
      }
      
      const combined = combinedBase.map(item => {
        if (item.type === 'experience') {
          let title = '';
          let subTitle = '';
          
          let found = false;
          for (const cat of predefinedCategories) {
            const exp = cat.experiences.find(e => e.id === item.experience_id);
            if (exp) {
              title = exp.name;
              if (item.sub_item_id && exp.subItems) {
                const sub = exp.subItems.find((s: any) => s.id === item.sub_item_id);
                if (sub) subTitle = sub.name;
              }
              found = true;
              break;
            }
          }
          if (!found) {
             title = customExperiences[item.experience_id] || item.location_name || 'Experiencia';
          }
          return { ...item, experience_title: title, sub_item_title: subTitle };
        }
        return item;
      });

      // Fetch photos for these users and summits
      // Build a set of unique (user_id, summit_id) pairs to fetch photos for
      const pairSet = new Set<string>();
      combined.forEach(item => {
        const baseId = item.summit_id || item.experience_id;
        if (!item.user_id || !baseId) return;

        // If it's a sub-experience (mini-experiencias como Coliseo en exp-7-wonders),
        // summit_photos lo guarda como `${baseId}::${sub_item_id}`
        if (item.sub_item_id) {
          pairSet.add(`${item.user_id}|${baseId}::${item.sub_item_id}`);
        }
        pairSet.add(`${item.user_id}|${baseId}`);
      });
      const pairs = [...pairSet].map(p => { const [u, s] = p.split('|'); return { user_id: u, summit_id: s }; });
      
      let photosMap = new Map();
      let photosMapBySummit = new Map();
      if (pairs.length > 0) {
        // Batch in chunks of 30 pairs to avoid massive queries
        const BATCH_SIZE = 30;
        const allPhotos: any[] = [];
        for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
          const batch = pairs.slice(i, i + BATCH_SIZE);
          const batchUserIds = [...new Set(batch.map(p => p.user_id))];
          const batchSummitIds = [...new Set(batch.map(p => p.summit_id))];
          const { data: photosData } = await supabase
            .from('summit_photos')
            .select('id, user_id, summit_id, public_url, taken_on, caption')
            .in('user_id', batchUserIds)
            .in('summit_id', batchSummitIds);
          if (photosData) allPhotos.push(...photosData);
        }
          
        // Deduplicate photos by id (batches may return overlapping results)
        const seenIds = new Set<string>();
        const uniquePhotos = allPhotos.filter(p => {
          if (seenIds.has(p.id)) return false;
          seenIds.add(p.id);
          return true;
        });

        uniquePhotos.forEach(p => {
           // Key with exact date
           const key = `${p.user_id}_${p.summit_id}_${p.taken_on || ''}`;
           if (!photosMap.has(key)) photosMap.set(key, []);
           photosMap.get(key).push(p);

           // Also key by user and summit_id without date as fallback
           const summitKey = `${p.user_id}_${p.summit_id}`;
           if (!photosMapBySummit.has(summitKey)) photosMapBySummit.set(summitKey, []);
           photosMapBySummit.get(summitKey).push(p);
        });
      }

      // Attach photos to combined items
      combined.forEach(item => {
         const baseId = item.summit_id || item.experience_id;
         const targetId = item.sub_item_id ? `${baseId}::${item.sub_item_id}` : baseId;
         const recordDate = item.achieved_on || '';

         // 1. Match targetId (including sub_item_id) with exact date
         let matched = (targetId && recordDate) ? photosMap.get(`${item.user_id}_${targetId}_${recordDate}`) : null;

         // 2. If sub_item_id exists but not matched by date, try baseId with exact date
         if ((!matched || matched.length === 0) && baseId && baseId !== targetId && recordDate) {
           matched = photosMap.get(`${item.user_id}_${baseId}_${recordDate}`);
         }

         // 3. Fallback: match targetId without date
         if ((!matched || matched.length === 0) && targetId) {
           matched = photosMapBySummit.get(`${item.user_id}_${targetId}`);
         }

         // 4. Fallback: match baseId without date
         if ((!matched || matched.length === 0) && baseId) {
           matched = photosMapBySummit.get(`${item.user_id}_${baseId}`);
         }

         item.photos = matched || [];
      });
      


      globalCachedFeedItems = combined;
      globalFeedLastFetched = Date.now();
      setFeedItems(combined);
      setLoading(false);
      isFetchingFeed = false;
    }
    
    fetchFeed();
  }, [isActive]);

  return (
    <div className="feed-container">
      {/* Feed List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>Cargando novedades...</div>
      ) : feedItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>No hay actividad reciente para mostrar.</div>
      ) : (
        <div>
          {feedItems.map(item => (
            <FeedItemCard key={`${item.type}-${item.id}`} item={item} session={session} onAuthRequired={onAuthRequired} />
          ))}
        </div>
      )}
    </div>
  );
}
