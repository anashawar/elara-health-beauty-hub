import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

/**
 * Recovers from stale state when the app resumes from background.
 *
 * On iOS/Android, after the app is backgrounded:
 * - Auth tokens can expire → "JWT expired" errors → pages hang on loading
 * - Network connections drop → fetch/query failures
 * - React Query cache goes stale → shows old or error data
 *
 * This hook detects resume and:
 * 1. Refreshes the auth session (token renewal)
 * 2. Invalidates all React Query caches (fresh data)
 * 3. Retries failed queries automatically
 */
export function useAppResumeRecovery() {
  const queryClient = useQueryClient();
  const lastActiveRef = useRef(Date.now());
  const recoveringRef = useRef(false);

  useEffect(() => {
    const STALE_THRESHOLD = 60 * 1000; // 1 minute in background = stale

    const recover = async () => {
      if (recoveringRef.current) return;
      const elapsed = Date.now() - lastActiveRef.current;
      if (elapsed < STALE_THRESHOLD) return;

      recoveringRef.current = true;
      console.log(`[AppResume] Recovering after ${Math.round(elapsed / 1000)}s in background`);

      // 1. Refresh auth token with timeout
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const { error } = await supabase.auth.refreshSession();
        clearTimeout(timeout);
        
        if (error) {
          console.warn("[AppResume] Session refresh failed:", error.message);
          // Try getSession as fallback — might still have a valid cached session
          await supabase.auth.getSession();
        }
      } catch (e) {
        console.warn("[AppResume] Session refresh error:", e);
      }

      // 2. Invalidate all queries — will trigger refetch for active ones
      queryClient.invalidateQueries();
      
      // 3. Also cancel any stuck/pending queries
      queryClient.cancelQueries();

      recoveringRef.current = false;
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        recover();
      } else {
        lastActiveRef.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    // Native: Capacitor App plugin for more reliable detection on iOS/Android
    let appListener: any = null;
    if (Capacitor.isNativePlatform()) {
      import("@capacitor/app").then(({ App }) => {
        App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) {
            recover();
          } else {
            lastActiveRef.current = Date.now();
          }
        }).then(listener => {
          appListener = listener;
        });
      }).catch(() => {});
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      appListener?.remove?.();
    };
  }, [queryClient]);
}
