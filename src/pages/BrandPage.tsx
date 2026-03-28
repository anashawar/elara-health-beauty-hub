import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Package, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useBrands, useBrandProductsPaginated, useBrandProductCount } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import BottomNav from "@/components/layout/BottomNav";
import DesktopHeader from "@/components/layout/DesktopHeader";
import DesktopFooter from "@/components/layout/DesktopFooter";
import FloatingSearch from "@/components/layout/FloatingSearch";
import SearchOverlay from "@/components/SearchOverlay";
import { useLanguage } from "@/i18n/LanguageContext";
import SEOHead, { breadcrumbJsonLd, SITE_BASE } from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveOffers, getOfferForProduct } from "@/hooks/useOfferPricing";
import { useMemo, useState } from "react";
import { useUserCity, isBrandAvailableInCity } from "@/hooks/useUserCity";

const COUNTRY_FLAGS: Record<string, string> = {
  "France": "🇫🇷", "USA": "🇺🇸", "United States": "🇺🇸", "South Korea": "🇰🇷", "Korea": "🇰🇷",
  "Germany": "🇩🇪", "Japan": "🇯🇵", "UK": "🇬🇧", "United Kingdom": "🇬🇧", "Italy": "🇮🇹",
  "Spain": "🇪🇸", "Canada": "🇨🇦", "Australia": "🇦🇺", "Switzerland": "🇨🇭", "Sweden": "🇸🇪",
  "Turkey": "🇹🇷", "India": "🇮🇳", "Iraq": "🇮🇶", "Jordan": "🇯🇴", "UAE": "🇦🇪",
  "Lebanon": "🇱🇧", "Morocco": "🇲🇦", "Egypt": "🇪🇬", "China": "🇨🇳", "Brazil": "🇧🇷",
  "Netherlands": "🇳🇱", "Belgium": "🇧🇪", "Poland": "🇵🇱", "Ireland": "🇮🇪",
};

const BrandPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: brands = [] } = useBrands();
  const { t, language } = useLanguage();
  const [searchOpen, setSearchOpen] = useState(false);
  const [page, setPage] = useState(0);
  const { data: activeOffers = [] } = useActiveOffers();
  const { userCity, isLoggedIn } = useUserCity();

  const brand = brands.find((b) => b.slug === id) || brands.find((b) => b.id === id);
  const isBrandRestricted = brand && !isBrandAvailableInCity((brand as any).restricted_cities, userCity, isLoggedIn);
  
  const { data: pageData, isLoading } = useBrandProductsPaginated(isBrandRestricted ? undefined : brand?.id, page);
  const { data: totalCount = 0 } = useBrandProductCount(isBrandRestricted ? undefined : brand?.id);
  const brandProducts = pageData?.products || [];
  const hasMore = pageData?.hasMore || false;

  const brandCountry = brand?.country_of_origin;
  const countries = brandCountry ? [brandCountry] : [];

  const offerMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getOfferForProduct>>();
    for (const p of brandProducts) {
      map.set(p.id, getOfferForProduct(p, activeOffers));
    }
    return map;
  }, [brandProducts, activeOffers]);

  const getBrandName = (b: any) => {
    if (language === "ar" && b.name_ar) return b.name_ar;
    if (language === "ku" && b.name_ku) return b.name_ku;
    return b.name;
  };

  const displayName = brand ? getBrandName(brand) : t("product.brand");
  const brandSlug = brand?.slug || id;
  const totalPages = Math.ceil(totalCount / 20);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <SEOHead
        title={`${displayName} — Buy Original ${displayName} Products in Iraq`}
        description={`Shop original ${displayName} products in Iraq. ${countries.length > 0 ? `Made in ${countries[0]}.` : ""} Fast delivery across Iraq. 100% authentic.`}
        canonical={`${SITE_BASE}/brand/${brandSlug}`}
        keywords={`${displayName}, ${displayName} iraq, buy ${displayName} iraq, ${displayName} products`}
        jsonLd={[
          breadcrumbJsonLd([
            { name: "ELARA", url: SITE_BASE },
            { name: "Brands", url: `${SITE_BASE}/brands` },
            { name: displayName, url: `${SITE_BASE}/brand/${brandSlug}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Brand",
            name: displayName,
            url: `${SITE_BASE}/brand/${brandSlug}`,
            ...(brand?.logo_url ? { logo: brand.logo_url } : {}),
          },
        ]}
      />

      {/* Mobile header */}
      <header className="sticky top-0 z-40 bg-card/95 border-b border-border md:hidden" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to={-1 as any} onClick={(e) => { e.preventDefault(); window.history.back(); }} className="p-1.5 -ml-1 rounded-xl hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
          </Link>
          <h1 className="text-lg font-display font-bold text-foreground">{displayName}</h1>
        </div>
      </header>

      {isBrandRestricted ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center max-w-sm text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-5">
              <ShieldAlert className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-display font-bold text-foreground mb-2">{t("brand.notAvailable")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{t("brand.notAvailableDesc")}</p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Link to="/addresses" className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                {t("brand.updateAddress")}
              </Link>
              <Link to="/brands" className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors">
                {t("brand.browseOther")}
              </Link>
            </div>
          </motion.div>
        </div>
      ) : (
      <div className="flex-1 pb-24 md:pb-0">
        <div className="max-w-7xl mx-auto w-full">
          {/* Desktop breadcrumb */}
          <div className="hidden md:flex items-center gap-2 px-6 pt-6 pb-2">
            <Link to="/brands" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Brands</Link>
            <span className="text-sm text-muted-foreground">/</span>
            <h1 className="text-lg font-display font-bold text-foreground">{displayName}</h1>
          </div>

          {/* Brand Hero Card */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="mx-4 md:mx-6 mt-4 relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border/50">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
            <div className="relative p-6 flex items-center gap-5">
              {brand?.logo_url && (
                <div className="w-24 h-24 rounded-2xl bg-card overflow-hidden shadow-premium border border-border/50 flex-shrink-0 p-3">
                  <img src={brand.logo_url} alt={displayName} className="w-full h-full object-contain drop-shadow-sm" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-display font-bold text-foreground">{displayName}</h2>
                {countries.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-base leading-none flex-shrink-0">{COUNTRY_FLAGS[countries[0] as string] || "🌍"}</span>
                    <span className="text-xs text-muted-foreground">{countries.join(", ")}</span>
                  </div>
                )}
                <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  <span className="text-[11px] font-semibold">
                    {totalCount} {totalCount !== 1 ? t("common.products").toLowerCase() : t("common.product").toLowerCase()}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Products */}
          {isLoading ? (
            <div className="px-4 md:px-6 mt-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden bg-card border border-border/50">
                    <Skeleton className="aspect-square w-full" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : brandProducts.length === 0 && page === 0 ? (
            <div className="flex flex-col items-center justify-center mt-16 px-4">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">{t("product.noProductsFound")}</p>
              <p className="text-xs text-muted-foreground">{t("product.checkBackLater") || "Check back later for new arrivals"}</p>
            </div>
          ) : (
            <>
              <div className="px-4 md:px-6 mt-5 mb-3" />
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-4 md:px-6">
                {brandProducts.map((product) => (
                  <ProductCard key={product.id} product={product} offerPricing={offerMap.get(product.id) ?? null} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 px-4 mt-6 mb-4">
                  <button
                    onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={page === 0}
                    className="p-2 rounded-xl border border-border hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i;
                      } else if (page < 3) {
                        pageNum = i;
                      } else if (page > totalPages - 4) {
                        pageNum = totalPages - 5 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => { setPage(pageNum); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          className={`w-9 h-9 rounded-xl text-sm font-semibold transition-colors ${
                            pageNum === page
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-secondary text-muted-foreground"
                          }`}
                        >
                          {pageNum + 1}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={!hasMore}
                    className="p-2 rounded-xl border border-border hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      )}

      <div className="hidden md:block">
        <DesktopFooter />
      </div>
      <FloatingSearch />
      <BottomNav />
    </div>
  );
};

export default BrandPage;
