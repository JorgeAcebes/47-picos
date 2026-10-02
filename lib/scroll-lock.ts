"use client";

import { useEffect } from "react";

let lockCount = 0;

export function lockScroll() {
  if (typeof document === "undefined") return;
  lockCount++;
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
}

export function unlockScroll() {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }
}

export function resetScrollLock() {
  if (typeof document === "undefined") return;
  lockCount = 0;
  document.documentElement.style.overflow = "";
  document.body.style.overflow = "";
}

/**
 * React hook to lock document scroll when enabled is true.
 * Safely handles nested modals, drawers, and overlays via reference counting.
 */
export function useScrollLock(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [enabled]);
}
