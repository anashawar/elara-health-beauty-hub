import { useBrands } from "@/hooks/useProducts";
import { Star } from "lucide-react";

const BrandsSection = () => {
  const { data: brands = [] } = useBrands();

  if (brands.length === 0) return null;

  return (
    <section className="px-4 mt-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Star className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-lg font-display font-bold text-foreground">Featured Brands</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {brands.map(brand => (
          <div
            key={brand.id}
            className="flex-shrink-0 w-20 flex flex-col items-center gap-2 p-3 bg-card rounded-2xl border border-border shadow-sm hover:shadow-premium hover:border-primary/30 transition-all duration-200"
          >
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-secondary">
              <img src={brand.logo_url || "/placeholder.svg"} alt={brand.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <span className="text-[10px] font-bold text-foreground text-center leading-tight">{brand.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BrandsSection;
