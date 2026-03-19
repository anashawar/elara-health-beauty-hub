import { useState, lazy, Suspense, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import TopHeader from "@/components/layout/TopHeader";
import DesktopHeader from "@/components/layout/DesktopHeader";
import BottomNav from "@/components/layout/BottomNav";
import DesktopFooter from "@/components/layout/DesktopFooter";
import HeroBanner, { prefetchBanners } from "@/components/home/HeroBanner";
import CategoryGrid from "@/components/home/CategoryGrid";
const AskElaraCard = lazy(() => import("@/components/home/AskElaraCard"));
const SkinScanBanner = lazy(() => import("@/components/home/SkinScanBanner"));
import ProductSectionSkeleton from "@/components/home/ProductSectionSkeleton";
import SearchOverlay from "@/components/SearchOverlay";
import SEOHead, { organizationJsonLd, websiteJsonLd, storeJsonLd } from "@/components/SEOHead";
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
const MobileAppBanners = lazy(() => import("@/components/home/MobileAppBanners").then(m => ({ default: m.MobileAppInlineBanner })));
const MobileAppHeroBanner = lazy(() => import("@/components/home/MobileAppBanners").then(m => ({ default: m.MobileAppHeroBanner })));
import { MobileAppTopStrip } from "@/components/home/MobileAppBanners";
const GiftsSection = lazy(() => import("@/components/home/GiftsSection"));

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

      <div className="flex-1 pb-24 md:pb-0 scroll-bounce">
        <Suspense fallback={null}>
          <MobileAppHeroBanner />
        </Suspense>
        <HeroBanner />

        <div className="app-container md:max-w-7xl md:mx-auto">
          <CategoryGrid />
          <Suspense fallback={null}>
            <AskElaraCard />
          </Suspense>
          <Suspense fallback={null}>
            <SkinScanBanner />
          </Suspense>

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

          <div className="hidden md:block px-4 mt-8">
            <Suspense fallback={null}>
              <AppDownloadBanner compact />
            </Suspense>
          </div>

          <Suspense fallback={null}>
            <BrandsSection />
          </Suspense>

          {giftProducts.length > 0 && (
            <Suspense fallback={null}>
              <GiftsSection products={giftProducts} />
            </Suspense>
          )}

          <Suspense fallback={null}>
            <ConcernsSection />
          </Suspense>

          <Suspense fallback={null}>
            <MobileAppBanners />
          </Suspense>

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
