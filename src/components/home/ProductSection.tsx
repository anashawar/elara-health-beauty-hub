import { ChevronRight, Flame, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import type { ProductWithRelations } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: ProductWithRelations[];
  viewAllLink?: string;
  horizontal?: boolean;
  variant?: "default" | "trending";
}

const ProductSection = ({ title, subtitle, products, viewAllLink, horizontal = true, variant = "default" }: ProductSectionProps) => {
  const { t } = useLanguage();
  if (products.length === 0) return null;

  const isTrending = variant === "trending";

  if (isTrending) {
    return (
      <section className="mt-8">
        {/* Bold trending header with gradient background */}
        <div className="mx-4 rounded-t-2xl bg-gradient-to-r from-primary via-primary/90 to-violet-600 px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
              >
                <Flame className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <h2 className="text-xl font-display font-bold text-white">{title}</h2>
                {subtitle && <p className="text-[12px] text-white/70 mt-0.5">{subtitle}</p>}
              </div>
            </div>
            {viewAllLink && (
              <Link to={viewAllLink} className="flex items-center gap-0.5 text-xs font-bold text-white bg-white/20 backdrop-blur-sm px-3.5 py-2 rounded-xl hover:bg-white/30 transition-colors border border-white/10">
                {t("common.viewAll")} <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
            )}
          </div>
        </div>

        {/* Products on gradient-tinted background */}
        <div className="mx-4 rounded-b-2xl bg-gradient-to-b from-primary/8 to-transparent pb-2">
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 py-4">
            {products.map(p => (
              <ProductCard key={p.id} product={p} variant="horizontal" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between px-4 mb-4">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {viewAllLink && (
          <Link to={viewAllLink} className="flex items-center gap-0.5 text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors">
            {t("common.viewAll")} <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        )}
      </div>
      {horizontal ? (
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2">
          {products.map(p => (
            <ProductCard key={p.id} product={p} variant="horizontal" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-4">
          {products.map(p => (
            <ProductCard key={p.id} product={p} variant="vertical" />
          ))}
        </div>
      )}
    </section>
  );
};

export default ProductSection;
