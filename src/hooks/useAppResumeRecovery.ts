import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/hooks/useAuth";

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
  const { forceRefresh } = useAuth();
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

      // 1. Rehydrate auth first so queries don't resume with a stale/null session
      try {
        await Promise.race([
          forceRefresh(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("auth_rehydrate_timeout")), 5000)),
        ]);
      } catch (e) {
        console.warn("[AppResume] Auth recovery failed:", e);
        try {
          const { error } = await supabase.auth.refreshSession();
          if (error) {
            console.warn("[AppResume] Session refresh failed:", error.message);
            await supabase.auth.getSession();
          }
        } catch (refreshError) {
          console.warn("[AppResume] Session refresh error:", refreshError);
        }
      }

      // 2. Cancel stuck queries first, then refetch active ones with fresh auth state
      await queryClient.cancelQueries();
      await queryClient.invalidateQueries({ refetchType: "active" });

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
  }, [forceRefresh, queryClient]);
}
