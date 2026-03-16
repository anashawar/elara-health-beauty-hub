import { Sparkles, ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";

const AskElaraCard = () => {
  const { t } = useLanguage();

  return (
    <section className="px-4 mt-8">
      <Link to="/elara-ai" className="block">
        <div className="relative rounded-3xl overflow-hidden shadow-float group active:scale-[0.98] transition-transform duration-200">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/85 to-violet-600" />
          <div className="absolute inset-0 opacity-40" style={{
            background: 'radial-gradient(circle at 80% 20%, hsl(352 42% 55% / 0.4) 0%, transparent 50%), radial-gradient(circle at 20% 80%, hsl(38 70% 55% / 0.3) 0%, transparent 50%)'
          }} />

          {/* Static orbs */}
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10 blur-2xl" />

          {/* Content */}
          <div className="relative p-5 flex gap-4 items-center z-10">
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">AI Assistant</span>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_hsl(142_76%_36%/0.5)]" />
              </div>
              <h3 className="text-xl font-display font-bold text-white mb-1.5">{t("home.askElara")}</h3>
              <p className="text-[13px] text-white/65 leading-snug line-clamp-2">
                {t("home.askElaraDesc")}
              </p>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {[t("home.askElaraQ1"), t("home.askElaraQ2")].map(q => (
                  <span key={q} className="text-[10px] bg-white/10 text-white/80 px-2.5 py-1.5 rounded-xl border border-white/10">
                    {q}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <ArrowRight className="w-5 h-5 text-primary rtl:rotate-180" />
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
};

export default AskElaraCard;
