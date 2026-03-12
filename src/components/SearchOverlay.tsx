import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, ArrowRight, SlidersHorizontal, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useProducts, useCategories, useBrands, formatPrice, concerns } from "@/hooks/useProducts";
import { motion, AnimatePresence } from "framer-motion";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SMART_SUGGESTIONS = [
  { label: "Best for acne", query: "acne", icon: "🎯" },
  { label: "Sunscreen SPF 50+", query: "sunscreen", icon: "☀️" },
  { label: "Anti-aging serums", query: "retinol serum", icon: "✨" },
  { label: "Vitamin C glow", query: "vitamin c", icon: "🍊" },
  { label: "Hair loss solutions", query: "hair loss", icon: "💇" },
  { label: "Dry skin relief", query: "moisturizer dry", icon: "💧" },
  { label: "Korean skincare", query: "korean", icon: "🇰🇷" },
  { label: "Under 15,000 IQD", query: "budget", icon: "💰" },
];

const TRENDING_TERMS = ["CeraVe", "Retinol", "Niacinamide", "Collagen", "Hair Serum", "SPF"];

const SearchOverlay = ({ isOpen, onClose }: SearchOverlayProps) => {
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setActiveFilter(null);
      setPriceFilter(null);
    }
  }, [isOpen]);

  const filteredResults = useMemo(() => {
    if (query.length < 2 && !activeFilter && !priceFilter) return { products: [], categories: [], brands: [] };

    const q = query.toLowerCase();

    // Enhanced product matching — search across multiple fields
    let matchedProducts = products.filter(p => {
      const searchFields = [
        p.title,
        p.brand,
        p.description,
        p.skin_type,
        p.application,
        p.form,
        p.country_of_origin,
        ...(p.tags || []),
        ...(p.benefits || []),
      ].filter(Boolean).join(" ").toLowerCase();

      const matchesQuery = q.length >= 2 ? searchFields.includes(q) : true;

      // Price filter
      let matchesPrice = true;
      if (priceFilter === "under15k") matchesPrice = p.price < 15000;
      else if (priceFilter === "15k-30k") matchesPrice = p.price >= 15000 && p.price <= 30000;
      else if (priceFilter === "30k-60k") matchesPrice = p.price >= 30000 && p.price <= 60000;
      else if (priceFilter === "over60k") matchesPrice = p.price > 60000;

      // Category/concern filter
      let matchesFilter = true;
      if (activeFilter) {
        const concern = concerns.find(c => c.id === activeFilter);
        if (concern) {
          matchesFilter = p.tags.some(t => t.toLowerCase().includes(concern.name.toLowerCase())) ||
            (p.skin_type || "").toLowerCase().includes(concern.name.toLowerCase()) ||
            (p.description || "").toLowerCase().includes(concern.name.toLowerCase());
        } else {
          // It's a category slug
          matchesFilter = p.category_slug === activeFilter;
        }
      }

      return matchesQuery && matchesPrice && matchesFilter;
    });

    // Special "budget" keyword
    if (q === "budget") {
      matchedProducts = products.filter(p => p.price < 15000).sort((a, b) => a.price - b.price);
    }

    const matchedCategories = q.length >= 2
      ? categories.filter(c => c.name.toLowerCase().includes(q))
      : [];

    const matchedBrands = q.length >= 2
      ? brands.filter(b => b.name.toLowerCase().includes(q))
      : [];

    return {
      products: matchedProducts.slice(0, 20),
      categories: matchedCategories,
      brands: matchedBrands,
    };
  }, [query, activeFilter, priceFilter, products, categories, brands]);

  const hasResults = filteredResults.products.length > 0 || filteredResults.categories.length > 0 || filteredResults.brands.length > 0;
  const isSearching = query.length >= 2 || activeFilter || priceFilter;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="max-w-lg mx-auto flex flex-col h-full">
        {/* Search header */}
        <div className="border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search products, brands, concerns..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
            />
            {(query || activeFilter || priceFilter) && (
              <button onClick={() => { setQuery(""); setActiveFilter(null); setPriceFilter(null); }} className="p-1">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <button onClick={onClose} className="text-xs text-primary font-semibold">
              Cancel
            </button>
          </div>

          {/* Quick filter chips */}
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            {/* Price filters */}
            {[
              { key: "under15k", label: "Under 15K" },
              { key: "15k-30k", label: "15K–30K" },
              { key: "30k-60k", label: "30K–60K" },
              { key: "over60k", label: "60K+" },
            ].map(pf => (
              <button
                key={pf.key}
                onClick={() => setPriceFilter(prev => prev === pf.key ? null : pf.key)}
                className={`flex-shrink-0 text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  priceFilter === pf.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {pf.label}
              </button>
            ))}
            {/* Concern filters */}
            {concerns.slice(0, 4).map(c => (
              <button
                key={c.id}
                onClick={() => setActiveFilter(prev => prev === c.id ? null : c.id)}
                className={`flex-shrink-0 text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  activeFilter === c.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Default state: suggestions */}
          {!isSearching && (
            <div className="space-y-6">
              {/* AI Smart Suggestions */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <p className="text-xs font-bold text-foreground uppercase tracking-wider">Recommended for You</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SMART_SUGGESTIONS.map(s => (
                    <button
                      key={s.query}
                      onClick={() => setQuery(s.query)}
                      className="flex items-center gap-2 px-3 py-2.5 bg-card rounded-xl border border-border/50 hover:border-primary/30 transition-all text-left"
                    >
                      <span className="text-base">{s.icon}</span>
                      <span className="text-xs font-medium text-foreground leading-tight">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Trending */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Trending</p>
                <div className="flex flex-wrap gap-2">
                  {TRENDING_TERMS.map(term => (
                    <button
                      key={term}
                      onClick={() => setQuery(term)}
                      className="text-xs bg-secondary text-secondary-foreground px-3 py-2 rounded-xl hover:bg-accent transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Browse by Category */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Browse Categories</p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {categories.slice(0, 6).map(cat => (
                    <Link
                      key={cat.id}
                      to={`/category/${cat.slug}`}
                      onClick={onClose}
                      className="flex-shrink-0 flex flex-col items-center gap-1.5 w-16"
                    >
                      <span className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-xl">
                        {cat.icon}
                      </span>
                      <span className="text-[10px] font-medium text-foreground text-center leading-tight">{cat.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active filter label */}
          {isSearching && (activeFilter || priceFilter) && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {activeFilter && (
                <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                  {concerns.find(c => c.id === activeFilter)?.icon || "📂"}{" "}
                  {concerns.find(c => c.id === activeFilter)?.name || categories.find(c => c.slug === activeFilter)?.name}
                  <button onClick={() => setActiveFilter(null)}><X className="w-3 h-3" /></button>
                </span>
              )}
              {priceFilter && (
                <span className="text-[10px] bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                  💰 {priceFilter}
                  <button onClick={() => setPriceFilter(null)}><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          {/* Brand results */}
          {filteredResults.brands.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Brands</p>
              {filteredResults.brands.map(b => (
                <Link
                  key={b.id}
                  to={`/brand/${b.id}`}
                  onClick={onClose}
                  className="flex items-center justify-between py-2.5 border-b border-border/50"
                >
                  <div className="flex items-center gap-3">
                    {b.logo_url && (
                      <img src={b.logo_url} alt={b.name} className="w-8 h-8 rounded-lg object-cover bg-secondary" />
                    )}
                    <span className="text-sm font-medium text-foreground">{b.name}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}

          {/* Category results */}
          {filteredResults.categories.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Categories</p>
              {filteredResults.categories.map(cat => (
                <Link
                  key={cat.id}
                  to={`/category/${cat.slug}`}
                  onClick={onClose}
                  className="flex items-center justify-between py-2.5 border-b border-border/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-sm font-medium text-foreground">{cat.name}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}

          {/* Product results */}
          {filteredResults.products.length > 0 && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Products ({filteredResults.products.length})
              </p>
              {filteredResults.products.map(p => (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  onClick={onClose}
                  className="flex items-center gap-3 py-2.5 border-b border-border/50"
                >
                  <img src={p.image} alt={p.title} className="w-14 h-14 rounded-xl object-cover bg-secondary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{p.brand}</p>
                    <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-foreground">{formatPrice(p.price)}</span>
                      {p.originalPrice && (
                        <span className="text-[10px] text-muted-foreground line-through">{formatPrice(p.originalPrice)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* No results */}
          {isSearching && !hasResults && (
            <div className="text-center mt-12">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm font-medium text-foreground mb-1">No results found</p>
              <p className="text-xs text-muted-foreground mb-4">
                Try different keywords or browse our suggestions
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {TRENDING_TERMS.slice(0, 4).map(term => (
                  <button
                    key={term}
                    onClick={() => { setQuery(term); setActiveFilter(null); setPriceFilter(null); }}
                    className="text-xs bg-secondary text-secondary-foreground px-3 py-2 rounded-xl"
                  >
                    Try "{term}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
