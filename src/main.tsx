import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Capacitor } from '@capacitor/core';

// Configure StatusBar for iOS safe areas
if (Capacitor.isNativePlatform()) {
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setOverlaysWebView({ overlay: true });
    StatusBar.setStyle({ style: Style.Dark });
  }).catch(() => {});

  // Initialize OneSignal on native
  import('@/lib/nativePush').then(({ initOneSignal }) => {
    initOneSignal();
  }).catch((e) => console.warn("Early native push init failed:", e));
}

createRoot(document.getElementById("root")!).render(<App />);
