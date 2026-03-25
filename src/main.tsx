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

  // Request push permission eagerly on native — iOS requires early prompt
  import('@/lib/nativePush').then(({ registerNativePush }) => {
    registerNativePush().then((token) => {
      if (token) console.log("Native push registered early, token:", token.substring(0, 10) + "...");
    });
  }).catch((e) => console.warn("Early native push init failed:", e));
}

createRoot(document.getElementById("root")!).render(<App />);
