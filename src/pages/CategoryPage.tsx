import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "@/components/layout/BottomNav";
import ProductCard from "@/components/ProductCard";
import { products, categories } from "@/data/products";

const CategoryPage = () => {
  const { id } = useParams<{ id: string }>();
  const category = categories.find(c => c.id === id);
  const categoryProducts = id ? products.filter(p => p.category === id) : products;

  return (
    <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/" className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="text-lg font-display font-bold text-foreground">{category?.name || "All Products"}</h1>
        </div>
      </header>

      {!id && (
        <div className="px-4 mt-4">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {categories.map(cat => (
              <Link key={cat.id} to={`/category/${cat.id}`} className="flex-shrink-0 px-4 py-2 bg-secondary text-secondary-foreground text-xs font-medium rounded-xl hover:bg-accent transition-colors">
                {cat.icon} {cat.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 px-4 mt-4">
        {categoryProducts.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {categoryProducts.length === 0 && (
        <p className="text-center text-muted-foreground mt-12 text-sm">No products found in this category</p>
      )}

      <BottomNav />
    </div>
  );
};

export default CategoryPage;
