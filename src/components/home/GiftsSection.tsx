import { memo, useRef, useState, useEffect } from "react";
import { Gift, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "@/components/ProductCard";
import type { ProductWithRelations } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";

interface GiftsSectionProps {
  products: ProductWithRelations[];
}

const GiftsSection = memo(({ products }: GiftsSectionProps) => {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      setScrollProgress(max > 0 ? el.scrollLeft / max : 0);
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [products.length]);

  if (products.length === 0) return null;

  return (
    <section className="mt-8 relative">
      {/* Gift header with gradient */}
      <div className="mx-4 rounded-t-3xl relative overflow-hidden" style={{
        background: "linear-gradient(135deg, hsl(352 42% 48%) 0%, hsl(330 55% 40%) 40%, hsl(280 50% 35%) 100%)"
      }}>
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full" style={{ background: "radial-gradient(circle, hsl(38 70% 55% / 0.25) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 left-10 w-20 h-20 rounded-full" style={{ background: "radial-gradient(circle, hsl(268 84% 58% / 0.2) 0%, transparent 70%)" }} />
          <span className="absolute top-3 right-8 text-2xl opacity-20 animate-pulse">🎁</span>
          <span className="absolute bottom-2 right-24 text-lg opacity-15" style={{ animationDelay: "1s" }}>✨</span>
          <span className="absolute top-5 left-[60%] text-sm opacity-10">🎀</span>
        </div>

        <div className="relative px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-lg">
                <Gift className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-white tracking-tight">
                  {t("home.bestGifts") || "Best Gifts"}
                </h2>
              </div>
            </div>
            <Link
              to="/collection/gifts"
              className="flex items-center gap-1 text-[11px] font-semibold text-white/70 hover:text-white transition-colors bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10"
            >
              {t("common.viewAll") || "View All"}
              <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </Link>
          </div>

          {/* Scroll progress bar */}
          <div className="mt-3.5 h-[3px] bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-150 ease-out"
              style={{
                width: `${Math.max(20, scrollProgress * 100)}%`,
                background: "linear-gradient(90deg, hsl(38 70% 55%), hsl(38 90% 65%))"
              }}
            />
          </div>
        </div>
      </div>

      {/* Product scroller */}
      <div className="mx-4 rounded-b-3xl bg-card border border-t-0 border-border/40 shadow-premium overflow-hidden">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto no-scrollbar px-4 py-4"
          style={{ WebkitOverflowScrolling: "touch", scrollSnapType: "x proximity" }}
        >
          {products.map((product) => (
            <div key={product.id} className="flex-shrink-0 scroll-snap-align-start" style={{ width: "152px" }}>
              <ProductCard product={product} variant="horizontal" />
            </div>
          ))}

          {/* "More gifts" teaser card */}
          <Link
            to="/collection/gifts"
            className="flex-shrink-0 w-[152px] rounded-3xl border border-border/30 overflow-hidden flex flex-col items-center justify-center gap-3 p-4 hover:bg-secondary/50 transition-colors"
            style={{ background: "linear-gradient(135deg, hsl(352 42% 48% / 0.05), hsl(280 50% 35% / 0.08))" }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: "linear-gradient(135deg, hsl(352 42% 48% / 0.12), hsl(280 50% 35% / 0.15))" }}>
              🎁
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-foreground">{t("common.viewAll") || "View All"}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("home.moreGifts") || "More gift ideas"}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" />
          </Link>
        </div>
      </div>
    </section>
  );
});

GiftsSection.displayName = "GiftsSection";

export default GiftsSection;
