import { useState, useMemo } from "react";
import { useParams, useLocation as useRouterLocation, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, SlidersHorizontal, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/layout/BottomNav";
import DesktopHeader from "@/components/layout/DesktopHeader";
import FloatingSearch from "@/components/layout/FloatingSearch";
import DesktopFooter from "@/components/layout/DesktopFooter";
import SearchOverlay from "@/components/SearchOverlay";
import ProductCard from "@/components/ProductCard";
import { useCategoryProductsPaginated, useCategoryProductCount, useCategories, useSubcategories, concerns, type ProductWithRelations } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";
import SEOHead, { breadcrumbJsonLd } from "@/components/SEOHead";
import { useActiveOffers, getOfferForProduct } from "@/hooks/useOfferPricing";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const concernKeywords: Record<string, string[]> = {
  acne: ["acne", "blemish", "pimple", "breakout", "zit"],
  dryskin: ["dry skin", "dry", "hydrat", "moistur", "dehydrat"],
  hyperpigmentation: ["hyperpigmentation", "pigment", "dark spot", "brighten", "whiten", "melasma", "uneven tone"],
  hairloss: ["hair loss", "hairloss", "hair fall", "thinning hair", "hair growth", "alopecia"],
  dandruff: ["dandruff", "flak", "scalp", "seborrh"],
  sensitive: ["sensitive", "redness", "irritat", "calm", "sooth", "rosacea", "gentle"],
  oilyskin: ["oily", "oil control", "sebum", "mattify", "shine control", "pore", "t-zone"],
  antiaging: ["anti-aging", "anti aging", "wrinkle", "fine line", "firming", "collagen", "retinol", "aging"],
};

function matchesConcern(p: { condition?: string | null; tags: string[]; description: string; title: string; benefits: string[] }, concernId: string): boolean {
  if (p.condition) {
    const conditions = p.condition.split(",").map(s => s.trim().toLowerCase());
    if (conditions.includes(concernId)) return true;
  }
  const idNormalized = concernId.replace("dryskin", "dry skin").replace("hairloss", "hair loss").replace("weightloss", "weight loss");
  if (p.tags.some(t => t.toLowerCase().includes(idNormalized))) return true;
  const keywords = concernKeywords[concernId];
  if (keywords) {
    const text = [p.title, p.description, ...p.benefits, ...p.tags].join(" ").toLowerCase();
    if (keywords.some(kw => text.includes(kw))) return true;
  }
  return false;
}

const CategoryPage = () => {
  const { id } = useParams<{ id: string }>();
  const routerLocation = useRouterLocation();
  const isConcernRoute = routerLocation.pathname.startsWith("/concern/");
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSubId = searchParams.get("sub") || null;
  const { t, language } = useLanguage();

  // For concern routes, use a fast server-side query instead of loading all products
  const { data: concernProducts = [], isLoading: loadingConcernProducts } = useQuery<ProductWithRelations[]>({
    queryKey: ["concern-products", id, language],
    queryFn: async () => {
      if (!id) return [];
      const keywords = concernKeywords[id] || [id];
      // Build an OR filter: condition matches OR title/description contains keywords
      const orFilters = [
        `condition.ilike.%${id}%`,
        ...keywords.slice(0, 3).map(kw => `title.ilike.%${kw}%`),
        ...keywords.slice(0, 3).map(kw => `description.ilike.%${kw}%`),
      ];
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, title, title_ar, title_ku, slug, price, original_price,
          is_new, is_trending, is_pick, in_stock,
          brand_id, category_id, subcategory_id,
          condition,
          brands ( name, restricted_cities ),
          categories ( slug ),
          product_images ( image_url, sort_order )
        `)
        .or(orFilters.join(","))
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []).map((p: any) => {
        const lt = language === "ar" ? (p.title_ar || p.title) : language === "ku" ? (p.title_ku || p.title) : p.title;
        return {
          id: p.id, title: lt, slug: p.slug,
          brand: p.brands?.name || "", brand_id: p.brand_id,
          category_id: p.category_id, category_slug: p.categories?.slug || null,
          subcategory_id: p.subcategory_id || null,
          price: Number(p.price), originalPrice: p.original_price ? Number(p.original_price) : null,
          image: p.product_images?.[0]?.image_url || "/placeholder.svg",
          images: (p.product_images || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)).map((img: any) => img.image_url),
          tags: [],
          description: "", benefits: [], usage: "",
          isNew: p.is_new || false, isTrending: p.is_trending || false, isPick: p.is_pick || false,
          country_of_origin: null, form: null, gender: null,
          volume_ml: null, volume_unit: "ml",
          application: null, skin_type: null, condition: p.condition || null,
          inStock: p.in_stock !== false,
          _brandRestrictedCities: p.brands?.restricted_cities || null,
        } as any;
      });
    },
    enabled: isConcernRoute && !!id,
    staleTime: 5 * 60 * 1000,
  });

  // Pagination state for category products
  const [catPage, setCatPage] = useState(0);

  // Reset page when category or subcategory changes
  const catPageKey = `${id}-${activeSubId}`;
  const [prevKey, setPrevKey] = useState(catPageKey);
  if (catPageKey !== prevKey) {
    setCatPage(0);
    setPrevKey(catPageKey);
  }

  const { data: catPaginated, isLoading: loadingCatProducts } = useCategoryProductsPaginated(
    !isConcernRoute ? id : undefined,
    !isConcernRoute ? activeSubId : null,
    catPage
  );
  const { data: catTotalCount = 0 } = useCategoryProductCount(
    !isConcernRoute ? id : undefined,
    !isConcernRoute ? activeSubId : null
  );
  const categoryProducts = catPaginated?.products || [];
  const catHasMore = catPaginated?.hasMore || false;

  const { data: categories = [] } = useCategories();
  const { data: subcategories = [] } = useSubcategories();
  const [searchOpen, setSearchOpen] = useState(false);
  const category = !isConcernRoute ? categories.find(c => c.slug === id) : null;
  const activeConcern = isConcernRoute ? concerns.find(c => c.id === id) : null;
  const baseProducts = isConcernRoute ? concernProducts : categoryProducts;
  const isLoadingProducts = isConcernRoute ? loadingConcernProducts : loadingCatProducts;
  const BRANDS = [...new Set(baseProducts.map(p => p.brand))];
  const { data: activeOffers = [] } = useActiveOffers();

  const categorySubs = useMemo(() => {
    if (!category) return [];
    return subcategories.filter(s => s.category_id === category.id);
  }, [category, subcategories]);

  const getSubName = (sub: any) => {
    if (language === "ar" && sub.name_ar) return sub.name_ar;
    if (language === "ku" && sub.name_ku) return sub.name_ku;
    return sub.name;
  };

  const SORT_OPTIONS = [
    { value: "relevance", label: t("categories.relevance") },
    { value: "name-az", label: t("categories.nameAZ") },
    { value: "newest", label: t("categories.newest") },
    { value: "price-low", label: t("categories.priceLow") },
    { value: "price-high", label: t("categories.priceHigh") },
  ];

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("relevance");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200000]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [activeFilterTab, setActiveFilterTab] = useState<string>("sort");

  const activeFilterCount = (sortBy !== "relevance" ? 1 : 0) + selectedBrands.length + selectedConditions.length + (priceRange[0] > 0 || priceRange[1] < 200000 ? 1 : 0);

  const getCatName = (cat: any) => {
    if (language === "ar" && cat.name_ar) return cat.name_ar;
    if (language === "ku" && cat.name_ku) return cat.name_ku;
    return cat.name;
  };

  const filteredProducts = useMemo(() => {
    let result: typeof baseProducts;
    // For concerns, products are already filtered server-side
    result = [...baseProducts];
    if (searchQuery.length > 1) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    }
    if (selectedBrands.length > 0) result = result.filter(p => selectedBrands.includes(p.brand));
    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1]);
    if (selectedConditions.length > 0) result = result.filter(p => p.tags.some(t => selectedConditions.includes(t)));
    switch (sortBy) {
      case "name-az": result.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "newest": result.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)); break;
      case "price-low": result.sort((a, b) => a.price - b.price); break;
      case "price-high": result.sort((a, b) => b.price - a.price); break;
    }
    return result;
  }, [id, isConcernRoute, searchQuery, sortBy, selectedBrands, priceRange, selectedConditions, baseProducts]);

  const toggleBrand = (brand: string) => setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  const toggleCondition = (condition: string) => setSelectedConditions(prev => prev.includes(condition) ? prev.filter(c => c !== condition) : [...prev, condition]);
  const clearFilters = () => { setSortBy("relevance"); setSelectedBrands([]); setPriceRange([0, 200000]); setSelectedConditions([]); };

  const handleSubClick = (subId: string | null) => {
    if (subId === activeSubId) searchParams.delete("sub");
    else if (subId) searchParams.set("sub", subId);
    else searchParams.delete("sub");
    setSearchParams(searchParams);
  };

  const activeSubName = activeSubId ? categorySubs.find(s => s.id === activeSubId) : null;
  const pageName = activeConcern?.name || (category ? getCatName(category) : t("categories.allProducts"));

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <SEOHead
        title={`${pageName} — Shop in Iraq`}
        description={`Browse ${pageName} products in Iraq. Original brands, fast delivery. Shop on ELARA.`}
        canonical={`https://elarastore.co${routerLocation.pathname}`}
        keywords={`${pageName}, ${pageName} iraq, buy ${pageName} iraq, beauty iraq, cosmetics iraq`}
        jsonLd={breadcrumbJsonLd([
          { name: "ELARA", url: "https://elarastore.co" },
          { name: "Categories", url: "https://elarastore.co/categories" },
          { name: pageName, url: `https://elarastore.co${routerLocation.pathname}` },
        ])}
      />
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border md:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to={isConcernRoute ? "/home" : activeSubId ? `/category/${id}` : "/categories"} className="p-1" onClick={(e) => {
            if (activeSubId) { e.preventDefault(); handleSubClick(null); }
          }}>
            <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
          </Link>
          {!activeConcern && (
            <h1 className="text-lg font-bold text-foreground">
              {activeSubName ? getSubName(activeSubName) : category ? getCatName(category) : t("categories.allProducts")}
            </h1>
          )}
        </div>

        {activeConcern && (
          <div className="px-5 pb-4 pt-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/40 flex items-center justify-center text-2xl shadow-sm">
                {activeConcern.icon}
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t("categories.productsFor")}</p>
                <h1 className="text-xl font-display font-bold text-foreground -mt-0.5">
                  {t(`concerns.${id === "dryskin" ? "drySkin" : id === "hairloss" ? "hairLoss" : id === "sensitive" ? "sensitiveSkin" : id === "weightloss" ? "weightLoss" : id === "oilyskin" ? "oilySkin" : id === "antiaging" ? "antiAging" : id}`) || activeConcern.name}
                </h1>
              </div>
            </div>
          </div>
        )}

        {categorySubs.length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button onClick={() => handleSubClick(null)} className={`flex-shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-colors ${!activeSubId ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
                {t("categories.viewAll")}
              </button>
              {categorySubs.map(sub => (
                <button key={sub.id} onClick={() => handleSubClick(sub.id)} className={`flex-shrink-0 px-3.5 py-1.5 text-xs font-medium rounded-xl transition-colors ${activeSubId === sub.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
                  {sub.icon} {getSubName(sub)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 pb-3 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t("categories.searchFor")}
              className="w-full pl-9 rtl:pl-8 rtl:pr-9 pr-8 py-2.5 bg-secondary/60 text-foreground text-sm rounded-xl border border-border/50 placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters(true)} className="relative p-2.5 bg-secondary/60 rounded-xl border border-border/50 hover:bg-accent transition-colors">
            <SlidersHorizontal className="w-4 h-4 text-foreground" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </header>

      <div className="app-container">
        {/* Desktop title + filters bar */}
        <div className="hidden md:block px-6 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link to={isConcernRoute ? "/home" : "/categories"} className="text-sm text-muted-foreground hover:text-foreground">← {t("common.back")}</Link>
              <span className="text-muted-foreground">/</span>
              <h1 className="text-2xl font-display font-bold text-foreground">
                {activeConcern ? (t(`concerns.${id === "dryskin" ? "drySkin" : id === "hairloss" ? "hairLoss" : id === "sensitive" ? "sensitiveSkin" : id === "weightloss" ? "weightLoss" : id === "oilyskin" ? "oilySkin" : id === "antiaging" ? "antiAging" : id}`) || activeConcern.name) : activeSubName ? getSubName(activeSubName) : category ? getCatName(category) : t("categories.allProducts")}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t("categories.searchFor")}
                  className="w-64 pl-9 pr-4 py-2.5 bg-secondary/60 text-foreground text-sm rounded-xl border border-border/50 placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button onClick={() => setShowFilters(true)} className="relative flex items-center gap-2 px-4 py-2.5 bg-secondary/60 rounded-xl border border-border/50 hover:bg-accent transition-colors">
                <SlidersHorizontal className="w-4 h-4 text-foreground" />
                <span className="text-sm text-foreground">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
                )}
              </button>
            </div>
          </div>

          {categorySubs.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-4">
              <button onClick={() => handleSubClick(null)} className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${!activeSubId ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
                {t("categories.viewAll")}
              </button>
              {categorySubs.map(sub => (
                <button key={sub.id} onClick={() => handleSubClick(sub.id)} className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${activeSubId === sub.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
                  {sub.icon} {getSubName(sub)}
                </button>
              ))}
            </div>
          )}
        </div>

        {!id && (
          <div className="px-4 md:px-6 mt-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:flex-wrap">
              {categories.map(cat => (
                <Link key={cat.id} to={`/category/${cat.slug}`} className="flex-shrink-0 px-4 py-2 bg-secondary text-secondary-foreground text-xs md:text-sm font-medium rounded-xl hover:bg-accent transition-colors">
                  {cat.icon} {getCatName(cat)}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 md:px-6 mt-3 mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {!isConcernRoute && catTotalCount > 0
              ? `${catPage * 20 + 1}–${Math.min((catPage + 1) * 20, catTotalCount)} of ${catTotalCount} ${t("common.products").toLowerCase()}`
              : `${filteredProducts.length} ${t("common.products").toLowerCase()}`}
          </p>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-xs text-primary font-medium">{t("categories.clearFilters")}</button>
          )}
        </div>

        {isLoadingProducts ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-4 md:px-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-muted animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-4 md:px-6">
              {filteredProducts.map(p => (
                <ProductCard key={p.id} product={p} offerPricing={getOfferForProduct(p, activeOffers)} />
              ))}
            </div>

            {!isConcernRoute && (catPage > 0 || catHasMore) && (
              <div className="flex items-center justify-center gap-3 px-4 mt-6 mb-4">
                <button
                  onClick={() => { setCatPage(p => Math.max(0, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={catPage === 0}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-secondary text-foreground disabled:opacity-40 hover:bg-accent transition-colors"
                >
                  ← {language === "ar" ? "السابق" : language === "ku" ? "پێشوو" : "Previous"}
                </button>
                <span className="text-sm text-muted-foreground font-medium">
                  {language === "ar" ? `صفحة ${catPage + 1}` : language === "ku" ? `لاپەڕە ${catPage + 1}` : `Page ${catPage + 1}`}
                </span>
                <button
                  onClick={() => { setCatPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  disabled={!catHasMore}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-secondary text-foreground disabled:opacity-40 hover:bg-accent transition-colors"
                >
                  {language === "ar" ? "التالي" : language === "ku" ? "دواتر" : "Next"} →
                </button>
              </div>
            )}

            {filteredProducts.length === 0 && (
              <div className="text-center mt-12 px-4">
                <p className="text-muted-foreground text-sm">{t("categories.noProductsFound")}</p>
                <button onClick={clearFilters} className="text-primary text-sm font-medium mt-2">{t("categories.clearAllFilters")}</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Filter Drawer */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-3xl max-w-lg md:max-w-xl mx-auto max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-border rounded-full" /></div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <h2 className="text-base font-bold text-foreground">{t("categories.filters")}</h2>
                <button onClick={() => setShowFilters(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="flex border-b border-border overflow-x-auto no-scrollbar">
                {[
                  { key: "sort", label: t("categories.sortBy") },
                  { key: "brands", label: t("categories.brands") },
                  { key: "price", label: t("categories.price") },
                  { key: "condition", label: t("categories.condition") },
                ].map(tab => (
                  <button key={tab.key} onClick={() => setActiveFilterTab(tab.key)}
                    className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeFilterTab === tab.key ? "text-primary border-primary" : "text-muted-foreground border-transparent"}`}
                  >{tab.label}</button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {activeFilterTab === "sort" && (
                  <div className="space-y-1">
                    {SORT_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setSortBy(opt.value)}
                        className={`w-full text-left rtl:text-right px-4 py-3 rounded-xl text-sm transition-colors ${sortBy === opt.value ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary"}`}
                      >{opt.label}</button>
                    ))}
                  </div>
                )}
                {activeFilterTab === "brands" && (
                  <div className="space-y-1">
                    {BRANDS.map(brand => (
                      <button key={brand} onClick={() => toggleBrand(brand)}
                        className={`w-full text-left rtl:text-right px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-between ${selectedBrands.includes(brand) ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary"}`}
                      >
                        {brand}
                        {selectedBrands.includes(brand) && <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center"><span className="text-primary-foreground text-xs">✓</span></span>}
                      </button>
                    ))}
                  </div>
                )}
                {activeFilterTab === "price" && (
                  <div className="space-y-6 pt-2">
                    <div>
                      <label className="text-sm text-muted-foreground mb-3 block">{t("categories.minPrice")}</label>
                      <input type="range" min={0} max={200000} step={5000} value={priceRange[0]} onChange={e => setPriceRange([Number(e.target.value), priceRange[1]])} className="w-full accent-primary" />
                      <p className="text-sm font-medium text-foreground mt-1">{priceRange[0].toLocaleString()} IQD</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-3 block">{t("categories.maxPrice")}</label>
                      <input type="range" min={0} max={200000} step={5000} value={priceRange[1]} onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])} className="w-full accent-primary" />
                      <p className="text-sm font-medium text-foreground mt-1">{priceRange[1].toLocaleString()} IQD</p>
                    </div>
                  </div>
                )}
                {activeFilterTab === "condition" && (
                  <div className="space-y-1">
                    {concerns.map(c => (
                      <button key={c.id} onClick={() => toggleCondition(c.id)}
                        className={`w-full text-left rtl:text-right px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-between ${selectedConditions.includes(c.id) ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary"}`}
                      >
                        <span>{c.icon} {c.name}</span>
                        {selectedConditions.includes(c.id) && <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center"><span className="text-primary-foreground text-xs">✓</span></span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-border flex gap-3">
                <button onClick={clearFilters} className="flex-1 py-3 bg-secondary text-foreground font-semibold rounded-2xl text-sm">{t("categories.clearAll") || "Clear All"}</button>
                <button onClick={() => setShowFilters(false)} className="flex-1 py-3 bg-primary text-primary-foreground font-semibold rounded-2xl text-sm">{t("categories.showResults") || "Show Results"}</button>
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

export default CategoryPage;
