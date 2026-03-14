import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { requestFCMToken, onForegroundMessage, getFirebaseConfig } from "@/lib/firebase";
import { toast } from "sonner";

export function usePushNotifications() {
  const { user } = useAuth();
  const initialized = useRef(false);

  const initServiceWorker = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const config = await getFirebaseConfig();
      if (!config) return;
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
    } catch (e) {
      console.warn("SW init failed:", e);
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!user) return;
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

    initServiceWorker();
    subscribe();

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
