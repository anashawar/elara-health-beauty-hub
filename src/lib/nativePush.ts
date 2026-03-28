import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Returns true if running on a native iOS/Android platform (Capacitor).
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get an FCM registration token on native iOS/Android using
 * @capacitor-firebase/messaging — this plugin bridges to the
 * NATIVE Firebase SDK, which correctly converts APNs tokens to
 * FCM registration tokens on iOS (something the web SDK cannot do).
 */
export async function registerNativePush(): Promise<string | null> {
  if (!isNativePlatform()) return null;

  try {
    const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");

    // Check / request permission
    let permStatus = await FirebaseMessaging.checkPermissions();

    if (permStatus.receive === "prompt" || permStatus.receive === "prompt-with-rationale") {
      permStatus = await FirebaseMessaging.requestPermissions();
    }

    if (permStatus.receive !== "granted") {
      console.warn("Push notification permission not granted");
      return null;
    }

    // getToken() returns an FCM registration token on BOTH iOS and Android.
    // On iOS it automatically registers APNs token with Firebase and swaps it.
    const { token } = await FirebaseMessaging.getToken();

    if (!token) {
      console.warn("No FCM token returned from FirebaseMessaging.getToken()");
      return null;
    }

    const platform = Capacitor.getPlatform();
    console.log(`[Push] FCM token obtained on ${platform}:`, token.substring(0, 12) + "...");
    return token;
  } catch (err) {
    console.error("Native push registration failed:", err);
    return null;
  }
}

/**
 * Save a push token to the database for the given user.
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
    console.log(`[Push] Token saved for ${platform} user ${userId.substring(0, 8)}`);
  }
}

/**
 * Set up foreground notification listeners on native.
 * Shows a toast when a push arrives while the app is open.
 */
export async function setupNativeListeners(onNavigate?: (url: string) => void): Promise<void> {
  if (!isNativePlatform()) return;

  const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");

  // Foreground: show in-app toast
  await FirebaseMessaging.addListener("notificationReceived", (event) => {
    const notification = event.notification;
    toast(notification?.title || "New notification", {
      description: notification?.body,
    });
  });

  // Tap on notification: navigate if link provided
  await FirebaseMessaging.addListener("notificationActionPerformed", (event) => {
    const data = event.notification?.data as Record<string, string> | undefined;
    const linkUrl = data?.link_url || data?.url;
    if (linkUrl && onNavigate) {
      onNavigate(linkUrl);
    }
  });
}

/**
 * Remove all native push listeners (cleanup).
 */
export async function removeNativeListeners(): Promise<void> {
  if (!isNativePlatform()) return;
  const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
  await FirebaseMessaging.removeAllListeners();
}
