import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, ShoppingBag, Search, Truck, ShieldCheck, BadgeCheck, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { products, formatPrice } from "@/data/products";
import ProductCard from "@/components/ProductCard";
import BottomNav from "@/components/layout/BottomNav";

const ProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  const searchResults = searchQuery.length > 1
    ? products.filter(p =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  return (
    <div className="min-h-screen bg-background pb-32 max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setSearchOpen(!searchOpen)} className="p-1">
              <Search className="w-5 h-5 text-foreground" />
            </button>
            <button onClick={() => toggleWishlist(product.id)} className="p-1">
              <Heart className={`w-5 h-5 ${wishlisted ? "fill-primary text-primary" : "text-foreground"}`} />
            </button>
          </div>
        </div>
        {searchOpen && (
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search for..."
                className="w-full pl-9 pr-9 py-2.5 bg-secondary rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 bg-card rounded-xl border border-border shadow-lg overflow-hidden">
                {searchResults.map(p => (
                  <Link
                    key={p.id}
                    to={`/product/${p.id}`}
                    onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/50 transition-colors"
                  >
                    <img src={p.image} alt={p.title} className="w-10 h-10 rounded-lg object-cover" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.brand} · {formatPrice(p.price)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Image - smaller & modern */}
      <div className="px-4 pt-4">
        <div className="aspect-[4/3] bg-secondary rounded-2xl overflow-hidden">
          <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Info */}
      <div className="px-4 pt-5">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#8b37ef" }}>{product.brand}</p>
        <h1 className="text-2xl font-bold text-foreground mt-1">{product.title}</h1>

        <div className="flex items-center gap-2 mt-3">
          <span className="text-lg font-bold text-foreground">{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <>
              <span className="text-xs text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
              <span className="text-[10px] font-bold text-primary bg-rose-light px-2 py-0.5 rounded-lg">-{discount}%</span>
            </>
          )}
        </div>

        {/* Free Delivery Banner */}
        <div className="mt-4 flex items-center gap-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-xl px-3.5 py-2.5">
          <Truck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-xs font-semibold text-emerald-700">Shop 40,000 IQD and get <span className="font-extrabold">FREE DELIVERY</span></p>
        </div>

        {/* Trust Icons */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { icon: Truck, label: "Fast Delivery" },
            { icon: ShieldCheck, label: "100% Original Product" },
            { icon: BadgeCheck, label: "Verified Brands" },
          ].map(item => (
            <div key={item.label} className="flex flex-col items-center gap-1.5 bg-secondary/60 rounded-xl py-3 px-2">
              <item.icon className="w-5 h-5 text-primary" />
              <span className="text-[10px] font-semibold text-foreground text-center leading-tight">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Tags */}
        {product.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-5">
            <span className="text-xs font-semibold text-foreground mr-1">Used for:</span>
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

        {/* Specifications Table */}
        <div className="mt-6">
          <h3 className="text-sm font-bold text-foreground mb-3">Specifications</h3>
          <div className="rounded-xl border border-border overflow-hidden">
            {[
              { label: "Brand", value: product.brand },
              { label: "Country of Origin", value: "—" },
              { label: "Form", value: "—" },
              { label: "Gender", value: "—" },
              { label: "Volume (ml)", value: "—" },
              { label: "Application", value: "—" },
              { label: "Type of Skin", value: product.tags.length > 0 ? product.tags.join(", ") : "—" },
            ].map((row, i) => (
              <div key={row.label} className={`flex items-center text-sm ${i % 2 === 0 ? "bg-secondary/40" : "bg-card"}`}>
                <span className="w-2/5 px-3.5 py-2.5 font-medium text-muted-foreground">{row.label}</span>
                <span className="w-3/5 px-3.5 py-2.5 text-foreground">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold text-foreground mb-3">You May Also Like</h3>
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
