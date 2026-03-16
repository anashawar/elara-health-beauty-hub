/**
 * Hook to switch between pre-bundled alternate app icons on iOS/Android.
 * Uses @capacitor-community/app-icon plugin.
 * 
 * NATIVE SETUP REQUIRED — see public/icons/README.md
 */
import { Capacitor } from "@capacitor/core";
import { useState, useCallback } from "react";

export type AppIconTheme = "default" | "ramadan" | "eid" | "newroz" | "newyear";

export const APP_ICON_OPTIONS: { id: AppIconTheme; label: string; preview: string }[] = [
  { id: "default",  label: "Default",  preview: "/app-icon.png" },
  { id: "ramadan",  label: "Ramadan",  preview: "/icons/icon-ramadan.png" },
  { id: "eid",      label: "Eid",      preview: "/icons/icon-eid.png" },
  { id: "newroz",   label: "Newroz",   preview: "/icons/icon-newroz.png" },
  { id: "newyear",  label: "New Year", preview: "/icons/icon-newyear.png" },
];

export const APP_SPLASH_OPTIONS: { id: AppIconTheme; preview: string }[] = [
  { id: "default",  preview: "/splash.png" },
  { id: "ramadan",  preview: "/splash/splash-ramadan.png" },
  { id: "eid",      preview: "/splash/splash-eid.png" },
  { id: "newroz",   preview: "/splash/splash-newroz.png" },
  { id: "newyear",  preview: "/splash/splash-newyear.png" },
];

export function useAppIcon() {
  const [currentIcon, setCurrentIcon] = useState<AppIconTheme>(
    () => (localStorage.getItem("elara-app-icon") as AppIconTheme) || "default"
  );
  const [switching, setSwitching] = useState(false);

  const switchIcon = useCallback(async (theme: AppIconTheme) => {
    if (!Capacitor.isNativePlatform()) {
      // On web, just persist selection for preview purposes
      localStorage.setItem("elara-app-icon", theme);
      setCurrentIcon(theme);
      return;
    }

    setSwitching(true);
    try {
      const { AppIcon } = await import("@capacitor-community/app-icon");

      if (theme === "default") {
        await AppIcon.reset({ suppressNotification: false });
      } else {
        await AppIcon.change({ name: `icon-${theme}`, suppressNotification: false });
      }

      localStorage.setItem("elara-app-icon", theme);
      setCurrentIcon(theme);
    } catch (err) {
      console.error("Failed to switch icon:", err);
    } finally {
      setSwitching(false);
    }
  }, []);

  return { currentIcon, switchIcon, switching, options: APP_ICON_OPTIONS };
}
