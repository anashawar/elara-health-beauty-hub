import { initializeApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";
import { supabase } from "@/integrations/supabase/client";

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let cachedConfig: Record<string, string> | null = null;

async function getConfig() {
  if (cachedConfig) return cachedConfig;
  try {
    const { data, error } = await supabase.functions.invoke("get-firebase-config");
    if (error) throw error;
    cachedConfig = data;
    return data;
  } catch (e) {
    console.warn("Failed to fetch Firebase config:", e);
    return null;
  }
}

async function getFirebaseApp() {
  if (app) return app;
  const config = await getConfig();
  if (!config || !config.apiKey) return null;
  app = initializeApp(config);
  return app;
}

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  if (messaging) return messaging;
  try {
    const fbApp = await getFirebaseApp();
    if (!fbApp) return null;
    messaging = getMessaging(fbApp);
    return messaging;
  } catch (e) {
    console.warn("Firebase Messaging not supported:", e);
    return null;
  }
}

export async function requestFCMToken(): Promise<string | null> {
  const m = await getFirebaseMessaging();
  if (!m) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const config = await getConfig();
  if (!config?.vapidKey) return null;

  try {
    const token = await getToken(m, { vapidKey: config.vapidKey });
    return token;
  } catch (e) {
    console.error("Failed to get FCM token:", e);
    return null;
  }
}

export async function getFirebaseConfig() {
  return getConfig();
}

export function onForegroundMessage(callback: (payload: any) => void): () => void {
  let unsub: (() => void) | null = null;
  getFirebaseMessaging().then((m) => {
    if (m) unsub = onMessage(m, callback);
  });
  return () => { unsub?.(); };
}
