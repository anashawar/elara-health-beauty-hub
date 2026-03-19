import { memo, useMemo } from "react";
import { ChevronRight, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "@/components/ProductCard";
import type { ProductWithRelations } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";
import { useActiveOffers, getOfferForProduct } from "@/hooks/useOfferPricing";

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: ProductWithRelations[];
  viewAllLink?: string;
  horizontal?: boolean;
  variant?: "default" | "trending";
}

const ProductSection = memo(({ title, subtitle, products, viewAllLink, horizontal = true, variant = "default" }: ProductSectionProps) => {
  const { t } = useLanguage();
  const { data: activeOffers = [] } = useActiveOffers();

  // Pre-compute offer pricing for all products once
  const offerMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getOfferForProduct>>();
    for (const p of products) {
      map.set(p.id, getOfferForProduct(p, activeOffers));
    }
    return map;
  }, [products, activeOffers]);

  if (products.length === 0) return null;

  const isTrending = variant === "trending";

  if (isTrending) {
    return (
      <section className="mt-8">
        <div className="mx-4 rounded-t-3xl bg-gradient-to-r from-primary via-primary/85 to-violet-600 px-5 pt-5 pb-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{
            background: 'radial-gradient(circle at 90% 30%, hsl(352 42% 55% / 0.4) 0%, transparent 40%)'
          }} />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center border border-white/10">
                <Flame className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-white tracking-tight">{title}</h2>
                {subtitle && <p className="text-[12px] text-white/60 mt-0.5">{subtitle}</p>}
              </div>
            </div>
            {viewAllLink && (
              <Link to={viewAllLink} className="flex items-center gap-0.5 text-xs font-bold text-white bg-white/15 px-3.5 py-2 rounded-xl border border-white/10">
                {t("common.viewAll")} <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Link>
            )}
          </div>
        </div>

        <div className="mx-4 rounded-b-3xl bg-gradient-to-b from-primary/6 to-transparent pb-2">
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 py-4 md:hidden" style={{ WebkitOverflowScrolling: "touch" }}>
            {products.map(p => (
              <ProductCard key={p.id} product={p} variant="horizontal" offerPricing={offerMap.get(p.id) ?? null} />
            ))}
          </div>
          <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-4 py-4">
            {products.slice(0, 10).map(p => (
              <ProductCard key={p.id} product={p} variant="vertical" offerPricing={offerMap.get(p.id) ?? null} />
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
          <h2 className="text-xl font-display font-bold text-foreground tracking-tight">{title}</h2>
          {subtitle && <p className="text-[13px] text-muted-foreground/70 mt-0.5">{subtitle}</p>}
        </div>
        {viewAllLink && (
          <Link to={viewAllLink} className="flex items-center gap-0.5 text-xs font-semibold text-primary bg-primary/8 px-3.5 py-2 rounded-xl">
            {t("common.viewAll")} <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </Link>
        )}
      </div>
      {horizontal ? (
        <>
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-2 md:hidden" style={{ WebkitOverflowScrolling: "touch" }}>
            {products.map(p => (
              <ProductCard key={p.id} product={p} variant="horizontal" offerPricing={offerMap.get(p.id) ?? null} />
            ))}
          </div>
          <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-4">
            {products.slice(0, 10).map(p => (
              <ProductCard key={p.id} product={p} variant="vertical" offerPricing={offerMap.get(p.id) ?? null} />
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 px-4">
          {products.map(p => (
            <ProductCard key={p.id} product={p} variant="vertical" offerPricing={offerMap.get(p.id) ?? null} />
          ))}
        </div>
      )}
    </section>
  );
});

ProductSection.displayName = "ProductSection";

export default ProductSection;
