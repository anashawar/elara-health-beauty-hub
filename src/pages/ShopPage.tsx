import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon, Grid3X3, LayoutList, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/layout/BottomNav";
import DesktopHeader from "@/components/layout/DesktopHeader";
import FloatingSearch from "@/components/layout/FloatingSearch";
import DesktopFooter from "@/components/layout/DesktopFooter";
import SearchOverlay from "@/components/SearchOverlay";
import ProductCard from "@/components/ProductCard";
import { useCategories, useBrands, concerns, type ProductWithRelations } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";
import SEOHead from "@/components/SEOHead";
import { useActiveOffers, getOfferForProduct } from "@/hooks/useOfferPricing";
import { useUserCity, isBrandAvailableInCity } from "@/hooks/useUserCity";

type ViewMode = "grid" | "list";
type SortKey = "relevance" | "name-az" | "newest" | "price-low" | "price-high";

const PAGE_SIZE = 30;

const CARD_SELECT = `
  id, title, title_ar, title_ku, slug, price, original_price,
  is_new, is_trending, is_pick, in_stock,
  brand_id, category_id,
  categories ( slug ),
  brands ( name, restricted_cities ),
  product_images ( image_url, sort_order )
`;

function mapProduct(p: any, language: "en" | "ar" | "ku"): ProductWithRelations {
  const localizedTitle =
    language === "ar" ? (p.title_ar || p.title) : language === "ku" ? (p.title_ku || p.title) : p.title;
  return {
    id: p.id, title: localizedTitle, slug: p.slug,
    brand: p.brands?.name || "", brand_id: p.brand_id,
    category_id: p.category_id, category_slug: p.categories?.slug || null,
    subcategory_id: null,
    price: Number(p.price),
    originalPrice: p.original_price ? Number(p.original_price) : null,
    image: p.product_images?.[0]?.image_url || "/placeholder.svg",
    images: (p.product_images || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((img: any) => img.image_url),
    tags: [], description: "", benefits: [], usage: "",
    isNew: p.is_new || false, isTrending: p.is_trending || false,
    isPick: p.is_pick || false, inStock: p.in_stock !== false,
    country_of_origin: null, form: null, gender: null,
    volume_ml: null, volume_unit: "ml", application: null,
    skin_type: null, condition: null,
  };
}

const ShopPage = () => {
  const [searchParams] = useSearchParams();
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const { t, language } = useLanguage();
  const userCity = useUserCity();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("relevance");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("cat") ? [searchParams.get("cat")!] : []
  );
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    searchParams.get("brand") ? [searchParams.get("brand")!] : []
  );
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200000]);
  const [activeFilterTab, setActiveFilterTab] = useState("sort");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchQuery); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [selectedCategories, selectedBrands, priceRange, sortBy]);

  // Resolve category slugs to IDs for DB query
  const selectedCategoryIds = selectedCategories
    .map((slug) => categories.find((c) => c.slug === slug)?.id)
    .filter(Boolean) as string[];

  // Resolve brand names to IDs
  const selectedBrandIds = selectedBrands
    .map((name) => brands.find((b: any) => b.name === name)?.id)
    .filter(Boolean) as string[];

  // Server-side paginated query
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["shop-products", language, page, debouncedSearch, selectedCategoryIds, selectedBrandIds, priceRange, sortBy],
    queryFn: async () => {
      let query = supabase.from("products").select(CARD_SELECT, { count: "exact" }) as any;

      // Filters
      if (debouncedSearch.length > 1) {
        query = query.or(`title.ilike.%${debouncedSearch}%,title_ar.ilike.%${debouncedSearch}%,title_ku.ilike.%${debouncedSearch}%`);
      }
      if (selectedCategoryIds.length === 1) {
        query = query.eq("category_id", selectedCategoryIds[0]);
      } else if (selectedCategoryIds.length > 1) {
        query = query.in("category_id", selectedCategoryIds);
      }
      if (selectedBrandIds.length === 1) {
        query = query.eq("brand_id", selectedBrandIds[0]);
      } else if (selectedBrandIds.length > 1) {
        query = query.in("brand_id", selectedBrandIds);
      }
      if (priceRange[0] > 0) query = query.gte("price", priceRange[0]);
      if (priceRange[1] < 200000) query = query.lte("price", priceRange[1]);

      // Sort
      switch (sortBy) {
        case "name-az": query = query.order("title", { ascending: true }); break;
        case "newest": query = query.order("created_at", { ascending: false }); break;
        case "price-low": query = query.order("price", { ascending: true }); break;
        case "price-high": query = query.order("price", { ascending: false }); break;
        default: query = query.order("created_at", { ascending: false }); break;
      }

      // Pagination
      const from = (page - 1) * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data: rows, error, count } = await query;
      if (error) throw error;

      return {
        products: (rows || []).map((p: any) => mapProduct(p, language)),
        total: count || 0,
      };
    },
    placeholderData: (prev) => prev, // keep old data while loading
    staleTime: 2 * 60 * 1000,
  });

  const products = data?.products || [];
  const totalCount = data?.total || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const { data: activeOffers = [] } = useActiveOffers();

  const offerMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getOfferForProduct>>();
    for (const p of products) {
      map.set(p.id, getOfferForProduct(p, activeOffers));
    }
    return map;
  }, [products, activeOffers]);

  const getCatName = useCallback((cat: any) => {
    if (language === "ar" && cat.name_ar) return cat.name_ar;
    if (language === "ku" && cat.name_ku) return cat.name_ku;
    return cat.name;
  }, [language]);

  const getBrandName = useCallback((b: any) => {
    if (language === "ar" && b.name_ar) return b.name_ar;
    if (language === "ku" && b.name_ku) return b.name_ku;
    return b.name;
  }, [language]);

  const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: "relevance", label: t("categories.relevance") },
    { value: "name-az", label: t("categories.nameAZ") },
    { value: "newest", label: t("categories.newest") },
    { value: "price-low", label: t("categories.priceLow") },
    { value: "price-high", label: t("categories.priceHigh") },
  ];

  const activeFilterCount =
    (sortBy !== "relevance" ? 1 : 0) +
    selectedCategories.length +
    selectedBrands.length +
    (priceRange[0] > 0 || priceRange[1] < 200000 ? 1 : 0);

  const toggleCategory = (slug: string) =>
    setSelectedCategories((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  const toggleBrand = (name: string) =>
    setSelectedBrands((prev) => (prev.includes(name) ? prev.filter((b) => b !== name) : [...prev, name]));
  const clearFilters = () => {
    setSortBy("relevance");
    setSelectedCategories([]);
    setSelectedBrands([]);
    setPriceRange([0, 200000]);
    setSearchQuery("");
    setPage(1);
  };

  const topCategories = categories.slice(0, 10);
  const topBrands = brands.filter((b: any) => b.featured).slice(0, 8);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Shop All Beauty & Health Products in Iraq"
        description="Browse 2000+ original health & beauty products on ELARA. Top brands like CeraVe, The Ordinary, L'Oréal. Fast delivery across Iraq."
        canonical="https://elara-health-beauty-hub.lovable.app/shop"
        keywords="shop iraq, beauty products iraq, cosmetics iraq, skincare iraq, ELARA shop, buy beauty products iraq, online pharmacy iraq"
      />
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Hero */}
      <div className="relative bg-gradient-to-br from-primary/8 via-background to-accent/5 border-b border-border/50">
        <div className="app-container px-4 md:px-6 pt-16 md:pt-8 pb-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">{t("common.appName")}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Shop</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount.toLocaleString()} {t("common.products").toLowerCase()}
          </p>
        </div>
      </div>

      {/* Sticky search + filter bar */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border/50">
        <div className="app-container px-4 md:px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("common.search")}
                className="w-full pl-9 rtl:pl-4 rtl:pr-9 pr-8 py-2.5 bg-secondary/60 text-foreground text-sm rounded-xl border border-border/50 placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2">
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
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div className="hidden md:flex items-center gap-1 border border-border/50 rounded-xl overflow-hidden">
              <button onClick={() => setViewMode("grid")} className={`p-2 transition-colors ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick category chips */}
          <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {topCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.slug)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                  selectedCategories.includes(cat.slug)
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-foreground border-border/60 hover:border-primary/40"
                }`}
              >
                <span className="text-sm">{cat.icon}</span>
                {getCatName(cat)}
              </button>
            ))}
            {topBrands.length > 0 && (
              <div className="flex-shrink-0 w-px h-6 self-center bg-border/60 mx-1" />
            )}
            {topBrands.map((brand: any) => (
              <button
                key={brand.id}
                onClick={() => toggleBrand(brand.name)}
                className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                  selectedBrands.includes(brand.name)
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-foreground border-border/60 hover:border-primary/40"
                }`}
              >
                {getBrandName(brand)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active filter pills */}
      {activeFilterCount > 0 && (
        <div className="app-container px-4 md:px-6 pt-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{t("categories.filters")}:</span>
            {selectedCategories.map((slug) => {
              const cat = categories.find((c) => c.slug === slug);
              return cat ? (
                <span key={slug} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                  {getCatName(cat)}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => toggleCategory(slug)} />
                </span>
              ) : null;
            })}
            {selectedBrands.map((name) => (
              <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                {name}
                <X className="w-3 h-3 cursor-pointer" onClick={() => toggleBrand(name)} />
              </span>
            ))}
            {sortBy !== "relevance" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent/60 text-foreground text-xs font-medium rounded-full">
                {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
                <X className="w-3 h-3 cursor-pointer" onClick={() => setSortBy("relevance")} />
              </span>
            )}
            <button onClick={clearFilters} className="text-xs text-destructive font-medium hover:underline">
              {t("categories.clearAll") || "Clear All"}
            </button>
          </div>
        </div>
      )}

      {/* Results bar */}
      <div className="app-container px-4 md:px-6 mt-3 mb-2 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isFetching && !isLoading ? "..." : totalCount.toLocaleString()} {t("common.products").toLowerCase()}
          {totalPages > 1 && ` · ${page}/${totalPages}`}
        </p>
        <button
          onClick={() => setShowFilters(true)}
          className="md:hidden flex items-center gap-1 text-xs text-muted-foreground"
        >
          {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Product Grid */}
      <div className="app-container px-4 md:px-6">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-card border border-border/40 overflow-hidden animate-pulse">
                <div className="aspect-square bg-secondary/60" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-secondary/80 rounded w-3/4" />
                  <div className="h-3 bg-secondary/60 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={
              viewMode === "list"
                ? "flex flex-col gap-3"
                : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
            }
          >
            {products.map((p) => (
              <ProductCard key={p.id} product={p} variant={viewMode === "list" ? "horizontal" : "vertical"} offerPricing={offerMap.get(p.id) ?? null} />
            ))}
          </div>
        )}

        {!isLoading && products.length === 0 && (
          <div className="text-center mt-16 px-4">
            <div className="w-16 h-16 mx-auto mb-4 bg-secondary/60 rounded-full flex items-center justify-center">
              <Search className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold">{t("common.noResults")}</p>
            <p className="text-muted-foreground text-sm mt-1">{t("common.tryDifferent")}</p>
            <button onClick={clearFilters} className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-sm">
              {t("categories.clearAllFilters") || "Clear All Filters"}
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8 mb-4">
            <button
              onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={page === 1}
              className="p-2 rounded-xl border border-border/50 bg-card text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => { setPage(pageNum); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                    page === pageNum
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-card text-foreground border border-border/50 hover:bg-secondary"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              disabled={page === totalPages}
              className="p-2 rounded-xl border border-border/50 bg-card text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        )}
      </div>

      {/* Filter Drawer */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowFilters(false)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-w-lg md:max-w-xl mx-auto max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-border rounded-full" />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <h2 className="text-base font-bold text-foreground">{t("categories.filters")}</h2>
                <button onClick={() => setShowFilters(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="flex border-b border-border overflow-x-auto no-scrollbar">
                {[
                  { key: "sort", label: t("categories.sortBy") },
                  { key: "categories", label: t("nav.categories") || "Categories" },
                  { key: "brands", label: t("categories.brands") },
                  { key: "price", label: t("categories.price") },
                ].map((tab) => (
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

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {activeFilterTab === "sort" && (
                  <div className="space-y-1">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSortBy(opt.value)}
                        className={`w-full text-left rtl:text-right px-4 py-3 rounded-xl text-sm transition-colors ${
                          sortBy === opt.value ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
                {activeFilterTab === "categories" && (
                  <div className="space-y-1">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.slug)}
                        className={`w-full text-left rtl:text-right px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-between ${
                          selectedCategories.includes(cat.slug) ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        <span>{cat.icon} {getCatName(cat)}</span>
                        {selectedCategories.includes(cat.slug) && (
                          <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-primary-foreground text-xs">✓</span>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {activeFilterTab === "brands" && (
                  <div className="space-y-1">
                    {brands.map((brand: any) => (
                      <button
                        key={brand.id}
                        onClick={() => toggleBrand(brand.name)}
                        className={`w-full text-left rtl:text-right px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-between ${
                          selectedBrands.includes(brand.name) ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {brand.logo_url && (
                            <img src={brand.logo_url} alt="" className="w-5 h-5 rounded object-contain" loading="lazy" />
                          )}
                          {getBrandName(brand)}
                        </span>
                        {selectedBrands.includes(brand.name) && (
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
                      <label className="text-sm text-muted-foreground mb-3 block">{t("categories.minPrice")}</label>
                      <input
                        type="range" min={0} max={200000} step={5000}
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                        className="w-full accent-primary"
                      />
                      <p className="text-sm font-medium text-foreground mt-1">{priceRange[0].toLocaleString()} IQD</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-3 block">{t("categories.maxPrice")}</label>
                      <input
                        type="range" min={0} max={200000} step={5000}
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                        className="w-full accent-primary"
                      />
                      <p className="text-sm font-medium text-foreground mt-1">{priceRange[1].toLocaleString()} IQD</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-border flex gap-3">
                <button onClick={clearFilters} className="flex-1 py-3 bg-secondary text-foreground font-semibold rounded-2xl text-sm">
                  {t("categories.clearAll") || "Clear All"}
                </button>
                <button onClick={() => setShowFilters(false)} className="flex-1 py-3 bg-primary text-primary-foreground font-semibold rounded-2xl text-sm">
                  {t("categories.showResults") || "Show Results"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="hidden md:block">
        <DesktopFooter />
      </div>
      <FloatingSearch />
      <BottomNav />
    </div>
  );
};

export default ShopPage;
