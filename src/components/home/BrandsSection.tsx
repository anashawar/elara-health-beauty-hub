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
      {/* Bold header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
            <Crown className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">{t("home.featuredBrands")}</h2>
            <p className="text-[11px] text-muted-foreground">Trusted by thousands</p>
          </div>
        </div>
      </div>

      {/* Brands scroll */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {brands.map((brand, idx) => (
          <motion.div
            key={brand.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Link
              to={`/brand/${brand.slug}`}
              className="flex-shrink-0 w-[88px] flex flex-col items-center gap-2.5 p-3 bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-premium hover:border-primary/30 hover:scale-105 transition-all duration-200"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary/50 p-1.5">
                <img src={brand.logo_url || "/placeholder.svg"} alt={brand.name} className="w-full h-full object-contain" loading="lazy" />
              </div>
              <span className="text-[11px] font-bold text-foreground text-center leading-tight line-clamp-2">{brand.name}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default BrandsSection;
