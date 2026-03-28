import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  isNativePlatform,
  initOneSignal,
  saveOneSignalToken,
  setupNativeListeners,
} from "@/lib/nativePush";

/**
 * Unified push notification hook using OneSignal.
 * - On native iOS/Android: uses OneSignal Cordova plugin
 * - On web: uses OneSignal Web SDK (loaded via script tag)
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const initialized = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;

    if (isNativePlatform()) {
      initOneSignal();
      saveOneSignalToken(user.id);
      setupNativeListeners((url) => navigate(url));
    }
  }, [user, navigate]);

  return { subscribe: () => user && saveOneSignalToken(user.id) };
}

/**
 * Standalone init — called from deferred App init.
 */
export async function initPushNotifications() {
  try {
    if (isNativePlatform()) {
      // Initialize OneSignal
      await initOneSignal();
      await setupNativeListeners();

      // If user is logged in, save token
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        await saveOneSignalToken(session.user.id);
      } else {
        // Listen for future sign-in
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (event === "SIGNED_IN" && newSession?.user) {
            subscription.unsubscribe();
            await saveOneSignalToken(newSession.user.id);
          }
        });
      }
      return;
    }

    // Web: no-op for now (OneSignal web can be added later)
  } catch (e) {
    console.warn("Deferred push init failed:", e);
  }
}