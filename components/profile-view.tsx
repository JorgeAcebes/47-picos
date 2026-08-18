"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SummitTracker } from "./summit-tracker";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { AuthDialog } from "./auth-dialog";

type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_public: boolean;
};

export function ProfileView({ username }: { username: string }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [error, setError] = useState("");
  const [mapLink, setMapLink] = useState("/");
  const [mode, setMode] = useState<"peaks" | "countries">("countries");

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
    if (!supabase) return;
    async function loadData() {
      // 1. Fetch profile by username
      const { data: profileData, error: profileError } = await supabase!
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (profileError || !profileData) {
        setError("Usuario no encontrado.");
        setLoading(false);
        return;
      }
      setProfile(profileData);

      // 2. Determine access
      if (profileData.is_public) {
        setAccess(true);
      } else if (session && session.user.id === profileData.id) {
        // Own profile
        setAccess(true);
      } else if (session) {
        // Check connection
        const { data: connData } = await supabase!
          .from("connections")
          .select("status")
          .eq("follower_id", session.user.id)
          .eq("following_id", profileData.id)
          .single();

        if (connData) {
          setConnectionStatus(connData.status);
          if (connData.status === "accepted") {
            setAccess(true);
          }
        }
      }
      setLoading(false);
    }
    loadData();
  }, [username, session]);

  async function connect() {
    if (!session || !supabase || !profile) {
      setAuthOpen(true);
      return;
    }
    const newStatus = profile.is_public ? 'accepted' : 'pending';
    const { error } = await supabase
      .from('connections')
      .insert({
        follower_id: session.user.id,
        following_id: profile.id,
        status: newStatus
      });
      
    if (!error) {
      setConnectionStatus(newStatus);
      if (newStatus === "accepted") setAccess(true);
    }
  }

  if (loading) return <div style={{ padding: "4rem", textAlign: "center" }}>Cargando perfil...</div>;

  if (error || !profile) return (
    <div style={{ padding: "4rem", textAlign: "center" }}>
      <h2>{error}</h2>
      <Link href="/social" className="button button--outline">Volver a Social</Link>
    </div>
  );

  if (!access) {
    return (
      <main>
        <header className="topbar">
          <Link className="brand" href={mapLink}>
            <img src="/icon.svg" alt="Logo" width={32} height={32} style={{ filter: "brightness(0)" }} />
          </Link>
          <nav>
            <Link href={mapLink}>Mapa</Link>
            <Link href="/social">Social</Link>
            <Link href="/ranking">Ranking</Link>
          </nav>
        </header>

        <section style={{ paddingTop: '120px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: '#ccc', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', color: 'white', fontWeight: 'bold' }}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              profile.username.charAt(0).toUpperCase()
            )}
          </div>
          <h2>@{profile.username}</h2>
          
          <div style={{ padding: "2rem", background: "#f5f5f5", borderRadius: "12px", marginTop: "2rem" }}>
            <h3 style={{ marginBottom: "1rem" }}>Este perfil es privado</h3>
            <p style={{ color: "#666", marginBottom: "1.5rem" }}>
              Conecta con @{profile.username} para ver su mapa, sus ascensiones y fotos.
            </p>
            {connectionStatus === "pending" ? (
              <button className="button button--outline" disabled>Solicitud pendiente</button>
            ) : (
              <button className="button button--purple" onClick={connect}>Conectar</button>
            )}
          </div>
        </section>

        {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} />}
      </main>
    );
  }

  return (
    <SummitTracker mode={mode} onSwitchMode={setMode} targetProfile={{ id: profile.id, username: profile.username }} />
  );
}
