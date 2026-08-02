"use client";

import { useCallback, useEffect, useState } from "react";

// Key for localStorage
const DISMISS_KEY = "pwa_install_dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 700;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isApple, setIsApple] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    // Don't show if:
    // 1. Already installed (standalone mode)
    // 2. User dismissed permanently
    // 3. Not on mobile
    if (isStandalone()) return;
    if (!isMobile()) return;
    if (typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_KEY) === "true") return;

    // Check if iOS
    if (isIOS()) {
      setIsApple(true);
      setShowPrompt(true);
      return;
    }

    // Listen for beforeinstallprompt (Chrome/Edge/Samsung etc.)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Also show after a short delay for browsers that support PWA
    // but might not fire beforeinstallprompt immediately
    const timer = setTimeout(() => {
      if (!isStandalone() && isMobile()) {
        // If no beforeinstallprompt fired, check if it's iOS
        if (isIOS()) {
          setIsApple(true);
          setShowPrompt(true);
        }
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleClose = useCallback(() => {
    setClosing(true);
    if (dontShowAgain) {
      localStorage.setItem(DISMISS_KEY, "true");
    }
    setTimeout(() => {
      setShowPrompt(false);
      setClosing(false);
    }, 280);
  }, [dontShowAgain]);

  if (!showPrompt) return null;

  return (
    <div className={`install-prompt-overlay${closing ? " install-prompt-overlay--closing" : ""}`}>
      <div className={`install-prompt-dialog${closing ? " install-prompt-dialog--closing" : ""}`}>
        {/* Close button */}
        <button
          className="install-prompt-close"
          onClick={handleClose}
          aria-label="Cerrar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* App icon */}
        <div className="install-prompt-icon">
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 52 L36 12 L48 32 Z" fill="url(#ipGreen)"/>
            <path d="M24 60 L44 26 L60 52 Z" fill="url(#ipPurple)" style={{ mixBlendMode: 'multiply' }}/>
            <defs>
              <linearGradient id="ipGreen" x1="12" y1="12" x2="48" y2="52">
                <stop stopColor="#5c9b7d"/>
                <stop offset="1" stopColor="#245f52"/>
              </linearGradient>
              <linearGradient id="ipPurple" x1="24" y1="26" x2="60" y2="60">
                <stop stopColor="#9570c7"/>
                <stop offset="1" stopColor="#5b3a8c"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Title */}
        <h3 className="install-prompt-title">196 Países</h3>
        <p className="install-prompt-subtitle">
          {isApple
            ? "Añade esta app a tu pantalla de inicio para una mejor experiencia."
            : "Instala la app para acceder más rápido y disfrutar de una experiencia completa."
          }
        </p>

        {/* Install / Instructions */}
        {isApple ? (
          <div className="install-prompt-ios-steps">
            <p>
              Pulsa el botón{" "}
              <span className="install-prompt-share-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </span>{" "}
              <strong>Compartir</strong> y luego <strong>&quot;Añadir a pantalla de inicio&quot;</strong>.
            </p>
          </div>
        ) : (
          <button
            className="button button--green button--wide install-prompt-btn"
            onClick={handleInstall}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Instalar aplicación
          </button>
        )}

        {/* Don't show again checkbox */}
        <label className="install-prompt-dismiss">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
          />
          No volver a mostrar
        </label>
      </div>
    </div>
  );
}
