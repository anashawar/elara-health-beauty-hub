import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

/** Fallback version for local web/dev only */
const FALLBACK_APP_VERSION = "1.1.0";

function compareVersions(current: string, minimum: string): boolean {
  const c = current.split(".").map(Number);
  const m = minimum.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((c[i] || 0) < (m[i] || 0)) return true;
    if ((c[i] || 0) > (m[i] || 0)) return false;
  }
  return false;
}

interface AppConfig {
  min_ios_version: string;
  min_android_version: string;
  update_message: string | null;
  update_message_ar: string | null;
  update_message_ku: string | null;
  ios_store_url: string | null;
  android_store_url: string | null;
}

export default function ForceUpdateGate({ children }: { children: React.ReactNode }) {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const { language } = useLanguage();

  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!isNative) return;

    let cancelled = false;

    const checkVersion = async () => {
      const [{ data }, appInfo] = await Promise.all([
        supabase.from("app_config").select("*").eq("id", "main").single(),
        CapacitorApp.getInfo().catch(() => null),
      ]);

      if (cancelled || !data) return;

      const cfg = data as unknown as AppConfig;
      const currentVersion = appInfo?.version || FALLBACK_APP_VERSION;
      const minVersion = platform === "ios" ? cfg.min_ios_version : cfg.min_android_version;

      setConfig(cfg);
      setNeedsUpdate(compareVersions(currentVersion, minVersion));
    };

    checkVersion();

    return () => {
      cancelled = true;
    };
  }, [isNative, platform]);

  if (!needsUpdate || !config) return <>{children}</>;

  const message =
    language === "ar" ? config.update_message_ar : language === "ku" ? config.update_message_ku : config.update_message;

  const storeUrl = platform === "ios" ? config.ios_store_url : config.android_store_url;
  const isRtl = language === "ar" || language === "ku";

  return (
    <div
      className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-6"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/60 mx-auto mb-6 flex items-center justify-center shadow-xl">
          <span className="text-4xl">🚀</span>
        </div>

        <h1 className="text-xl font-display font-bold text-foreground mb-3">
          {language === "ar" ? "تحديث مطلوب" : language === "ku" ? "نوێکردنەوە پێویستە" : "Update Required"}
        </h1>

        <p className="text-sm text-muted-foreground leading-relaxed mb-8">
          {message || "A new version of ELARA is available. Please update to continue."}
        </p>

        {storeUrl && (
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-4 bg-primary text-primary-foreground font-bold rounded-2xl text-sm shadow-lg"
          >
            {language === "ar" ? "تحديث الآن" : language === "ku" ? "ئێستا نوێ بکەرەوە" : "Update Now"}
          </a>
        )}
      </div>
    </div>
  );
}
