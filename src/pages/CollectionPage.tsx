import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Search, X } from "lucide-react";
import BottomNav from "@/components/layout/BottomNav";
import DesktopHeader from "@/components/layout/DesktopHeader";
import SearchOverlay from "@/components/SearchOverlay";
import ProductCard from "@/components/ProductCard";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";

const collectionMeta: Record<string, { titleKey: string; subtitleKey: string; icon: string }> = {
  trending: { titleKey: "home.trendingNow", subtitleKey: "home.mostPopular", icon: "🔥" },
  picks: { titleKey: "home.elaraPicks", subtitleKey: "home.curatedForYou", icon: "💎" },
  offers: { titleKey: "home.specialOffers", subtitleKey: "home.limitedDeals", icon: "🏷️" },
  new: { titleKey: "home.newArrivals", subtitleKey: "home.freshAdditions", icon: "✨" },
  gifts: { titleKey: "home.bestGifts", subtitleKey: "home.moreGifts", icon: "🎁" },
};

const CollectionPage = () => {
  const { type } = useParams<{ type: string }>();
  const { data: products = [], isLoading } = useProducts();
  const { t } = useLanguage();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const meta = collectionMeta[type || ""] || collectionMeta.trending;

  const filtered = useMemo(() => {
    let result = products;
    switch (type) {
      case "trending": result = products.filter(p => p.isTrending); break;
      case "picks": result = products.filter(p => p.isPick); break;
      case "offers": result = products.filter(p => p.originalPrice); break;
      case "new": result = products.filter(p => p.isNew); break;
      case "gifts": result = products.filter(p => p.tags.includes("gift")); break;
      default: result = [];
    }
    if (searchQuery.length > 1) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
    }
    return result;
  }, [type, products, searchQuery]);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border md:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/home" className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-lg">{meta.icon}</span>
            <div>
              <h1 className="text-lg font-display font-bold text-foreground">{t(meta.titleKey)}</h1>
              <p className="text-[11px] text-muted-foreground">{t(meta.subtitleKey)}</p>
            </div>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t("categories.searchFor")}
              className="w-full pl-9 rtl:pl-4 rtl:pr-9 pr-8 py-2.5 bg-secondary/60 text-foreground text-sm rounded-xl border border-border/50 placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              style={{ fontSize: '16px' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="app-container">
        <div className="hidden md:flex items-center gap-3 px-6 pt-6 pb-2">
          <Link to="/home" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl font-display font-bold text-foreground">{t(meta.titleKey)}</h1>
        </div>

        <div className="px-4 md:px-6 mt-3 mb-2">
          <p className="text-xs text-muted-foreground">{filtered.length} {t("common.products").toLowerCase()}</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-4 md:px-6">
            {filtered.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center mt-12 px-4">
            <p className="text-muted-foreground text-sm">{t("categories.noProductsFound")}</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default CollectionPage;
