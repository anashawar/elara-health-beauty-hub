import { Scan, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

const SkinScanBanner = () => {
  const { language } = useLanguage();

  return (
    <section className="px-4 mt-6">
      <Link to="/skin-scan" className="block">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="relative rounded-3xl overflow-hidden shadow-float group"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500 via-primary to-violet-500" />
          <div className="absolute inset-0 opacity-30" style={{
            background: 'radial-gradient(circle at 90% 10%, hsl(352 80% 70% / 0.5) 0%, transparent 40%), radial-gradient(circle at 10% 90%, hsl(280 60% 60% / 0.4) 0%, transparent 40%)'
          }} />

          {/* Animated glow */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/15 blur-3xl"
          />

          {/* Scan grid lines */}
          <div className="absolute inset-0 opacity-[0.06]" style={{
            backgroundImage: 'linear-gradient(0deg, white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }} />

          {/* Scanning line */}
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 bottom-0 w-16 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          />

          {/* Content */}
          <div className="relative p-5 flex gap-4 items-center z-10">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="flex-shrink-0 w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg relative"
            >
              <Scan className="w-8 h-8 text-white" />
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 border-2 border-white/30 rounded-2xl"
              />
            </motion.div>

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

            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg"
            >
              <ArrowRight className="w-5 h-5 text-rose-500 rtl:rotate-180" />
            </motion.div>
          </div>
        </motion.div>
      </Link>
    </section>
  );
};

export default SkinScanBanner;
