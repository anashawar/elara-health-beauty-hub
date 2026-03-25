import { Capacitor } from "@capacitor/core";
import { PushNotifications, type Token, type PushNotificationSchema, type ActionPerformed } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Returns true if running on a native iOS/Android platform (Capacitor).
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Register for native push notifications on iOS/Android.
 * Returns the device token, or null if registration fails.
 */
export async function registerNativePush(): Promise<string | null> {
  if (!isNativePlatform()) return null;

  try {
    // Check / request permission
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === "prompt" || permStatus.receive === "prompt-with-rationale") {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== "granted") {
      console.warn("Push notification permission not granted");
      return null;
    }

    // Register with OS
    await PushNotifications.register();

    // Wait for registration token
    return new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 10000);

      PushNotifications.addListener("registration", (token: Token) => {
        clearTimeout(timeout);
        console.log("Native push token:", token.value);
        resolve(token.value);
      });

      PushNotifications.addListener("registrationError", (error) => {
        clearTimeout(timeout);
        console.error("Push registration error:", error);
        resolve(null);
      });
    });
  } catch (err) {
    console.error("Native push registration failed:", err);
    return null;
  }
}

/**
 * Save a native push token to the database for the given user.
 */
export async function saveNativeToken(userId: string, token: string): Promise<void> {
  const platform = Capacitor.getPlatform(); // 'ios' | 'android'

  const { data: existing } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint")
    .eq("user_id", userId)
    .eq("endpoint", token)
    .maybeSingle();

  if (!existing) {
    await supabase.from("push_subscriptions").insert({
      user_id: userId,
      endpoint: token,
      p256dh: platform, // store platform for routing
      auth: "native",
      is_active: true,
    });
  }
}

/**
 * Set up foreground notification listeners on native.
 * Shows a toast when a push arrives while the app is open.
 */
export function setupNativeListeners(onNavigate?: (url: string) => void): void {
  if (!isNativePlatform()) return;

  // Foreground: show in-app toast
  PushNotifications.addListener(
    "pushNotificationReceived",
    (notification: PushNotificationSchema) => {
      toast(notification.title || "New notification", {
        description: notification.body,
      });
    }
  );

  // Tap on notification: navigate if link provided
  PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action: ActionPerformed) => {
      const data = action.notification.data;
      const linkUrl = data?.link_url || data?.url;
      if (linkUrl && onNavigate) {
        onNavigate(linkUrl);
      }
    }
  );
}

/**
 * Remove all native push listeners (cleanup).
 */
export async function removeNativeListeners(): Promise<void> {
  if (!isNativePlatform()) return;
  await PushNotifications.removeAllListeners();
}
