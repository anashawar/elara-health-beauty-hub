import { memo, useCallback } from "react";
import { Heart, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/hooks/useAuth";
import type { ProductWithRelations } from "@/hooks/useProducts";
import { useFormatPrice } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";
import type { OfferPricing } from "@/hooks/useOfferPricing";
import { toast } from "@/components/ui/sonner";
import { hapticMedium, hapticSuccess } from "@/lib/haptics";

interface ProductCardProps {
  product: ProductWithRelations;
  variant?: "horizontal" | "vertical";
  /** Pre-computed offer pricing — pass from parent to avoid per-card queries */
  offerPricing?: OfferPricing | null;
}

/** SEO-friendly product URL — always use slug */
const productUrl = (p: ProductWithRelations) => `/product/${p.slug}`;

const ProductCard = memo(({ product, variant = "vertical", offerPricing = null }: ProductCardProps) => {
  const { addToCart, toggleWishlist, isInWishlist } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const formatPrice = useFormatPrice();
  const { t } = useLanguage();
  const wishlisted = isInWishlist(product.id);
  const outOfStock = !product.inStock;

  const displayPrice = offerPricing ? offerPricing.discountedPrice : product.price;
  const originalDisplayPrice = offerPricing ? product.price : product.originalPrice;
  const discount = offerPricing
    ? offerPricing.discountPercent
    : product.originalPrice
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  const url = productUrl(product);

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
    void hapticMedium();
    toast.success(t("product.addedToCart") || "Added to cart");
  }, [outOfStock, user, product, addToCart, navigate, t]);

  const handleToggleWishlist = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void hapticSuccess();
    toggleWishlist(product.id);
  }, [product.id, toggleWishlist]);

  if (variant === "horizontal") {
    return (
      <div className="flex-shrink-0 w-[152px] rounded-3xl border border-border/30 bg-card shadow-sm overflow-hidden">
        <Link to={url} className="block">
          <div className="relative aspect-square overflow-hidden bg-secondary/40">
            <img src={product.image} alt={product.title} width={152} height={152} className="w-full h-full object-cover" loading="lazy" decoding="async" />
            {outOfStock && (
              <span className="absolute inset-0 flex items-center justify-center bg-background/50">
                <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-3 py-1 rounded-xl">{t("product.outOfStock") || "Out of Stock"}</span>
              </span>
            )}
            {!outOfStock && discount > 0 && (
              <span className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-sm">-{discount}%</span>
            )}
            {!outOfStock && product.isNew && (
              <span className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 bg-foreground/80 text-background text-[10px] font-bold px-2.5 py-1 rounded-xl">{t("common.new")}</span>
            )}
          </div>
        </Link>
        <div className="p-3">
          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{product.brand}</p>
          <Link to={url}>
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
              className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-2 rounded-xl transition-colors duration-75 active:scale-95 ${outOfStock ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground shadow-sm"}`}
            >
              {outOfStock ? (t("product.outOfStock") || "Out of Stock") : <><Plus className="w-3 h-3" /> {t("product.add")}</>}
            </button>
            <button
              onClick={handleToggleWishlist}
              className="p-2 rounded-xl bg-secondary/60 transition-colors duration-75 active:scale-90"
            >
              <Heart className={`w-3.5 h-3.5 ${wishlisted ? "fill-primary text-primary" : "text-muted-foreground/50"}`} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border/30 bg-card shadow-sm overflow-hidden">
      <Link to={url} className="block">
        <div className="relative aspect-square overflow-hidden bg-secondary/40">
          <img src={product.image} alt={product.title} width={200} height={200} className="w-full h-full object-cover" loading="lazy" decoding="async" />
          {outOfStock && (
            <span className="absolute inset-0 flex items-center justify-center bg-background/50">
              <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-3 py-1 rounded-xl">{t("product.outOfStock") || "Out of Stock"}</span>
            </span>
          )}
          {!outOfStock && discount > 0 && (
            <span className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-sm">-{discount}%</span>
          )}
          {!outOfStock && product.isNew && !discount && (
            <span className="absolute top-2.5 left-2.5 rtl:left-auto rtl:right-2.5 bg-foreground/80 text-background text-[10px] font-bold px-2.5 py-1 rounded-xl">{t("common.new")}</span>
          )}
          <button
            onClick={handleToggleWishlist}
            className="absolute top-2.5 right-2.5 rtl:right-auto rtl:left-2.5 p-2 rounded-full bg-card/80 shadow-sm transition-colors duration-75 active:scale-90"
          >
            <Heart className={`w-4 h-4 ${wishlisted ? "fill-primary text-primary" : "text-muted-foreground/60"}`} />
          </button>
        </div>
      </Link>
      <div className="p-3.5">
        <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{product.brand}</p>
        <Link to={url}>
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
          className={`w-full flex items-center justify-center gap-1 text-xs font-semibold py-2.5 rounded-2xl mt-3 transition-colors duration-75 active:scale-[0.97] ${outOfStock ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground shadow-sm"}`}
        >
          {outOfStock ? (t("product.outOfStock") || "Out of Stock") : <><Plus className="w-3.5 h-3.5" /> {t("product.addToCart")}</>}
        </button>
      </div>
    </div>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
