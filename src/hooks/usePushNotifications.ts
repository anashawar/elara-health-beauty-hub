import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  clearOneSignalUser,
  isNativePlatform,
  initOneSignal,
  saveOneSignalToken,
  setupNativeListeners,
} from "@/lib/nativePush";

let authListenerBound = false;

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
      void initOneSignal();
      void setupNativeListeners((url) => navigate(url));
      void saveOneSignalToken(user.id);
    }
  }, [user, navigate]);

  return { subscribe: () => user && saveOneSignalToken(user.id) };
}

/**
 * Standalone init — called from deferred App init.
 */
export async function initPushNotifications() {
  try {
    if (!isNativePlatform()) return;

    await initOneSignal();
    await setupNativeListeners();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      await saveOneSignalToken(session.user.id);
    } else {
      await clearOneSignalUser();
    }

    if (!authListenerBound) {
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (newSession?.user) {
          await saveOneSignalToken(newSession.user.id);
          return;
        }

        await clearOneSignalUser();
      });

      authListenerBound = true;
    }
  } catch (e) {
    console.warn("Deferred push init failed:", e);
  }
}