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
 * On iOS, OneSignal is initialized natively in AppDelegate.swift.
 * This function is a no-op on native — init happens in Swift.
 */
export async function initOneSignal(): Promise<void> {
  if (!isNativePlatform()) return;
  console.log("[Push] OneSignal native init handled by AppDelegate on", Capacitor.getPlatform());
}

/**
 * Set external user ID via OneSignal and save subscription to DB.
 * Uses the native bridge if available, otherwise logs a warning.
 */
export async function saveOneSignalToken(userId: string): Promise<void> {
  if (!isNativePlatform()) return;

  try {
    const OneSignal = (window as any).plugins?.OneSignal ?? (window as any).OneSignalPlugin;

    // Login sets the external user ID for targeting
    if (OneSignal?.login) {
      OneSignal.login(userId);
      console.log(`[Push] OneSignal login called for user ${userId.substring(0, 8)}`);
    } else {
      console.log("[Push] OneSignal JS bridge not available — native SDK handles registration");
    }

    // Save a record to our DB for tracking
    const platform = Capacitor.getPlatform();
    const endpoint = `onesignal_${platform}_${userId}`;

    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id")
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
      console.log(`[Push] Subscription record saved for ${platform}`);
    }
  } catch (err) {
    console.error("[Push] saveOneSignalToken error:", err);
  }
}

/**
 * Set up notification tap listeners (deep linking).
 */
export async function setupNativeListeners(onNavigate?: (url: string) => void): Promise<void> {
  if (!isNativePlatform()) return;
  // Deep link handling is done natively; JS-side navigation handled via URL scheme
  console.log("[Push] Native listeners handled by OneSignal SDK");
}

/**
 * Cleanup — no-op, OneSignal manages its own lifecycle.
 */
export async function removeNativeListeners(): Promise<void> {}