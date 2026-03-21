import { usePickProducts, useOfferProducts, useNewProducts } from "@/hooks/useHomeProducts";
import { useLanguage } from "@/i18n/LanguageContext";
import ProductSection from "@/components/home/ProductSection";
import ProductSectionSkeleton from "@/components/home/ProductSectionSkeleton";

/**
 * Renders picks, offers, and new arrivals sections.
 * Only mounted when scrolled into view (via useLazySection in parent).
 * This defers 3 API calls until the user actually scrolls down.
 */
const DeferredProductSections = () => {
  const { t } = useLanguage();
  const { data: picks = [], isLoading: loadingPicks } = usePickProducts();
  const { data: offers = [], isLoading: loadingOffers } = useOfferProducts();
  const { data: newArrivals = [], isLoading: loadingNew } = useNewProducts();

  if (loadingPicks || loadingOffers || loadingNew) {
    return <ProductSectionSkeleton />;
  }

  return (
    <>
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
