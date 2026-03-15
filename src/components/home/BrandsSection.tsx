import { useBrands } from "@/hooks/useProducts";
import { Crown, ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";
import { useState } from "react";

const DESKTOP_INITIAL = 10;

const BrandsSection = () => {
  const { data: brands = [] } = useBrands();
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);

  if (brands.length === 0) return null;

  const desktopBrands = showAll ? brands : brands.slice(0, DESKTOP_INITIAL);
  const hasMore = brands.length > DESKTOP_INITIAL;

  return (
    <section className="px-4 mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
            <Crown className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">{t("home.featuredBrands")}</h2>
            <p className="text-[11px] text-muted-foreground">{t("home.trustedByThousands")}</p>
          </div>
        </div>
      </div>

      {/* Mobile: horizontal scroll — no stagger animations for performance */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 md:hidden">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            to={`/brand/${brand.slug}`}
            className="flex-shrink-0 w-[80px] h-[80px] flex items-center justify-center rounded-2xl bg-card border border-border/40 shadow-sm hover:shadow-premium hover:border-primary/30 active:scale-95 transition-all duration-200 p-3"
            title={brand.name}
          >
            <img src={brand.logo_url || "/placeholder.svg"} alt={brand.name} className="w-full h-full object-contain drop-shadow-sm" loading="lazy" decoding="async" />
          </Link>
        ))}
      </div>

      {/* Desktop: grid */}
      <div className="hidden md:grid md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
        {desktopBrands.map((brand) => (
          <Link
            key={brand.id}
            to={`/brand/${brand.slug}`}
            className="aspect-square flex items-center justify-center rounded-2xl bg-card border border-border/40 shadow-sm hover:shadow-premium hover:border-primary/30 hover:scale-105 transition-all duration-200 p-4"
            title={brand.name}
          >
            <img src={brand.logo_url || "/placeholder.svg"} alt={brand.name} className="w-full h-full object-contain drop-shadow-sm" loading="lazy" decoding="async" />
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="hidden md:flex justify-center mt-4">
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-primary bg-primary/8 rounded-xl hover:bg-primary/15 transition-colors"
          >
            {showAll ? (
              <>Show Less <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>View All Brands ({brands.length}) <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        </div>
      )}
    </section>
  );
};

export default BrandsSection;