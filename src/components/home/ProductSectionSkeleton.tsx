const ProductCardSkeleton = () => (
  <div className="flex-shrink-0 w-[152px] rounded-3xl border border-border/30 bg-card overflow-hidden animate-pulse">
    <div className="aspect-square bg-secondary/60" />
    <div className="p-3 space-y-2">
      <div className="h-2.5 w-12 bg-secondary/80 rounded" />
      <div className="h-3 w-full bg-secondary/80 rounded" />
      <div className="h-3 w-3/4 bg-secondary/80 rounded" />
      <div className="h-3.5 w-16 bg-secondary/80 rounded mt-1" />
      <div className="h-8 w-full bg-secondary/60 rounded-xl mt-2" />
    </div>
  </div>
);

const ProductSectionSkeleton = () => (
  <section className="mt-8 px-4">
    <div className="flex items-center justify-between mb-4">
      <div className="space-y-1.5">
        <div className="h-5 w-32 bg-secondary/80 rounded animate-pulse" />
        <div className="h-3 w-24 bg-secondary/60 rounded animate-pulse" />
      </div>
      <div className="h-3 w-16 bg-secondary/60 rounded animate-pulse" />
    </div>
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 4 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  </section>
);

export default ProductSectionSkeleton;
