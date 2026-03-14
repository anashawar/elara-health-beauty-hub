import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { requestFCMToken, onForegroundMessage } from "@/lib/firebase";
import { toast } from "sonner";

export function usePushNotifications() {
  const { user } = useAuth();
  const initialized = useRef(false);

  // Send Firebase config to service worker
  const initServiceWorker = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({
        type: "FIREBASE_CONFIG",
        config: {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: import.meta.env.VITE_FIREBASE_APP_ID,
        },
      });
    } catch (e) {
      console.warn("SW init failed:", e);
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!user) return;

    const token = await requestFCMToken();
    if (!token) return;

    // Save/update token in push_subscriptions
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

    initServiceWorker();
    subscribe();

    // Foreground message handling
    const unsubscribe = onForegroundMessage((payload: any) => {
      const { title, body } = payload.notification || payload.data || {};
      if (title) {
        toast(title, { description: body });
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [user, initServiceWorker, subscribe]);

  return { subscribe };
}
