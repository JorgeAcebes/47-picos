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
  const [mapLink, setMapLink] = useState("/");
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [recommended, setRecommended] = useState<Profile[]>([]);
  
  // A mapping of profile id to connection status
  const [connections, setConnections] = useState<Record<string, ConnectionStatus>>({});
  
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
    if (!session || !supabase) return;
    
    async function fetchConnections() {
      const { data } = await supabase!
        .from('connections')
        .select('following_id, status')
        .eq('follower_id', session!.user.id);
        
      if (data) {
        const connMap: Record<string, ConnectionStatus> = {};
        for (const conn of data) {
          connMap[conn.following_id] = conn.status;
        }
        setConnections(connMap);
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
    const delay = setTimeout(async () => {
      const { data } = await supabase!
        .from("profiles")
        .select("*")
        .ilike("username", `%${searchQuery}%`)
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
    }
  }

  function renderProfileItem(profile: Profile) {
    const isMe = session?.user.id === profile.id;
    const status = connections[profile.id];
    
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
          <div>
            {status === 'accepted' ? (
              <button className="button button--outline" disabled>Siguiendo</button>
            ) : status === 'pending' ? (
              <button className="button button--outline" disabled>Pendiente</button>
            ) : (
              <button className="button button--purple" onClick={() => connect(profile.id, profile.is_public)}>Conectar</button>
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
          <Link href="/social" style={{ fontWeight: 'bold' }}>Social</Link>
          {session ? (
            <button className="account-button" onClick={() => setProfileOpen(true)}>
              <span className="account-avatar">
                {session.user.email?.slice(0, 1).toUpperCase()}
              </span>
              <span>{session.user.email?.split("@")[0]}</span>
              <small>Perfil</small>
            </button>
          ) : (
            <button className="button button--outline" onClick={() => setAuthOpen(true)}>
              Entrar / Registrarme
            </button>
          )}
        </nav>
      </header>

      <section className="peak-list-section" style={{ paddingTop: '80px', maxWidth: '800px', margin: '0 auto' }}>
        <div className="section-heading">
          <div>
            <span className="eyebrow">RED SOCIAL</span>
            <h2>Encuentra a otros montañeros</h2>
            <p>Busca usuarios y conecta con ellos para ver sus progresos.</p>
          </div>
        </div>

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
              searchResults.map(renderProfileItem)
            ) : (
              <p>No se encontraron usuarios.</p>
            )}
          </div>
        ) : (
          <div>
            <h3>Recomendados para ti</h3>
            {session ? (
              recommended.length > 0 ? (
                recommended.map(renderProfileItem)
              ) : (
                <p>No hay recomendaciones por ahora. ¡Busca y conecta con tus primeros amigos!</p>
              )
            ) : (
              <p>Inicia sesión para ver recomendaciones basadas en tus conexiones.</p>
            )}
          </div>
        )}
      </section>
      
      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} />}
      {profileOpen && session && <ProfileSettings session={session} onClose={() => setProfileOpen(false)} />}
    </main>
  );
}
