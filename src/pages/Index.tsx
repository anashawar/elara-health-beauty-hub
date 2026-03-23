import { useState, lazy, Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import TopHeader from "@/components/layout/TopHeader";
import DesktopHeader from "@/components/layout/DesktopHeader";
import BottomNav from "@/components/layout/BottomNav";
import DesktopFooter from "@/components/layout/DesktopFooter";
import HeroBanner, { prefetchBanners } from "@/components/home/HeroBanner";
import CategoryGrid from "@/components/home/CategoryGrid";
import ProductSectionSkeleton from "@/components/home/ProductSectionSkeleton";
import SearchOverlay from "@/components/SearchOverlay";
import SEOHead, { organizationJsonLd, websiteJsonLd, storeJsonLd } from "@/components/SEOHead";
import { useTrendingProducts, useDiscountedProducts } from "@/hooks/useHomeProducts";
import { useLanguage } from "@/i18n/LanguageContext";
import { useLazySection } from "@/hooks/useLazySection";

// Lazy loaded — secondary sections
const AskElaraCard = lazy(() => import("@/components/home/AskElaraCard"));
const SkinScanBanner = lazy(() => import("@/components/home/SkinScanBanner"));
const ProductSection = lazy(() => import("@/components/home/ProductSection"));
const TodayOffersSlider = lazy(() => import("@/components/home/TodayOffersSlider"));
const OffersBanner = lazy(() => import("@/components/home/OffersBanner"));
const BrandsSection = lazy(() => import("@/components/home/BrandsSection"));
const ConcernsSection = lazy(() => import("@/components/home/ConcernsSection"));
const DealsBanner = lazy(() => import("@/components/home/DealsBanner"));
const AppDownloadBanner = lazy(() => import("@/components/home/AppDownloadBanner"));
const WhyElaraBanner = lazy(() => import("@/components/home/WhyElaraBanner"));
const MobileAppBanners = lazy(() => import("@/components/home/MobileAppBanners").then(m => ({ default: m.MobileAppInlineBanner })));
const MobileAppHeroBanner = lazy(() => import("@/components/home/MobileAppBanners").then(m => ({ default: m.MobileAppHeroBanner })));
import { MobileAppTopStrip } from "@/components/home/MobileAppBanners";

const DiscountsSection = lazy(() => import("@/components/home/DiscountsSection"));

/** Deferred section — only loads data + renders when scrolled near */
const DeferredProductSections = lazy(() => import("@/components/home/DeferredProductSections"));

const Index = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState<string | undefined>();
  const { t } = useLanguage();

  useEffect(() => {
    prefetchBanners(queryClient);
  }, [queryClient]);

  useEffect(() => {
    const state = location.state as any;
    if (state?.openSearch) {
      setSearchInitialQuery(state.searchQuery || undefined);
      setSearchOpen(true);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  // Only fetch trending (above-fold) and discounted eagerly
  const { data: trending = [], isLoading: loadingTrending } = useTrendingProducts();
  const { data: discountedProducts = [] } = useDiscountedProducts();

  // Intersection observers for deferred sections
  const midSection = useLazySection("300px");
  const bottomSection = useLazySection("400px");

  const isLoading = loadingTrending;

  const handleSearchClose = () => {
    setSearchOpen(false);
    setSearchInitialQuery(undefined);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ minHeight: '-webkit-fill-available' }}>
      <SEOHead
        title="Shop Skincare, Makeup, Vitamins & More in Iraq"
        description="Iraq's #1 online health & beauty store. Shop original skincare, makeup, haircare, vitamins & supplements from top brands like CeraVe, The Ordinary, L'Oréal. Fast 24h delivery across Iraq."
        canonical="https://elara-health-beauty-hub.lovable.app/home"
        keywords="beauty iraq, skincare iraq, makeup iraq, cosmetics iraq, health products iraq, online beauty store iraq, elara beauty, erbil beauty shop, baghdad skincare, buy cosmetics iraq, original beauty products iraq"
        jsonLd={[organizationJsonLd, websiteJsonLd, storeJsonLd]}
      />
      <MobileAppTopStrip />
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <TopHeader onSearchClick={() => setSearchOpen(true)} />
      {searchOpen && <SearchOverlay isOpen={searchOpen} onClose={handleSearchClose} initialQuery={searchInitialQuery} />}

      <div className="flex-1 pb-24 md:pb-0 scroll-bounce" style={{ contain: 'layout style' }}>
        <HeroBanner />

        <div className="app-container md:max-w-7xl md:mx-auto">
          {/* CategoryGrid — reserve min-height to prevent CLS */}
          <div className="min-h-[120px] md:min-h-[80px]">
            <CategoryGrid />
          </div>

          {/* MobileAppHeroBanner moved BELOW hero + categories so it doesn't push LCP down */}
          <Suspense fallback={null}>
            <MobileAppHeroBanner />
          </Suspense>

          <Suspense fallback={<div className="h-[130px] mx-4 mt-8 rounded-3xl bg-secondary/30 animate-pulse" />}>
            <AskElaraCard />
          </Suspense>
          <Suspense fallback={<div className="h-[110px] mx-4 mt-6 rounded-3xl bg-secondary/30 animate-pulse" />}>
            <SkinScanBanner />
          </Suspense>

          {discountedProducts.length > 0 && (
            <Suspense fallback={<ProductSectionSkeleton />}>
              <DiscountsSection products={discountedProducts} />
            </Suspense>
          )}

          <Suspense fallback={null}>
            <TodayOffersSlider />
          </Suspense>

          {isLoading ? (
            <ProductSectionSkeleton />
          ) : (
            <Suspense fallback={<ProductSectionSkeleton />}>
              <ProductSection title={t("home.trendingNow")} subtitle={t("home.mostPopular")} products={trending} viewAllLink="/collection/trending" variant="trending" />
            </Suspense>
          )}

          <Suspense fallback={null}>
            <OffersBanner />
          </Suspense>

          <div className="hidden md:block px-4 mt-8">
            <Suspense fallback={null}>
              <AppDownloadBanner compact />
            </Suspense>
          </div>

          {/* Mid-fold: brands, gifts, concerns — deferred */}
          <div ref={midSection.ref} style={{ contentVisibility: 'auto', containIntrinsicSize: '0 400px' }}>
            {midSection.visible && (
              <>
                <Suspense fallback={null}>
                  <BrandsSection />
                </Suspense>

                <Suspense fallback={null}>
                  <ConcernsSection />
                </Suspense>

                <Suspense fallback={null}>
                  <MobileAppBanners />
                </Suspense>

                <Suspense fallback={null}>
                  <DealsBanner />
                </Suspense>
              </>
            )}
          </div>

          {/* Bottom-fold: picks, offers, new arrivals — deferred data fetch */}
          <div ref={bottomSection.ref} style={{ contentVisibility: 'auto', containIntrinsicSize: '0 600px' }}>
            {bottomSection.visible && (
              <Suspense fallback={<ProductSectionSkeleton />}>
                <DeferredProductSections />
              </Suspense>
            )}
          </div>

          <Suspense fallback={null}>
            <WhyElaraBanner />
          </Suspense>

          <div className="hidden md:block px-4 mt-10">
            <Suspense fallback={null}>
              <AppDownloadBanner />
            </Suspense>
          </div>

          <DesktopFooter />

          <footer className="mt-8 mb-4 px-4 text-center md:hidden">
            <p className="text-xs text-muted-foreground">ELARA — {t("common.tagline")}</p>
          </footer>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
