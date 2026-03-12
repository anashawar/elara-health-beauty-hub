import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
import { motion } from "framer-motion";
import { useProducts, useBrands } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import BottomNav from "@/components/layout/BottomNav";
import FloatingSearch from "@/components/layout/FloatingSearch";

const BrandPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: products = [] } = useProducts();
  const { data: brands = [] } = useBrands();

  const brand = brands.find((b) => b.id === id);
  const brandProducts = products.filter((p) => p.brand_id === id);

  return (
    <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to={-1 as any} onClick={(e) => { e.preventDefault(); window.history.back(); }} className="p-1.5 -ml-1 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="text-lg font-display font-bold text-foreground">{brand?.name || "Brand"}</h1>
        </div>
      </header>

      {/* Brand Hero */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4 bg-card rounded-3xl border border-border/50 p-6 flex flex-col items-center text-center"
      >
        {brand?.logo_url && (
          <div className="w-20 h-20 rounded-2xl bg-secondary overflow-hidden mb-4 shadow-md">
            <img src={brand.logo_url} alt={brand.name} className="w-full h-full object-cover" />
          </div>
        )}
        <h2 className="text-xl font-display font-bold text-foreground">{brand?.name}</h2>
        <p className="text-xs text-muted-foreground mt-1.5">
          {brandProducts.length} product{brandProducts.length !== 1 ? "s" : ""} available
        </p>
      </motion.div>

      {/* Products Grid */}
      {brandProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-16 px-4">
          <Package className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No products found for this brand</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 mt-5">
          {brandProducts.map((product, idx) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default BrandPage;
