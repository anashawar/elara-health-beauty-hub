import { Heart, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import type { ProductWithRelations } from "@/hooks/useProducts";
import { formatPrice } from "@/hooks/useProducts";
import { useLanguage } from "@/i18n/LanguageContext";
import { useActiveOffers, getOfferForProduct } from "@/hooks/useOfferPricing";

interface ProductCardProps {
  product: ProductWithRelations;
  variant?: "horizontal" | "vertical";
}

const ProductCard = ({ product, variant = "vertical" }: ProductCardProps) => {
  const { addToCart, toggleWishlist, isInWishlist } = useApp();
  const { t } = useLanguage();
  const { data: activeOffers = [] } = useActiveOffers();
  const wishlisted = isInWishlist(product.id);
  const outOfStock = !product.inStock;

  // Check for offer-based discount
  const offerPricing = getOfferForProduct(product, activeOffers);

  // Use offer price if available, otherwise fall back to original price discount
  const displayPrice = offerPricing ? offerPricing.discountedPrice : product.price;
  const originalDisplayPrice = offerPricing ? product.price : product.originalPrice;
  const discount = offerPricing
    ? offerPricing.discountPercent
    : product.originalPrice
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  if (variant === "horizontal") {
    return (
      <div className="flex-shrink-0 w-36 bg-card rounded-2xl shadow-premium overflow-hidden group">
        <Link to={`/product/${product.id}`} className="block">
          <div className="relative aspect-square overflow-hidden bg-secondary">
            <img src={product.image} alt={product.title} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${outOfStock ? "opacity-50 grayscale" : ""}`} loading="lazy" />
            {outOfStock && (
              <span className="absolute inset-0 flex items-center justify-center bg-background/60">
                <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-3 py-1 rounded-lg">{t("product.outOfStock") || "Out of Stock"}</span>
              </span>
            )}
            {!outOfStock && discount > 0 && (
              <span className="absolute top-2 left-2 rtl:left-auto rtl:right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-lg">-{discount}%</span>
            )}
            {!outOfStock && product.isNew && (
              <span className="absolute top-2 left-2 rtl:left-auto rtl:right-2 bg-sage text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-lg">{t("common.new")}</span>
            )}
          </div>
        </Link>
        <div className="p-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{product.brand}</p>
          <Link to={`/product/${product.id}`}>
            <h3 className="text-sm font-bold text-foreground mt-0.5 line-clamp-2 leading-snug tracking-tight">{product.title}</h3>
          </Link>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[15px] font-bold text-foreground">{formatPrice(displayPrice)}</span>
            {originalDisplayPrice && originalDisplayPrice > displayPrice && (
              <span className="text-[11px] text-muted-foreground line-through">{formatPrice(originalDisplayPrice)}</span>
            )}
          </div>
          {offerPricing && (
            <p className="text-[9px] font-semibold text-primary mt-0.5 truncate">{offerPricing.offerLabel}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2">
            <button
              onClick={() => !outOfStock && addToCart(product)}
              disabled={outOfStock}
              className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-semibold py-2 rounded-xl transition-opacity ${outOfStock ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:opacity-90"}`}
            >
              {outOfStock ? (t("product.outOfStock") || "Out of Stock") : <><Plus className="w-3 h-3" /> {t("product.add")}</>}
            </button>
            <button
              onClick={() => toggleWishlist(product.id)}
              className="p-2 rounded-xl bg-secondary hover:bg-accent transition-colors"
            >
              <Heart className={`w-3.5 h-3.5 ${wishlisted ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-premium overflow-hidden group">
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-secondary">
          <img src={product.image} alt={product.title} className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${outOfStock ? "opacity-50 grayscale" : ""}`} loading="lazy" />
          {outOfStock && (
            <span className="absolute inset-0 flex items-center justify-center bg-background/60">
              <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-3 py-1 rounded-lg">{t("product.outOfStock") || "Out of Stock"}</span>
            </span>
          )}
          {!outOfStock && discount > 0 && (
            <span className="absolute top-2 left-2 rtl:left-auto rtl:right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-lg">-{discount}%</span>
          )}
          {!outOfStock && product.isNew && !discount && (
            <span className="absolute top-2 left-2 rtl:left-auto rtl:right-2 bg-sage text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-lg">{t("common.new")}</span>
          )}
          <button
            onClick={(e) => { e.preventDefault(); toggleWishlist(product.id); }}
            className="absolute top-2 right-2 rtl:right-auto rtl:left-2 p-1.5 rounded-full bg-card/80 backdrop-blur-sm hover:bg-card transition-colors"
          >
            <Heart className={`w-4 h-4 ${wishlisted ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
        </div>
      </Link>
      <div className="p-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{product.brand}</p>
        <Link to={`/product/${product.id}`}>
          <h3 className="text-[15px] font-bold text-foreground mt-1 line-clamp-2 leading-snug tracking-tight">{product.title}</h3>
        </Link>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-base font-bold text-foreground">{formatPrice(displayPrice)}</span>
          {originalDisplayPrice && originalDisplayPrice > displayPrice && (
            <span className="text-[11px] text-muted-foreground line-through">{formatPrice(originalDisplayPrice)}</span>
          )}
        </div>
        {offerPricing && (
          <p className="text-[9px] font-semibold text-primary mt-0.5 truncate">{offerPricing.offerLabel}</p>
        )}
        <button
          onClick={() => !outOfStock && addToCart(product)}
          disabled={outOfStock}
          className={`w-full flex items-center justify-center gap-1 text-xs font-semibold py-2.5 rounded-xl mt-3 transition-opacity ${outOfStock ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:opacity-90"}`}
        >
          {outOfStock ? (t("product.outOfStock") || "Out of Stock") : <><Plus className="w-3.5 h-3.5" /> {t("product.addToCart")}</>}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
