import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Download, Share, Plus, ArrowLeft, Smartphone, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

const InstallPage = () => {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream);
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4"
        >
          <CheckCircle2 className="w-10 h-10 text-primary" />
        </motion.div>
        <h2 className="text-xl font-display font-bold text-foreground mb-2">{t("install.alreadyInstalled")}</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">{t("install.alreadyInstalledDesc")}</p>
        <Link to="/home" className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-2xl text-sm">
          {t("install.goToHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto flex flex-col">
      <header className="px-4 py-3 border-b border-border">
        <Link to="/home" className="p-1">
          <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
        </Link>
      </header>

      <div className="flex-1 px-6 py-8 flex flex-col items-center">
        <img src="/pwa-icon-192.png" alt="ELARA" className="w-20 h-20 rounded-2xl shadow-lg mb-5" />
        <h1 className="text-2xl font-display font-bold text-foreground text-center">{t("install.title")}</h1>
        <p className="text-sm text-muted-foreground text-center mt-2 max-w-xs">
          {t("install.desc")}
        </p>

        <div className="w-full mt-8 space-y-3">
          {[
            { icon: "⚡", title: t("install.instantAccess"), desc: t("install.instantAccessDesc") },
            { icon: "📴", title: t("install.worksOffline"), desc: t("install.worksOfflineDesc") },
            { icon: "🔔", title: t("install.fullScreen"), desc: t("install.fullScreenDesc") },
          ].map(item => (
            <div key={item.title} className="flex items-center gap-3 p-3.5 bg-card rounded-2xl border border-border/50">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {deferredPrompt ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleInstall}
            className="w-full mt-8 flex items-center justify-center gap-2 py-4 bg-primary text-primary-foreground font-bold rounded-2xl text-sm shadow-lg"
          >
            <Download className="w-5 h-5" />
            {t("install.installNow")}
          </motion.button>
        ) : isIOS ? (
          <div className="w-full mt-8 bg-card rounded-2xl border border-border/50 p-5">
            <p className="text-sm font-bold text-foreground mb-3 text-center">{t("install.howToInstallIOS")}</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-foreground">{t("install.step1")}</span>
                  <Share className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground font-semibold">{t("install.share")}</span>
                  <span className="text-sm text-foreground">{t("install.button")}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-foreground">{t("install.step2")}</span>
                  <Plus className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground font-semibold">{t("install.addToHomeScreen")}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</div>
                <span className="text-sm text-foreground">{t("install.step3Tap")} <span className="font-semibold">{t("install.step3Add")}</span> {t("install.step3Done")}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full mt-8 bg-card rounded-2xl border border-border/50 p-5 text-center">
            <Smartphone className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-foreground font-medium">{t("install.openInChrome")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("install.chromeMenu")}</p>
          </div>
        )}
      </div>

      <div className="px-5 py-4 text-center">
        <p className="text-[10px] text-muted-foreground">ELARA — {t("common.tagline")}</p>
      </div>
    </div>
  );
};

export default InstallPage;
