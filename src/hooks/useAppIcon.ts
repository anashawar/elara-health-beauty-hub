/**
 * Hook to manage app icon (default only).
 */
import { useState, useCallback } from "react";

export type AppIconTheme = "default";

export const APP_ICON_OPTIONS: { id: AppIconTheme; label: string; preview: string }[] = [
  { id: "default", label: "Default", preview: "/app-icon.png" },
];

export function useAppIcon() {
  const [currentIcon] = useState<AppIconTheme>("default");
  const [switching] = useState(false);

  const switchIcon = useCallback(async (_theme: AppIconTheme) => {
    // Only default icon available
  }, []);

  return { currentIcon, switchIcon, switching, options: APP_ICON_OPTIONS };
}
