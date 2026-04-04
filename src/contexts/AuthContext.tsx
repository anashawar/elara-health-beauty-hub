import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

/** Hide native splash screen once app is ready */
const hideSplash = () => {
  if (Capacitor.isNativePlatform()) {
    import("@capacitor/splash-screen").then(({ SplashScreen }) => {
      SplashScreen.hide();
    }).catch(() => {});
  }
};

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  forceRefresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const resolvedRef = useRef(false);
  const rehydratingRef = useRef(false);

  const syncSession = useCallback(async () => {
    if (rehydratingRef.current) return;
    rehydratingRef.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      resolvedRef.current = true;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    } catch (err) {
      console.warn("[AuthProvider] syncSession failed:", err);
      resolvedRef.current = true;
      setLoading(false);
    } finally {
      rehydratingRef.current = false;
    }
  }, []);

  useEffect(() => {
    resolvedRef.current = false;

    const markReady = (s: Session | null) => {
      resolvedRef.current = true;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    };

    // Safety timeout — NEVER stay in loading for more than 3 seconds
    const safetyTimer = setTimeout(() => {
      if (!resolvedRef.current) {
        console.warn("[AuthProvider] Safety timeout — forcing loading=false");
        resolvedRef.current = true;
        setLoading(false);
        hideSplash();
      }
    }, 3000);

    // 1. Set up listener FIRST (per Supabase best practices)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        markReady(session);
      }
    );

    // 2. Then restore session from storage
    syncSession().catch(() => {
      markReady(null);
    });

    let appListener: { remove: () => Promise<void> } | null = null;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          setLoading(true);
          void syncSession();
        }
      }).then((listener) => {
        appListener = listener;
      }).catch(() => undefined);
    }

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
      appListener?.remove?.();
    };
  }, [syncSession]);

  const forceRefresh = useCallback(async () => {
    setLoading(true);
    await syncSession();
  }, [syncSession]);

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, forceRefresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
