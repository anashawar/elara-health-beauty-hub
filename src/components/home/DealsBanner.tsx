import { Link } from "react-router-dom";
import { ArrowRight, Percent } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { motion } from "framer-motion";

const DealsBanner = () => {
  const { t } = useLanguage();

  return (
    <section className="px-4 mt-8">
      <Link
        to="/categories"
        className="block relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/85 to-primary/65 p-5 shadow-float group"
      >
        {/* Glass decoration */}
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/8 blur-xl" />
        <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/8 blur-xl" />

        <div className="relative z-10 flex items-center gap-4">
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/10"
          >
            <Percent className="w-6 h-6 text-white" />
          </motion.div>

          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mb-0.5">{t("home.dealsForYou")}</p>
            <p className="text-sm font-bold text-white leading-snug">
              {t("home.dealsText")}
            </p>
          </div>

          <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <ArrowRight className="w-4 h-4 text-primary rtl:rotate-180" />
          </div>
        </div>
      </Link>
    </section>
  );
};

export default DealsBanner;
