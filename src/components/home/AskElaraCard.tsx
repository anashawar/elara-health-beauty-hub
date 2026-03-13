import { Sparkles, ArrowRight, MessageCircle } from "lucide-react";
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
          className="relative rounded-2xl overflow-hidden shadow-premium-lg group"
        >
          {/* Bold gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-violet-600" />
          
          {/* Animated orbs */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/20 blur-xl"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/15 blur-xl"
          />
          <motion.div
            animate={{ y: [0, -8, 0], x: [0, 4, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-4 right-12 w-3 h-3 rounded-full bg-white/30"
          />
          <motion.div
            animate={{ y: [0, 6, 0], x: [0, -3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-8 right-8 w-2 h-2 rounded-full bg-white/25"
          />

          {/* Content */}
          <div className="relative p-5 flex gap-4 items-center z-10">
            {/* Icon */}
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg"
            >
              <Sparkles className="w-7 h-7 text-white" />
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/70">AI Assistant</span>
                <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1.5 h-1.5 rounded-full bg-green-400"
                />
              </div>
              <h3 className="text-xl font-display font-bold text-white mb-1.5">{t("home.askElara")}</h3>
              <p className="text-[13px] text-white/75 leading-snug line-clamp-2">
                {t("home.askElaraDesc")}
              </p>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {[t("home.askElaraQ1"), t("home.askElaraQ2")].map(q => (
                  <span key={q} className="text-[10px] bg-white/15 backdrop-blur-sm text-white/90 px-2.5 py-1 rounded-lg border border-white/10">
                    {q}
                  </span>
                ))}
              </div>
            </div>

            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg"
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
