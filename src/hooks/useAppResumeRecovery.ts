import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

/**
 * Recovers from stale state when the app resumes from background.
 *
 * Problem: On iOS/Android, after the app is backgrounded for a while,
 * the auth token can expire, network connections drop, and cached data
 * goes stale — causing pages to show infinite loading spinners.
 *
 * Solution: Listen for visibility changes (web) and Capacitor appStateChange
 * (native), then refresh the auth session and invalidate stale queries.
 */
export function useAppResumeRecovery() {
  const queryClient = useQueryClient();
  const lastActiveRef = useRef(Date.now());

  useEffect(() => {
    const STALE_THRESHOLD = 2 * 60 * 1000; // 2 minutes in background = stale

    const recover = async () => {
      const elapsed = Date.now() - lastActiveRef.current;
      if (elapsed < STALE_THRESHOLD) return;

      console.log(`[AppResume] Recovering after ${Math.round(elapsed / 1000)}s in background`);

      // 1. Refresh auth token — prevents "JWT expired" errors
      try {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn("[AppResume] Session refresh failed:", error.message);
        }
      } catch (e) {
        console.warn("[AppResume] Session refresh error:", e);
      }

      // 2. Invalidate all queries so pages re-fetch fresh data
      //    instead of showing stale cache or error states
      queryClient.invalidateQueries();
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        recover();
      } else {
        lastActiveRef.current = Date.now();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    // Native: also listen via Capacitor App plugin for more reliable detection
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
