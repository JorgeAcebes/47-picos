"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type UserProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_public: boolean;
  enable_regions?: boolean;
  enable_experiences?: boolean;
  share_photos?: boolean;
  share_notes?: boolean;
  is_test?: boolean;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  refreshProfile: (customSession?: Session | null) => Promise<void>;
  signOut: () => Promise<void>;
};

// Global in-memory cache to ensure session & profile survive across ANY page navigation or component mount
let globalSession: Session | null = null;
let globalProfile: UserProfile | null = null;
let isAuthInitialized = false;

function getStoredProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("app_user_profile");
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  setProfile: () => {},
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(globalSession);
  const [profile, setProfile] = useState<UserProfile | null>(() => globalProfile || getStoredProfile());
  const [loading, setLoading] = useState(!isAuthInitialized);

  const refreshProfile = useCallback(async (activeSession?: Session | null) => {
    const s = activeSession !== undefined ? activeSession : globalSession;
    if (!s || !supabase) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, is_public, enable_regions, enable_experiences, share_photos, share_notes")
        .eq("id", s.user.id)
        .single();

      if (data && !error) {
        setProfile(data);
        globalProfile = data;
        if (typeof window !== "undefined") {
          localStorage.setItem("app_user_profile", JSON.stringify(data));
        }
      }
    } catch (err) {
      console.error("Error refreshing profile:", err);
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error during signOut:", err);
    }
    globalSession = null;
    globalProfile = null;
    setSession(null);
    setProfile(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("app_user_profile");
    }
  }, []);

  useEffect(() => {
    // Restore cached profile on client if not already populated
    if (!globalProfile) {
      const stored = getStoredProfile();
      if (stored) {
        globalProfile = stored;
        setProfile(stored);
      }
    }

    if (!supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // Initial session load
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      if (!isMounted) return;
      if (initSession) {
        globalSession = initSession;
        setSession(initSession);
        if (!globalProfile || globalProfile.id !== initSession.user.id) {
          refreshProfile(initSession);
        }
      }
      setLoading(false);
      isAuthInitialized = true;
    });

    // Listen for auth changes (sign in, sign out, token refresh)
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT") {
        globalSession = null;
        globalProfile = null;
        setSession(null);
        setProfile(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("app_user_profile");
        }
        return;
      }

      if (nextSession) {
        globalSession = nextSession;
        setSession(nextSession);
        if (!globalProfile || globalProfile.id !== nextSession.user.id) {
          refreshProfile(nextSession);
        }
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        profile,
        loading,
        setProfile,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
