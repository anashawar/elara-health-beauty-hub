import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useProducts } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import BottomNav from "@/components/layout/BottomNav";
import { useLanguage } from "@/i18n/LanguageContext";

const WishlistPage = () => {
  const { wishlist } = useApp();
  const { data: products = [] } = useProducts();
  const { t } = useLanguage();
  const wishlistProducts = products.filter(p => wishlist.includes(p.id));

  return (
    <div className="min-h-screen bg-background pb-24 app-container">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/home" className="p-1"><ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" /></Link>
          <h1 className="text-lg font-display font-bold text-foreground">{t("wishlist.title")}</h1>
          <span className="text-xs text-muted-foreground ms-1">({wishlistProducts.length})</span>
        </div>
      </header>

      {wishlistProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 px-4">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
            <span className="text-3xl">💝</span>
          </div>
          <h3 className="text-lg font-display font-bold text-foreground">{t("wishlist.noSavedItems")}</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6">{t("wishlist.saveYourFavorites")}</p>
          <Link to="/home" className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-2xl text-sm">
            {t("common.startShopping")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-4 mt-4">
          {wishlistProducts.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default WishlistPage;
