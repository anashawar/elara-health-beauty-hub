import { ChevronRight, Flame } from "lucide-react";
import { Link } from "react-router-dom";
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

  return (
    <section className={`mt-8 ${isTrending ? "py-6 bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5" : ""}`}>
      <div className="flex items-center justify-between px-4 mb-4">
        <div className="flex items-center gap-2">
          {isTrending && (
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Flame className="w-4.5 h-4.5 text-primary" />
            </div>
          )}
          <div>
            <h2 className={`font-display font-bold text-foreground ${isTrending ? "text-[22px]" : "text-xl"}`}>{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
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
