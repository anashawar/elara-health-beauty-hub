import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Search, X, ArrowRight, Sparkles, Clock, Trash2, HelpCircle } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import BottomNav from "@/components/layout/BottomNav";
import { useProducts, useCategories, useBrands, useFormatPrice, concerns } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";
import { getRecentSearches, addRecentSearch, clearRecentSearches } from "@/hooks/useRecentSearches";
import { useUserCity, isBrandAvailableInCity } from "@/hooks/useUserCity";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const SearchOverlay = ({ isOpen, onClose, initialQuery }: SearchOverlayProps) => {
  const { data: products = [] } = useProducts({ enabled: isOpen });
  const { data: categories = [] } = useCategories();
  const { data: allBrands = [] } = useBrands();
  const { userCity, isLoggedIn } = useUserCity();
  const brands = useMemo(() => allBrands.filter((b: any) => isBrandAvailableInCity(b.restricted_cities, userCity, isLoggedIn)), [allBrands, userCity, isLoggedIn]);
  const { t } = useLanguage();
  const formatPrice = useFormatPrice();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
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

  /* ── Smart search helpers ── */

  // Common misspellings & synonyms map
  const SYNONYMS: Record<string, string[]> = useMemo(() => ({
    "moisturizer": ["moisturiser", "mosturizer", "moistrizer", "cream", "lotion", "hydrator"],
    "sunscreen": ["sunblock", "spf", "sun cream", "sun protection", "suncream"],
    "cleanser": ["face wash", "facewash", "cleaner", "wash"],
    "serum": ["essence", "ampoule", "concentrate"],
    "retinol": ["retinal", "retinoic", "vitamin a", "tretinoin"],
    "vitamin c": ["vit c", "vitc", "ascorbic acid", "vitamin-c"],
    "niacinamide": ["niacin", "vitamin b3", "nicotinamide"],
    "hyaluronic": ["hyaluronic acid", "ha", "hyluronic", "hylaronic"],
    "salicylic": ["salicylic acid", "bha", "salisilic", "salisylic"],
    "toner": ["tonic", "tonner"],
    "exfoliate": ["exfoliator", "exfoliant", "scrub", "peeling", "peel"],
    "acne": ["pimple", "pimples", "breakout", "breakouts", "zit", "zits", "blemish"],
    "dark spots": ["hyperpigmentation", "pigmentation", "dark marks", "spots", "melasma"],
    "wrinkles": ["wrinkle", "fine lines", "anti aging", "anti-aging", "antiaging"],
    "dry skin": ["dryness", "dehydrated", "flaky", "rough skin"],
    "oily skin": ["oily", "oiliness", "greasy", "sebum"],
    "hair loss": ["hair fall", "hairfall", "thinning hair", "baldness", "balding"],
    "lip": ["lips", "lip balm", "lip care", "chapstick"],
    "eye cream": ["eye", "under eye", "dark circles", "eye bags", "puffy eyes"],
    "body lotion": ["body cream", "body moisturizer", "body butter"],
    "shampoo": ["shampo", "shanpoo", "hair wash"],
    "conditioner": ["conditoner", "hair conditioner"],
    "cerave": ["serave", "cerve", "cera ve"],
    "la roche-posay": ["la roche posay", "laroche", "laroshe", "la rosh", "lrp"],
    "the ordinary": ["ordinary", "theordinary"],
    "neutrogena": ["nutrogena", "neutragena", "nuetrogena"],
    "bioderma": ["bioderm", "bioderme"],
    "vichy": ["vishy", "vichy"],
    "eucerin": ["euserin", "eucren"],
    "cosrx": ["cosrex", "cos rx"],
    "korea": ["korean", "korean skincare", "k-beauty", "kbeauty", "south korea"],
    "japan": ["japanese", "japanese skincare", "j-beauty"],
    "france": ["french", "french skincare"],
  }), []);

  // Levenshtein distance for fuzzy matching
  function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => {
      const row = new Array(n + 1).fill(0);
      row[0] = i;
      return row;
    });
    for (let j = 1; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  // Expand query with synonyms
  function expandQuery(q: string): string[] {
    const terms = [q];
    const qLow = q.toLowerCase();
    for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
      if (qLow.includes(canonical) || aliases.some(a => qLow.includes(a))) {
        terms.push(canonical);
        terms.push(...aliases);
      }
    }
    return [...new Set(terms)];
  }

  // Find "Did you mean?" suggestions from brands and popular terms
  function findDidYouMean(q: string): string | null {
    if (q.length < 3) return null;
    const qLow = q.toLowerCase();

    // Check against all brand names and synonym keys
    const candidates = [
      ...brands.map(b => b.name),
      ...Object.keys(SYNONYMS),
      ...TRENDING_TERMS,
      ...["moisturizer", "sunscreen", "cleanser", "serum", "toner", "shampoo", "conditioner", "retinol", "vitamin c", "niacinamide", "hyaluronic acid", "salicylic acid"],
    ];

    let bestMatch: string | null = null;
    let bestDist = Infinity;
    const maxDist = Math.max(1, Math.floor(qLow.length * 0.4)); // Allow up to 40% character difference

    for (const candidate of candidates) {
      const cLow = candidate.toLowerCase();
      if (cLow === qLow) return null; // Exact match exists, no suggestion needed

      // Check if it starts similarly
      const dist = levenshtein(qLow, cLow);
      if (dist < bestDist && dist <= maxDist && dist > 0) {
        bestDist = dist;
        bestMatch = candidate;
      }

      // Also check partial matches (user typed beginning of word)
      if (cLow.startsWith(qLow) && qLow.length >= 3) {
        return candidate;
      }
    }

    return bestMatch;
  }

  // Debounce search query (300ms)
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(value), 300);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getRecentSearches());
      // Restore initial query if provided (e.g. coming back via swipe)
      if (initialQuery) {
        setQuery(initialQuery);
        setDebouncedQuery(initialQuery);
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setDebouncedQuery("");
      setActiveFilter(null);
      setPriceFilter(null);
    }
  }, [isOpen, initialQuery]);

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Pre-build a search index once when products change
  const searchIndex = useMemo(() => {
    return products.map(p => ({
      product: p,
      searchText: [p.title, p.brand, p.description, p.skin_type, p.application, p.form, p.country_of_origin, ...(p.tags || []), ...(p.benefits || [])].filter(Boolean).join(" ").toLowerCase(),
      titleLower: (p.title || "").toLowerCase(),
      brandLower: (p.brand || "").toLowerCase(),
    }));
  }, [products]);

  const filteredResults = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (q.length < 2 && !activeFilter && !priceFilter) return { products: [], categories: [], brands: [] };

    // Expand query with synonyms
    const expandedTerms = q.length >= 2 ? expandQuery(q) : [];

    let matchedProducts = searchIndex.filter(({ product: p, searchText, titleLower, brandLower }) => {
      let matchesQuery = true;
      if (q.length >= 2) {
        // Direct match
        matchesQuery = expandedTerms.some(term => searchText.includes(term));

        // Fuzzy match on title and brand if no direct match
        if (!matchesQuery && q.length >= 3) {
          const words = titleLower.split(/\s+/);
          matchesQuery = words.some(w => {
            if (w.length < 3) return false;
            const dist = levenshtein(q, w);
            return dist <= Math.max(1, Math.floor(Math.min(q.length, w.length) * 0.3));
          });
          if (!matchesQuery) {
            const dist = levenshtein(q, brandLower);
            matchesQuery = dist <= Math.max(1, Math.floor(Math.min(q.length, brandLower.length) * 0.3));
          }
        }
      }
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
    }).map(({ product, searchText, titleLower, brandLower }) => {
      // Score for relevance sorting
      let score = 0;
      if (q.length >= 2) {
        if (titleLower.includes(q)) score += 10;
        if (brandLower.includes(q)) score += 8;
        if (titleLower.startsWith(q)) score += 5;
        if (brandLower === q) score += 15;
        // Boost exact word matches
        const words = titleLower.split(/\s+/);
        if (words.includes(q)) score += 12;
      }
      return { product, score };
    }).sort((a, b) => b.score - a.score).map(({ product }) => product);

    if (q === "budget") matchedProducts = products.filter(p => p.price < 15000).sort((a, b) => a.price - b.price);
    return {
      products: matchedProducts.slice(0, 20),
      categories: q.length >= 2 ? categories.filter(c => {
        const cLow = c.name.toLowerCase();
        return expandedTerms.some(term => cLow.includes(term)) || (q.length >= 3 && levenshtein(q, cLow) <= 2);
      }) : [],
      brands: q.length >= 2 ? brands.filter(b => {
        const bLow = b.name.toLowerCase();
        return expandedTerms.some(term => bLow.includes(term)) || (q.length >= 3 && levenshtein(q, bLow) <= Math.max(1, Math.floor(bLow.length * 0.3)));
      }) : [],
    };
  }, [debouncedQuery, activeFilter, priceFilter, searchIndex, products, categories, brands]);

  // "Did you mean?" suggestion
  const didYouMean = useMemo(() => {
    if (debouncedQuery.length < 3) return null;
    if (filteredResults.products.length > 3) return null; // Good results already
    return findDidYouMean(debouncedQuery);
  }, [debouncedQuery, filteredResults.products.length, brands]);

  const hasResults = filteredResults.products.length > 0 || filteredResults.categories.length > 0 || filteredResults.brands.length > 0;
  const isSearching = query.length >= 2 || activeFilter || priceFilter;

  // Save to recent searches when user taps a result
  const handleResultClick = useCallback(() => {
    if (query.trim().length >= 2) {
      addRecentSearch(query.trim());
    }
    onClose();
  }, [query, onClose]);

  const handleRecentSearchTap = useCallback((term: string) => {
    setQuery(term);
    setDebouncedQuery(term);
    addRecentSearch(term);
    setRecentSearches(getRecentSearches());
  }, []);

  const handleClearRecent = useCallback(() => {
    clearRecentSearches();
    setRecentSearches([]);
  }, []);

  // Navigate to product from search — saves search state for back navigation
  const handleProductClick = useCallback((productId: string) => {
    if (query.trim().length >= 2) {
      addRecentSearch(query.trim());
    }
    // Use navigate with state so swipe-back restores search
    navigate(`/product/${productId}`, { state: { fromSearch: true, searchQuery: query } });
    onClose();
  }, [query, navigate, onClose]);

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
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-xs font-bold text-foreground uppercase tracking-wider">{t("search.recentSearches") || "Recent Searches"}</p>
                    </div>
                    <button onClick={handleClearRecent} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3 h-3" />
                      {t("common.clearAll") || "Clear all"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map(term => (
                      <button
                        key={term}
                        onClick={() => handleRecentSearchTap(term)}
                        className="flex items-center gap-1.5 text-xs bg-secondary/80 text-secondary-foreground px-3 py-2 rounded-xl hover:bg-accent transition-colors"
                      >
                        <Clock className="w-3 h-3 text-muted-foreground/50" />
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

          {/* Did you mean? suggestion */}
          {isSearching && didYouMean && (
            <button
              onClick={() => { setQuery(didYouMean); setDebouncedQuery(didYouMean); }}
              className="flex items-center gap-2 mb-4 px-4 py-3 bg-primary/5 border border-primary/20 rounded-2xl w-full text-left rtl:text-right hover:bg-primary/10 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="text-sm text-foreground">
                {t("search.didYouMean") || "Did you mean"}{" "}
                <span className="font-bold text-primary">{didYouMean}</span>?
              </span>
            </button>
          )}

          {filteredResults.brands.length > 0 && (<div className="mb-4"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("categories.brands")}</p>{filteredResults.brands.map(b => (<Link key={b.id} to={`/brand/${b.id}`} onClick={handleResultClick} className="flex items-center justify-between py-2.5 border-b border-border/50"><div className="flex items-center gap-3">{b.logo_url && <img src={b.logo_url} alt={b.name} className="w-10 h-10 rounded-lg object-contain bg-secondary p-1" />}<span className="text-sm font-medium text-foreground">{b.name}</span></div><ArrowRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" /></Link>))}</div>)}

          {filteredResults.categories.length > 0 && (<div className="mb-4"><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("nav.categories")}</p>{filteredResults.categories.map(cat => (<Link key={cat.id} to={`/category/${cat.slug}`} onClick={handleResultClick} className="flex items-center justify-between py-2.5 border-b border-border/50"><div className="flex items-center gap-2"><span className="text-lg">{cat.icon}</span><span className="text-sm font-medium text-foreground">{cat.name}</span></div><ArrowRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" /></Link>))}</div>)}

          {filteredResults.products.length > 0 && (<div><p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t("common.products")} ({filteredResults.products.length})</p><div className="md:grid md:grid-cols-2 md:gap-x-4">{filteredResults.products.map(p => (<button key={p.id} onClick={() => handleProductClick(p.id)} className="flex items-center gap-3 py-2.5 border-b border-border/50 hover:bg-secondary/50 md:px-3 md:rounded-xl md:border-none transition-colors w-full text-left rtl:text-right"><img src={p.image} alt={p.title} className="w-14 h-14 rounded-xl object-cover bg-secondary flex-shrink-0" loading="lazy" /><div className="flex-1 min-w-0"><p className="text-[10px] font-bold text-primary uppercase tracking-wider">{p.brand}</p><p className="text-sm font-medium text-foreground truncate">{p.title}</p><div className="flex items-center gap-2 mt-0.5"><span className="text-xs font-bold text-foreground">{formatPrice(p.price)}</span>{p.originalPrice && <span className="text-[10px] text-muted-foreground line-through">{formatPrice(p.originalPrice)}</span>}</div></div></button>))}</div></div>)}

          {isSearching && !hasResults && (
            <div className="text-center mt-12">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm font-medium text-foreground mb-1">{t("common.noResults")}</p>
              <p className="text-xs text-muted-foreground mb-4">{t("common.tryDifferent")}</p>
              <div className="flex flex-wrap justify-center gap-2 mb-5">{TRENDING_TERMS.slice(0, 4).map(term => (<button key={term} onClick={() => { setQuery(term); setDebouncedQuery(term); setActiveFilter(null); setPriceFilter(null); }} className="text-xs bg-secondary text-secondary-foreground px-3 py-2 rounded-xl">{term}</button>))}</div>
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
