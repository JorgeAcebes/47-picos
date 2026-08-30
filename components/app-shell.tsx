"use client";

import { useState, useEffect } from "react";
import { SummitTracker } from "./summit-tracker";
import { SocialTab } from "./social-tab";
import { RankingTab } from "./ranking-tab";

type Tab = "map" | "social" | "ranking";

export function AppShell({ 
  initialTab = "map", 
  initialMapMode = "countries" 
}: { 
  initialTab?: Tab, 
  initialMapMode?: "peaks" | "countries" 
}) {
  const [currentTab, setCurrentTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === "/social") setCurrentTab("social");
      else if (path === "/ranking") setCurrentTab("ranking");
      else setCurrentTab("map");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const handleNavigate = (targetUrl: string) => {
    let tab: Tab = "map";
    if (targetUrl === "/social") tab = "social";
    if (targetUrl === "/ranking") tab = "ranking";
    
    setCurrentTab(tab);
    
    if (window.location.pathname !== targetUrl || window.location.hash) {
      window.history.pushState(null, "", targetUrl);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Si volvemos al mapa, forzamos un evento de resize para que Leaflet actualice los tiles
    if (tab === "map") {
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    }
    
    // También enviamos un evento popstate simulado para que los componentes (ej. SummitTracker) 
    // se enteren de que la URL ha cambiado a nivel local
    window.dispatchEvent(new Event('popstate'));
  };

  return (
    <>
      <div style={{ display: currentTab === "map" ? "block" : "none", animation: "fadeIn 0.3s" }}>
        <SummitTracker mode={initialMapMode} onNavigate={handleNavigate} isActive={currentTab === "map"} />
      </div>

      <div style={{ display: currentTab === "social" ? "block" : "none", animation: "fadeIn 0.3s" }}>
        <SocialTab onNavigate={handleNavigate} isActive={currentTab === "social"} />
      </div>

      <div style={{ display: currentTab === "ranking" ? "block" : "none", animation: "fadeIn 0.3s" }}>
        <RankingTab onNavigate={handleNavigate} />
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </>
  );
}
