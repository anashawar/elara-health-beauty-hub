import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { Sparkles } from "lucide-react";

const concernsData = [
  { id: "acne", key: "concerns.acne", icon: "🎯" },
  { id: "dryskin", key: "concerns.drySkin", icon: "💧" },
  { id: "hyperpigmentation", key: "concerns.hyperpigmentation", icon: "🌟" },
  { id: "hairloss", key: "concerns.hairLoss", icon: "💇" },
  { id: "dandruff", key: "concerns.dandruff", icon: "❄️" },
  { id: "sensitive", key: "concerns.sensitiveSkin", icon: "🌸" },
  { id: "immunity", key: "concerns.immunity", icon: "🛡️" },
  { id: "weightloss", key: "concerns.weightLoss", icon: "⚡" },
];

const ConcernsSection = () => {
  const { t } = useLanguage();

  return (
    <section className="px-4 mt-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-lg font-display font-bold text-foreground">{t("home.shopByConcern")}</h2>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {concernsData.map(c => (
          <Link
            key={c.id}
            to={`/concern/${c.id}`}
            className="flex flex-col items-center gap-1.5 p-3 bg-card rounded-2xl border border-border shadow-sm hover:shadow-premium hover:border-primary/30 transition-all duration-200"
          >
            <span className="text-2xl">{c.icon}</span>
            <span className="text-[10px] font-bold text-center text-foreground leading-tight">{t(c.key)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ConcernsSection;
