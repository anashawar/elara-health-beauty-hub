import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

/**
 * Centralized auth hook with resilience against hangs on iOS/Android.
 *
 * Key safeguards:
 * - Safety timeout: loading state caps at 5s so the app never freezes
 * - getSession + onAuthStateChange properly sequenced (listener set BEFORE getSession)
 * - Catch on getSession so network errors don't leave loading=true forever
 * - forceRefresh() for manual recovery after app resume
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const resolvedRef = useRef(false);

  useEffect(() => {
    resolvedRef.current = false;

    const markReady = (s: Session | null) => {
      if (!resolvedRef.current) {
        resolvedRef.current = true;
      }
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    };

    // Safety timeout — NEVER stay in loading for more than 5 seconds
    const safetyTimer = setTimeout(() => {
      if (!resolvedRef.current) {
        console.warn("[useAuth] Safety timeout — forcing loading=false");
        resolvedRef.current = true;
        setLoading(false);
      }
    }, 5000);

    // 1. Set up listener FIRST (per Supabase best practices)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Synchronous state update only — no awaits here to avoid deadlocks
        markReady(session);
      }
    );

    // 2. Then restore session from storage
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        markReady(session);
      })
      .catch((err) => {
        console.warn("[useAuth] getSession failed:", err);
        markReady(null);
      });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  // Manual refresh for app-resume recovery
  const forceRefresh = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
    } catch {
      // Silently fail — don't break the app
    }
    setLoading(false);
  }, []);

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

  return { user, session, loading, signUp, signIn, signOut, forceRefresh };
}
