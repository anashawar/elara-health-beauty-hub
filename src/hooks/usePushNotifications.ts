import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { isNativePlatform, registerNativePush, saveNativeToken, setupNativeListeners, removeNativeListeners } from "@/lib/nativePush";

/**
 * Unified push notification hook.
 * - On native iOS/Android: uses Capacitor PushNotifications plugin
 * - On web: uses Firebase Cloud Messaging (FCM)
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const initialized = useRef(false);
  const navigate = useNavigate();

  const subscribeNative = useCallback(async () => {
    if (!user) return;
    const token = await registerNativePush();
    if (token) {
      await saveNativeToken(user.id, token);
    }
  }, [user]);

  const subscribeWeb = useCallback(async () => {
    if (!user) return;
    const { requestFCMToken } = await import("@/lib/firebase");
    const token = await requestFCMToken();
    if (!token) return;

    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint")
      .eq("user_id", user.id)
      .eq("endpoint", token)
      .maybeSingle();

    if (!existing) {
      await supabase.from("push_subscriptions").insert({
        user_id: user.id,
        endpoint: token,
        p256dh: "fcm",
        auth: "fcm",
        is_active: true,
      });
    }
  }, [user]);

  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;

    if (isNativePlatform()) {
      // Native iOS/Android path
      subscribeNative();
      setupNativeListeners((url) => navigate(url));

      return () => {
        removeNativeListeners();
      };
    } else {
      // Web/PWA path — Firebase
      const init = async () => {
        const { getFirebaseConfig, onForegroundMessage } = await import("@/lib/firebase");

        if ("serviceWorker" in navigator) {
          try {
            const config = await getFirebaseConfig();
            if (config) {
              const reg = await navigator.serviceWorker.ready;
              reg.active?.postMessage({
                type: "FIREBASE_CONFIG",
                config: {
                  apiKey: config.apiKey,
                  projectId: config.projectId,
                  messagingSenderId: config.messagingSenderId,
                  appId: config.appId,
                },
              });
            }
          } catch (e) {
            console.warn("SW init failed:", e);
          }
        }

        subscribeWeb();

        onForegroundMessage((payload: any) => {
          const { title, body } = payload.notification || payload.data || {};
          if (title) {
            toast(title, { description: body });
          }
        });
      };

      init();
    }
  }, [user, subscribeNative, subscribeWeb, navigate]);

  return { subscribe: isNativePlatform() ? subscribeNative : subscribeWeb };
}

/**
 * Standalone init — called from deferred App init.
 */
export async function initPushNotifications() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (isNativePlatform()) {
      // On native, permission was already requested in main.tsx.
      // Here we just save the token if user is logged in.
      if (!session?.user) {
        // Listen for future sign-in to save token
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
          if (event === 'SIGNED_IN' && newSession?.user) {
            subscription.unsubscribe();
            const token = await registerNativePush();
            if (token) await saveNativeToken(newSession.user.id, token);
            setupNativeListeners();
          }
        });
        return;
      }

      const token = await registerNativePush();
      if (token) await saveNativeToken(session.user.id, token);
      setupNativeListeners();
      return;
    }

    // Web path — only if logged in
    if (!session?.user) return;

    const { getFirebaseConfig, onForegroundMessage, requestFCMToken } = await import("@/lib/firebase");

    if ("serviceWorker" in navigator) {
      const config = await getFirebaseConfig();
      if (config) {
        const reg = await navigator.serviceWorker.ready;
        reg.active?.postMessage({
          type: "FIREBASE_CONFIG",
          config: {
            apiKey: config.apiKey,
            projectId: config.projectId,
            messagingSenderId: config.messagingSenderId,
            appId: config.appId,
          },
        });
      }
    }

    const token = await requestFCMToken();
    if (token) {
      const { data: existing } = await supabase
        .from("push_subscriptions")
        .select("id, endpoint")
        .eq("user_id", session.user.id)
        .eq("endpoint", token)
        .maybeSingle();

      if (!existing) {
        await supabase.from("push_subscriptions").insert({
          user_id: session.user.id,
          endpoint: token,
          p256dh: "fcm",
          auth: "fcm",
          is_active: true,
        });
      }
    }

    onForegroundMessage((payload: any) => {
      const { title, body } = payload.notification || payload.data || {};
      if (title) {
        import("sonner").then(({ toast: t }) => {
          t(title, { description: body });
        });
      }
    });
  } catch (e) {
    console.warn("Deferred push init failed:", e);
  }
}
