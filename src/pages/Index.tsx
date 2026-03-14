import { useState, lazy, Suspense } from "react";
import TopHeader from "@/components/layout/TopHeader";
import DesktopHeader from "@/components/layout/DesktopHeader";
import BottomNav from "@/components/layout/BottomNav";
import HeroBanner from "@/components/home/HeroBanner";
import CategoryGrid from "@/components/home/CategoryGrid";
import AskElaraCard from "@/components/home/AskElaraCard";
import ProductSectionSkeleton from "@/components/home/ProductSectionSkeleton";
import SearchOverlay from "@/components/SearchOverlay";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";

// Lazy load below-fold heavy sections
const ProductSection = lazy(() => import("@/components/home/ProductSection"));
const TodayOffersSlider = lazy(() => import("@/components/home/TodayOffersSlider"));
const OffersBanner = lazy(() => import("@/components/home/OffersBanner"));
const BrandsSection = lazy(() => import("@/components/home/BrandsSection"));
const ConcernsSection = lazy(() => import("@/components/home/ConcernsSection"));
const DealsBanner = lazy(() => import("@/components/home/DealsBanner"));

const Index = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: products = [], isLoading } = useProducts();
  const { t } = useLanguage();

  const trending = products.filter(p => p.isTrending);
  const picks = products.filter(p => p.isPick);
  const offers = products.filter(p => p.originalPrice);
  const newArrivals = products.filter(p => p.isNew);

  const SectionFallback = <ProductSectionSkeleton />;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8 scroll-bounce" style={{ minHeight: '-webkit-fill-available' }}>
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <TopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <HeroBanner />
      <div className="app-container">
        <CategoryGrid />

        <AskElaraCard />

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

        <Suspense fallback={null}>
          <BrandsSection />
        </Suspense>

        <Suspense fallback={null}>
          <ConcernsSection />
        </Suspense>

        <Suspense fallback={null}>
          <DealsBanner />
        </Suspense>

        {!isLoading && (
          <Suspense fallback={SectionFallback}>
            <>
              <ProductSection title={t("home.elaraPicks")} subtitle={t("home.curatedForYou")} products={picks} viewAllLink="/collection/picks" />
              <ProductSection title={t("home.specialOffers")} subtitle={t("home.limitedDeals")} products={offers} viewAllLink="/collection/offers" />
              <ProductSection title={t("home.newArrivals")} subtitle={t("home.freshAdditions")} products={newArrivals} viewAllLink="/collection/new" />
            </>
          </Suspense>
        )}

        {/* Footer */}
        <footer className="mt-8 mb-4 px-4 text-center md:py-8 md:border-t md:border-border">
          <p className="text-xs text-muted-foreground">ELARA — {t("common.tagline")}</p>
        </footer>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
