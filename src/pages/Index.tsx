import { useState } from "react";
import TopHeader from "@/components/layout/TopHeader";
import DesktopHeader from "@/components/layout/DesktopHeader";
import BottomNav from "@/components/layout/BottomNav";
import HeroBanner from "@/components/home/HeroBanner";
import CategoryGrid from "@/components/home/CategoryGrid";
import ProductSection from "@/components/home/ProductSection";
import ConcernsSection from "@/components/home/ConcernsSection";
import BrandsSection from "@/components/home/BrandsSection";
import AskElaraCard from "@/components/home/AskElaraCard";
import DealsBanner from "@/components/home/DealsBanner";
import OffersBanner from "@/components/home/OffersBanner";
import SearchOverlay from "@/components/SearchOverlay";
import { useProducts } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";

const Index = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: products = [], isLoading } = useProducts();
  const { t } = useLanguage();

  const trending = products.filter(p => p.isTrending);
  const picks = products.filter(p => p.isPick);
  const offers = products.filter(p => p.originalPrice);
  const newArrivals = products.filter(p => p.isNew);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <TopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <div className="app-container">
        <HeroBanner />
        <CategoryGrid />

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <AskElaraCard />
            <ProductSection title={t("home.trendingNow")} subtitle={t("home.mostPopular")} products={trending} viewAllLink="/collection/trending" variant="trending" />
            <OffersBanner />
            <BrandsSection />
            <ConcernsSection />
            <DealsBanner />
            <ProductSection title={t("home.elaraPicks")} subtitle={t("home.curatedForYou")} products={picks} viewAllLink="/collection/picks" />
            <ProductSection title={t("home.specialOffers")} subtitle={t("home.limitedDeals")} products={offers} viewAllLink="/collection/offers" />
            <ProductSection title={t("home.newArrivals")} subtitle={t("home.freshAdditions")} products={newArrivals} viewAllLink="/collection/new" />
          </>
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
