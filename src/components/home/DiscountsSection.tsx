import { memo, useMemo } from "react";
import { ChevronRight, Percent, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import type { ProductWithRelations } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";
import { useActiveOffers, getOfferForProduct } from "@/hooks/useOfferPricing";

interface DiscountsSectionProps {
  products: ProductWithRelations[];
}

const DiscountsSection = memo(({ products }: DiscountsSectionProps) => {
  const { t } = useLanguage();
  const { data: activeOffers = [] } = useActiveOffers();

  const offerMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getOfferForProduct>>();
    for (const p of products) {
      map.set(p.id, getOfferForProduct(p, activeOffers));
    }
    return map;
  }, [products, activeOffers]);

  if (products.length === 0) return null;

  return (
    <section className="mt-8">
      {/* Header with gradient accent */}
      <div className="mx-4 rounded-t-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-5 pt-5 pb-4 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-20" style={{
          background: 'radial-gradient(circle at 15% 50%, hsl(0 0% 100% / 0.3) 0%, transparent 50%), radial-gradient(circle at 85% 20%, hsl(0 0% 100% / 0.2) 0%, transparent 40%)'
        }} />
        <div className="absolute top-2 right-6 rtl:right-auto rtl:left-6 opacity-10">
          <Percent className="w-20 h-20 text-white rotate-12" />
        </div>

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center border border-white/15 backdrop-blur-sm"
            >
              <Timer className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <h2 className="text-xl font-display font-bold text-white tracking-tight">
                {t("home.discounts")}
              </h2>
              <p className="text-[12px] text-white/70 mt-0.5 font-medium">
                {t("home.discountsHurry")}
              </p>
            </div>
          </div>
          <Link
            to="/collection/discounts"
            className="flex items-center gap-0.5 text-xs font-bold text-white bg-white/20 px-3.5 py-2 rounded-xl border border-white/15 backdrop-blur-sm hover:bg-white/30 transition-colors"
          >
            {t("common.viewAll")} <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>
      </div>

      {/* Product scroll area */}
      <div className="mx-4 rounded-b-3xl bg-gradient-to-b from-orange-500/8 to-transparent pb-2">
        <div className="flex gap-3 overflow-x-auto px-4 py-4 scrollbar-hide scroll-smooth snap-x snap-mandatory"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {products.map((product) => (
            <div key={product.id} className="snap-start shrink-0 w-[154px] md:w-[180px]">
              <ProductCard product={product} offerPricing={offerMap.get(product.id) ?? null} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

DiscountsSection.displayName = "DiscountsSection";
export default DiscountsSection;
