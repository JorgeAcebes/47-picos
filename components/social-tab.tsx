"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { AuthDialog } from "./auth-dialog";
import { IconLogo } from "./icons";
import { ProfileSettings } from "./profile-settings";
import { ConfirmModal } from "./confirm-modal";
import { FeedTab } from "./feed-tab";
import { countries } from "@/data/countries";
import { peaks } from "@/data/peaks";
import { predefinedCategories } from "@/data/experiences";

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_public: boolean;
};

type ConnectionStatus = 'pending' | 'accepted' | null;

export function SocialTab({ onNavigate, isActive = true }: { onNavigate?: (tab: string) => void, isActive?: boolean }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState<"login" | "register" | false>(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [mapLink, setMapLink] = useState("/");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [recommended, setRecommended] = useState<Profile[]>([]);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState<'feed' | 'discover' | 'followers' | 'following'>('feed');
  const [announcements, setAnnouncements] = useState<any[]>([]);
  
  const [progressCounts, setProgressCounts] = useState({ countries: 0, peaks: 0, experiences: 0 });
  const [totalCounts, setTotalCounts] = useState({ countries: 196, peaks: 47, experiences: 0 });
  
  // A mapping of profile id to connection status
  const [connections, setConnections] = useState<Record<string, ConnectionStatus>>({});
  const [followerStatuses, setFollowerStatuses] = useState<Record<string, ConnectionStatus>>({});
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  
  const hasPendingRequests = myProfile && !myProfile.is_public && Object.values(followerStatuses).includes('pending');
  
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => setSession(nextSession),
    );
    
    if (typeof window !== "undefined") {
      let stored = localStorage.getItem("last_map_path") || "/";
      if (stored !== "/" && stored !== "/picos") stored = "/";
      setMapLink(stored);
    }
    
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isActive) return;
    if (session && !profileOpen) {
      supabase?.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
        if (data) setMyProfile(data);
      });
    }
  }, [session, profileOpen, isActive]);

  useEffect(() => {
    if (!isActive || !session || !supabase) return;
    
    async function fetchConnections() {
      // Fetch who I am following
      const { data: followingConns } = await supabase!
        .from('connections')
        .select('following_id, status')
        .eq('follower_id', session!.user.id);
        
      if (followingConns) {
        const connMap: Record<string, ConnectionStatus> = {};
        for (const conn of followingConns) {
          connMap[conn.following_id] = conn.status;
        }
        setConnections(connMap);
        
        // Fetch profiles for following
        const followingIds = followingConns.map(c => c.following_id);
        if (followingIds.length > 0) {
          const { data: followingProfiles } = await supabase!
            .from('profiles')
            .select('*')
            .in('id', followingIds);
          if (followingProfiles) setFollowing(followingProfiles);
        }
      }

      // Fetch my followers
      const { data: followerConns } = await supabase!
        .from('connections')
        .select('follower_id, status')
        .eq('following_id', session!.user.id);
        
      if (followerConns) {
        const followerIds = followerConns.map(c => c.follower_id);
        
        const fStatusMap: Record<string, ConnectionStatus> = {};
        for (const conn of followerConns) {
          fStatusMap[conn.follower_id] = conn.status;
        }
        setFollowerStatuses(fStatusMap);

        if (followerIds.length > 0) {
          const { data: followerProfiles } = await supabase!
            .from('profiles')
            .select('*')
            .in('id', followerIds);
          if (followerProfiles) setFollowers(followerProfiles);
        }
      }
    }
    
    async function fetchRecommended() {
      const { data: recData } = await supabase!.rpc('get_recommended_profiles');
      
      const { data: pubData } = await supabase!
        .from('profiles')
        .select('*')
        .eq('is_public', true)
        .neq('id', session!.user.id)
        .limit(10);
        
      const combined = [...(recData || [])];
      if (pubData) {
        for (const p of pubData) {
          if (!combined.find(x => x.id === p.id)) {
            combined.push(p);
          }
        }
      }
      setRecommended(combined);
    }
    
    async function fetchProgress() {
      if (!session) return;
      const { data: ascData } = await supabase!.from('ascents').select('summit_id').eq('user_id', session.user.id).eq('is_wishlist', false);
      const { count: expCount } = await supabase!.from('experience_records').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('is_wishlist', false);
      
      let pCount = 0;
      let cCount = 0;
      
      if (ascData) {
        const countryIds = new Set(countries.map(c => c.id));
        const peakIds = new Set(peaks.map(p => p.id));
        
        const uniqueSummits = new Set(ascData.map(a => a.summit_id));
        
        for (const summit_id of uniqueSummits) {
          if (countryIds.has(summit_id)) cCount++;
          if (peakIds.has(summit_id)) pCount++;
        }
      }
      
      setProgressCounts({
        countries: cCount,
        peaks: pCount,
        experiences: expCount || 0
      });
      setTotalCounts({
        countries: countries.length,
        peaks: peaks.length,
        experiences: predefinedCategories.reduce((acc, cat) => acc + cat.experiences.length, 0)
      });
    }

    fetchConnections();
    fetchRecommended();
    fetchProgress();
  }, [session, isActive]);

  useEffect(() => {
    if (!supabase || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const cleanSearchQuery = searchQuery.replace(/^@/, '');
    const delay = setTimeout(async () => {
      const { data } = await supabase!
        .from("profiles")
        .select("*")
        .ilike("username", `%${cleanSearchQuery}%`)
        .limit(20);
      if (data) setSearchResults(data);
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  async function connect(profileId: string, isPublic: boolean) {
    if (!session || !supabase) return;
    
    const newStatus = isPublic ? 'accepted' : 'pending';
    const { error } = await supabase
      .from('connections')
      .insert({
        follower_id: session.user.id,
        following_id: profileId,
        status: newStatus
      });
      
    if (!error) {
      setConnections(prev => ({ ...prev, [profileId]: newStatus }));
      const profileToAdd = searchResults.find(p => p.id === profileId) || 
                           recommended.find(p => p.id === profileId) || 
                           followers.find(p => p.id === profileId);
      if (profileToAdd && !following.find(p => p.id === profileId)) {
        setFollowing(prev => [...prev, profileToAdd]);
      }
    }
  }

  function unfollow(profileId: string, username: string) {
    setConfirmConfig({
      isOpen: true,
      message: `¿Quieres dejar de seguir a @${username}?`,
      onConfirm: () => performUnfollow(profileId),
    });
  }

  async function performUnfollow(profileId: string) {
    if (!session || !supabase) return;
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('follower_id', session.user.id)
      .eq('following_id', profileId);
      
    if (!error) {
      setConnections(prev => {
        const next = { ...prev };
        delete next[profileId];
        return next;
      });
      setFollowing(prev => prev.filter(p => p.id !== profileId));
    }
  }

  async function acceptRequest(profileId: string) {
    if (!session || !supabase) return;
    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('follower_id', profileId)
      .eq('following_id', session.user.id);
      
    if (!error) {
      setFollowerStatuses(prev => ({ ...prev, [profileId]: 'accepted' }));
    }
  }

  async function rejectRequest(profileId: string) {
    if (!session || !supabase) return;
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('follower_id', profileId)
      .eq('following_id', session.user.id);
      
    if (!error) {
      setFollowerStatuses(prev => {
        const next = { ...prev };
        delete next[profileId];
        return next;
      });
      setFollowers(prev => prev.filter(p => p.id !== profileId));
    }
  }

  function removeFollower(profileId: string, username: string) {
    setConfirmConfig({
      isOpen: true,
      message: `¿Quieres eliminar a @${username} de tus seguidores?`,
      onConfirm: () => performRemoveFollower(profileId),
    });
  }

  async function performRemoveFollower(profileId: string) {
    if (!session || !supabase) return;
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('follower_id', profileId)
      .eq('following_id', session.user.id);
      
    if (!error) {
      setFollowerStatuses(prev => {
        const next = { ...prev };
        delete next[profileId];
        return next;
      });
      setFollowers(prev => prev.filter(p => p.id !== profileId));
    }
  }

  function renderProfileItem(profile: Profile, context: 'discover' | 'followers' | 'following') {
    const isMe = session?.user.id === profile.id;
    const followingStatus = connections[profile.id];
    const followerStatus = followerStatuses[profile.id];
    const isPendingFollower = context === 'followers' && followerStatus === 'pending';
    
    return (
      <div key={profile.id} className={`peak-list-item ${isPendingFollower ? 'shake-once' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', marginBottom: '0.5rem', background: '#fff', borderRadius: '8px' }}>
        <Link href={`/perfil/${profile.username}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
            {profile.avatar_url ? (
               <img src={profile.avatar_url} alt={profile.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
               profile.username.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div style={{ fontWeight: 'bold' }}>@{profile.username}</div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>{profile.is_public ? 'Público' : 'Privado'}</div>
          </div>
        </Link>
        
        {!isMe && session && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {context === 'followers' ? (
              followerStatus === 'pending' ? (
                <>
                  <button className="button button--green" onClick={() => acceptRequest(profile.id)}>Aceptar</button>
                  <button className="button button--outline" onClick={() => rejectRequest(profile.id)}>Rechazar</button>
                </>
              ) : (
                <button className="button button--outline" onClick={() => removeFollower(profile.id, profile.username)}>Eliminar</button>
              )
            ) : (
              followingStatus === 'accepted' ? (
                <button className="button button--outline" onClick={() => unfollow(profile.id, profile.username)}>Siguiendo</button>
              ) : followingStatus === 'pending' ? (
                <button className="button button--outline" onClick={() => unfollow(profile.id, profile.username)}>Pendiente</button>
              ) : (
                <button className="button button--purple" onClick={() => connect(profile.id, profile.is_public)}>Conectar</button>
              )
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href={mapLink} onClick={(e) => { if (onNavigate) { e.preventDefault(); let currentMap = localStorage.getItem("last_map_path") || "/"; if (currentMap !== "/" && currentMap !== "/picos") currentMap = "/"; onNavigate(currentMap); }}}>
          <IconLogo className="brand-icon" />
          <span className="brand-text" style={{ marginLeft: 8, fontWeight: 700 }}>
            {mapLink === "/picos" ? "47" : "196"} <span style={{ fontWeight: 400 }}>{mapLink === "/picos" ? "PICOS" : "PAÍSES"}</span>
          </span>
        </a>
        <nav>
          <a href={mapLink} onClick={(e) => { if (onNavigate) { e.preventDefault(); let currentMap = localStorage.getItem("last_map_path") || "/"; if (currentMap !== "/" && currentMap !== "/picos") currentMap = "/"; onNavigate(currentMap); }}} onMouseEnter={() => { import('./summit-tracker'); }}>Mapa</a>
          <a href="/social" style={{ fontWeight: 'bold', position: 'relative' }} onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate("/social"); }}}>
            Social
            {hasPendingRequests ? (
              <span 
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('followers');
                }}
                style={{ 
                  position: 'absolute', 
                  top: '0', 
                  right: '-10px', 
                  width: '8px', 
                  height: '8px', 
                  backgroundColor: 'red', 
                  borderRadius: '50%',
                  cursor: 'pointer'
                }} 
              />
            ) : null}
          </a>
          <a href="/ranking" onClick={(e) => { if (onNavigate) { e.preventDefault(); onNavigate("/ranking"); } }} onMouseEnter={() => { import('./ranking-tab'); }}>Ranking</a>
          {session ? (
            <button className="account-button" onClick={() => setProfileOpen(true)}>
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="Mi Perfil" className="account-avatar" style={{ objectFit: "cover" }} />
              ) : (
                <span className="account-avatar">
                  {myProfile?.username?.slice(0, 1).toUpperCase() || session.user.email?.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span>{myProfile?.username || session.user.email?.split("@")[0]}</span>
            </button>
          ) : (
            <button className="button button--outline" onClick={() => setAuthOpen("login")}>
              Entrar
            </button>
          )}
        </nav>
      </header>

      <section className="social-grid-layout page-container" style={{ paddingBottom: '70px', paddingLeft: '24px', paddingRight: '24px' }}>
        
        {/* Left Sidebar (Desktop only) */}
        <div className="sidebar-left">
          {session && myProfile ? (
            <>
              {/* Desktop Profile Card */}
              <div className="hide-on-mobile" style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => onNavigate?.('profile')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="profile-avatar-container" style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--pine)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
                    {myProfile.avatar_url ? (
                      <img src={myProfile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      myProfile.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '18px' }}>@{myProfile.username}</h3>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: 'var(--ink)' }}>
                      <div onClick={(e) => { e.stopPropagation(); setActiveTab('followers'); }} style={{ cursor: 'pointer' }}><span style={{ fontWeight: 'bold' }}>{followers.length}</span> seguidores</div>
                      <div onClick={(e) => { e.stopPropagation(); setActiveTab('following'); }} style={{ cursor: 'pointer' }}><span style={{ fontWeight: 'bold' }}>{following.length}</span> siguiendo</div>
                    </div>
                  </div>
                </div>

                {(progressCounts.countries > 0 || progressCounts.peaks > 0 || progressCounts.experiences > 0) && (
                  <div className="profile-stats-row" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    {progressCounts.countries > 0 && (
                      <div className="profile-stats-col" style={{ textAlign: 'center' }}>
                        <div className="profile-stats-val" style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--pine)' }}>{progressCounts.countries}/{totalCounts.countries}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Países</div>
                      </div>
                    )}
                    {progressCounts.peaks > 0 && (
                      <div className="profile-stats-col" style={{ textAlign: 'center' }}>
                        <div className="profile-stats-val" style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--pine)' }}>{progressCounts.peaks}/{totalCounts.peaks}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Picos</div>
                      </div>
                    )}
                    {progressCounts.experiences > 0 && (
                      <div className="profile-stats-col" style={{ textAlign: 'center' }}>
                        <div className="profile-stats-val" style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--pine)' }}>{progressCounts.experiences}/{totalCounts.experiences}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Experiencias</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', border: '1px solid var(--line)', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 8px' }}>Únete a la comunidad</h3>
              <p style={{ margin: '0 0 16px', fontSize: '14px', color: 'var(--muted)' }}>Conecta con otros usuarios y descubre sus experiencias.</p>
              <button className="button button--green button--wide" onClick={() => setAuthOpen("login")}>Iniciar sesión</button>
            </div>
          )}

          <div className="sidebar-nav-desktop" style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '16px' }}>
            <button className={`social-nav-btn ${activeTab === 'feed' ? 'active' : ''}`} onClick={() => setActiveTab('feed')}>
              Novedades
            </button>
            <button className={`social-nav-btn ${activeTab === 'discover' ? 'active' : ''}`} onClick={() => setActiveTab('discover')}>
              Descubrir
            </button>
            <button className={`social-nav-btn ${activeTab === 'followers' ? 'active' : ''}`} onClick={() => setActiveTab('followers')}>
              Seguidores
              {hasPendingRequests && <span style={{ width: 8, height: 8, background: 'red', borderRadius: '50%' }} />}
            </button>
            <button className={`social-nav-btn ${activeTab === 'following' ? 'active' : ''}`} onClick={() => setActiveTab('following')}>
              Siguiendo
            </button>
          </div>
        </div>

        {/* Main Feed Area */}
        <div className="feed-main">
          {/* Mobile Profile Card (Condensed) */}
          {session && myProfile && (
            <div className="hide-on-desktop" style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid var(--line)', cursor: 'pointer', marginBottom: '20px' }} onClick={() => onNavigate?.('profile')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--pine)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 'bold' }}>
                  {myProfile.avatar_url ? (
                    <img src={myProfile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    myProfile.username.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>@{myProfile.username}</h3>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: 'var(--ink)' }}>
                    <div onClick={(e) => { e.stopPropagation(); setActiveTab('followers'); }} style={{ cursor: 'pointer' }}><span style={{ fontWeight: 'bold' }}>{followers.length}</span> seguidores</div>
                    <div onClick={(e) => { e.stopPropagation(); setActiveTab('following'); }} style={{ cursor: 'pointer' }}><span style={{ fontWeight: 'bold' }}>{following.length}</span> siguiendo</div>
                  </div>
                </div>
              </div>
              {(progressCounts.countries > 0 || progressCounts.peaks > 0 || progressCounts.experiences > 0) && (
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-around', gap: '8px' }}>
                  {progressCounts.countries > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--pine)' }}>{progressCounts.countries}/{totalCounts.countries}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Países</div>
                    </div>
                  )}
                  {progressCounts.peaks > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--pine)' }}>{progressCounts.peaks}/{totalCounts.peaks}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Picos</div>
                    </div>
                  )}
                  {progressCounts.experiences > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--pine)' }}>{progressCounts.experiences}/{totalCounts.experiences}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Experiencias</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Mobile Horizontal Navigation */}
          <div className="social-mobile-nav" style={{ display: "flex", gap: "10px", marginBottom: "20px", alignItems: "center", overflowX: "auto", paddingBottom: "4px" }}>
            <button className={`button ${activeTab === 'feed' ? 'button--green' : 'button--outline'}`} style={{ flex: 1, whiteSpace: "nowrap" }} onClick={() => setActiveTab('feed')}>Novedades</button>
            <button className={`button ${activeTab === 'discover' ? 'button--green' : 'button--outline'}`} style={{ flex: 1, whiteSpace: "nowrap" }} onClick={() => setActiveTab('discover')}>Descubrir</button>
            <button className={`button ${activeTab === 'followers' ? 'button--green' : 'button--outline'}`} style={{ flex: 1, position: 'relative', whiteSpace: "nowrap" }} onClick={() => setActiveTab('followers')}>
              Seguidores
              {hasPendingRequests && <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', backgroundColor: 'red', borderRadius: '50%' }} />}
            </button>
            <button className={`button ${activeTab === 'following' ? 'button--green' : 'button--outline'}`} style={{ flex: 1, whiteSpace: "nowrap" }} onClick={() => setActiveTab('following')}>Siguiendo</button>
          </div>

          {activeTab === 'feed' && (
            <div style={{ maxWidth: '700px', margin: '0 auto', width: '100%' }}>
              <FeedTab session={session} isActive={isActive} onAuthRequired={() => setAuthOpen("login")} />
            </div>
          )}

        {activeTab === 'discover' && (
          <>
            <input 
              type="search"
              placeholder="Buscar por @usuario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', marginBottom: '1rem' }}
            />

            {searchQuery.length >= 2 ? (
              <div>
                <h3>Resultados de búsqueda</h3>
                {searchResults.length > 0 ? (
                  searchResults.map(p => renderProfileItem(p, 'discover'))
                ) : (
                  <p>No se encontraron usuarios.</p>
                )}
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: "0.25rem" }}>
                  <button
                    onClick={async () => {
                      try {
                        if (navigator.share) {
                          await navigator.share({
                            title: '196 Países',
                            text: '¡Únete a 196 Países y registra cada uno de los países que visitas!',
                            url: window.location.origin
                          });
                        } else {
                          await navigator.clipboard.writeText(window.location.origin);
                          alert('Enlace copiado al portapapeles');
                        }
                      } catch (err) {
                        console.error('Error compartiendo:', err);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--pine)',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    Comparte la aplicación
                  </button>
                </div>
                <h3>Recomendados para ti</h3>
                {session ? (
                  recommended.filter(p => p.id !== session.user.id && !connections[p.id]).length > 0 ? (
                    recommended.filter(p => p.id !== session.user.id && !connections[p.id]).map(p => renderProfileItem(p, 'discover'))
                  ) : (
                    <p>No hay recomendaciones por ahora. ¡Busca y conecta con tus primeros amigos!</p>
                  )
                ) : (
                  <p>Inicia sesión para ver recomendaciones basadas en tus conexiones.</p>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'followers' && (
          <div>
            <h3>Tus Seguidores</h3>
            {session ? (
              followers.length > 0 ? (
                followers.map(p => renderProfileItem(p, 'followers'))
              ) : (
                <p>Aún no tienes seguidores.</p>
              )
            ) : (
              <p>Inicia sesión para ver tus seguidores.</p>
            )}
          </div>
        )}

        {activeTab === 'following' && (
          <div>
            <h3>Siguiendo</h3>
            {session ? (
              following.length > 0 ? (
                following.map(p => renderProfileItem(p, 'following'))
              ) : (
                <p>No sigues a nadie todavía.</p>
              )
            ) : (
              <p>Inicia sesión para ver a quién sigues.</p>
            )}
          </div>
        )}
        </div>

        {/* Right Sidebar (Desktop only) */}
        <div className="sidebar-right">
          {announcements.length > 0 && (
            <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', padding: '20px', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                Anuncio
              </h4>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{announcements[0].message}</p>
              {announcements[0].link && (
                <a href={announcements[0].link} style={{ display: 'inline-block', marginTop: '12px', color: '#4338ca', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none' }}>Saber más &rarr;</a>
              )}
            </div>
          )}
        </div>
      </section>
      
      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} initialTab={authOpen === "login" ? "login" : "register"} />}
      {profileOpen && session && <ProfileSettings session={session} onClose={() => setProfileOpen(false)} />}
      <ConfirmModal
        isOpen={!!confirmConfig?.isOpen}
        message={confirmConfig?.message || ""}
        onConfirm={() => {
          if (confirmConfig?.onConfirm) confirmConfig.onConfirm();
          setConfirmConfig(null);
        }}
        onCancel={() => setConfirmConfig(null)}
      />
    </main>
  );
}
