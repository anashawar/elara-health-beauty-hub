import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Share2, ShoppingBag, Search, Truck, ShieldCheck, BadgeCheck, X, Star, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import SearchOverlay from "@/components/SearchOverlay";
import DesktopHeader from "@/components/layout/DesktopHeader";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/components/ui/sonner";
import { useApp } from "@/context/AppContext";
import { useAuth } from "@/hooks/useAuth";
import { useProducts, useBrands, formatPrice } from "@/hooks/useProducts";
import { useActiveOffers, getOfferForProduct } from "@/hooks/useOfferPricing";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import ProductCard from "@/components/ProductCard";
import BottomNav from "@/components/layout/BottomNav";
import ReviewSection from "@/components/product/ReviewSection";
import { useLanguage } from "@/i18n/LanguageContext";

const PUBLISHED_URL = "https://elara-health-beauty-hub.lovable.app";

const getShareUrl = (productId: string) => `${PUBLISHED_URL}/product/${productId}`;

const handleNativeShare = async (title: string, text: string, url: string, fallbackToast: string) => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ title, text, url, dialogTitle: title });
    } else if (navigator.share) {
      await navigator.share({ title, text, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast(fallbackToast);
    }
  } catch (e) {
    // User cancelled share dialog – ignore
  }
};

const ProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, isInWishlist } = useApp();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const { data: allProducts = [] } = useProducts();
  const { data: activeOffers = [] } = useActiveOffers();
  const { data: brands = [] } = useBrands();
  const product = allProducts.find(p => p.id === id);

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("product.notFound")}</p>
      </div>
    );
  }

  const wishlisted = isInWishlist(product.id);
  const offerPricing = getOfferForProduct(product, activeOffers);
  const displayPrice = offerPricing ? offerPricing.discountedPrice : product.price;
  const originalDisplayPrice = offerPricing ? product.price : product.originalPrice;
  const discount = offerPricing
    ? offerPricing.discountPercent
    : product.originalPrice
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  const related = allProducts.filter(p => p.category_slug === product.category_slug && p.id !== product.id).slice(0, 4);

  const outOfStock = product ? !product.inStock : false;

  const handleAddToCart = () => {
    if (outOfStock) return;
    if (!user) {
      toast(t("auth.signInRequired") || "Please sign in first");
      navigate("/auth");
      return;
    }
    addToCart(product);
  };

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
    <div className="min-h-screen bg-background pb-36 md:pb-8">
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile header */}
      <header className="sticky top-0 z-40 glass-heavy border-b border-border/30 md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center gap-2 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ms-1 rounded-xl hover:bg-secondary active:bg-secondary active:scale-90 transition-all flex-shrink-0">
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
              onClick={() => handleNativeShare(
                product.title,
                t("product.shareText", { title: product.title, brand: product.brand }),
                getShareUrl(product.id),
                t("product.linkCopied")
              )}
              className="p-2 rounded-xl hover:bg-secondary active:scale-90 transition-all"
            >
              <Share2 className="w-5 h-5 text-foreground" />
            </button>
            <button onClick={() => toggleWishlist(product.id)} className="p-2 rounded-xl hover:bg-secondary active:scale-90 transition-all">
              <Heart className={`w-5 h-5 transition-all ${wishlisted ? "fill-primary text-primary scale-110" : "text-foreground"}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="app-container">
        {/* Desktop breadcrumb */}
        <div className="hidden md:flex items-center gap-2 px-6 pt-4 pb-2 text-sm">
          <Link to="/home" className="text-muted-foreground hover:text-foreground transition-colors">{t("nav.home")}</Link>
          <span className="text-muted-foreground">/</span>
          {product.category_slug && (
            <>
              <Link to={`/category/${product.category_slug}`} className="text-muted-foreground hover:text-foreground transition-colors capitalize">{product.category_slug}</Link>
              <span className="text-muted-foreground">/</span>
            </>
          )}
          <span className="text-foreground font-medium truncate">{product.title}</span>
        </div>

        {/* Desktop: side-by-side layout */}
        <div className="md:grid md:grid-cols-2 md:gap-8 md:px-6 md:mt-2">
          {/* Image Gallery */}
          <div className="relative md:sticky md:top-24 md:self-start">
            <div ref={sliderRef} onScroll={handleScroll} className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar md:rounded-2xl md:overflow-hidden" style={{ scrollbarWidth: "none" }}>
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
            {/* Desktop thumbnail strip */}
            {total > 1 && (
              <div className="hidden md:flex gap-2 mt-3">
                {images.map((img, idx) => (
                  <button key={idx} onClick={() => goTo(idx)} className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${idx === currentSlide ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="px-4 md:px-0 pt-5 md:pt-0">
            <Link to={`/brand/${product.brand_id}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/50 hover:bg-secondary/80 border border-border/30 transition-all group/brand">
              {(() => { const b = brands.find(b => b.id === product.brand_id); return b?.logo_url ? <img src={b.logo_url} alt={product.brand} className="w-8 h-8 object-contain rounded-lg bg-card p-0.5" /> : null; })()}
              <span className="text-xs font-bold uppercase tracking-widest text-primary group-hover/brand:underline">{product.brand}</span>
            </Link>
            <h1 className="text-xl md:text-2xl font-display font-bold text-foreground mt-1.5 leading-tight">{product.title}</h1>
            <div className="flex items-baseline gap-2.5 mt-2">
              <span className="text-2xl md:text-3xl font-extrabold text-primary">{formatPrice(displayPrice)}</span>
              {originalDisplayPrice && originalDisplayPrice > displayPrice && <span className="text-sm text-muted-foreground line-through">{formatPrice(originalDisplayPrice)}</span>}
              {offerPricing && <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">{offerPricing.offerLabel}</span>}
            </div>

            {/* Fast Delivery Banner */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-3 relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border border-primary/20 px-4 py-3"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/8 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground leading-tight">{t("common.fastDelivery") || "Fast 24-Hour Delivery"}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{t("common.fastDeliverySub") || "Order now & get it tomorrow!"}</p>
                </div>
              </div>
            </motion.div>

            {/* Desktop: share/wishlist actions */}
            <div className="hidden md:flex items-center gap-2 mt-4">
              <button onClick={() => toggleWishlist(product.id)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-secondary transition-colors">
                <Heart className={`w-4 h-4 transition-all ${wishlisted ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium text-foreground">{wishlisted ? t("common.saved") : t("common.save")}</span>
              </button>
              <button
                onClick={() => handleNativeShare(
                  product.title,
                  t("product.shareText", { title: product.title, brand: product.brand }),
                  getShareUrl(product.id),
                  t("product.linkCopied")
                )}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-secondary transition-colors"
              >
                <Share2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Share</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { icon: Truck, text: t("common.freeDelivery"), sub: "40K+" },
                { icon: ShieldCheck, text: t("common.original"), sub: "100%" },
                { icon: BadgeCheck, text: t("common.verified"), sub: "✓" },
              ].map(item => (
                <div key={item.text} className="flex flex-col items-center gap-1.5 bg-gradient-to-b from-primary/5 to-primary/10 border border-primary/15 rounded-2xl px-2 py-3 text-center">
                  <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[10px] font-bold text-foreground leading-tight">{item.text}</span>
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

            {/* Desktop Add to Cart */}
            <div className="hidden md:block mt-5">
              <motion.button whileTap={{ scale: outOfStock ? 1 : 0.97 }} onClick={handleAddToCart} disabled={outOfStock} className={`w-full flex items-center justify-center gap-2.5 font-bold py-4 rounded-2xl shadow-lg transition-opacity text-sm ${outOfStock ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
                <ShoppingBag className="w-5 h-5" />
                {outOfStock ? (t("product.outOfStock") || "Out of Stock") : t("product.addToCart")}
              </motion.button>
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
                          ...(product.skin_type ? [{ label: t("product.skinType"), value: product.skin_type }] : []),
                          ...(product.country_of_origin ? [{ label: t("product.countryOfOrigin") || "Country of Origin", value: product.country_of_origin }] : []),
                          ...(product.condition ? [{ label: t("product.concerns") || "Concern(s)", value: product.condition.split(",").map((c: string) => c.trim()).filter(Boolean).join(", ") }] : []),
                          ...(product.volume_ml ? [{ label: t("product.size") || "Size", value: `${product.volume_ml} ${product.volume_unit || "ml"}` }] : []),
                          ...(product.form ? [{ label: t("product.form") || "Form", value: product.form }] : []),
                        ].filter(row => row.value).map((row, i) => (
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
                <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth-x pb-2 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible">
                  {related.map(p => <ProductCard key={p.id} product={p} variant="horizontal" />)}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Mobile fixed Add to Cart */}
      <div className="fixed left-0 right-0 z-40 px-4 md:hidden" style={{ bottom: `calc(60px + env(safe-area-inset-bottom, 0px))` }}>
        <div className="app-container pb-2">
          <div className="glass-heavy rounded-2xl border border-border/30 p-2">
            <motion.button whileTap={{ scale: outOfStock ? 1 : 0.97 }} onClick={handleAddToCart} disabled={outOfStock} className={`w-full flex items-center justify-center gap-2.5 font-bold py-3.5 rounded-xl shadow-sm transition-opacity text-sm ${outOfStock ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-primary text-primary-foreground hover:opacity-90"}`}>
              <ShoppingBag className="w-5 h-5" />
              {outOfStock ? (t("product.outOfStock") || "Out of Stock") : t("product.addToCart")}
            </motion.button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProductPage;
