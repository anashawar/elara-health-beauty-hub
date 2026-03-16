import { Scan, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

const SkinScanBanner = () => {
  const { language } = useLanguage();

  return (
    <section className="px-4 mt-6">
      <Link to="/skin-scan" className="block">
        <div className="relative rounded-3xl overflow-hidden shadow-float group active:scale-[0.98] transition-transform duration-200">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500 via-primary to-violet-500" />
          <div className="absolute inset-0 opacity-30" style={{
            background: 'radial-gradient(circle at 90% 10%, hsl(352 80% 70% / 0.5) 0%, transparent 40%), radial-gradient(circle at 10% 90%, hsl(280 60% 60% / 0.4) 0%, transparent 40%)'
          }} />

          {/* Static glow */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 blur-3xl" />

          {/* Grid lines — pure CSS */}
          <div className="absolute inset-0 opacity-[0.06]" style={{
            backgroundImage: 'linear-gradient(0deg, white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }} />

          {/* Content */}
          <div className="relative p-5 flex gap-4 items-center z-10">
            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
              <Scan className="w-8 h-8 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3 h-3 text-white/70" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">
                  {language === "ar" ? "ميزة متقدمة" : language === "ku" ? "تایبەتمەندی پێشکەوتوو" : "Advanced Feature"}
                </span>
              </div>
              <h3 className="text-lg font-display font-bold text-white mb-1">
                {language === "ar" ? "ELARA AI محلل البشرة" : language === "ku" ? "ELARA AI شیکەری پێست" : "ELARA AI Skin Analyzer"}
              </h3>
              <p className="text-[12px] text-white/65 leading-snug">
                {language === "ar" ? "امسح وجهك الآن واحصل على تحليل بشرة مفصل مع AI!" : language === "ku" ? "ئێستا دەموچاوت بسکان بکە و شیکردنەوەی پێست وەربگرە!" : "Scan your face now & get a detailed skin analysis with AI!"}
              </p>
            </div>

            <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <ArrowRight className="w-5 h-5 text-rose-500 rtl:rotate-180" />
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
};

export default SkinScanBanner;
