import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Search, X, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import BottomNav from "@/components/layout/BottomNav";
import { useProducts, useCategories, useBrands, useFormatPrice, concerns } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchOverlay = ({ isOpen, onClose }: SearchOverlayProps) => {
  const { data: products = [] } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const { t } = useLanguage();
  const formatPrice = useFormatPrice();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const SMART_SUGGESTIONS = [
    { label: t("search.bestForAcne"), query: "acne", icon: "🎯" },
    { label: t("search.sunscreenSPF"), query: "sunscreen", icon: "☀️" },
    { label: t("search.antiAgingSerums"), query: "retinol serum", icon: "✨" },
    { label: t("search.vitaminCGlow"), query: "vitamin c", icon: "🍊" },
    { label: t("search.hairLossSolutions"), query: "hair loss", icon: "💇" },
    { label: t("search.drySkinRelief"), query: "moisturizer dry", icon: "💧" },
    { label: t("search.koreanSkincare"), query: "korean", icon: "🇰🇷" },
    { label: t("search.underBudget"), query: "budget", icon: "💰" },
  ];

  const TRENDING_TERMS = ["CeraVe", "Retinol", "Niacinamide", "Collagen", "Hair Serum", "SPF"];

  // Debounce search query (300ms)
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(value), 300);
  }, []);

  useEffect(() => {
    if (isOpen) { setTimeout(() => inputRef.current?.focus(), 100); }
    else { setQuery(""); setDebouncedQuery(""); setActiveFilter(null); setPriceFilter(null); }
  }, [isOpen]);

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Pre-build a search index once when products change
  const searchIndex = useMemo(() => {
    return products.map(p => ({
      product: p,
      searchText: [p.title, p.brand, p.description, p.skin_type, p.application, p.form, p.country_of_origin, ...(p.tags || []), ...(p.benefits || [])].filter(Boolean).join(" ").toLowerCase(),
    }));
  }, [products]);

  const filteredResults = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (q.length < 2 && !activeFilter && !priceFilter) return { products: [], categories: [], brands: [] };

    let matchedProducts = searchIndex.filter(({ product: p, searchText }) => {
      const matchesQuery = q.length >= 2 ? searchText.includes(q) : true;
      let matchesPrice = true;
      if (priceFilter === "under15k") matchesPrice = p.price < 15000;
      else if (priceFilter === "15k-30k") matchesPrice = p.price >= 15000 && p.price <= 30000;
      else if (priceFilter === "30k-60k") matchesPrice = p.price >= 30000 && p.price <= 60000;
      else if (priceFilter === "over60k") matchesPrice = p.price > 60000;
      let matchesFilter = true;
      if (activeFilter) {
        const concern = concerns.find(c => c.id === activeFilter);
        if (concern) {
          matchesFilter = p.tags.some(t => t.toLowerCase().includes(concern.name.toLowerCase())) || (p.skin_type || "").toLowerCase().includes(concern.name.toLowerCase()) || (p.description || "").toLowerCase().includes(concern.name.toLowerCase());
        } else { matchesFilter = p.category_slug === activeFilter; }
      }
      return matchesQuery && matchesPrice && matchesFilter;
    }).map(({ product }) => product);

    if (q === "budget") matchedProducts = products.filter(p => p.price < 15000).sort((a, b) => a.price - b.price);
    return {
      products: matchedProducts.slice(0, 20),
      categories: q.length >= 2 ? categories.filter(c => c.name.toLowerCase().includes(q)) : [],
      brands: q.length >= 2 ? brands.filter(b => b.name.toLowerCase().includes(q)) : [],
    };
  }, [debouncedQuery, activeFilter, priceFilter, searchIndex, products, categories, brands]);

  const hasResults = filteredResults.products.length > 0 || filteredResults.categories.length > 0 || filteredResults.brands.length > 0;
  const isSearching = query.length >= 2 || activeFilter || priceFilter;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background md:bg-background/80 md:backdrop-blur-sm" style={{ height: '100dvh' }}>
      <div className="max-w-lg md:max-w-4xl mx-auto flex flex-col h-full md:h-auto md:max-h-[85vh] md:mt-8 md:rounded-2xl md:border md:border-border md:shadow-premium md:bg-card" style={{ height: '100dvh' }}>
        <div className="border-b border-border flex-shrink-0 sticky top-0 z-10 bg-background md:bg-card md:rounded-t-2xl" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="flex items-center gap-3 px-4 md:px-6 py-3 md:py-4">
            <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <input ref={inputRef} value={query} onChange={e => handleQueryChange(e.target.value)} placeholder={t("common.searchFull")} className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base md:text-lg" style={{ fontSize: '16px' }} />
            {(query || activeFilter || priceFilter) && (<button onClick={() => { setQuery(""); setDebouncedQuery(""); setActiveFilter(null); setPriceFilter(null); }} className="p-1"><X className="w-4 h-4 text-muted-foreground" /></button>)}
            <button onClick={onClose} className="text-xs md:text-sm text-primary font-semibold md:px-3 md:py-1.5 md:rounded-lg md:hover:bg-primary/10 transition-colors">{t("common.cancel")}</button>
          </div>
          <div className="px-4 md:px-6 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
            {[{ key: "under15k", label: "Under 15K" }, { key: "15k-30k", label: "15K–30K" }, { key: "30k-60k", label: "30K–60K" }, { key: "over60k", label: "60K+" }].map(pf => (
              <button key={pf.key} onClick={() => setPriceFilter(prev => prev === pf.key ? null : pf.key)} className={`flex-shrink-0 text-[11px] md:text-xs px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-colors ${priceFilter === pf.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>{pf.label}</button>
            ))}
            {concerns.slice(0, 4).map(c => (
              <button key={c.id} onClick={() => setActiveFilter(prev => prev === c.id ? null : c.id)} className={`flex-shrink-0 text-[11px] md:text-xs px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-colors ${activeFilter === c.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>{c.icon} {c.name}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4" style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}>
          {!isSearching && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-1.5 mb-3"><Sparkles className="w-3.5 h-3.5 text-primary" /><p className="text-xs font-bold text-foreground uppercase tracking-wider">{t("search.recommendedForYou")}</p></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {SMART_SUGGESTIONS.map(s => (<button key={s.query} onClick={() => { setQuery(s.query); setDebouncedQuery(s.query); }} className="flex items-center gap-2 px-3 py-2.5 bg-card md:bg-secondary/50 rounded-xl border border-border/50 hover:border-primary/30 transition-all text-left rtl:text-right"><span className="text-base">{s.icon}</span><span className="text-xs font-medium text-foreground leading-tight">{s.label}</span></button>))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{t("search.trending")}</p>
                <div className="flex flex-wrap gap-2">{TRENDING_TERMS.map(term => (<button key={term} onClick={() => { setQuery(term); setDebouncedQuery(term); }} className="text-xs bg-secondary text-secondary-foreground px-3 py-2 rounded-xl hover:bg-accent transition-colors">{term}</button>))}</div>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{t("search.browseCategories")}</p>
                <div className="flex gap-2 md:gap-4 overflow-x-auto no-scrollbar pb-1">
                  {categories.slice(0, 8).map(cat => (<Link key={cat.id} to={`/category/${cat.slug}`} onClick={onClose} className="flex-shrink-0 flex flex-col items-center gap-1.5 w-16 md:w-20"><span className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-secondary flex items-center justify-center text-xl md:text-2xl">{cat.icon}</span><span className="text-[10px] md:text-xs font-medium text-foreground text-center leading-tight">{cat.name}</span></Link>))}
                </div>
              </div>
            </div>
          )}

          {isSearching && (activeFilter || priceFilter) && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {activeFilter && (<span className="text-[10px] bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">{concerns.find(c => c.id === activeFilter)?.icon || "📂"} {concerns.find(c => c.id === activeFilter)?.name || categories.find(c => c.slug === activeFilter)?.name}<button onClick={() => setActiveFilter(null)}><X className="w-3 h-3" /></button></span>)}
              {priceFilter && (<span className="text-[10px] bg-primary/10 text-primary font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">💰 {priceFilter}<button onClick={() => setPriceFilter(null)}><X className="w-3 h-3" /></button></span>)}
            </div>
          )}

          {filteredResults.brands.length > 0 && (<div className="mb-4"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("categories.brands")}</p>{filteredResults.brands.map(b => (<Link key={b.id} to={`/brand/${b.id}`} onClick={onClose} className="flex items-center justify-between py-2.5 border-b border-border/50"><div className="flex items-center gap-3">{b.logo_url && <img src={b.logo_url} alt={b.name} className="w-8 h-8 rounded-lg object-cover bg-secondary" />}<span className="text-sm font-medium text-foreground">{b.name}</span></div><ArrowRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" /></Link>))}</div>)}

          {filteredResults.categories.length > 0 && (<div className="mb-4"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("nav.categories")}</p>{filteredResults.categories.map(cat => (<Link key={cat.id} to={`/category/${cat.slug}`} onClick={onClose} className="flex items-center justify-between py-2.5 border-b border-border/50"><div className="flex items-center gap-2"><span className="text-lg">{cat.icon}</span><span className="text-sm font-medium text-foreground">{cat.name}</span></div><ArrowRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" /></Link>))}</div>)}

          {filteredResults.products.length > 0 && (<div><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("common.products")} ({filteredResults.products.length})</p><div className="md:grid md:grid-cols-2 md:gap-x-4">{filteredResults.products.map(p => (<Link key={p.id} to={`/product/${p.id}`} onClick={onClose} className="flex items-center gap-3 py-2.5 border-b border-border/50 hover:bg-secondary/50 md:px-3 md:rounded-xl md:border-none transition-colors"><img src={p.image} alt={p.title} className="w-14 h-14 rounded-xl object-cover bg-secondary flex-shrink-0" loading="lazy" /><div className="flex-1 min-w-0"><p className="text-[10px] font-bold text-primary uppercase tracking-wider">{p.brand}</p><p className="text-sm font-medium text-foreground truncate">{p.title}</p><div className="flex items-center gap-2 mt-0.5"><span className="text-xs font-bold text-foreground">{formatPrice(p.price)}</span>{p.originalPrice && <span className="text-[10px] text-muted-foreground line-through">{formatPrice(p.originalPrice)}</span>}</div></div></Link>))}</div></div>)}

          {isSearching && !hasResults && (
            <div className="text-center mt-12">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm font-medium text-foreground mb-1">{t("common.noResults")}</p>
              <p className="text-xs text-muted-foreground mb-4">{t("common.tryDifferent")}</p>
              <div className="flex flex-wrap justify-center gap-2 mb-5">{TRENDING_TERMS.slice(0, 4).map(term => (<button key={term} onClick={() => { setQuery(term); setDebouncedQuery(term); setActiveFilter(null); setPriceFilter(null); }} className="text-xs bg-secondary text-secondary-foreground px-3 py-2 rounded-xl">Try "{term}"</button>))}</div>
              <Link to={`/elara-ai?q=${encodeURIComponent(query)}`} onClick={onClose} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-primary to-violet-600 text-white font-semibold text-sm shadow-float">
                <Sparkles className="w-4 h-4" />
                {t("search.askElaraAI") || "Ask ELARA AI instead"}
              </Link>
            </div>
          )}
        </div>
        {/* Show bottom nav so users can tap Home to leave search */}
        <div className="md:hidden" onClick={onClose}>
          <BottomNav />
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;