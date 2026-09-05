"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

type Tab = "map" | "social" | "ranking";

const TabLoadingFallback = () => (
  <div 
    style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      minHeight: "60vh",
      width: "100%"
    }}
  >
    <div 
      style={{
        width: "36px",
        height: "36px",
        border: "3px solid rgba(0, 0, 0, 0.1)",
        borderTopColor: "var(--purple, #2d5a27)",
        borderRadius: "50%",
        animation: "appShellSpinner 0.8s linear infinite"
      }} 
    />
  </div>
);

const SummitTracker = dynamic(
  () => import("./summit-tracker").then((mod) => mod.SummitTracker),
  { 
    ssr: false,
    loading: () => <TabLoadingFallback />
  }
);

const SocialTab = dynamic(
  () => import("./social-tab").then((mod) => mod.SocialTab),
  { 
    ssr: false,
    loading: () => <TabLoadingFallback />
  }
);

const RankingTab = dynamic(
  () => import("./ranking-tab").then((mod) => mod.RankingTab),
  { 
    ssr: false,
    loading: () => <TabLoadingFallback />
  }
);

export function AppShell({ 
  initialTab = "map", 
  initialMapMode = "countries" 
}: { 
  initialTab?: Tab; 
  initialMapMode?: "peaks" | "countries"; 
}) {
  const [currentTab, setCurrentTab] = useState<Tab>(initialTab);
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(() => new Set<Tab>([initialTab]));
  const [mapMode, setMapMode] = useState<"peaks" | "countries">(initialMapMode);

  useEffect(() => {
    // Sincronizar pestaña inicial con la ruta real en el primer montaje
    const path = window.location.pathname;
    let actualTab: Tab = initialTab;
    if (path === "/social") actualTab = "social";
    else if (path === "/ranking") actualTab = "ranking";
    else if (path === "/" || path === "/picos") actualTab = "map";

    if (actualTab !== currentTab) {
      setCurrentTab(actualTab);
    }
    setVisitedTabs((prev) => {
      if (prev.has(actualTab)) return prev;
      const next = new Set(prev);
      next.add(actualTab);
      return next;
    });

    const handlePopState = () => {
      const p = window.location.pathname;
      let nextTab: Tab = "map";
      if (p === "/social") nextTab = "social";
      else if (p === "/ranking") nextTab = "ranking";
      else nextTab = "map";

      if (p === "/picos") setMapMode("peaks");
      else if (p === "/") setMapMode("countries");

      setCurrentTab(nextTab);
      setVisitedTabs((prev) => {
        if (prev.has(nextTab)) return prev;
        const next = new Set(prev);
        next.add(nextTab);
        return next;
      });

      // Si volvemos al mapa con botones atrás/adelante, forzamos resize para Leaflet
      if (nextTab === "map") {
        setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [initialTab]);

  const handleSwitchMode = (newMode: "peaks" | "countries") => {
    setMapMode(newMode);
    const newPath = newMode === "peaks" ? "/picos" : "/";
    localStorage.setItem("last_map_path", newPath);
    if (window.location.pathname !== newPath) {
      window.history.pushState(null, "", newPath);
      window.dispatchEvent(new Event('popstate'));
    }
  };

  const handleNavigate = (targetUrl: string) => {
    let tab: Tab = "map";
    if (targetUrl === "/social") tab = "social";
    if (targetUrl === "/ranking") tab = "ranking";
    
    setCurrentTab(tab);
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
    
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
      {visitedTabs.has("map") && (
        <div 
          id="tabpanel-map"
          role="tabpanel"
          style={{ display: currentTab === "map" ? "block" : "none", animation: "fadeIn 0.3s" }}
          aria-hidden={currentTab !== "map"}
        >
          <SummitTracker mode={mapMode} onSwitchMode={handleSwitchMode} onNavigate={handleNavigate} isActive={currentTab === "map"} />
        </div>
      )}

      {visitedTabs.has("social") && (
        <div 
          id="tabpanel-social"
          role="tabpanel"
          style={{ display: currentTab === "social" ? "block" : "none", animation: "fadeIn 0.3s" }}
          aria-hidden={currentTab !== "social"}
        >
          <SocialTab onNavigate={handleNavigate} isActive={currentTab === "social"} />
        </div>
      )}

      {visitedTabs.has("ranking") && (
        <div 
          id="tabpanel-ranking"
          role="tabpanel"
          style={{ display: currentTab === "ranking" ? "block" : "none", animation: "fadeIn 0.3s" }}
          aria-hidden={currentTab !== "ranking"}
        >
          <RankingTab onNavigate={handleNavigate} isActive={currentTab === "ranking"} />
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes appShellSpinner {
          to { transform: rotate(360deg); }
        }
      `}} />
    </>
  );
}
