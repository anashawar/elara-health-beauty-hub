import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Share2, ShoppingBag, Search, Truck, ShieldCheck, BadgeCheck, X, Star, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import SearchOverlay from "@/components/SearchOverlay";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/components/ui/sonner";
import { useApp } from "@/context/AppContext";
import { useProducts, formatPrice } from "@/hooks/useProducts";
import ProductCard from "@/components/ProductCard";
import BottomNav from "@/components/layout/BottomNav";
import ReviewSection from "@/components/product/ReviewSection";
import { useLanguage } from "@/i18n/LanguageContext";

const ProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const { data: allProducts = [] } = useProducts();
  const product = allProducts.find(p => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("product.notFound")}</p>
      </div>
    );
  }

  const wishlisted = isInWishlist(product.id);
  const discount = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  const related = allProducts.filter(p => p.category_slug === product.category_slug && p.id !== product.id).slice(0, 4);

  const handleAddToCart = () => {
    addToCart(product);
  };

  return (
    <div className="min-h-screen bg-background pb-36 max-w-lg mx-auto">
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ms-1 rounded-xl hover:bg-secondary transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex-1 flex items-center gap-2.5 px-4 py-2.5 bg-secondary/80 rounded-xl border border-border hover:border-primary/30 transition-all duration-200"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{t("common.search")}</span>
          </button>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={async () => {
                const shareData = {
                  title: product.title,
                  text: `Check out ${product.title} by ${product.brand} on ELARA!`,
                  url: window.location.href,
                };
                try {
                  if (navigator.share) {
                    await navigator.share(shareData);
                  } else {
                    await navigator.clipboard.writeText(window.location.href);
                    toast(t("product.linkCopied"));
                  }
                } catch (e) {}
              }}
              className="p-2 rounded-xl hover:bg-secondary transition-colors"
            >
              <Share2 className="w-5 h-5 text-foreground" />
            </button>
            <button onClick={() => toggleWishlist(product.id)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <Heart className={`w-5 h-5 transition-all ${wishlisted ? "fill-primary text-primary scale-110" : "text-foreground"}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Image Gallery */}
      <div className="relative">
        {(() => {
          const images = product.images && product.images.length > 0 ? product.images : [product.image];
          const total = images.length;
          const goTo = (idx: number) => {
            setCurrentSlide(idx);
            if (sliderRef.current) sliderRef.current.scrollTo({ left: idx * sliderRef.current.offsetWidth, behavior: "smooth" });
          };
          const handleScroll = () => {
            if (sliderRef.current) setCurrentSlide(Math.round(sliderRef.current.scrollLeft / sliderRef.current.offsetWidth));
          };
          return (
            <>
              <div ref={sliderRef} onScroll={handleScroll} className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar" style={{ scrollbarWidth: "none" }}>
                {images.map((img, idx) => (
                  <div key={idx} className="w-full flex-shrink-0 snap-center aspect-square bg-gradient-to-br from-secondary to-muted">
                    <img src={img} alt={`${product.title} ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3 flex flex-col gap-1.5">
                {discount > 0 && (
                  <div className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-xl shadow-md">
                    -{discount}% {t("common.off")}
                  </div>
                )}
              </div>
              {product.isNew && (
                <div className="absolute top-3 right-3 rtl:right-auto rtl:left-3 bg-foreground text-background text-[10px] font-bold px-2.5 py-1 rounded-lg">
                  {t("common.new")}
                </div>
              )}
              {total > 1 && (
                <>
                  {currentSlide > 0 && (
                    <button onClick={() => goTo(currentSlide - 1)} className="absolute left-2 rtl:left-auto rtl:right-2 top-1/2 -translate-y-1/2 bg-card/80 backdrop-blur-sm rounded-full p-1.5 shadow-md">
                      <ChevronLeft className="w-4 h-4 text-foreground rtl:rotate-180" />
                    </button>
                  )}
                  {currentSlide < total - 1 && (
                    <button onClick={() => goTo(currentSlide + 1)} className="absolute right-2 rtl:right-auto rtl:left-2 top-1/2 -translate-y-1/2 bg-card/80 backdrop-blur-sm rounded-full p-1.5 shadow-md">
                      <ChevronRight className="w-4 h-4 text-foreground rtl:rotate-180" />
                    </button>
                  )}
                </>
              )}
              {total > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, idx) => (
                    <button key={idx} onClick={() => goTo(idx)} className={`rounded-full transition-all duration-300 ${idx === currentSlide ? "w-6 h-2 bg-primary" : "w-2 h-2 bg-card/70"}`} />
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Product Info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="px-4 pt-5">
        <div className="flex items-center gap-2">
          <Link to={`/brand/${product.brand_id}`} className="text-xs font-bold uppercase tracking-widest text-primary hover:underline">{product.brand}</Link>
        </div>
        <h1 className="text-xl font-display font-bold text-foreground mt-1.5 leading-tight">{product.title}</h1>
        <div className="flex items-baseline gap-2.5 mt-2">
          <span className="text-2xl font-extrabold text-primary">{formatPrice(product.price)}</span>
          {product.originalPrice && <span className="text-sm text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>}
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
          {[
            { icon: Truck, text: t("common.freeDelivery") },
            { icon: ShieldCheck, text: t("common.original") },
            { icon: BadgeCheck, text: t("common.verified") },
          ].map(item => (
            <div key={item.text} className="flex items-center gap-1.5 bg-secondary/70 rounded-full px-3 py-2 flex-shrink-0">
              <item.icon className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-foreground whitespace-nowrap">{item.text}</span>
            </div>
          ))}
        </div>

        {product.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-4">
            {product.tags.map(tag => (
              <span key={tag} className="text-[10px] font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-full">{tag}</span>
            ))}
          </div>
        )}

        <div className="mt-5 bg-card rounded-2xl border border-border/50 p-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
        </div>

        <button onClick={() => setShowDetails(!showDetails)} className="w-full flex items-center justify-between mt-4 py-3 px-4 bg-card rounded-2xl border border-border/50">
          <span className="text-sm font-semibold text-foreground">{t("product.details")}</span>
          {showDetails ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="bg-card rounded-b-2xl border-x border-b border-border/50 px-4 pb-4 -mt-2 pt-4 space-y-5">
                {product.benefits.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">{t("product.benefits")}</h3>
                    <ul className="space-y-1.5">
                      {product.benefits.map(b => (
                        <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />{b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {product.usage && (
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">{t("product.howToUse")}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{product.usage}</p>
                  </div>
                )}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">{t("product.specifications")}</h3>
                  <div className="rounded-xl overflow-hidden border border-border/50">
                    {[
                      { label: t("product.brand"), value: product.brand },
                      { label: t("product.skinType"), value: product.tags.length > 0 ? product.tags.join(", ") : t("product.all") },
                    ].map((row, i) => (
                      <div key={row.label} className={`flex text-sm ${i % 2 === 0 ? "bg-secondary/30" : "bg-card"}`}>
                        <span className="w-2/5 px-3 py-2.5 font-medium text-muted-foreground">{row.label}</span>
                        <span className="w-3/5 px-3 py-2.5 text-foreground">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ReviewSection productId={product.id} />

        {related.length > 0 && (
          <div className="mt-8">
            <h3 className="text-base font-display font-bold text-foreground mb-3">{t("product.youMayAlsoLike")}</h3>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {related.map(p => <ProductCard key={p.id} product={p} variant="horizontal" />)}
            </div>
          </div>
        )}
      </motion.div>

      <div className="fixed left-0 right-0 z-40 px-4 pb-2 fixed-bottom-safe" style={{ bottom: undefined }}>
        <div className="max-w-lg mx-auto">
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleAddToCart} className="w-full flex items-center justify-center gap-2.5 bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-lg hover:opacity-90 transition-opacity text-sm">
            <ShoppingBag className="w-5 h-5" />
            {t("product.addToCart")}
          </motion.button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProductPage;
