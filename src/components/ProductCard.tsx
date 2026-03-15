import { memo, useCallback } from "react";
import { Heart, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/hooks/useAuth";
import type { ProductWithRelations } from "@/hooks/useProducts";
import { formatPrice } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";
import { useActiveOffers, getOfferForProduct } from "@/hooks/useOfferPricing";
import { toast } from "@/components/ui/sonner";

interface ProductCardProps {
  product: ProductWithRelations;
  variant?: "horizontal" | "vertical";
}

const ProductCard = memo(({ product, variant = "vertical" }: ProductCardProps) => {
  const { addToCart, toggleWishlist, isInWishlist } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: activeOffers = [] } = useActiveOffers();
  const wishlisted = isInWishlist(product.id);
  const outOfStock = !product.inStock;

  const offerPricing = getOfferForProduct(product, activeOffers);
  const displayPrice = offerPricing ? offerPricing.discountedPrice : product.price;
  const originalDisplayPrice = offerPricing ? product.price : product.originalPrice;
  const discount = offerPricing
    ? offerPricing.discountPercent
    : product.originalPrice
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  const handleAddToCart = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (outOfStock) return;
    if (!user) {
      toast(t("auth.signInRequired") || "Please sign in first");
      navigate("/auth");
      return;
    }
    addToCart(product);
    toast.success(t("product.addedToCart") || "Added to cart");
  }, [outOfStock, user, product, addToCart, navigate, t]);

  const handleToggleWishlist = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  }, [product.id, toggleWishlist]);

  if (variant === "horizontal") {
    return (
      <div className="flex-shrink-0 w-[152px] glass rounded-3xl border border-border/30 shadow-glass overflow-hidden group will-change-transform">
        <Link to={`/product/${product.id}`} className="block">
          <div className="relative aspect-square overflow-hidden bg-secondary/40">
            <img src={product.image} alt={product.title} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${outOfStock ? "opacity-50 grayscale" : ""}`} loading="lazy" decoding="async" />
            {outOfStock && (
              <span className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-3 py-1 rounded-xl">{t("product.outOfStock") || "Out of Stock"}</span>
              </span>
            )}
            {!outOfStock && discount > 0 && (
              <span className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 bg-primary/90 backdrop-blur-sm text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-sm">-{discount}%</span>
            )}
            {!outOfStock && product.isNew && (
              <span className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 bg-foreground/80 backdrop-blur-sm text-background text-[10px] font-bold px-2.5 py-1 rounded-xl">{t("common.new")}</span>
            )}
          </div>
        </Link>
        <div className="p-3">
          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{product.brand}</p>
          <Link to={`/product/${product.id}`}>
            <h3 className="text-[13px] font-bold text-foreground mt-0.5 line-clamp-2 leading-snug tracking-tight">{product.title}</h3>
          </Link>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[14px] font-bold text-foreground">{formatPrice(displayPrice)}</span>
            {originalDisplayPrice && originalDisplayPrice > displayPrice && (
              <span className="text-[10px] text-muted-foreground/60 line-through">{formatPrice(originalDisplayPrice)}</span>
            )}
          </div>
          {offerPricing && (
            <p className="text-[9px] font-semibold text-primary mt-0.5 truncate">{offerPricing.offerLabel}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2.5">
            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-2 rounded-xl transition-colors duration-150 active:scale-95 ${outOfStock ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:opacity-90 shadow-sm"}`}
            >
              {outOfStock ? (t("product.outOfStock") || "Out of Stock") : <><Plus className="w-3 h-3" /> {t("product.add")}</>}
            </button>
            <button
              onClick={handleToggleWishlist}
              className="p-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors duration-150 active:scale-90"
            >
              <Heart className={`w-3.5 h-3.5 transition-colors duration-150 ${wishlisted ? "fill-primary text-primary" : "text-muted-foreground/50"}`} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl border border-border/30 shadow-glass overflow-hidden group will-change-transform">
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-secondary/40">
          <img src={product.image} alt={product.title} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${outOfStock ? "opacity-50 grayscale" : ""}`} loading="lazy" decoding="async" />
          {outOfStock && (
            <span className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
              <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-3 py-1 rounded-xl">{t("product.outOfStock") || "Out of Stock"}</span>
            </span>
          )}
          {!outOfStock && discount > 0 && (
            <span className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 bg-primary/90 backdrop-blur-sm text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-sm">-{discount}%</span>
          )}
          {!outOfStock && product.isNew && !discount && (
            <span className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 bg-foreground/80 backdrop-blur-sm text-background text-[10px] font-bold px-2.5 py-1 rounded-xl">{t("common.new")}</span>
          )}
          <button
            onClick={handleToggleWishlist}
            className="absolute top-2.5 right-2.5 rtl:right-auto rtl:left-2.5 p-2 rounded-full glass shadow-sm hover:bg-card transition-colors duration-150 active:scale-90"
          >
            <Heart className={`w-4 h-4 transition-colors duration-150 ${wishlisted ? "fill-primary text-primary" : "text-muted-foreground/60"}`} />
          </button>
        </div>
      </Link>
      <div className="p-3.5">
        <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{product.brand}</p>
        <Link to={`/product/${product.id}`}>
          <h3 className="text-[15px] font-bold text-foreground mt-1 line-clamp-2 leading-snug tracking-tight">{product.title}</h3>
        </Link>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-base font-bold text-foreground">{formatPrice(displayPrice)}</span>
          {originalDisplayPrice && originalDisplayPrice > displayPrice && (
            <span className="text-[11px] text-muted-foreground/60 line-through">{formatPrice(originalDisplayPrice)}</span>
          )}
        </div>
        {offerPricing && (
          <p className="text-[9px] font-semibold text-primary mt-0.5 truncate">{offerPricing.offerLabel}</p>
        )}
        <button
          onClick={handleAddToCart}
          disabled={outOfStock}
          className={`w-full flex items-center justify-center gap-1 text-xs font-semibold py-2.5 rounded-2xl mt-3 transition-colors duration-150 active:scale-[0.97] ${outOfStock ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:opacity-90 shadow-sm"}`}
        >
          {outOfStock ? (t("product.outOfStock") || "Out of Stock") : <><Plus className="w-3.5 h-3.5" /> {t("product.addToCart")}</>}
        </button>
      </div>
    </div>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
