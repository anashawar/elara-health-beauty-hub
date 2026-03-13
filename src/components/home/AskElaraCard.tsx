import { Sparkles, ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const AskElaraCard = () => {
  const { t } = useLanguage();

  return (
    <section className="px-4 mt-8">
      <Link to="/elara-ai" className="block">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden shadow-float group"
        >
          {/* Mesh gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/85 to-violet-600" />
          <div className="absolute inset-0 opacity-40" style={{
            background: 'radial-gradient(circle at 80% 20%, hsl(352 42% 55% / 0.4) 0%, transparent 50%), radial-gradient(circle at 20% 80%, hsl(38 70% 55% / 0.3) 0%, transparent 50%)'
          }} />
          
          {/* Floating glass orbs */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/15 blur-2xl"
          />
          <motion.div
            animate={{ scale: [1, 1.25, 1], opacity: [0.1, 0.18, 0.1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full bg-white/10 blur-2xl"
          />

          {/* Content */}
          <div className="relative p-5 flex gap-4 items-center z-10">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg"
            >
              <Sparkles className="w-7 h-7 text-white" />
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">AI Assistant</span>
                <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_hsl(142_76%_36%/0.5)]"
                />
              </div>
              <h3 className="text-xl font-display font-bold text-white mb-1.5">{t("home.askElara")}</h3>
              <p className="text-[13px] text-white/65 leading-snug line-clamp-2">
                {t("home.askElaraDesc")}
              </p>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {[t("home.askElaraQ1"), t("home.askElaraQ2")].map(q => (
                  <span key={q} className="text-[10px] bg-white/10 backdrop-blur-sm text-white/80 px-2.5 py-1.5 rounded-xl border border-white/10">
                    {q}
                  </span>
                ))}
              </div>
            </div>

            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg"
            >
              <ArrowRight className="w-5 h-5 text-primary rtl:rotate-180" />
            </motion.div>
          </div>
        </motion.div>
      </Link>
    </section>
  );
};

export default AskElaraCard;
