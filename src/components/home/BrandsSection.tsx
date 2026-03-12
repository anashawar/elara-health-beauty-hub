import { useBrands } from "@/hooks/useProducts";

const BrandsSection = () => {
  const { data: brands = [] } = useBrands();

  if (brands.length === 0) return null;

  return (
    <section className="px-4 mt-8">
      <h2 className="text-lg font-display font-bold text-foreground mb-4">Featured Brands</h2>
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
        {brands.map(brand => (
          <div key={brand.id} className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-secondary shadow-sm">
              <img src={brand.logo_url || "/placeholder.svg"} alt={brand.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground">{brand.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BrandsSection;
