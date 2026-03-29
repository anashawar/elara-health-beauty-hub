import { Capacitor } from "@capacitor/core";

/**
 * Lightweight haptic feedback utility for native iOS/Android.
 * Falls back silently on web — no errors, no overhead.
 */

let HapticsPlugin: typeof import("@capacitor/haptics").Haptics | null = null;
let ImpactStyle: typeof import("@capacitor/haptics").ImpactStyle | undefined;
let NotificationType: typeof import("@capacitor/haptics").NotificationType | undefined;

// Lazy-load the plugin only on native platforms
const getHaptics = async () => {
  if (!Capacitor.isNativePlatform()) return null;
  if (HapticsPlugin) return HapticsPlugin;
  try {
    const mod = await import("@capacitor/haptics");
    HapticsPlugin = mod.Haptics;
    ImpactStyle = mod.ImpactStyle;
    NotificationType = mod.NotificationType;
    return HapticsPlugin;
  } catch {
    return null;
  }
};

/**
 * Light tap — tab switches, toggles, selections
 */
export const hapticLight = async () => {
  const h = await getHaptics();
  if (h && ImpactStyle) {
    await h.impact({ style: ImpactStyle.Light });
  }
};

/**
 * Medium tap — add to cart, button presses
 */
export const hapticMedium = async () => {
  const h = await getHaptics();
  if (h && ImpactStyle) {
    await h.impact({ style: ImpactStyle.Medium });
  }
};

/**
 * Heavy tap — important actions like checkout, delete
 */
export const hapticHeavy = async () => {
  const h = await getHaptics();
  if (h && ImpactStyle) {
    await h.impact({ style: ImpactStyle.Heavy });
  }
};

/**
 * Success — order placed, item added to wishlist
 */
export const hapticSuccess = async () => {
  const h = await getHaptics();
  if (h && NotificationType) {
    await h.notification({ type: NotificationType.Success });
  }
};

/**
 * Warning — coupon invalid, stock low
 */
export const hapticWarning = async () => {
  const h = await getHaptics();
  if (h && NotificationType) {
    await h.notification({ type: NotificationType.Warning });
  }
};

/**
 * Error — failed action, validation error
 */
export const hapticError = async () => {
  const h = await getHaptics();
  if (h && NotificationType) {
    await h.notification({ type: NotificationType.Error });
  }
};

/**
 * Selection tick — scrolling through pickers, sliders
 */
export const hapticSelection = async () => {
  const h = await getHaptics();
  if (h) {
    await h.selectionStart();
    await h.selectionChanged();
    await h.selectionEnd();
  }
};
