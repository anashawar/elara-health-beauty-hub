import { memo, useMemo } from "react";
import { ChevronRight, Percent } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "@/components/ProductCard";
import type { ProductWithRelations } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";
import { useActiveOffers, getOfferForProduct } from "@/hooks/useOfferPricing";
import { useIsMobile } from "@/hooks/use-mobile";

interface DiscountsSectionProps {
  products: ProductWithRelations[];
}

const DiscountsSection = memo(({ products }: DiscountsSectionProps) => {
  const { t } = useLanguage();
  const { data: activeOffers = [] } = useActiveOffers();
  const isMobile = useIsMobile();

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
      <div
        className="mx-4 rounded-t-2xl px-5 pt-5 pb-4 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--rose)) 100%)",
        }}
      >
        {/* Subtle decorative mesh */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            background:
              "radial-gradient(circle at 80% 20%, hsl(0 0% 100%) 0%, transparent 45%)",
          }}
        />
        <div className="absolute -bottom-4 -right-4 rtl:-right-auto rtl:-left-4 opacity-[0.06]">
          <Percent className="w-24 h-24 text-white rotate-[-15deg]" />
        </div>

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Percent className="w-[18px] h-[18px] text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-sans font-bold text-primary-foreground tracking-tight leading-tight">
                {t("home.discounts")}
              </h2>
              <p className="text-[11px] md:text-xs text-primary-foreground/60 mt-0.5 font-medium">
                {t("home.discountsHurry")}
              </p>
            </div>
          </div>
          <Link
            to="/collection/discounts"
            className="flex items-center gap-0.5 text-[11px] md:text-xs font-semibold text-primary-foreground/90 bg-white/12 px-3 py-1.5 rounded-lg hover:bg-white/20 active:scale-[0.97] transition-all"
          >
            {t("common.viewAll")}{" "}
            <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        </div>
      </div>

      {/* Product area — horizontal scroll on mobile, grid on desktop */}
      <div className="mx-4 rounded-b-2xl border border-t-0 border-border/50 bg-card pb-1">
        {isMobile ? (
          <div
            className="flex gap-3 overflow-x-auto px-3 py-3 scrollbar-hide scroll-smooth snap-x snap-mandatory"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {products.map((product) => (
              <div
                key={product.id}
                className="snap-start shrink-0 w-[154px]"
              >
                <ProductCard
                  product={product}
                  offerPricing={offerMap.get(product.id) ?? null}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-4 py-4">
            {products.map((product) => (
              <div key={product.id}>
                <ProductCard
                  product={product}
                  offerPricing={offerMap.get(product.id) ?? null}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
});

DiscountsSection.displayName = "DiscountsSection";
export default DiscountsSection;
