import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { countries } from "@/data/countries";
import { peaks } from "@/data/peaks";

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

function FeedItemCard({ item, session, onAuthRequired }: { item: any, session: Session | null, onAuthRequired?: () => void }) {
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const photos: any[] = item.photos || [];
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

  useEffect(() => {
    async function loadInteractions() {
      if (!supabase) return;

      // Load Likes
      const { count } = await supabase
        .from('feed_likes')
        .select('*', { count: 'exact', head: true })
        .eq('entity_type', item.type)
        .eq('entity_id', item.id);
      
      setLikes(count || 0);

      const { count: cCount } = await supabase
        .from('feed_comments')
        .select('*', { count: 'exact', head: true })
        .eq('entity_type', item.type)
        .eq('entity_id', item.id);
      
      setCommentCount(cCount || 0);

      if (session) {
        const { data } = await supabase
          .from('feed_likes')
          .select('id')
          .eq('entity_type', item.type)
          .eq('entity_id', item.id)
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (data) setHasLiked(true);
      }
    }
    loadInteractions();
  }, [item, session]);

  const toggleLike = async () => {
    if (!session || !supabase) {
      if (onAuthRequired) onAuthRequired();
      return;
    }

    if (hasLiked) {
      setHasLiked(false);
      setLikes(prev => prev - 1);
      await supabase
        .from('feed_likes')
        .delete()
        .eq('entity_type', item.type)
        .eq('entity_id', item.id)
        .eq('user_id', session.user.id);
    } else {
      setHasLiked(true);
      setLikes(prev => prev + 1);
      await supabase
        .from('feed_likes')
        .insert({
          entity_type: item.type,
          entity_id: item.id,
          user_id: session.user.id
        });
    }
  };

  const loadComments = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('feed_comments')
      .select('id, user_id, comment, created_at, profiles!feed_comments_user_id_profiles_fkey(username, avatar_url)')
      .eq('entity_type', item.type)
      .eq('entity_id', item.id)
      .order('created_at', { ascending: true });
    
    if (data) setComments(data);
  };

  const handleToggleComments = () => {
    if (!showComments) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !supabase) {
      if (onAuthRequired) onAuthRequired();
      return;
    }
    if (!newComment.trim()) return;

    const commentText = newComment.trim();
    setNewComment("");

    const { data, error } = await supabase
      .from('feed_comments')
      .insert({
        entity_type: item.type,
        entity_id: item.id,
        user_id: session.user.id,
        comment: commentText
      })
      .select('id, user_id, comment, created_at, profiles!feed_comments_user_id_profiles_fkey(username, avatar_url)')
      .single();

    if (!error && data) {
      setComments(prev => [...prev, data]);
      setCommentCount(prev => prev + 1);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!session || !supabase) return;
    if (!window.confirm("¿Seguro que quieres eliminar este comentario?")) return;
    const { error } = await supabase.from('feed_comments').delete().eq('id', commentId).eq('user_id', session.user.id);
    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      setCommentCount(prev => Math.max(0, prev - 1));
    }
  };

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
  }

  let title = "ha completado una experiencia";
  if (item.type === "ascent") {
    title = isPeak ? "ha registrado una ascensión" : "ha visitado un país";
  }

  let displayTitle = finalLocationName;
  if (item.achieved_on && !isUnknownDate(item.achieved_on)) {
    displayTitle = `${finalLocationName}: ${format(new Date(item.achieved_on), "d MMM yyyy", { locale: es })}`;
  }


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
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
            {formatDateSafe((!item.achieved_on || isUnknownDate(item.achieved_on)) ? item.created_at : item.achieved_on)}
          </div>
        </div>
      </div>

      <div className="feed-card-body" style={{ paddingBottom: '12px', paddingTop: '0' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '18px', color: 'var(--pine)' }}>{displayTitle}</h3>
        {item.notes && (
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--ink)', lineHeight: '1.5' }}>
            {item.notes}
          </p>
        )}
      </div>

      {photos.length > 0 && (
        <div style={{ position: 'relative', width: '100%', marginBottom: '16px' }}>
          {photos.length === 1 ? (
            <img 
              src={photos[0].public_url} 
              onClick={() => setLightboxIndex(0)} 
              alt="Activity media" 
              className="feed-card-media" 
              style={{ width: '100%', height: '300px', objectFit: 'cover', cursor: 'pointer', borderRadius: '12px' }} 
            />
          ) : photos.length === 3 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '4px', borderRadius: '12px', overflow: 'hidden', height: '300px' }}>
              <div style={{ gridRow: '1 / span 2', gridColumn: '1', position: 'relative', width: '100%', height: '100%' }}>
                <img 
                  src={photos[0].public_url} 
                  onClick={() => setLightboxIndex(0)} 
                  alt="" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                />
              </div>
              <div style={{ gridRow: '1', gridColumn: '2', position: 'relative', width: '100%', height: '100%' }}>
                <img 
                  src={photos[1].public_url} 
                  onClick={() => setLightboxIndex(1)} 
                  alt="" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                />
              </div>
              <div style={{ gridRow: '2', gridColumn: '2', position: 'relative', width: '100%', height: '100%' }}>
                <img 
                  src={photos[2].public_url} 
                  onClick={() => setLightboxIndex(2)} 
                  alt="" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', borderRadius: '12px', overflow: 'hidden' }}>
              {photos.slice(0, 4).map((photo: any, index: number) => {
                const isLast = index === 3;
                const hasMore = photos.length > 4;
                return (
                  <div key={photo.id || index} style={{ position: 'relative', aspectRatio: '1', width: '100%' }}>
                    <img 
                      src={photo.public_url} 
                      onClick={() => setLightboxIndex(index)} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} 
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
                {photos.length > 1 && ` · ${lightboxIndex + 1} de ${photos.length}`}
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

      <div className="feed-card-footer">
        <button className={`interaction-btn ${hasLiked ? 'liked' : ''}`} onClick={toggleLike}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={hasLiked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          {likes > 0 ? likes : ''}
        </button>
        <button className="interaction-btn" onClick={handleToggleComments}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          {commentCount > 0 ? commentCount : 'Comentar'}
        </button>
      </div>

      {showComments && (
        <div style={{ padding: '0 16px 16px', background: '#fafafa', borderTop: '1px solid var(--line)' }}>
          {comments.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '16px', marginBottom: '16px' }}>
              {comments.map(comment => (
                <div key={comment.id} style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--pine)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0 }}>
                    {comment.profiles?.avatar_url ? (
                      <img src={comment.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      comment.profiles?.username?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: '13px', lineHeight: '1.4' }}>
                    <span style={{ fontWeight: 'bold', marginRight: '6px', color: 'var(--ink)' }}>{comment.profiles?.username}</span>
                    <span style={{ color: 'var(--ink)' }}>{comment.comment}</span>
                    <div style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#999' }}>{formatDateSafe(comment.created_at)}</span>
                    </div>
                  </div>
                  {session?.user?.id === comment.user_id && (
                    <button onClick={() => deleteComment(comment.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '4px', alignSelf: 'flex-start', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <form onSubmit={postComment} style={{ display: 'flex', gap: '8px', paddingTop: comments.length === 0 ? '16px' : '0' }}>
            <input 
              type="text" 
              placeholder="Añade un comentario..." 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onClick={() => { if (!session && onAuthRequired) onAuthRequired(); }}
              style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--line)', borderRadius: '20px', fontSize: '13px', outline: 'none' }}
            />
            <button type="submit" disabled={!newComment.trim()} style={{ background: 'none', border: 'none', color: 'var(--pine)', fontWeight: 'bold', fontSize: '13px', cursor: newComment.trim() ? 'pointer' : 'default', opacity: newComment.trim() ? 1 : 0.5 }}>
              Publicar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

let globalCachedFeedItems: any[] | null = null;
let globalLastSessionId: string | undefined = undefined;

export function FeedTab({ session, isActive = true, onAuthRequired }: { session: Session | null; isActive?: boolean; onAuthRequired?: () => void }) {
  const [loading, setLoading] = useState(!globalCachedFeedItems);
  const [feedItems, setFeedItems] = useState<any[]>(globalCachedFeedItems || []);

  useEffect(() => {
    if (!isActive) return;

    async function fetchFeed() {
      if (globalCachedFeedItems && globalLastSessionId === session?.user?.id) {
        setFeedItems(globalCachedFeedItems);
        setLoading(false);
        return;
      }
      if (!supabase) return;
      setLoading(true);

      const limit = 200;
      let ascents: any[] = [];
      let expRecords: any[] = [];
      let fetchError = null;

      // Fetch ascents
      const { data: ascData, error: ascErr } = await supabase
        .from("ascents")
        .select("id, user_id, summit_id, created_at, achieved_on, notes, profiles!ascents_user_id_profiles_fkey(username, avatar_url, is_public)")
        .eq('is_wishlist', false)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (ascErr) fetchError = ascErr.message;
      if (ascData) {
        ascents = ascData.filter((a: any) => !(a.summit_id || '').toLowerCase().startsWith('region-'));
      }

      // Fetch experiences
      const { data: expData, error: expErr } = await supabase
        .from("experience_records")
        .select("id, user_id, experience_id, created_at, achieved_on, notes, location_name, profiles!experience_records_user_id_profiles_fkey(username, avatar_url, is_public)")
        .eq('is_wishlist', false)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (expErr && !fetchError) fetchError = expErr.message;
      if (expData) expRecords = expData;

      if (fetchError) {
        setFeedItems([{ type: 'error', notes: fetchError, id: 'error-1' }]);
        setLoading(false);
        return;
      }

      // Combinar y ordenar - filtrar items sin fecha válida
      // Los registros con fecha desconocida (p. ej. 31 dic 1899 / 1900-01-01) se posicionan según su fecha de registro (created_at)
      const combined = [
        ...ascents.map(a => ({
          ...a,
          type: "ascent",
          record_date: (!a.achieved_on || isUnknownDate(a.achieved_on)) ? a.created_at : a.achieved_on
        })),
        ...expRecords.map(e => ({
          ...e,
          type: "experience",
          record_date: (!e.achieved_on || isUnknownDate(e.achieved_on)) ? e.created_at : e.achieved_on
        }))
      ].filter(item => item.record_date && !isNaN(new Date(item.record_date).getTime()))
       .sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime())
       .slice(0, limit);

      // Fetch photos for these users and summits
      const userIds = [...new Set(combined.map(item => item.user_id))];
      const summitIds = [...new Set(combined.map(item => item.summit_id || item.experience_id))];
      
      let photosMap = new Map();
      if (userIds.length > 0 && summitIds.length > 0) {
        const { data: photosData, error: photosError } = await supabase
          .from('summit_photos')
          .select('id, user_id, summit_id, public_url, taken_on, caption')
          .in('user_id', userIds)
          .in('summit_id', summitIds);
          
        console.log("Photos Data:", photosData, "Photos Error:", photosError);
          
        if (photosData) {
          photosData.forEach(p => {
             const key = `${p.user_id}_${p.summit_id}_${p.taken_on || ''}`;
             if (!photosMap.has(key)) photosMap.set(key, []);
             photosMap.get(key).push(p);
          });
        }
      }

      // Attach photos to combined items
      combined.forEach(item => {
         const id = item.summit_id || item.experience_id;
         const recordDate = item.achieved_on || '';
         const key = `${item.user_id}_${id}_${recordDate}`;
         item.photos = photosMap.get(key) || [];
      });
      
      console.log("Photos Map:", photosMap);
      console.log("Items with photos:", combined.filter(c => c.photos && c.photos.length > 0));

      globalCachedFeedItems = combined;
      globalLastSessionId = session?.user?.id;
      setFeedItems(combined);
      setLoading(false);
    }
    
    fetchFeed();
  }, [session, isActive]);

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
