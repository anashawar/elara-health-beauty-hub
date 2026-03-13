import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { motion } from "framer-motion";
import { Stethoscope } from "lucide-react";

const concernsData = [
  { id: "acne", key: "concerns.acne", icon: "🎯", gradient: "from-rose-500 to-pink-600" },
  { id: "dryskin", key: "concerns.drySkin", icon: "💧", gradient: "from-sky-500 to-blue-600" },
  { id: "hyperpigmentation", key: "concerns.hyperpigmentation", icon: "🌟", gradient: "from-amber-500 to-orange-600" },
  { id: "hairloss", key: "concerns.hairLoss", icon: "💇", gradient: "from-violet-500 to-purple-600" },
  { id: "dandruff", key: "concerns.dandruff", icon: "❄️", gradient: "from-cyan-500 to-teal-600" },
  { id: "sensitive", key: "concerns.sensitiveSkin", icon: "🌸", gradient: "from-pink-500 to-rose-600" },
  { id: "immunity", key: "concerns.immunity", icon: "🛡️", gradient: "from-emerald-500 to-green-600" },
  { id: "weightloss", key: "concerns.weightLoss", icon: "⚡", gradient: "from-yellow-500 to-amber-600" },
];

const ConcernsSection = () => {
  const { t } = useLanguage();

  return (
    <section className="px-4 mt-8">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
          <Stethoscope className="w-4.5 h-4.5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">{t("home.shopByConcern")}</h2>
          <p className="text-[11px] text-muted-foreground">Find what your skin needs</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {concernsData.map((c, idx) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
          >
            <Link
              to={`/concern/${c.id}`}
              className="flex items-center gap-3 p-3.5 bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-premium hover:border-primary/30 transition-all duration-200 group"
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.gradient} flex items-center justify-center shadow-sm flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                <span className="text-xl drop-shadow-sm">{c.icon}</span>
              </div>
              <span className="text-[13px] font-bold text-foreground leading-tight">{t(c.key)}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default ConcernsSection;
