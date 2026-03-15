import { useMemo } from "react";
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

const ProductSection = lazy(() => import("@/components/home/ProductSection"));
const TodayOffersSlider = lazy(() => import("@/components/home/TodayOffersSlider"));
const OffersBanner = lazy(() => import("@/components/home/OffersBanner"));
const BrandsSection = lazy(() => import("@/components/home/BrandsSection"));
const ConcernsSection = lazy(() => import("@/components/home/ConcernsSection"));
const DealsBanner = lazy(() => import("@/components/home/DealsBanner"));
const AppDownloadBanner = lazy(() => import("@/components/home/AppDownloadBanner"));

const Index = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: products = [], isLoading } = useProducts();
  const { t } = useLanguage();

  // Memoize filtered product lists to prevent re-filtering on every render
  const trending = useMemo(() => products.filter(p => p.isTrending), [products]);
  const picks = useMemo(() => products.filter(p => p.isPick), [products]);
  const offers = useMemo(() => products.filter(p => p.originalPrice), [products]);
  const newArrivals = useMemo(() => products.filter(p => p.isNew), [products]);

  const SectionFallback = <ProductSectionSkeleton />;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8 scroll-bounce" style={{ minHeight: '-webkit-fill-available' }}>
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <TopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <HeroBanner />

      {/* Desktop: constrained width content */}
      <div className="app-container md:max-w-7xl md:mx-auto">
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

        {/* App Download Banner — Desktop only, after offers */}
        <div className="px-4 mt-8">
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

        {/* Full App Download Banner — Desktop only, before footer */}
        <div className="px-4 mt-10">
          <Suspense fallback={null}>
            <AppDownloadBanner />
          </Suspense>
        </div>

        <footer className="mt-8 mb-4 px-4 text-center md:py-10 md:border-t md:border-border">
          <p className="text-xs text-muted-foreground">ELARA — {t("common.tagline")}</p>
          <div className="hidden md:flex items-center justify-center gap-6 mt-4">
            <a href="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("profile.aboutElara")}</a>
            <a href="/faq" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("profile.faq")}</a>
            <a href="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("profile.termsConditions")}</a>
            <a href="/privacy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("profile.privacyPolicy")}</a>
          </div>
        </footer>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
