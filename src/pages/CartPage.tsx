import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Trash2, Tag, ShoppingBag, Sparkles, Truck, X, CheckCircle2, Loader2, Package, ChevronRight, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { useFormatPrice } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/layout/BottomNav";
import DesktopHeader from "@/components/layout/DesktopHeader";
import FloatingSearch from "@/components/layout/FloatingSearch";
import SearchOverlay from "@/components/SearchOverlay";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";

import { getDeliveryFee, FREE_DELIVERY_MIN } from "@/lib/deliveryFee";
import { useActiveOffers, getOfferForProduct } from "@/hooks/useOfferPricing";
import { calcCouponDiscount, getEligibleSubtotal, calcOfferSavings, getEffectivePrice } from "@/lib/discountRules";
import CartFrequentlyBought from "@/components/cart/CartFrequentlyBought";

const CartPage = () => {
  const { cart, updateQuantity, removeFromCart, cartTotal, cartCount, clearCart, pendingCoupon, setPendingCoupon, appliedCoupon, setAppliedCoupon } = useApp();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const formatPrice = useFormatPrice();
  const [coupon, setCoupon] = useState(appliedCoupon?.code || "");
  const [couponLoading, setCouponLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const autoApplied = useRef(false);

  // Auto-apply pending coupon from banner
  useEffect(() => {
    if (pendingCoupon && !autoApplied.current && !appliedCoupon && cart.length > 0) {
      autoApplied.current = true;
      setCoupon(pendingCoupon);
      setPendingCoupon(null);
      const applyPending = async () => {
        setCouponLoading(true);
        const { data, error } = await supabase
          .from("coupons_public")
          .select("*")
          .ilike("code", pendingCoupon.trim())
          .eq("is_active", true)
          .maybeSingle();
        setCouponLoading(false);
        if (!error && data) {
          if (data.expires_at && new Date(data.expires_at) < new Date()) return;
          if (data.max_uses && data.current_uses >= data.max_uses) return;
          setAppliedCoupon({
            code: data.code,
            discount_type: data.discount_type,
            discount_value: data.discount_value,
          });
          toast(t("cart.couponApplied"));
        }
      };
      applyPending();
    }
  }, [pendingCoupon, cart.length]);

  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    pending: { label: t("cart.pending"), color: "bg-amber-100 text-amber-700", icon: "⏳" },
    in_progress: { label: t("cart.processing"), color: "bg-violet-100 text-violet-700", icon: "⚙️" },
    shipped: { label: t("cart.shipped"), color: "bg-cyan-100 text-cyan-700", icon: "📦" },
    on_the_way: { label: t("cart.onTheWay"), color: "bg-blue-100 text-blue-700", icon: "🚚" },
    delivered: { label: t("cart.delivered"), color: "bg-green-100 text-green-700", icon: "✅" },
    cancelled: { label: t("cart.cancelled"), color: "bg-red-100 text-red-700", icon: "❌" },
  };

  const { data: activeOrders } = useQuery({
    queryKey: ["active-orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, status, total, created_at, order_items(quantity)")
        .in("status", ["processing", "prepared", "on_the_way"])
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: defaultAddress } = useQuery({
    queryKey: ["default-address-city", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("addresses")
        .select("city")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Check if first order (for coupon rules messaging)
  const { data: existingOrderCount } = useQuery({
    queryKey: ["user-order-count-cart", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 0,
  });
  const isFirstOrder = existingOrderCount === 0;

  const { data: activeOffers = [] } = useActiveOffers();
  const offerLookup = (p: any) => getOfferForProduct(p, activeOffers);

  // Calculate offer savings and coupon discount
  const offerSavings = calcOfferSavings(cart, offerLookup);
  const discount = calcCouponDiscount(appliedCoupon, cart, isFirstOrder, offerLookup);
  const eligibleSubtotal = getEligibleSubtotal(cart, offerLookup);

  const subtotalAfterDiscount = Math.max(cartTotal - offerSavings - discount, 0);
  const deliveryFee = getDeliveryFee(defaultAddress?.city, subtotalAfterDiscount);
  const freeDeliveryLeft = FREE_DELIVERY_MIN - subtotalAfterDiscount;
  const freeDeliveryProgress = Math.min((subtotalAfterDiscount / FREE_DELIVERY_MIN) * 100, 100);
  const total = subtotalAfterDiscount + deliveryFee;

  const handleApplyCoupon = async () => {
    if (!coupon.trim()) return;
    setCouponLoading(true);

    const trimmedCode = coupon.trim().toUpperCase();

    const { data, error } = await supabase
      .from("coupons_public")
      .select("*")
      .ilike("code", trimmedCode)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      setCouponLoading(false);
      toast(t("cart.invalidCoupon"));
      return;
    }

    // Expired check
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setCouponLoading(false);
      toast(t("cart.couponExpired"));
      return;
    }

    // Max global uses check
    if (data.max_uses && data.current_uses >= data.max_uses) {
      setCouponLoading(false);
      toast(t("cart.couponLimitReached"));
      return;
    }

    // Min order amount check (against full cart total before discounts)
    if (data.min_order_amount && cartTotal < data.min_order_amount) {
      setCouponLoading(false);
      toast(t("cart.minOrderRequired", { amount: formatPrice(data.min_order_amount) }));
      return;
    }

    // Per-user restriction check
    if (user) {
      const { data: allowedUsers } = await supabase
        .from("coupon_allowed_users")
        .select("user_id")
        .eq("coupon_id", data.id);

      if (allowedUsers && allowedUsers.length > 0) {
        const isAllowed = allowedUsers.some((au: any) => au.user_id === user.id);
        if (!isAllowed) {
          setCouponLoading(false);
          toast(t("cart.invalidCoupon"));
          return;
        }
      }
    }

    // Coupons can be reused by the same user on multiple orders

    setCouponLoading(false);

    // Accept the coupon
    setAppliedCoupon({
      code: data.code,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
    });

    // On first order: inform user coupon is tracked but discount applies from 2nd order
    if (isFirstOrder) {
      toast(language === "ar"
        ? "تم قبول الكوبون! خصم 15% للطلب الأول يُطبّق تلقائياً. خصم الكوبون سيعمل من الطلب الثاني."
        : language === "ku"
          ? "کوپۆنەکە وەرگیرا! داشکانی 15% بۆ داواکاری یەکەم خۆکارانە دادەنرێت. داشکانی کوپۆن لە داواکاری دووەمەوە کار دەکات."
          : "Coupon accepted! Your 15% first-order discount is applied automatically. Coupon discount will work from your second order.",
        { duration: 6000 }
      );
    } else {
      toast(t("cart.couponApplied"));
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCoupon("");
    toast(t("cart.couponRemoved"));
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/30 md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/home" className="p-2 -ml-2 rounded-xl active:bg-secondary active:scale-90 transition-all">
              <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
            </Link>
            <div>
              <h1 className="text-lg font-display font-bold text-foreground">{t("cart.myBag")}</h1>
              {cart.length > 0 && (
                <p className="text-[10px] text-muted-foreground">{cartCount} {cartCount !== 1 ? t("common.items") : t("common.item")}</p>
              )}
            </div>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-destructive font-medium px-3 py-1.5 bg-destructive/10 rounded-lg active:scale-95 transition-transform">
              {t("cart.clearAll")}
            </button>
          )}
        </div>
      </header>

      <div className="app-container">
        {/* Desktop title */}
        <div className="hidden md:flex items-center justify-between px-6 pt-6 pb-2">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{t("cart.myBag")}</h1>
            {cart.length > 0 && (
              <p className="text-sm text-muted-foreground">{cartCount} {cartCount !== 1 ? t("common.items") : t("common.item")}</p>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-destructive font-medium px-3 py-1.5 bg-destructive/10 rounded-lg">
              {t("cart.clearAll")}
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center mt-20 px-4"
          >
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-secondary to-muted flex items-center justify-center mb-5">
              <ShoppingBag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-display font-bold text-foreground">{t("cart.emptyBag")}</h3>
            <p className="text-sm text-muted-foreground mt-1.5 mb-6 text-center">
              {t("cart.emptyBagDesc")}
            </p>
            <Link to="/home" className="px-8 py-3.5 bg-primary text-primary-foreground font-bold rounded-2xl text-sm shadow-md">
              {t("common.startShopping")}
            </Link>
            {/* AI suggestion on empty cart */}
            <Link to="/elara-ai" className="mt-4 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20 group">
              <Sparkles className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs font-bold text-foreground">{t("cart2.notSureWhatToBuy")}</p>
                <p className="text-[10px] text-muted-foreground">{t("cart2.letAIRecommend")}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-primary rtl:rotate-180" />
            </Link>
          </motion.div>
        ) : (
          <div className="md:grid md:grid-cols-3 md:gap-6 md:px-6 md:mt-4">
            {/* Cart items column */}
            <div className="md:col-span-2">
              {/* Free Delivery Progress */}
              {freeDeliveryLeft > 0 && (
                <div className="mx-4 md:mx-0 mt-4 md:mt-0 bg-card rounded-2xl border border-border/50 p-3.5">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <p className="text-xs text-foreground font-medium">
                      {t("cart.freeDeliveryProgress", { amount: formatPrice(freeDeliveryLeft) })}
                    </p>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${freeDeliveryProgress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                    />
                  </div>
                </div>
              )}
              {freeDeliveryLeft <= 0 && (
                <div className="mx-4 md:mx-0 mt-4 md:mt-0 bg-primary/10 rounded-2xl p-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <p className="text-xs font-semibold text-primary">{t("cart.unlockedFreeDelivery")}</p>
                </div>
              )}

              {/* Cart Items */}
              <div className="px-4 md:px-0 mt-4 space-y-3">
                <AnimatePresence>
                  {cart.map((item, idx) => (
                    <motion.div
                      key={item.product.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex gap-3 bg-card rounded-2xl p-3 border border-border/40"
                    >
                      <Link to={`/product/${item.product.id}`} className="flex-shrink-0">
                        <img
                          src={item.product.image}
                          alt={item.product.title}
                          className="w-24 h-24 rounded-xl object-cover bg-secondary"
                        />
                      </Link>
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{item.product.brand}</p>
                          <p className="text-sm font-semibold text-foreground truncate mt-0.5">{item.product.title}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          {(() => {
                            const effectivePrice = getEffectivePrice(item.product, offerLookup);
                            const hasOffer = effectivePrice < item.product.price;
                            return (
                              <div className="flex items-center gap-1.5">
                                {hasOffer && (
                                  <p className="text-xs text-muted-foreground line-through">{formatPrice(item.product.price * item.quantity)}</p>
                                )}
                                <p className={`text-base font-extrabold ${hasOffer ? "text-primary" : "text-foreground"}`}>{formatPrice(effectivePrice * item.quantity)}</p>
                              </div>
                            );
                          })()}
                          <div className="flex items-center bg-secondary rounded-xl overflow-hidden border border-border/30">
                            <button
                              onClick={() => { updateQuantity(item.product.id, item.quantity - 1); }}
                              className="p-2.5 hover:bg-muted transition-colors active:bg-muted active:scale-90"
                            >
                              {item.quantity === 1 ? (
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              ) : (
                                <Minus className="w-3.5 h-3.5 text-foreground" />
                              )}
                            </button>
                            <span className="text-sm font-bold text-foreground w-8 text-center tabular-nums">{item.quantity}</span>
                            <button
                              onClick={() => { updateQuantity(item.product.id, item.quantity + 1); }}
                              className="p-2.5 hover:bg-muted transition-colors active:bg-muted active:scale-90"
                            >
                              <Plus className="w-3.5 h-3.5 text-foreground" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Frequently Bought Together for cart */}
              {cart.length > 0 && (
                <CartFrequentlyBought cartProductIds={cart.map(i => i.product.id)} />
              )}
            </div>

            {/* Sidebar - Order Summary */}
            <div className="md:col-span-1">
              {/* Coupon */}
              <div className="px-4 md:px-0 mt-5 md:mt-0">
                {appliedCoupon ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center justify-between bg-primary/10 rounded-xl px-4 py-3 border border-primary/20"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                  <div>
                        <p className="text-xs font-bold text-primary">{appliedCoupon.code}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {isFirstOrder
                            ? (language === "ar" ? "مسجّل للتتبع • خصم الكوبون من الطلب الثاني" : "Tracked • Coupon discount from 2nd order")
                            : (
                              appliedCoupon.discount_type === "percentage"
                                ? `${appliedCoupon.discount_value}% ${t("common.off").toLowerCase()}`
                                : `${formatPrice(appliedCoupon.discount_value)} ${t("common.off").toLowerCase()}`
                            ) + (discount > 0 ? ` · ${t("cart.youSave")} ${formatPrice(discount)}` : "")
                          }
                        </p>
                        {isFirstOrder && (
                          <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            {language === "ar" ? "خصم 15% للطلب الأول يُطبّق تلقائياً في الدفع" : "15% first-order discount applied at checkout"}
                          </p>
                        )}
                      </div>
                    </div>
                    <button onClick={removeCoupon} className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </motion.div>
                ) : (
                  <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-card rounded-xl px-3.5 border border-border/50">
                      <Tag className="w-4 h-4 text-primary" />
                      <input
                        value={coupon}
                        onChange={e => setCoupon(e.target.value.toUpperCase())}
                        placeholder={t("cart.couponPlaceholder")}
                        className="flex-1 bg-transparent text-sm py-3 outline-none text-foreground placeholder:text-muted-foreground uppercase"
                        onKeyDown={e => e.key === "Enter" && handleApplyCoupon()}
                      />
                    </div>
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !coupon.trim()}
                      className="px-5 bg-primary/10 text-primary font-bold text-sm rounded-xl hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.apply")}
                    </button>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="mx-4 md:mx-0 mt-5 bg-card rounded-2xl border border-border/50 overflow-hidden md:sticky md:top-24">
                <div className="px-4 py-3 bg-secondary/30 border-b border-border/30">
                  <h3 className="text-sm font-bold text-foreground">{t("cart.orderSummary")}</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("cart.subtotal")} ({cartCount} {t("common.items")})</span>
                    <span className="font-semibold text-foreground">{formatPrice(cartTotal)}</span>
                  </div>
                  {offerSavings > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        🏷️ {language === "ar" ? "خصومات العروض" : language === "ku" ? "داشکانی ئۆفەرەکان" : "Offer Discounts"}
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">-{formatPrice(offerSavings)}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-primary font-medium">{t("cart.coupon")} ({appliedCoupon?.code})</span>
                      <span className="font-semibold text-primary">-{formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("cart.delivery")}</span>
                    <span className={`font-semibold ${deliveryFee === 0 ? "text-primary" : "text-foreground"}`}>
                      {deliveryFee === 0 ? `${t("common.free")} ✨` : formatPrice(deliveryFee)}
                    </span>
                  </div>
                  <div className="border-t border-border/50 pt-3 flex justify-between items-baseline">
                    <span className="font-bold text-foreground">{t("cart.total")}</span>
                    <div className="text-right">
                      {(offerSavings > 0 || discount > 0) && (
                        <span className="text-xs text-muted-foreground line-through mr-2">{formatPrice(cartTotal + deliveryFee)}</span>
                      )}
                      <span className="text-xl font-extrabold text-foreground">{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>

                {/* Checkout Button */}
                <div className="px-4 pb-4">
                  <motion.div whileTap={{ scale: 0.98 }}>
                    <Link
                      to="/checkout"
                      className="block w-full text-center bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-lg text-sm"
                    >
                      {t("cart.proceedToCheckout")}
                    </Link>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Orders Section */}
        {activeOrders && activeOrders.length > 0 && (
          <div className="px-4 md:px-6 mt-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">{t("cart.activeOrders")}</h3>
              </div>
              <Link to="/orders" className="text-xs text-primary font-medium flex items-center gap-0.5">
                {t("common.viewAll")} <ChevronRight className="w-3 h-3 rtl:rotate-180" />
              </Link>
            </div>
            <div className="space-y-2.5 md:grid md:grid-cols-3 md:gap-3 md:space-y-0">
              {activeOrders.map((order) => {
                const cfg = statusConfig[order.status] || statusConfig.pending;
                const itemCount = order.order_items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;
                return (
                  <Link
                    key={order.id}
                    to="/orders"
                    className="flex items-center justify-between bg-card rounded-2xl p-3.5 border border-border/40"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{cfg.icon}</span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {itemCount} {itemCount !== 1 ? t("common.items") : t("common.item")} · {formatPrice(Number(order.total))}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <FloatingSearch />
      <BottomNav />
    </div>
  );
};

export default CartPage;
