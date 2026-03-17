import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Trash2, CheckSquare, Square, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useProducts } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import BottomNav from "@/components/layout/BottomNav";
import DesktopHeader from "@/components/layout/DesktopHeader";
import SearchOverlay from "@/components/SearchOverlay";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "@/components/ui/sonner";

const WishlistPage = () => {
  const { wishlist, toggleWishlist } = useApp();
  const { data: products = [] } = useProducts();
  const { t, language } = useLanguage();
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const wishlistProducts = products.filter(p => wishlist.includes(p.id));

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === wishlistProducts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(wishlistProducts.map(p => p.id)));
    }
  };

  const removeSelected = () => {
    selected.forEach(id => toggleWishlist(id));
    const count = selected.size;
    setSelected(new Set());
    setSelectMode(false);
    toast(
      language === "ar" ? `تم إزالة ${count} منتج` :
      language === "ku" ? `${count} بەرهەم لابرا` :
      `${count} item${count > 1 ? "s" : ""} removed`
    );
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const txt = {
    select: language === "ar" ? "تحديد" : language === "ku" ? "هەڵبژاردن" : "Select",
    selectAll: language === "ar" ? "تحديد الكل" : language === "ku" ? "هەموو هەڵبژێرە" : "Select All",
    deselectAll: language === "ar" ? "إلغاء الكل" : language === "ku" ? "هەموو لابە" : "Deselect All",
    remove: language === "ar" ? "إزالة" : language === "ku" ? "لابردن" : "Remove",
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/30 md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/profile" className="p-2 -ml-2 rounded-xl hover:bg-secondary active:scale-90 transition-all">
              <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
            </Link>
            <h1 className="text-lg font-display font-bold text-foreground">{t("wishlist.title")}</h1>
            <span className="text-xs text-muted-foreground">({wishlistProducts.length})</span>
          </div>
          {wishlistProducts.length > 0 && (
            selectMode ? (
              <button onClick={exitSelectMode} className="p-2 rounded-xl hover:bg-secondary">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            ) : (
              <button onClick={() => setSelectMode(true)} className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10">
                {txt.select}
              </button>
            )
          )}
        </div>

        {/* Selection toolbar */}
        {selectMode && wishlistProducts.length > 0 && (
          <div className="flex items-center justify-between px-4 pb-3">
            <button onClick={selectAll} className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              {selected.size === wishlistProducts.length ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : (
                <Square className="w-4 h-4 text-muted-foreground" />
              )}
              {selected.size === wishlistProducts.length ? txt.deselectAll : txt.selectAll}
            </button>
            {selected.size > 0 && (
              <button
                onClick={removeSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold active:scale-95 transition-transform"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {txt.remove} ({selected.size})
              </button>
            )}
          </div>
        )}
      </header>

      <div className="app-container">
        {/* Desktop title */}
        <div className="hidden md:flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-2">
            <Link to="/profile" className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</Link>
            <span className="text-sm text-muted-foreground">/</span>
            <h1 className="text-lg font-display font-bold text-foreground">{t("wishlist.title")} ({wishlistProducts.length})</h1>
          </div>
          {wishlistProducts.length > 0 && !selectMode && (
            <button onClick={() => setSelectMode(true)} className="text-xs font-semibold text-primary px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
              {txt.select}
            </button>
          )}
          {selectMode && (
            <div className="flex items-center gap-3">
              <button onClick={selectAll} className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                {selected.size === wishlistProducts.length ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                {selected.size === wishlistProducts.length ? txt.deselectAll : txt.selectAll}
              </button>
              {selected.size > 0 && (
                <button onClick={removeSelected} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold">
                  <Trash2 className="w-3.5 h-3.5" /> {txt.remove} ({selected.size})
                </button>
              )}
              <button onClick={exitSelectMode} className="text-xs text-muted-foreground font-medium">Cancel</button>
            </div>
          )}
        </div>

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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 px-4 md:px-6 mt-4">
            {wishlistProducts.map(p => (
              <div key={p.id} className="relative">
                {selectMode && (
                  <button
                    onClick={() => toggleSelect(p.id)}
                    className="absolute top-2 left-2 rtl:left-auto rtl:right-2 z-10 w-7 h-7 rounded-lg bg-card/90 backdrop-blur-sm border border-border/50 flex items-center justify-center shadow-sm"
                  >
                    {selected.has(p.id) ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                )}
                <div className={selectMode && selected.has(p.id) ? "ring-2 ring-primary rounded-2xl" : ""}>
                  <ProductCard product={p} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default WishlistPage;
