import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const brandBanners = [
  {
    name: "Bioderma",
    slug: "bioderma",
    tagline: "Top Recommended",
    subtitle: "Gentle Care",
    bg: "from-sky-100 to-blue-200",
    accent: "bg-blue-500",
    textColor: "text-blue-900",
    tagColor: "bg-blue-500 text-white",
  },
  {
    name: "Biosar",
    slug: "biosar",
    tagline: "Up to 30% OFF",
    subtitle: "Scientific & Natural",
    bg: "from-violet-100 to-purple-200",
    accent: "bg-purple-500",
    textColor: "text-purple-900",
    tagColor: "bg-purple-500 text-white",
  },
  {
    name: "Centrum",
    slug: "centrum",
    tagline: "Better Health",
    subtitle: "Essential Vitamins",
    bg: "from-emerald-100 to-teal-200",
    accent: "bg-emerald-500",
    textColor: "text-emerald-900",
    tagColor: "bg-emerald-600 text-white",
  },
  {
    name: "CeraVe",
    slug: "cerave",
    tagline: "100% Original",
    subtitle: "Skin Barrier Repair",
    bg: "from-amber-50 to-orange-100",
    accent: "bg-orange-500",
    textColor: "text-orange-900",
    tagColor: "bg-rose-500 text-white",
  },
];

const BrandBanners = () => {
  const { t, isRTL } = useLanguage();

  return (
    <section className="px-4 mt-8">
      <div className="grid grid-cols-2 gap-3">
        {brandBanners.map((brand, i) => (
          <Link
            to={`/brand/${brand.slug}`}
            key={brand.slug}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${brand.bg} p-4 flex flex-col justify-between min-h-[140px] group transition-transform active:scale-[0.97]`}
          >
            {/* Tag */}
            <span className={`self-start text-[10px] font-bold px-2.5 py-1 rounded-full ${brand.tagColor} shadow-sm`}>
              {brand.tagline}
            </span>

            {/* Text */}
            <div className="mt-auto">
              <p className={`text-[11px] font-medium ${brand.textColor} opacity-70`}>
                {brand.subtitle}
              </p>
              <h3 className={`text-lg font-display font-bold ${brand.textColor} leading-tight`}>
                {brand.name}
              </h3>
            </div>

            {/* CTA pill */}
            <div className={`mt-2 inline-flex items-center gap-1 self-start text-[10px] font-bold px-3 py-1.5 rounded-full ${brand.tagColor} shadow-md group-hover:shadow-lg transition-shadow`}>
              {t("home.buyNow") || "Buy now"}
              <ArrowRight className={`w-3 h-3 ${isRTL ? "rotate-180" : ""}`} />
            </div>

            {/* Decorative circle */}
            <div className={`absolute -bottom-6 ${isRTL ? "-left-6" : "-right-6"} w-24 h-24 rounded-full ${brand.accent} opacity-10`} />
            <div className={`absolute -top-4 ${isRTL ? "-left-4" : "-right-4"} w-16 h-16 rounded-full ${brand.accent} opacity-[0.07]`} />
          </Link>
        ))}
      </div>
    </section>
  );
};

export default BrandBanners;
