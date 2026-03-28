import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

const ONESIGNAL_APP_ID = "13744f00-e92d-4e78-84ca-4dffe5a16cea";

/**
 * Returns true if running on a native iOS/Android platform (Capacitor).
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Initialize OneSignal on native platforms.
 * OneSignal handles all APNs/FCM token management automatically.
 */
export async function initOneSignal(): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const OneSignal = (window as any).plugins?.OneSignal;
    if (!OneSignal) {
      console.warn("[Push] OneSignal plugin not available");
      return;
    }

    OneSignal.initialize(ONESIGNAL_APP_ID);
    OneSignal.Notifications.requestPermission(true);

    console.log("[Push] OneSignal initialized on", Capacitor.getPlatform());
  } catch (err) {
    console.error("[Push] OneSignal init failed:", err);
  }
}

/**
 * Get the OneSignal player/subscription ID and save it to our database.
 */
export async function saveOneSignalToken(userId: string): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const OneSignal = (window as any).plugins?.OneSignal;
    if (!OneSignal) return;

    // Get the subscription ID (player ID)
    const subId = OneSignal.User?.pushSubscription?.id;
    const token = OneSignal.User?.pushSubscription?.token;

    const endpoint = subId || token;
    if (!endpoint) {
      console.warn("[Push] No OneSignal subscription ID yet");
      return;
    }

    // Set external user ID for targeting
    OneSignal.login(userId);

    const platform = Capacitor.getPlatform();

    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint")
      .eq("user_id", userId)
      .eq("endpoint", endpoint)
      .maybeSingle();

    if (!existing) {
      await supabase.from("push_subscriptions").insert({
        user_id: userId,
        endpoint,
        p256dh: platform,
        auth: "onesignal",
        is_active: true,
      });
      console.log(`[Push] OneSignal token saved for ${platform} user ${userId.substring(0, 8)}`);
    }
  } catch (err) {
    console.error("[Push] Failed to save OneSignal token:", err);
  }
}

/**
 * Set up foreground notification listeners on native.
 */
export async function setupNativeListeners(onNavigate?: (url: string) => void): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const OneSignal = (window as any).plugins?.OneSignal;
    if (!OneSignal) return;

    // Foreground display: show notification
    OneSignal.Notifications.addEventListener("foregroundWillDisplay", (event: any) => {
      // Let OneSignal display the notification natively
      event.getNotification().display();
    });

    // Tap handler: navigate if link provided
    OneSignal.Notifications.addEventListener("click", (event: any) => {
      const data = event.notification?.additionalData;
      const linkUrl = data?.link_url || data?.url;
      if (linkUrl && onNavigate) {
        onNavigate(linkUrl);
      }
    });
  } catch (err) {
    console.error("[Push] Failed to set up OneSignal listeners:", err);
  }
}

/**
 * Remove all native push listeners (cleanup).
 */
export async function removeNativeListeners(): Promise<void> {
  // OneSignal manages its own listeners; no explicit cleanup needed
}