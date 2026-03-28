import { Capacitor } from "@capacitor/core";
import OneSignal from "onesignal-cordova-plugin";
import { supabase } from "@/integrations/supabase/client";

const ONESIGNAL_APP_ID = "13744f00-e92d-4e78-84ca-4dffe5a16cea";

let initialized = false;
let listenersBound = false;
let subscriptionObserverBound = false;
let navigateHandler: ((url: string) => void) | undefined;

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

function hasCordovaBridge(): boolean {
  return typeof window !== "undefined" && !!(window as Window & { cordova?: unknown }).cordova;
}

async function waitForCordovaBridge(timeoutMs = 4000): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (hasCordovaBridge()) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return false;
}

function normalizeInternalUrl(url?: string | null): string | null {
  if (!url) return null;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsed = new URL(url);
      if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }

      window.location.href = url;
      return null;
    } catch {
      return null;
    }
  }

  return url.startsWith("/") ? url : `/${url}`;
}

function bindOneSignalListeners() {
  if (listenersBound) return;

  OneSignal.Notifications.addEventListener("foregroundWillDisplay", (event) => {
    event.getNotification().display();
  });

  OneSignal.Notifications.addEventListener("click", (event) => {
    const additionalData = (event.notification.additionalData ?? {}) as { link_url?: string };
    const targetUrl = normalizeInternalUrl(
      event.result?.url ?? event.notification.launchURL ?? additionalData.link_url ?? null,
    );

    if (!targetUrl) return;

    if (navigateHandler) {
      navigateHandler(targetUrl);
      return;
    }

    window.location.href = targetUrl;
  });

  listenersBound = true;
}

function bindSubscriptionObserver() {
  if (subscriptionObserverBound) return;

  OneSignal.User.pushSubscription.addEventListener("change", async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      await saveOneSignalToken(session.user.id);
    }
  });

  subscriptionObserverBound = true;
}

export async function initOneSignal(): Promise<void> {
  if (!isNativePlatform()) return;

  const bridgeReady = await waitForCordovaBridge();
  if (!bridgeReady) {
    console.warn("[Push] OneSignal bridge not ready yet");
    return;
  }

  if (!initialized) {
    OneSignal.initialize(ONESIGNAL_APP_ID);
    initialized = true;
  }

  bindOneSignalListeners();
  bindSubscriptionObserver();

  try {
    const hasPermission = await OneSignal.Notifications.getPermissionAsync();
    if (!hasPermission) {
      const canRequestPermission = await OneSignal.Notifications.canRequestPermission();
      if (canRequestPermission) {
        await OneSignal.Notifications.requestPermission(false);
      }
    }
  } catch (error) {
    console.warn("[Push] Failed to request notification permission:", error);
  }
}

export async function saveOneSignalToken(userId: string): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    await initOneSignal();
    if (!initialized) return;

    OneSignal.login(userId);

    const platform = Capacitor.getPlatform();
    const subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
    const pushToken = await OneSignal.User.pushSubscription.getTokenAsync();
    const isOptedIn = await OneSignal.User.pushSubscription.getOptedInAsync();
    const endpoint = `onesignal:${platform}:${subscriptionId ?? userId}`;

    if (!subscriptionId && !pushToken) {
      console.log("[Push] OneSignal subscription not ready yet");
      return;
    }

    const payload = {
      user_id: userId,
      endpoint,
      p256dh: pushToken ?? platform,
      auth: "onesignal",
      is_active: isOptedIn,
    };

    const { data: existing, error: lookupError } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("endpoint", endpoint)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("push_subscriptions")
        .update(payload)
        .eq("id", existing.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from("push_subscriptions").insert(payload);
      if (insertError) throw insertError;
    }

    console.log(`[Push] OneSignal subscription saved for ${platform}`);
  } catch (err) {
    console.error("[Push] saveOneSignalToken error:", err);
  }
}

export async function clearOneSignalUser(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    await initOneSignal();
    if (initialized) {
      OneSignal.logout();
    }
  } catch (error) {
    console.warn("[Push] Failed to clear OneSignal user:", error);
  }
}

export async function setupNativeListeners(onNavigate?: (url: string) => void): Promise<void> {
  if (!isNativePlatform()) return;

  navigateHandler = onNavigate;
  await initOneSignal();
}

export async function removeNativeListeners(): Promise<void> {
  navigateHandler = undefined;
}