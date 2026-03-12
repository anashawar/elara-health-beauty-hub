import { useState, useRef, useEffect } from "react";
import { Search, X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useProducts, useCategories } from "@/hooks/useProducts";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchOverlay = ({ isOpen, onClose }: SearchOverlayProps) => {
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  const filteredProducts = query.length > 1
    ? products.filter(p => p.title.toLowerCase().includes(query.toLowerCase()) || p.brand.toLowerCase().includes(query.toLowerCase()))
    : [];

  const filteredCategories = query.length > 1
    ? categories.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background animate-fade-up">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products, brands, categories..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
          />
          <button onClick={onClose} className="p-1">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="px-4 py-4 overflow-y-auto max-h-[calc(100vh-60px)]">
          {query.length < 2 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Popular Searches</p>
              <div className="flex flex-wrap gap-2">
                {["Sunscreen", "Vitamin C", "Hair Serum", "CeraVe", "Retinol", "Collagen"].map(term => (
                  <button key={term} onClick={() => setQuery(term)} className="text-xs bg-secondary text-secondary-foreground px-3 py-2 rounded-xl">
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredCategories.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Categories</p>
              {filteredCategories.map(cat => (
                <Link key={cat.id} to={`/category/${cat.id}`} onClick={onClose} className="flex items-center justify-between py-2.5 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-sm font-medium text-foreground">{cat.name}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}

          {filteredProducts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Products</p>
              {filteredProducts.map(p => (
                <Link key={p.id} to={`/product/${p.id}`} onClick={onClose} className="flex items-center gap-3 py-2.5 border-b border-border/50">
                  <img src={p.image} alt={p.title} className="w-12 h-12 rounded-xl object-cover bg-secondary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">{p.brand}</p>
                    <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {query.length >= 2 && filteredProducts.length === 0 && filteredCategories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-8">No results found for "{query}"</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
