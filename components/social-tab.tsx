"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { AuthDialog } from "./auth-dialog";
import { ProfileSettings } from "./profile-settings";

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_public: boolean;
};

type ConnectionStatus = 'pending' | 'accepted' | null;

export function SocialTab() {
  const [session, setSession] = useState<Session | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [mapLink, setMapLink] = useState("/");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [recommended, setRecommended] = useState<Profile[]>([]);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState<'discover' | 'followers' | 'following'>('discover');
  
  // A mapping of profile id to connection status
  const [connections, setConnections] = useState<Record<string, ConnectionStatus>>({});
  const [followerStatuses, setFollowerStatuses] = useState<Record<string, ConnectionStatus>>({});
  
  const hasPendingRequests = Object.values(followerStatuses).includes('pending');
  
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => setSession(nextSession),
    );
    
    if (typeof window !== "undefined") {
      setMapLink(localStorage.getItem("last_map_path") || "/");
    }
    
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && !profileOpen) {
      supabase?.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
        if (data) setMyProfile(data);
      });
    }
  }, [session, profileOpen]);

  useEffect(() => {
    if (!session || !supabase) return;
    
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
    
    fetchConnections();
    fetchRecommended();
  }, [session]);

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

  async function unfollow(profileId: string, username: string) {
    if (!window.confirm(`¿Quieres dejar de seguir a @${username}?`)) return;
    
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

  async function removeFollower(profileId: string, username: string) {
    if (!window.confirm(`¿Quieres eliminar a @${username} de tus seguidores?`)) return;
    
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
    
    return (
      <div key={profile.id} className="peak-list-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', marginBottom: '0.5rem', background: '#fff', borderRadius: '8px' }}>
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
        <Link className="brand" href={mapLink}>
          <img src="/icon.svg" alt="Logo" width={32} height={32} style={{ filter: "brightness(0)" }} />
        </Link>
        <nav>
          <Link href={mapLink}>Mapa</Link>
          <Link href="/social" style={{ fontWeight: 'bold', position: 'relative' }}>
            Social
            {hasPendingRequests && (
              <span style={{ 
                position: 'absolute', 
                top: '0', 
                right: '-10px', 
                width: '8px', 
                height: '8px', 
                backgroundColor: 'red', 
                borderRadius: '50%' 
              }} />
            )}
          </Link>
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
              <small>Perfil</small>
            </button>
          ) : (
            <button className="button button--outline" onClick={() => setAuthOpen(true)}>
              Entrar
            </button>
          )}
        </nav>
      </header>

      <section className="peak-list-section" style={{ paddingTop: '80px', maxWidth: '800px', margin: '0 auto' }}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">RED SOCIAL</span>
            <h2>Encuentra a otros usuarios</h2>
            <p>Busca usuarios y conecta con ellos para ver sus progresos.</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button className={`button ${activeTab === 'discover' ? 'button--green' : 'button--outline'}`} style={{ flex: 1 }} onClick={() => setActiveTab('discover')}>Descubrir</button>
          <button className={`button ${activeTab === 'followers' ? 'button--green' : 'button--outline'}`} style={{ flex: 1 }} onClick={() => setActiveTab('followers')}>Seguidores</button>
          <button className={`button ${activeTab === 'following' ? 'button--green' : 'button--outline'}`} style={{ flex: 1 }} onClick={() => setActiveTab('following')}>Siguiendo</button>
        </div>

        {activeTab === 'discover' && (
          <>
            <input 
              type="search"
              placeholder="Buscar por @usuario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', marginBottom: '2rem' }}
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
                <h3>Recomendados para ti</h3>
                {session ? (
                  recommended.length > 0 ? (
                    recommended.map(p => renderProfileItem(p, 'discover'))
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
      </section>
      
      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} />}
      {profileOpen && session && <ProfileSettings session={session} onClose={() => setProfileOpen(false)} />}
    </main>
  );
}
