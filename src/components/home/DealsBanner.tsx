import { Link } from "react-router-dom";
import { ArrowRight, Percent } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const DealsBanner = () => {
  const { t } = useLanguage();

  return (
    <section className="px-4 mt-8">
      <Link
        to="/categories"
        className="block relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary/70 p-5 shadow-premium"
      >
        {/* Animated background circles */}
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10 animate-[pulse_3s_ease-in-out_infinite]" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/10 animate-[pulse_3s_ease-in-out_1s_infinite]" />
        <div className="absolute top-1/2 right-1/3 w-8 h-8 rounded-full bg-white/5 animate-[pulse_3s_ease-in-out_0.5s_infinite]" />

        <div className="relative z-10 flex items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]">
            <Percent className="w-6 h-6 text-white" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-0.5">{t("home.dealsForYou")}</p>
            <p className="text-sm font-bold text-white leading-snug">
              {t("home.dealsText")}
            </p>
          </div>

          {/* CTA arrow */}
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg">
            <ArrowRight className="w-4 h-4 text-primary rtl:rotate-180" />
          </div>
        </div>
      </Link>
    </section>
  );
};

export default DealsBanner;
