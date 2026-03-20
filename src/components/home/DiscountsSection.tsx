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
      {/* Header */}
      <div className="mx-4 rounded-t-2xl px-5 pt-5 pb-4 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--rose)) 100%)'
      }}>
        {/* Subtle decorative mesh */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          background: 'radial-gradient(circle at 80% 20%, hsl(0 0% 100%) 0%, transparent 45%)'
        }} />
        <div className="absolute -bottom-4 -right-4 rtl:-right-auto rtl:-left-4 opacity-[0.06]">
          <Percent className="w-24 h-24 text-white rotate-[-15deg]" />
        </div>

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"
            >
              <Percent className="w-[18px] h-[18px] text-primary-foreground" />
            </motion.div>
            <div>
              <h2 className="text-lg font-sans font-bold text-primary-foreground tracking-tight leading-tight">
                {t("home.discounts")}
              </h2>
              <p className="text-[11px] text-primary-foreground/60 mt-0.5 font-medium">
                {t("home.discountsHurry")}
              </p>
            </div>
          </div>
          <Link
            to="/collection/discounts"
            className="flex items-center gap-0.5 text-[11px] font-semibold text-primary-foreground/90 bg-white/12 px-3 py-1.5 rounded-lg hover:bg-white/20 active:scale-[0.97] transition-all"
          >
            {t("common.viewAll")} <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>
      </div>

      {/* Product scroll area */}
      <div className="mx-4 rounded-b-2xl border border-t-0 border-border/50 bg-card pb-1">
        <div className="flex gap-3 overflow-x-auto px-3 py-3 scrollbar-hide scroll-smooth snap-x snap-mandatory"
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
