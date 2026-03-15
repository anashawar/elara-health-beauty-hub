import { useState } from "react";
import { Link } from "react-router-dom";
import fibLogo from "@/assets/fib-logo.png";
import qiLogo from "@/assets/qi-logo.svg";
import { ArrowLeft, Check, MapPin, ChevronDown, Sparkles, PartyPopper } from "lucide-react";
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

const FIRST_ORDER_DISCOUNT_PERCENT = 15;
const FIRST_ORDER_MIN_AMOUNT = 20000;

const CheckoutPage = () => {
  const { cart, cartTotal, clearCart } = useApp();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [submitted, setSubmitted] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [searchOpen, setSearchOpen] = useState(false);
  const deliveryFee = cartTotal >= 40000 ? 0 : 5000;

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
    staleTime: 0, // Always fresh — critical for accuracy
  });

  const isFirstOrder = existingOrderCount === 0 && !ordersCountLoading;
  const meetsMinimum = cartTotal >= FIRST_ORDER_MIN_AMOUNT;
  const firstOrderDiscount = isFirstOrder && meetsMinimum
    ? Math.round((cartTotal * FIRST_ORDER_DISCOUNT_PERCENT) / 100 / 250) * 250
    : 0;
  const finalTotal = cartTotal - firstOrderDiscount + deliveryFee;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (user && selectedAddress) {
      // Re-verify first order status at submit time to prevent race conditions
      const { count: freshCount } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      const confirmedFirstOrder = (freshCount ?? 0) === 0;
      const confirmedDiscount = confirmedFirstOrder && meetsMinimum
        ? Math.round((cartTotal * FIRST_ORDER_DISCOUNT_PERCENT) / 100 / 250) * 250
        : 0;

      const { data: order, error: orderError } = await supabase.from("orders").insert({
        user_id: user.id,
        address_id: selectedAddress.id,
        subtotal: cartTotal,
        delivery_fee: deliveryFee,
        discount: confirmedDiscount,
        total: cartTotal - confirmedDiscount + deliveryFee,
        payment_method: paymentMethod,
        notes: confirmedDiscount > 0
          ? [notes, `[First Order -${FIRST_ORDER_DISCOUNT_PERCENT}%]`].filter(Boolean).join(" | ")
          : (notes || null),
        coupon_code: confirmedDiscount > 0 ? `FIRST_ORDER_${FIRST_ORDER_DISCOUNT_PERCENT}` : null,
        status: "pending",
      }).select().single();

      if (orderError) {
        console.error(orderError);
      } else if (order) {
        const items = cart.map(item => ({
          order_id: order.id,
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        }));
        await supabase.from("order_items").insert(items);
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
        <p className="text-sm text-muted-foreground text-center mb-6">{t("checkout.orderPlacedDesc")}</p>
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
    { value: "cod", label: t("checkout.cod"), desc: t("checkout.codDesc"), icon: "💵", image: null },
    { value: "fib", label: t("checkout.fib"), desc: t("checkout.fibDesc"), icon: null, image: fibLogo },
    { value: "qicard", label: t("checkout.qicard"), desc: t("checkout.qicardDesc"), icon: null, image: qiLogo },
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
            {paymentMethods.map(method => (
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

        {/* Order Summary */}
        <div className="bg-card rounded-2xl p-4 shadow-premium">
          <h3 className="text-sm font-bold text-foreground mb-3">{t("cart.orderSummary")}</h3>
          <div className="space-y-1.5">
            {cart.map(item => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground truncate max-w-[200px]">{item.product.title} ×{item.quantity}</span>
                <span className="text-foreground font-medium">{formatPrice(item.product.price * item.quantity)}</span>
              </div>
            ))}

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

            <div className={`border-t border-border pt-2 ${firstOrderDiscount === 0 ? "mt-2" : ""} flex justify-between text-sm`}>
              <span className="text-muted-foreground">{t("cart.delivery")}</span>
              <span className={deliveryFee === 0 ? "text-sage font-medium" : "text-foreground font-medium"}>
                {deliveryFee === 0 ? t("common.free") : formatPrice(deliveryFee)}
              </span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="font-bold text-foreground">{t("cart.total")}</span>
              <div className="text-right">
                {firstOrderDiscount > 0 && (
                  <span className="text-xs text-muted-foreground line-through mr-2">{formatPrice(cartTotal + deliveryFee)}</span>
                )}
                <span className="font-bold text-foreground text-lg">{formatPrice(finalTotal)}</span>
              </div>
            </div>
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
