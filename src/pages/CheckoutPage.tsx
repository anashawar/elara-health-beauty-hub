import { useState } from "react";
import { Link } from "react-router-dom";
import fibLogo from "@/assets/fib-logo.png";
import qiLogo from "@/assets/qi-logo.svg";
import { ArrowLeft, Check, MapPin, ChevronDown, Sparkles, PartyPopper, Star, Clock, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/context/AppContext";
import { useFormatPrice } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/layout/BottomNav";
import DesktopHeader from "@/components/layout/DesktopHeader";
import SearchOverlay from "@/components/SearchOverlay";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { calculatePoints, useAwardPoints } from "@/hooks/useLoyalty";
import { getDeliveryFee } from "@/lib/deliveryFee";
import { useActiveOffers, getOfferForProduct } from "@/hooks/useOfferPricing";
import {
  FIRST_ORDER_DISCOUNT_PERCENT,
  FIRST_ORDER_MIN_AMOUNT,
  calcOrderDiscounts,
  getEffectivePrice,
} from "@/lib/discountRules";

const CheckoutPage = () => {
  const { cart, cartTotal, clearCart, appliedCoupon } = useApp();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const formatPrice = useFormatPrice();
  const [submitted, setSubmitted] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [searchOpen, setSearchOpen] = useState(false);
  const awardPoints = useAwardPoints();

  // Check if user has any previous orders (for first-order discount)
  const { data: existingOrderCount, isLoading: ordersCountLoading } = useQuery({
    queryKey: ["user-order-count", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user,
    staleTime: 0,
  });

  const isFirstOrder = existingOrderCount === 0 && !ordersCountLoading;
  const meetsMinimum = (cartTotal - (discounts?.offerSavings ?? 0)) >= FIRST_ORDER_MIN_AMOUNT;

  // Active offers for determining already-discounted products
  const { data: activeOffers = [] } = useActiveOffers();
  const offerLookup = (p: any) => getOfferForProduct(p, activeOffers);

  // Use centralized discount rules engine
  const discounts = calcOrderDiscounts(cart, cartTotal, isFirstOrder, appliedCoupon, offerLookup);
  const { offerSavings, firstOrderDiscount, couponDiscount, totalDiscount, offerAdjustedSubtotal } = discounts;

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ["addresses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const selectedAddress = addresses.find(a => a.id === selectedAddressId)
    || addresses.find(a => a.is_default)
    || addresses[0]
    || null;

  const subtotalAfterDiscount = Math.max(cartTotal - totalDiscount, 0);
  const deliveryFee = getDeliveryFee(selectedAddress?.city, subtotalAfterDiscount);
  const finalTotal = subtotalAfterDiscount + deliveryFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !selectedAddress) {
      console.error("Missing user or address");
      return;
    }

    // Re-verify first order status at submit time to prevent race conditions
    const { count: freshCount } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const confirmedFirstOrder = (freshCount ?? 0) === 0;
    const confirmedDiscounts = calcOrderDiscounts(cart, cartTotal, confirmedFirstOrder, appliedCoupon, offerLookup);
    const confirmedTotalDiscount = confirmedDiscounts.totalDiscount;
    const confirmedFirstDiscount = confirmedDiscounts.firstOrderDiscount;

    // Build notes and coupon_code
    const notesParts: string[] = [];
    if (notes) notesParts.push(notes);
    if (confirmedFirstDiscount > 0) notesParts.push(`[First Order -${FIRST_ORDER_DISCOUNT_PERCENT}%]`);
    if (appliedCoupon) notesParts.push(`[Coupon: ${appliedCoupon.code}]`);

    const couponCode = appliedCoupon?.code
      || (confirmedFirstDiscount > 0 ? `FIRST_ORDER_${FIRST_ORDER_DISCOUNT_PERCENT}` : null);

    const { data: order, error: orderError } = await supabase.from("orders").insert({
      user_id: user.id,
      address_id: selectedAddress.id,
      subtotal: cartTotal,
      delivery_fee: deliveryFee,
      discount: confirmedTotalDiscount,
      total: Math.max(cartTotal - confirmedTotalDiscount, 0) + deliveryFee,
      payment_method: paymentMethod,
      notes: notesParts.length > 0 ? notesParts.join(" | ") : null,
      coupon_code: couponCode,
      status: "processing",
    }).select().single();

    if (orderError) {
      console.error("Order insert failed:", orderError);
      alert(orderError.message || "Failed to place order. Please try again.");
      return;
    }

    if (!order) {
      console.error("No order returned after insert");
      alert("Failed to place order. Please try again.");
      return;
    }

    const items = cart.map(item => ({
      order_id: order.id,
      product_id: item.product.id,
      quantity: item.quantity,
      price: getEffectivePrice(item.product, offerLookup),
    }));
    await supabase.from("order_items").insert(items);

    // Increment coupon usage if a real coupon was used
    if (appliedCoupon?.code) {
      const { data: couponRow } = await supabase
        .from("coupons")
        .select("current_uses")
        .eq("code", appliedCoupon.code)
        .maybeSingle();
      if (couponRow) {
        await supabase
          .from("coupons")
          .update({ current_uses: (couponRow.current_uses || 0) + 1 })
          .eq("code", appliedCoupon.code);
      }
    }

    // Send order confirmation email (fire-and-forget)
    const addressParts = [
      selectedAddress.label, selectedAddress.city,
      selectedAddress.area, selectedAddress.street,
      selectedAddress.building, selectedAddress.floor,
    ].filter(Boolean).join(", ");

    supabase.functions.invoke("send-order-email", {
      body: {
        order_id: order.id,
        items: cart.map(item => ({
          title: item.product.title,
          quantity: item.quantity,
          price: item.product.price,
        })),
        subtotal: cartTotal,
        delivery_fee: deliveryFee,
        discount: confirmedTotalDiscount,
        total: Math.max(cartTotal - confirmedTotalDiscount, 0) + deliveryFee,
        delivery_address: addressParts,
        payment_method: paymentMethod,
      },
    }).catch(e => console.error("Order email failed:", e));

    // Award loyalty points (1 point per 1,000 IQD)
    const orderTotal = Math.max(cartTotal - confirmedTotalDiscount, 0) + deliveryFee;
    const pts = calculatePoints(orderTotal);
    if (pts > 0) {
      setEarnedPoints(pts);
      try {
        await awardPoints.mutateAsync({
          points: pts,
          description: t("rewards.orderReward"),
          referenceId: order.id,
        });
      } catch (e) {
        console.error("Failed to award points:", e);
      }
    }

    setSubmitted(true);
    clearCart();
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 max-w-lg mx-auto pb-24" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-sage/20 flex items-center justify-center mb-4"
        >
          <Check className="w-10 h-10 text-sage" />
        </motion.div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">{t("checkout.orderPlaced")}</h2>
        <p className="text-sm text-muted-foreground text-center mb-4">{t("checkout.orderPlacedDesc")}</p>

        {/* Points earned celebration */}
        {earnedPoints > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-xs bg-gradient-to-r from-amber-500/10 to-primary/10 rounded-2xl p-4 border border-amber-500/20 mb-6 text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span className="text-sm font-display font-bold text-foreground">{t("rewards.youEarned")}</span>
            </div>
            <p className="text-3xl font-display font-black text-primary">{earnedPoints}</p>
            <p className="text-xs text-muted-foreground">{t("rewards.pointsEarned")}</p>
            <Link to="/rewards" className="inline-block mt-2 text-xs font-semibold text-primary hover:underline">
              {t("rewards.title")} →
            </Link>
          </motion.div>
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link to="/orders" className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-2xl text-sm text-center">
            {t("profile.myOrders")}
          </Link>
          <Link to="/home" className="px-6 py-3 bg-secondary text-foreground font-semibold rounded-2xl text-sm text-center">
            {t("common.continueShopping")}
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  const paymentMethods = [
    { value: "cod", label: t("checkout.cod"), desc: t("checkout.codDesc"), icon: "💵", image: null, active: true },
    { value: "fib", label: t("checkout.fib"), desc: t("checkout.fibDesc"), icon: null, image: fibLogo, active: false },
    { value: "qicard", label: t("checkout.qicard"), desc: t("checkout.qicardDesc"), icon: null, image: qiLogo, active: false },
  ];

  const firstOrderTexts = {
    en: {
      title: "🎉 First Order Discount!",
      desc: `You get ${FIRST_ORDER_DISCOUNT_PERCENT}% off your first order`,
      saving: "You're saving",
      belowMin: `Add ${formatPrice(FIRST_ORDER_MIN_AMOUNT - cartTotal)} more to unlock your ${FIRST_ORDER_DISCOUNT_PERCENT}% first order discount!`,
    },
    ar: {
      title: "🎉 خصم الطلب الأول!",
      desc: `تحصل على خصم ${FIRST_ORDER_DISCOUNT_PERCENT}% على طلبك الأول`,
      saving: "توفيرك",
      belowMin: `أضف ${formatPrice(FIRST_ORDER_MIN_AMOUNT - cartTotal)} إضافية للحصول على خصم ${FIRST_ORDER_DISCOUNT_PERCENT}% على طلبك الأول!`,
    },
    ku: {
      title: "🎉 داشکانی داواکاری یەکەم!",
      desc: `${FIRST_ORDER_DISCOUNT_PERCENT}% داشکان لەسەر داواکاری یەکەمت`,
      saving: "پاشەکەوتت",
      belowMin: `${formatPrice(FIRST_ORDER_MIN_AMOUNT - cartTotal)} زیاتر زیاد بکە بۆ کردنەوەی ${FIRST_ORDER_DISCOUNT_PERCENT}% داشکانی داواکاری یەکەم!`,
    },
  };
  const fot = firstOrderTexts[language] || firstOrderTexts.en;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/30 md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/cart" className="p-2 -ml-2 rounded-xl active:bg-secondary active:scale-90 transition-all">
            <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
          </Link>
          <h1 className="text-lg font-display font-bold text-foreground">{t("checkout.title")}</h1>
        </div>
      </header>

      <div className="app-container">
        <div className="hidden md:flex items-center gap-2 px-6 pt-6 pb-2">
          <Link to="/cart" className="text-sm text-muted-foreground hover:text-foreground">← {t("nav.cart")}</Link>
          <span className="text-sm text-muted-foreground">/</span>
          <h1 className="text-lg font-display font-bold text-foreground">{t("checkout.title")}</h1>
        </div>

      <form onSubmit={handleSubmit} className="px-4 md:px-6 mt-4 space-y-4 md:max-w-2xl">

        {/* First Order Discount Banner */}
        {isFirstOrder && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-2xl p-4 ${
              meetsMinimum
                ? "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700"
                : "bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500"
            }`}
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/20" />
              <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/10" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                {meetsMinimum ? (
                  <Sparkles className="w-5 h-5 text-white" />
                ) : (
                  <PartyPopper className="w-5 h-5 text-white" />
                )}
                <h3 className="text-sm font-display font-bold text-white tracking-wide">
                  {fot.title}
                </h3>
              </div>
              {meetsMinimum ? (
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-white/85">{fot.desc}</p>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl px-3 py-1.5 border border-white/20">
                    <p className="text-[10px] text-white/70 uppercase tracking-wider font-medium">{fot.saving}</p>
                    <p className="text-base font-display font-bold text-white">-{formatPrice(firstOrderDiscount)}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-white/85 mt-1">{fot.belowMin}</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Delivery Address */}
        <div className="bg-card rounded-2xl p-4 shadow-premium">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">{t("checkout.deliveryAddress")}</h3>
            {addresses.length > 1 && (
              <button
                type="button"
                onClick={() => setShowAddressPicker(!showAddressPicker)}
                className="text-xs text-primary font-medium flex items-center gap-1"
              >
                {t("checkout.change")} <ChevronDown className={`w-3 h-3 transition-transform ${showAddressPicker ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>

          {addressesLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selectedAddress ? (
            <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-xl">
              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">{selectedAddress.label || t("addresses.title")} — {selectedAddress.city}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[selectedAddress.area, selectedAddress.street, selectedAddress.building, selectedAddress.floor, (selectedAddress as any).apartment].filter(Boolean).join(", ")}
                </p>
                {selectedAddress.phone && (
                  <p className="text-xs text-muted-foreground mt-0.5">📞 {selectedAddress.phone}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-xs text-muted-foreground mb-2">{t("checkout.noAddresses")}</p>
              <Link to="/addresses" className="text-xs text-primary font-medium">{t("checkout.addAddress")}</Link>
            </div>
          )}

          <AnimatePresence>
            {showAddressPicker && addresses.length > 1 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-3 space-y-2 overflow-hidden"
              >
                {addresses.map(addr => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => { setSelectedAddressId(addr.id); setShowAddressPicker(false); }}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      (selectedAddress?.id === addr.id) ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <p className="text-xs font-semibold text-foreground">{addr.label || t("addresses.title")} — {addr.city}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {[addr.area, addr.street, addr.building].filter(Boolean).join(", ")}
                    </p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notes */}
        <div className="bg-card rounded-2xl p-4 shadow-premium">
          <h3 className="text-sm font-bold text-foreground mb-2">{t("checkout.orderNotes")}</h3>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t("checkout.notesPlaceholder")}
            rows={2}
            className="w-full bg-secondary text-foreground text-sm px-4 py-3 rounded-xl outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>

        {/* Payment */}
        <div className="bg-card rounded-2xl p-4 shadow-premium">
          <h3 className="text-sm font-bold text-foreground mb-3">{t("checkout.paymentMethod")}</h3>
          <div className="space-y-2">
            {paymentMethods.filter(m => m.active).map(method => (
              <label
                key={method.value}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition-all ${
                  paymentMethod === method.value
                    ? "border-primary bg-primary/5"
                    : "border-transparent bg-secondary"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value={method.value}
                  checked={paymentMethod === method.value}
                  onChange={() => setPaymentMethod(method.value)}
                  className="accent-primary"
                />
                {method.image ? (
                  <img src={method.image} alt={method.label} className="w-8 h-8 rounded object-contain" />
                ) : (
                  <span className="text-lg">{method.icon}</span>
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">{method.label}</p>
                  <p className="text-[10px] text-muted-foreground">{method.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Estimated Delivery Time */}
        <div className="bg-card rounded-2xl p-4 shadow-premium">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">{language === "ar" ? "وقت التوصيل المتوقع" : language === "ku" ? "کاتی گەیاندنی چاوەڕوانکراو" : "Estimated Delivery Time"}</h3>
          </div>
          <p className="text-sm text-foreground font-semibold">
            {language === "ar" ? "خلال 24 ساعة 🚀" : language === "ku" ? "لە ماوەی ٢٤ کاتژمێردا 🚀" : "Within 24 hours 🚀"}
          </p>
          <div className="flex items-start gap-1.5 mt-2">
            <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {language === "ar"
                ? "قد يحدث تأخير بسيط في أوقات الطلبات الكثيرة أو المناسبات. لكن بشكل عام، التوصيل خلال 24 ساعة إلى باب منزلك!"
                : language === "ku"
                  ? "لەوانەیە لە کاتی داواکاری زۆر یان بۆنەکاندا دواکەوتنی کەمێک ڕووبدات. بەڵام بە گشتی، گەیاندن لە ماوەی ٢٤ کاتژمێردا بۆ دەرگای ماڵتان!"
                  : "Delivery might have slight delays during high-order periods or occasions. But overall, delivery is within 24 hours straight to your door!"}
            </p>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-card rounded-2xl p-4 shadow-premium">
          <h3 className="text-sm font-bold text-foreground mb-3">{t("cart.orderSummary")}</h3>
          <div className="space-y-1.5">
            {cart.map(item => {
              const effectivePrice = getEffectivePrice(item.product, offerLookup);
              const hasOffer = effectivePrice < item.product.price;
              return (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate max-w-[200px]">{item.product.title} ×{item.quantity}</span>
                  <div className="flex items-center gap-1.5">
                    {hasOffer && (
                      <span className="text-muted-foreground line-through text-xs">{formatPrice(item.product.price * item.quantity)}</span>
                    )}
                    <span className="text-foreground font-medium">{formatPrice(effectivePrice * item.quantity)}</span>
                  </div>
                </div>
              );
            })}

            {/* Offer savings line */}
            {offerSavings > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="border-t border-border pt-2 mt-2 flex justify-between text-sm"
              >
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  🏷️ {language === "ar" ? "خصومات العروض" : language === "ku" ? "داشکانی ئۆفەرەکان" : "Offer Discounts"}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">-{formatPrice(offerSavings)}</span>
              </motion.div>
            )}

            {/* First order discount line */}
            {firstOrderDiscount > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="border-t border-border pt-2 mt-2 flex justify-between text-sm"
              >
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {fot.title}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">-{formatPrice(firstOrderDiscount)}</span>
              </motion.div>
            )}

            {/* Coupon discount line */}
            {appliedCoupon && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="border-t border-border pt-2 mt-2"
              >
                <div className="flex justify-between text-sm">
                  <span className="text-primary font-medium flex items-center gap-1">
                    🏷️ {t("cart.coupon")} ({appliedCoupon.code})
                  </span>
                  {couponDiscount > 0 ? (
                    <span className="text-primary font-bold">-{formatPrice(couponDiscount)}</span>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      {isFirstOrder
                        ? (language === "ar" ? "من الطلب الثاني" : "From 2nd order")
                        : (language === "ar" ? "لا منتجات مؤهلة" : "No eligible items")}
                    </span>
                  )}
                </div>
                {isFirstOrder && appliedCoupon.influencer_name && (
                  <p className="text-[9px] text-muted-foreground mt-1">
                    ✓ {language === "ar" ? `مسجّل عبر ${appliedCoupon.influencer_name}` : `Tracked via ${appliedCoupon.influencer_name}`}
                  </p>
                )}
              </motion.div>
            )}

            <div className={`border-t border-border pt-2 ${totalDiscount === 0 ? "mt-2" : ""} flex justify-between text-sm`}>
              <span className="text-muted-foreground">{t("cart.delivery")}</span>
              <span className={deliveryFee === 0 ? "text-sage font-medium" : "text-foreground font-medium"}>
                {deliveryFee === 0 ? t("common.free") : formatPrice(deliveryFee)}
              </span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="font-bold text-foreground">{t("cart.total")}</span>
              <div className="text-right">
                {totalDiscount > 0 && (
                  <span className="text-xs text-muted-foreground line-through mr-2">{formatPrice(cartTotal + deliveryFee)}</span>
                )}
                <span className="font-bold text-foreground text-lg">{formatPrice(finalTotal)}</span>
              </div>
            </div>

            {/* Points preview */}
            {calculatePoints(finalTotal) > 0 && (
              <div className="border-t border-border pt-2 flex items-center justify-between">
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {language === "ar" ? "ستكسب" : language === "ku" ? "بەدەست دەهێنیت" : "You will earn"}
                </span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">+{calculatePoints(finalTotal)} pts</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 pb-8">
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={!selectedAddress && !!user}
            className="w-full bg-primary text-primary-foreground font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity text-sm disabled:opacity-50 shadow-float"
          >
            {t("checkout.placeOrder")}
          </motion.button>
        </div>
      </form>
      </div>

      <BottomNav />
    </div>
  );
};

export default CheckoutPage;
