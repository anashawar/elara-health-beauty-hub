import { Capacitor } from "@capacitor/core";
import { motion } from "framer-motion";
import { Smartphone, Download, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import BottomNav from "@/components/layout/BottomNav";

interface NativeAppGateProps {
  children: React.ReactNode;
  featureName?: string;
}

export default function NativeAppGate({ children, featureName = "ELARA AI" }: NativeAppGateProps) {
  const isNative = Capacitor.isNativePlatform();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const isRtl = language === "ar" || language === "ku";

  if (isNative) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRtl ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/30" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary">
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <h1 className="text-lg font-display font-bold">{featureName}</h1>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-500 via-primary to-violet-500 mx-auto mb-6 flex items-center justify-center shadow-xl">
            <Smartphone className="w-12 h-12 text-white" />
          </div>

          <h2 className="text-xl font-display font-black text-foreground mb-3">
            {t("nativeApp.availableOnApp")}
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            {language === "ar"
              ? `للحصول على أفضل نتائج، ${featureName} متاح حصرياً على تطبيق ELARA لأجهزة iOS و Android. حمل التطبيق الآن واستمتع بتجربة كاملة!`
              : language === "ku"
                ? `بۆ باشترین ئەنجام، ${featureName} تایبەتە بە ئەپی ELARA بۆ iOS و Android. ئێستا ئەپەکە دابەزێنە!`
                : `For the best experience, ${featureName} is exclusively available on the ELARA app for iOS and Android. Download the app now for full access!`}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => navigate("/install")}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-rose-500 via-primary to-violet-500 text-white font-semibold rounded-2xl shadow-lg text-sm"
            >
              <Download className="w-4 h-4" />
              {language === "ar" ? "حمّل تطبيق ELARA" : language === "ku" ? "ئەپی ELARA دابەزێنە" : "Download ELARA App"}
            </button>

            <button
              onClick={() => navigate("/")}
              className="w-full py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {language === "ar" ? "تصفح المتجر" : language === "ku" ? "گەڕان لە فرۆشگا" : "Continue Browsing"}
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-base">🍎</span>
              </div>
              iOS
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                <span className="text-base">🤖</span>
              </div>
              Android
            </div>
          </div>
        </motion.div>
      </div>
      <BottomNav />
    </div>
  );
}
