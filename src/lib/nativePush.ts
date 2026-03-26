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
 * Get an FCM token on native iOS/Android.
 * On iOS, Capacitor gives an APNs token — we pass it to Firebase SDK 
 * which converts it to an FCM registration token that Firebase campaigns can target.
 * On Android, Capacitor already gives an FCM token directly.
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

    // Get the native token (APNs on iOS, FCM on Android)
    const nativeToken = await new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 10000);

      PushNotifications.addListener("registration", (token: Token) => {
        clearTimeout(timeout);
        console.log("Native push token received:", token.value.substring(0, 10) + "...");
        resolve(token.value);
      });

      PushNotifications.addListener("registrationError", (error) => {
        clearTimeout(timeout);
        console.error("Push registration error:", error);
        resolve(null);
      });
    });

    if (!nativeToken) return null;

    const platform = Capacitor.getPlatform();

    // On iOS, the native token is an APNs token.
    // We need to use Firebase SDK to get the FCM registration token.
    if (platform === "ios") {
      try {
        const { requestFCMToken } = await import("@/lib/firebase");
        const fcmToken = await requestFCMToken();
        if (fcmToken) {
          console.log("iOS FCM token obtained via Firebase SDK");
          return fcmToken;
        }
        // Fallback: store the APNs token anyway (won't work with Firebase campaigns)
        console.warn("Could not get FCM token on iOS, falling back to APNs token");
        return nativeToken;
      } catch (e) {
        console.warn("Firebase SDK not available on iOS, using APNs token:", e);
        return nativeToken;
      }
    }

    // On Android, Capacitor already returns an FCM token
    return nativeToken;
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
