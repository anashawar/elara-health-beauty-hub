import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Heart, ShoppingBag, Star, ChevronRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { products, formatPrice } from "@/data/products";
import ProductCard from "@/components/ProductCard";
import BottomNav from "@/components/layout/BottomNav";

const ProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const { addToCart, toggleWishlist, isInWishlist } = useApp();
  const product = products.find(p => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Product not found</p>
      </div>
    );
  }

  const wishlisted = isInWishlist(product.id);
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const related = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-background pb-32 max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to={-1 as any} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <button onClick={() => toggleWishlist(product.id)} className="p-1">
            <Heart className={`w-5 h-5 ${wishlisted ? "fill-primary text-primary" : "text-foreground"}`} />
          </button>
        </div>
      </header>

      {/* Image */}
      <div className="aspect-square bg-secondary overflow-hidden">
        <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
      </div>

      {/* Info */}
      <div className="px-4 pt-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{product.brand}</p>
        <h1 className="text-xl font-display font-bold text-foreground mt-1">{product.title}</h1>

        <div className="flex items-center gap-2 mt-3">
          <span className="text-2xl font-bold text-foreground">{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <>
              <span className="text-sm text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
              <span className="text-xs font-bold text-primary bg-rose-light px-2 py-0.5 rounded-lg">-{discount}%</span>
            </>
          )}
        </div>

        {/* Tags */}
        {product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {product.tags.map(tag => (
              <span key={tag} className="text-[10px] font-medium bg-secondary text-secondary-foreground px-3 py-1.5 rounded-xl">{tag}</span>
            ))}
          </div>
        )}

        {/* Description */}
        <div className="mt-6">
          <h3 className="text-sm font-bold text-foreground mb-2">Description</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
        </div>

        {/* Benefits */}
        <div className="mt-5">
          <h3 className="text-sm font-bold text-foreground mb-2">Benefits</h3>
          <ul className="space-y-1.5">
            {product.benefits.map(b => (
              <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        {/* Usage */}
        <div className="mt-5">
          <h3 className="text-sm font-bold text-foreground mb-2">How to Use</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{product.usage}</p>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-display font-bold text-foreground mb-3">You May Also Like</h3>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {related.map(p => (
                <ProductCard key={p.id} product={p} variant="horizontal" />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-16 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border px-4 py-3">
        <div className="flex gap-3 max-w-lg mx-auto">
          <button
            onClick={() => addToCart(product)}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3.5 rounded-2xl hover:opacity-90 transition-opacity"
          >
            <ShoppingBag className="w-4 h-4" /> Add to Cart
          </button>
          <button className="px-6 bg-foreground text-background font-semibold py-3.5 rounded-2xl hover:opacity-90 transition-opacity">
            Buy Now
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProductPage;
