import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/layout/BottomNav";
import ProductCard from "@/components/ProductCard";
import { useProducts, useCategories, concerns } from "@/hooks/useProducts";

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "name-az", label: "Name A-Z" },
  { value: "newest", label: "Newest" },
  { value: "price-low", label: "Price (Lowest First)" },
  { value: "price-high", label: "Price (Highest First)" },
];

const CategoryPage = () => {
  const { id } = useParams<{ id: string }>();
  const category = categories.find(c => c.id === id);

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200000]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [activeFilterTab, setActiveFilterTab] = useState<string>("sort");

  const activeFilterCount = (sortBy !== "relevance" ? 1 : 0) + selectedBrands.length + selectedConditions.length + (priceRange[0] > 0 || priceRange[1] < 200000 ? 1 : 0);

  const filteredProducts = useMemo(() => {
    let result = id ? products.filter(p => p.category === id) : products;

    if (searchQuery.length > 1) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    }

    if (selectedBrands.length > 0) {
      result = result.filter(p => selectedBrands.includes(p.brand));
    }

    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);

    if (selectedConditions.length > 0) {
      result = result.filter(p => p.tags.some(t => selectedConditions.includes(t)));
    }

    switch (sortBy) {
      case "name-az": result.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "newest": result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
      case "price-low": result.sort((a, b) => a.price - b.price); break;
      case "price-high": result.sort((a, b) => b.price - a.price); break;
    }

    return result;
  }, [id, searchQuery, sortBy, selectedBrands, priceRange, selectedConditions]);

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  };

  const toggleCondition = (condition: string) => {
    setSelectedConditions(prev => prev.includes(condition) ? prev.filter(c => c !== condition) : [...prev, condition]);
  };

  const clearFilters = () => {
    setSortBy("relevance");
    setSelectedBrands([]);
    setPriceRange([0, 200000]);
    setSelectedConditions([]);
  };

  return (
    <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/" className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <h1 className="text-lg font-bold text-foreground">{category?.name || "All Products"}</h1>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search for..."
              className="w-full pl-9 pr-8 py-2.5 bg-secondary/60 text-foreground text-sm rounded-xl border border-border/50 placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(true)}
            className="relative p-2.5 bg-secondary/60 rounded-xl border border-border/50 hover:bg-accent transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4 text-foreground" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Category chips when no specific category */}
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

      {/* Results count */}
      <div className="px-4 mt-3 mb-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}</p>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-xs text-primary font-medium">Clear filters</button>
        )}
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-2 gap-3 px-4">
        {filteredProducts.map(p => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center mt-12 px-4">
          <p className="text-muted-foreground text-sm">No products found</p>
          <button onClick={clearFilters} className="text-primary text-sm font-medium mt-2">Clear all filters</button>
        </div>
      )}

      {/* Filter Drawer */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowFilters(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-w-lg mx-auto max-h-[85vh] flex flex-col"
            >
              {/* Drawer handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-border rounded-full" />
              </div>

              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <h2 className="text-base font-bold text-foreground">Filters</h2>
                <button onClick={() => setShowFilters(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Filter tabs */}
              <div className="flex border-b border-border overflow-x-auto no-scrollbar">
                {[
                  { key: "sort", label: "Sort by" },
                  { key: "brands", label: "Brands" },
                  { key: "price", label: "Price" },
                  { key: "condition", label: "Condition" },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilterTab(tab.key)}
                    className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                      activeFilterTab === tab.key
                        ? "text-primary border-primary"
                        : "text-muted-foreground border-transparent"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Filter content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {activeFilterTab === "sort" && (
                  <div className="space-y-1">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setSortBy(opt.value)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${
                          sortBy === opt.value
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {activeFilterTab === "brands" && (
                  <div className="space-y-1">
                    {BRANDS.map(brand => (
                      <button
                        key={brand}
                        onClick={() => toggleBrand(brand)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-between ${
                          selectedBrands.includes(brand)
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        {brand}
                        {selectedBrands.includes(brand) && (
                          <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-primary-foreground text-xs">✓</span>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {activeFilterTab === "price" && (
                  <div className="space-y-6 pt-2">
                    <div>
                      <label className="text-sm text-muted-foreground mb-3 block">Min Price (IQD)</label>
                      <input
                        type="range"
                        min={0}
                        max={200000}
                        step={5000}
                        value={priceRange[0]}
                        onChange={e => setPriceRange([Number(e.target.value), priceRange[1]])}
                        className="w-full accent-primary"
                      />
                      <p className="text-sm font-medium text-foreground mt-1">{priceRange[0].toLocaleString()} IQD</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-3 block">Max Price (IQD)</label>
                      <input
                        type="range"
                        min={0}
                        max={200000}
                        step={5000}
                        value={priceRange[1]}
                        onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])}
                        className="w-full accent-primary"
                      />
                      <p className="text-sm font-medium text-foreground mt-1">{priceRange[1].toLocaleString()} IQD</p>
                    </div>
                  </div>
                )}

                {activeFilterTab === "condition" && (
                  <div className="space-y-1">
                    {concerns.map(c => (
                      <button
                        key={c.id}
                        onClick={() => toggleCondition(c.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-between ${
                          selectedConditions.includes(c.id)
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        <span>{c.icon} {c.name}</span>
                        {selectedConditions.includes(c.id) && (
                          <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-primary-foreground text-xs">✓</span>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Apply button */}
              <div className="px-5 py-4 border-t border-border flex gap-3">
                <button
                  onClick={clearFilters}
                  className="flex-1 py-3 text-sm font-medium text-muted-foreground bg-secondary rounded-xl hover:bg-accent transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-[2] py-3 text-sm font-medium text-primary-foreground bg-primary rounded-xl hover:opacity-90 transition-opacity"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default CategoryPage;
