import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Search, X } from "lucide-react";
import BottomNav from "@/components/layout/BottomNav";
import DesktopHeader from "@/components/layout/DesktopHeader";
import DesktopFooter from "@/components/layout/DesktopFooter";
import SearchOverlay from "@/components/SearchOverlay";
import ProductCard from "@/components/ProductCard";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveOffers, getOfferForProduct } from "@/hooks/useOfferPricing";
import SEOHead, { collectionJsonLd, breadcrumbJsonLd, SITE_BASE } from "@/components/SEOHead";

const PAGE_SIZE = 30;

const collectionMeta: Record<string, { titleKey: string; subtitleKey: string; icon: string }> = {
  trending: { titleKey: "home.trendingNow", subtitleKey: "home.mostPopular", icon: "🔥" },
  picks: { titleKey: "home.elaraPicks", subtitleKey: "home.curatedForYou", icon: "💎" },
  offers: { titleKey: "home.specialOffers", subtitleKey: "home.limitedDeals", icon: "🏷️" },
  new: { titleKey: "home.newArrivals", subtitleKey: "home.freshAdditions", icon: "✨" },
  gifts: { titleKey: "home.bestGifts", subtitleKey: "home.moreGifts", icon: "🎁" },
};

const CARD_SELECT = `
  id, title, title_ar, title_ku, slug, price, original_price,
  is_new, is_trending, is_pick, in_stock,
  brand_id, category_id,
  brands ( name ),
  product_images ( image_url, sort_order )
`;

function mapProduct(p: any, language: string) {
  const localizedTitle =
    language === "ar" ? (p.title_ar || p.title) : language === "ku" ? (p.title_ku || p.title) : p.title;
  return {
    id: p.id,
    title: localizedTitle,
    slug: p.slug,
    brand: p.brands?.name || "",
    brand_id: p.brand_id,
    category_id: p.category_id,
    category_slug: null,
    subcategory_id: null,
    price: Number(p.price),
    originalPrice: p.original_price ? Number(p.original_price) : null,
    image: p.product_images?.[0]?.image_url || "/placeholder.svg",
    images: (p.product_images || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((img: any) => img.image_url),
    tags: [] as string[],
    description: "",
    benefits: [] as string[],
    usage: "",
    isNew: p.is_new || false,
    isTrending: p.is_trending || false,
    isPick: p.is_pick || false,
    country_of_origin: null,
    form: null,
    gender: null,
    volume_ml: null,
    volume_unit: "ml" as const,
    application: null,
    skin_type: null,
    condition: null,
    inStock: p.in_stock !== false,
  };
}

const CollectionPage = () => {
  const { type } = useParams<{ type: string }>();
  const { t, language } = useLanguage();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const { data: activeOffers = [] } = useActiveOffers();

  const meta = collectionMeta[type || ""] || collectionMeta.trending;

  const { data, isLoading } = useQuery({
    queryKey: ["collection", type, page, searchQuery, language],
    queryFn: async () => {
      if (type === "gifts") {
        // Gift products need tag lookup first
        const { data: tagData } = await supabase
          .from("product_tags")
          .select("product_id")
          .eq("tag", "gift");
        const giftIds = (tagData || []).map((t: any) => t.product_id);
        if (giftIds.length === 0) return { products: [], total: 0 };

        let query = supabase
          .from("products")
          .select(CARD_SELECT, { count: "exact" }) as any;
        query = query.in("id", giftIds);

        if (searchQuery.length > 1) {
          query = query.ilike("title", `%${searchQuery}%`);
        }

        const from = (page - 1) * PAGE_SIZE;
        const { data: rows, count } = await query
          .order("created_at", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        return {
          products: (rows || []).map((p: any) => mapProduct(p, language)),
          total: count || 0,
        };
      }

      let query = supabase
        .from("products")
        .select(CARD_SELECT, { count: "exact" }) as any;

      // Apply filter based on collection type
      switch (type) {
        case "trending": query = query.eq("is_trending", true); break;
        case "picks": query = query.eq("is_pick", true); break;
        case "offers": query = query.not("original_price", "is", null); break;
        case "new": query = query.eq("is_new", true); break;
      }

      if (searchQuery.length > 1) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      const from = (page - 1) * PAGE_SIZE;
      const { data: rows, count } = await query
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      return {
        products: (rows || []).map((p: any) => mapProduct(p, language)),
        total: count || 0,
      };
    },
    placeholderData: (prev) => prev,
  });

  const products = data?.products || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const offerMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getOfferForProduct>>();
    for (const p of products) {
      map.set(p.id, getOfferForProduct(p, activeOffers));
    }
    return map;
  }, [products, activeOffers]);

  const collectionTitle = t(meta.titleKey);
  const collectionDesc = `Shop ${collectionTitle} products at ELARA. ${total} products available. Original beauty, skincare & health products with fast delivery across Iraq.`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <SEOHead
        title={`${collectionTitle} — Shop ${collectionTitle} Products in Iraq`}
        description={collectionDesc}
        canonical={`${SITE_BASE}/collection/${type}`}
        keywords={`${collectionTitle} iraq, ${collectionTitle} beauty, ${collectionTitle} skincare, beauty iraq, elara ${type}`}
        jsonLd={[
          collectionJsonLd(collectionTitle, collectionDesc, `${SITE_BASE}/collection/${type}`),
          breadcrumbJsonLd([
            { name: "ELARA", url: SITE_BASE },
            { name: collectionTitle, url: `${SITE_BASE}/collection/${type}` },
          ]),
        ]}
      />

      <header className="sticky top-0 z-40 bg-card/95 border-b border-border md:hidden" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/home" className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-lg">{meta.icon}</span>
            <div>
              <h1 className="text-lg font-display font-bold text-foreground">{collectionTitle}</h1>
              <p className="text-[11px] text-muted-foreground">{t(meta.subtitleKey)}</p>
            </div>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder={t("categories.searchFor")}
              className="w-full pl-9 rtl:pl-4 rtl:pr-9 pr-8 py-2.5 bg-secondary/60 text-foreground text-sm rounded-xl border border-border/50 placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              style={{ fontSize: '16px' }}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setPage(1); }} className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 pb-24 md:pb-0">
        <div className="max-w-7xl mx-auto w-full">
          <div className="hidden md:flex items-center gap-3 px-6 pt-6 pb-2">
            <Link to="/home" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="text-2xl font-display font-bold text-foreground">{collectionTitle}</h1>
          </div>

          <div className="px-4 md:px-6 mt-3 mb-2">
            <p className="text-xs text-muted-foreground">{total} {t("common.products").toLowerCase()}</p>
          </div>

          {isLoading && products.length === 0 ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-4 md:px-6">
              {products.map(p => (
                <ProductCard key={p.id} product={p} offerPricing={offerMap.get(p.id) ?? null} />
              ))}
            </div>
          )}

          {!isLoading && products.length === 0 && (
            <div className="text-center mt-12 px-4">
              <p className="text-muted-foreground text-sm">{t("categories.noProductsFound")}</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 mb-4 px-4">
              <button
                disabled={page <= 1}
                onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0); }}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-secondary text-foreground disabled:opacity-40"
              >
                ←
              </button>
              <span className="text-sm text-muted-foreground font-medium">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-secondary text-foreground disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:block">
        <DesktopFooter />
      </div>
      <BottomNav />
    </div>
  );
};

export default CollectionPage;
