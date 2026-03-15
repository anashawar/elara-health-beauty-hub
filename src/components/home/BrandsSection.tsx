import { useBrands } from "@/hooks/useProducts";
import { Crown } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const BrandsSection = () => {
  const { data: brands = [] } = useBrands();
  const { t } = useLanguage();

  if (brands.length === 0) return null;

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

      {/* Mobile: horizontal scroll, Desktop: grid */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 md:hidden">
        {brands.map((brand, idx) => (
          <motion.div
            key={brand.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.35 }}
          >
            <Link
              to={`/brand/${brand.slug}`}
              className="flex-shrink-0 w-[80px] h-[80px] flex items-center justify-center rounded-2xl bg-card border border-border/40 shadow-sm hover:shadow-premium hover:border-primary/30 hover:scale-110 transition-all duration-300 p-3"
              title={brand.name}
            >
              <img src={brand.logo_url || "/placeholder.svg"} alt={brand.name} className="w-full h-full object-contain drop-shadow-sm" loading="lazy" />
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="hidden md:grid md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4">
        {brands.map((brand, idx) => (
          <motion.div
            key={brand.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03, duration: 0.35 }}
          >
            <Link
              to={`/brand/${brand.slug}`}
              className="aspect-square flex items-center justify-center rounded-2xl bg-card border border-border/40 shadow-sm hover:shadow-premium hover:border-primary/30 hover:scale-105 transition-all duration-300 p-4"
              title={brand.name}
            >
              <img src={brand.logo_url || "/placeholder.svg"} alt={brand.name} className="w-full h-full object-contain drop-shadow-sm" loading="lazy" />
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default BrandsSection;
