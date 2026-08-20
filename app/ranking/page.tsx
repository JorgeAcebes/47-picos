"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import Link from "next/link";
import { countries } from "@/data/countries";
import "./ranking.css";

type RankingEntry = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  ascents_count: number;
};

type ContinentFilter = "Todos" | "África" | "América" | "Asia" | "Europa" | "Oceanía";
type ScopeFilter = "all" | "following";
type ModeFilter = "countries" | "peaks";

export default function RankingPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [mode, setMode] = useState<ModeFilter>("countries");
  const [scope, setScope] = useState<ScopeFilter>("all");
  
  const [mapLink, setMapLink] = useState("/");
  const [totalUsersCount, setTotalUsersCount] = useState<number>(0);
  const [myProfile, setMyProfile] = useState<{username: string, avatar_url: string | null} | null>(null);

  useEffect(() => {
    if (session) {
      supabase?.from("profiles").select("username, avatar_url").eq("id", session.user.id).single().then(({ data }) => {
        if (data) setMyProfile(data);
      });
    }
  }, [session]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => setSession(nextSession),
    );
    
    if (typeof window !== "undefined") {
      setMapLink(localStorage.getItem("last_map_path") || "/");
      const savedMode = localStorage.getItem("ranking_mode") as ModeFilter | null;
      if (savedMode === "countries" || savedMode === "peaks") setMode(savedMode);
      
      const savedScope = localStorage.getItem("ranking_scope") as ScopeFilter | null;
      if (savedScope === "all" || savedScope === "following") setScope(savedScope);
    }
    
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchTotalUsers() {
      if (!supabase) return;
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      if (count !== null) setTotalUsersCount(count);
    }
    fetchTotalUsers();
  }, []);

  useEffect(() => {
    async function fetchRanking() {
      setLoading(true);
      try {
        let summitIds: string[] | null = null;

        const { data, error } = await supabase!.rpc("get_user_ranking", {
          p_summit_ids: summitIds,
          p_following_only: scope === "following",
          p_follower: session?.user?.id || null,
          p_mode: mode
        });

        if (error) {
          console.error("Error fetching ranking:", error);
          setEntries([]);
        } else {
          setEntries(data as RankingEntry[] || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (supabase) {
      fetchRanking();
    }
  }, [mode, scope, session]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ranking_mode", mode);
    }
  }, [mode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ranking_scope", scope);
    }
  }, [scope]);

  const totalPossible = mode === "peaks" ? 47 : 196;
  const unit = mode === "peaks" ? "picos" : "países";

  const handleScopeChange = (newScope: ScopeFilter) => {
    if (newScope === 'following' && !session) {
      alert("Inicia sesión en la pestaña Social para usar este filtro.");
      return;
    }
    setScope(newScope);
  };

  const rankedEntries = useMemo(() => {
    let currentRank = 1;
    return entries.map((entry, index) => {
      if (index > 0 && entry.ascents_count < entries[index - 1].ascents_count) {
        currentRank = index + 1;
      }
      return { ...entry, rank: currentRank };
    });
  }, [entries]);

  return (
    <div className={`ranking-theme ${mode === "countries" ? "mode-countries" : ""}`} style={{ backgroundColor: "var(--bg-color)" }}>
      {/* ── Standard Topbar ────────────────── */}
      <header className="topbar">
        <Link className="brand" href={mapLink}>
          <img src="/icon.svg" alt="Logo" width={32} height={32} style={{ filter: "brightness(0)" }} />
        </Link>
        <nav>
          <Link href={mapLink}>Mapa</Link>
          <Link href="/social">Social</Link>
          <Link href="/ranking" style={{ fontWeight: 'bold', color: 'var(--purple)' }}>Ranking</Link>
          {session ? (
            <Link href={myProfile?.username ? `/perfil/${myProfile.username}` : "/"} className="account-button">
              {myProfile?.avatar_url ? (
                <img src={myProfile.avatar_url} alt="Mi Perfil" className="account-avatar" style={{ objectFit: "cover" }} />
              ) : (
                <span className="account-avatar">
                  {myProfile?.username?.slice(0, 1).toUpperCase() || session.user.email?.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span>{myProfile?.username || session.user.email?.split("@")[0]}</span>
            </Link>
          ) : (
            <Link href="/login" className="button button--outline">
              Entrar
            </Link>
          )}
        </nav>
      </header>

      {/* ── Narrow Main Container (like Social) ────────────────── */}
      <main className="peak-list-section" style={{ paddingTop: '80px', maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem' }}>
        
        <div className="section-heading">
          <div>
            <span className="eyebrow">EL PODIO</span>
            <h2>Ranking de {mode === "peaks" ? "Alpinistas" : "Viajeros"}</h2>
            <p>
              {scope === "following"
                ? `Encuentra tu posición entre las ${loading ? '...' : entries.length} personas que sigues.`
                : `Encuentra tu posición entre los ${loading ? '...' : entries.length} usuarios totales.`}
            </p>
          </div>
        </div>

        <section id="tabla">
          {/* Filters: Mode selector, then Scope, then Continents */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
            
            <div className="mode-selector" style={{ margin: 0 }}>
              <button
                className={`mode-tab ${mode === "peaks" ? "mode-tab--active" : ""}`}
                onClick={() => setMode("peaks")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mode-tab-icon">
                  <path d="M8 3l4 8 5-5 2 4H2L8 3z" />
                  <path d="M4.14 15.08l2.6-3.51L8 13l4-5.5 4 5.5 2.74-2.42L21.86 15.08" />
                </svg>
                47 Picos
              </button>
              <button
                className={`mode-tab ${mode === "countries" ? "mode-tab--active" : ""}`}
                onClick={() => setMode("countries")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mode-tab-icon">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z" />
                </svg>
                196 Países
              </button>
            </div>
            <div className="list-filters" style={{ margin: 0 }}>
              <button
                className={`list-filter-pill ${scope === 'all' ? 'list-filter-pill--active' : ''}`}
                onClick={() => handleScopeChange('all')}
                style={scope === 'all' ? { background: '#d4af37', color: 'white', borderColor: '#d4af37' } : {}}
              >
                Global
              </button>
              <button
                className={`list-filter-pill ${scope === 'following' ? 'list-filter-pill--active' : ''}`}
                onClick={() => handleScopeChange('following')}
                style={scope === 'following' ? { background: '#d4af37', color: 'white', borderColor: '#d4af37' } : {}}
              >
                Siguiendo
              </button>
            </div>
          </div>

          <div className="ranking-table-head">
            <span>#</span>
            <span>{mode === "peaks" ? "Escalador" : "Explorador"}</span>
            <span>Avance</span>
          </div>

          <div>
            {loading ? (
              <div className="ranking-empty-msg">Cargando clasificación...</div>
            ) : entries.length === 0 ? (
              <div className="ranking-empty-msg">No hay resultados para este filtro todavía.</div>
            ) : (
              rankedEntries.map((entry) => {
                const currentRank = entry.rank;
                const medalClass = currentRank === 1 ? ' rank-gold' : currentRank === 2 ? ' rank-silver' : currentRank === 3 ? ' rank-bronze' : '';
                const pct = Math.round((entry.ascents_count / totalPossible) * 100);
                const initial = entry.username ? entry.username.charAt(0).toUpperCase() : "?";

                return (
                  <Link key={entry.user_id} href={`/perfil/${entry.username}?challenge=${mode}`} className={`ranking-row${medalClass}`} style={{ display: 'grid' }}>
                    <div className="ranking-rank-num">{String(currentRank).padStart(2, '0')}</div>
                    <div className="ranking-who">
                      <div className="ranking-avatar">
                        {entry.avatar_url ? (
                          <img src={entry.avatar_url} alt={entry.username} />
                        ) : (
                          initial
                        )}
                      </div>
                      <div>
                        <div className="ranking-who-name">@{entry.username}</div>
                      </div>
                    </div>
                    <div className="ranking-stats-col">
                      <div className="ranking-countries-count">{entry.ascents_count} / {totalPossible} {unit}</div>
                      <div className="ranking-bar-track">
                        <div className="ranking-bar-fill" style={{ width: `${pct}%` }}></div>
                      </div>
                      <span className="ranking-pct">{pct}% completado</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
