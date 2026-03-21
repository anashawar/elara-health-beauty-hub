import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * Hook version — kept for backward compatibility if used elsewhere.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const initialized = useRef(false);

  const subscribe = useCallback(async () => {
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

    // Defer Firebase import
    const init = async () => {
      const { getFirebaseConfig, onForegroundMessage } = await import("@/lib/firebase");

      // Init service worker
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

      subscribe();

      onForegroundMessage((payload: any) => {
        const { title, body } = payload.notification || payload.data || {};
        if (title) {
          toast(title, { description: body });
        }
      });
    };

    init();
  }, [user, subscribe]);

  return { subscribe };
}

/**
 * Standalone init — called from deferred App init.
 * Dynamically imports firebase only when actually needed.
 */
export async function initPushNotifications() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return; // No user — skip entirely

    const { getFirebaseConfig, onForegroundMessage, requestFCMToken } = await import("@/lib/firebase");

    // Init service worker
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

    // Subscribe
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

    // Foreground messages
    const { onForegroundMessage: onMsg } = await import("@/lib/firebase");
    onMsg((payload: any) => {
      const { title, body } = payload.notification || payload.data || {};
      if (title) {
        import("sonner").then(({ toast: t }) => {
          t(title, { description: body });
        });
      }
    });
  } catch (e) {
    // Silent — push is non-critical
    console.warn("Deferred push init failed:", e);
  }
}
