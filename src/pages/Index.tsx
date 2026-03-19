import { useState, lazy, Suspense, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import TopHeader from "@/components/layout/TopHeader";
import DesktopHeader from "@/components/layout/DesktopHeader";
import BottomNav from "@/components/layout/BottomNav";
import DesktopFooter from "@/components/layout/DesktopFooter";
import HeroBanner, { prefetchBanners } from "@/components/home/HeroBanner";
import CategoryGrid from "@/components/home/CategoryGrid";
import AskElaraCard from "@/components/home/AskElaraCard";
import SkinScanBanner from "@/components/home/SkinScanBanner";
import ProductSectionSkeleton from "@/components/home/ProductSectionSkeleton";
import SearchOverlay from "@/components/SearchOverlay";
import SEOHead, { organizationJsonLd, websiteJsonLd } from "@/components/SEOHead";
import { useTrendingProducts, usePickProducts, useOfferProducts, useNewProducts, useGiftProducts } from "@/hooks/useHomeProducts";
import { useLanguage } from "@/i18n/LanguageContext";

const ProductSection = lazy(() => import("@/components/home/ProductSection"));
const TodayOffersSlider = lazy(() => import("@/components/home/TodayOffersSlider"));
const OffersBanner = lazy(() => import("@/components/home/OffersBanner"));
const BrandsSection = lazy(() => import("@/components/home/BrandsSection"));
const ConcernsSection = lazy(() => import("@/components/home/ConcernsSection"));
const DealsBanner = lazy(() => import("@/components/home/DealsBanner"));
const AppDownloadBanner = lazy(() => import("@/components/home/AppDownloadBanner"));
const WhyElaraBanner = lazy(() => import("@/components/home/WhyElaraBanner"));
import { MobileAppTopStrip, MobileAppHeroBanner, MobileAppInlineBanner } from "@/components/home/MobileAppBanners";
const GiftsSection = lazy(() => import("@/components/home/GiftsSection"));

const Index = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState<string | undefined>();
  const { t } = useLanguage();

  // Prefetch banners immediately on mount — they show first
  useEffect(() => {
    prefetchBanners(queryClient);
  }, [queryClient]);

  // Restore search state if navigated back from a product page
  useEffect(() => {
    const state = location.state as any;
    if (state?.openSearch) {
      setSearchInitialQuery(state.searchQuery || undefined);
      setSearchOpen(true);
      // Clean the state so it doesn't re-trigger
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  // Lightweight per-section queries — each fetches only ~20 products instead of all 2800
  const { data: trending = [], isLoading: loadingTrending } = useTrendingProducts();
  const { data: picks = [], isLoading: loadingPicks } = usePickProducts();
  const { data: offers = [], isLoading: loadingOffers } = useOfferProducts();
  const { data: newArrivals = [], isLoading: loadingNew } = useNewProducts();
  const { data: giftProducts = [] } = useGiftProducts();

  const isLoading = loadingTrending;
  const SectionFallback = <ProductSectionSkeleton />;

  const handleSearchClose = () => {
    setSearchOpen(false);
    setSearchInitialQuery(undefined);
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8 scroll-bounce" style={{ minHeight: '-webkit-fill-available' }}>
      <SEOHead
        title="Shop Skincare, Makeup, Vitamins & More"
        description="Iraq's #1 online health & beauty store. Shop original skincare, makeup, haircare, vitamins & supplements from top brands. Fast delivery across Iraq."
        canonical="https://elara-health-beauty-hub.lovable.app/home"
        keywords="beauty iraq, skincare iraq, makeup iraq, cosmetics iraq, health products iraq, online beauty store iraq, elara beauty, erbil beauty shop, baghdad skincare"
        jsonLd={[organizationJsonLd, websiteJsonLd]}
      />
      <MobileAppTopStrip />
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <TopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={handleSearchClose} initialQuery={searchInitialQuery} />

      <MobileAppHeroBanner />
      <HeroBanner />

      {/* Desktop: constrained width content */}
      <div className="app-container md:max-w-7xl md:mx-auto">
        <CategoryGrid />

        <AskElaraCard />
        <SkinScanBanner />

        {isLoading ? (
          <>
            <ProductSectionSkeleton />
            <ProductSectionSkeleton />
          </>
        ) : (
          <Suspense fallback={SectionFallback}>
            <ProductSection title={t("home.trendingNow")} subtitle={t("home.mostPopular")} products={trending} viewAllLink="/collection/trending" variant="trending" />
          </Suspense>
        )}

        <Suspense fallback={null}>
          <TodayOffersSlider />
        </Suspense>

        <Suspense fallback={null}>
          <OffersBanner />
        </Suspense>

        {/* App Download Banner — Desktop only, after offers */}
        <div className="hidden md:block px-4 mt-8">
          <Suspense fallback={null}>
            <AppDownloadBanner compact />
          </Suspense>
        </div>

        <Suspense fallback={null}>
          <BrandsSection />
        </Suspense>

        <Suspense fallback={null}>
          <ConcernsSection />
        </Suspense>

        <MobileAppInlineBanner />

        <Suspense fallback={null}>
          <DealsBanner />
        </Suspense>

        {loadingPicks || loadingOffers || loadingNew ? (
          <ProductSectionSkeleton />
        ) : (
          <Suspense fallback={SectionFallback}>
            <>
              <ProductSection title={t("home.elaraPicks")} subtitle={t("home.curatedForYou")} products={picks} viewAllLink="/collection/picks" />
              <ProductSection title={t("home.specialOffers")} subtitle={t("home.limitedDeals")} products={offers} viewAllLink="/collection/offers" />
              <ProductSection title={t("home.newArrivals")} subtitle={t("home.freshAdditions")} products={newArrivals} viewAllLink="/collection/new" />
            </>
          </Suspense>
        )}

        {/* Why ELARA animated banner */}
        <Suspense fallback={null}>
          <WhyElaraBanner />
        </Suspense>

        {/* Full App Download Banner — Desktop only, before footer */}
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

      <BottomNav />
    </div>
  );
};

export default Index;
