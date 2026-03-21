import { usePickProducts, useOfferProducts, useNewProducts, useGiftProducts } from "@/hooks/useHomeProducts";
import { useLanguage } from "@/i18n/LanguageContext";
import { lazy, Suspense } from "react";
import ProductSection from "@/components/home/ProductSection";
import ProductSectionSkeleton from "@/components/home/ProductSectionSkeleton";

const GiftsSection = lazy(() => import("@/components/home/GiftsSection"));

/**
 * Renders picks, offers, new arrivals, and gift sections.
 * Only mounted when scrolled into view (via useLazySection in parent).
 * This defers 4 API calls until the user actually scrolls down.
 */
const DeferredProductSections = () => {
  const { t } = useLanguage();
  const { data: picks = [], isLoading: loadingPicks } = usePickProducts();
  const { data: offers = [], isLoading: loadingOffers } = useOfferProducts();
  const { data: newArrivals = [], isLoading: loadingNew } = useNewProducts();
  const { data: giftProducts = [] } = useGiftProducts();

  if (loadingPicks || loadingOffers || loadingNew) {
    return <ProductSectionSkeleton />;
  }

  return (
    <>
      {giftProducts.length > 0 && (
        <Suspense fallback={null}>
          <GiftsSection products={giftProducts} />
        </Suspense>
      )}
      {picks.length > 0 && (
        <ProductSection title={t("home.elaraPicks")} subtitle={t("home.curatedForYou")} products={picks} viewAllLink="/collection/picks" />
      )}
      {offers.length > 0 && (
        <ProductSection title={t("home.specialOffers")} subtitle={t("home.limitedDeals")} products={offers} viewAllLink="/collection/offers" />
      )}
      {newArrivals.length > 0 && (
        <ProductSection title={t("home.newArrivals")} subtitle={t("home.freshAdditions")} products={newArrivals} viewAllLink="/collection/new" />
      )}
    </>
  );
};

export default DeferredProductSections;
