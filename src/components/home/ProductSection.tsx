import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "@/components/ProductCard";
import type { ProductWithRelations } from "@/hooks/useProducts";

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: ProductWithRelations[];
  viewAllLink?: string;
  horizontal?: boolean;
}

const ProductSection = ({ title, subtitle, products, viewAllLink, horizontal = true }: ProductSectionProps) => {
  if (products.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between px-4 mb-3">
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {viewAllLink && (
          <Link to={viewAllLink} className="flex items-center gap-0.5 text-xs font-semibold text-primary">
            View All <ChevronRight className="w-3.5 h-3.5" />
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
        <div className="grid grid-cols-2 gap-3 px-4">
          {products.map(p => (
            <ProductCard key={p.id} product={p} variant="vertical" />
          ))}
        </div>
      )}
    </section>
  );
};

export default ProductSection;
