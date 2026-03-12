import { Link } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Trash2, Tag, ShoppingBag, Sparkles, Truck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { formatPrice } from "@/hooks/useProducts";
import BottomNav from "@/components/layout/BottomNav";
import { useState } from "react";

const CartPage = () => {
  const { cart, updateQuantity, removeFromCart, cartTotal, cartCount, clearCart } = useApp();
  const [coupon, setCoupon] = useState("");
  const deliveryFee = cartTotal >= 40000 ? 0 : 5000;
  const freeDeliveryLeft = 40000 - cartTotal;
  const freeDeliveryProgress = Math.min((cartTotal / 40000) * 100, 100);

  return (
    <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-1.5 -ml-1 rounded-xl hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Link>
            <div>
              <h1 className="text-lg font-display font-bold text-foreground">My Bag</h1>
              {cart.length > 0 && (
                <p className="text-[10px] text-muted-foreground">{cartCount} item{cartCount !== 1 ? "s" : ""}</p>
              )}
            </div>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-destructive font-medium px-3 py-1.5 bg-destructive/10 rounded-lg">
              Clear All
            </button>
          )}
        </div>
      </header>

      {cart.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center mt-20 px-4"
        >
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-secondary to-muted flex items-center justify-center mb-5">
            <ShoppingBag className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-display font-bold text-foreground">Your bag is empty</h3>
          <p className="text-sm text-muted-foreground mt-1.5 mb-6 text-center">
            Looks like you haven't added anything yet ✨
          </p>
          <Link to="/" className="px-8 py-3.5 bg-primary text-primary-foreground font-bold rounded-2xl text-sm shadow-md">
            Start Shopping
          </Link>
        </motion.div>
      ) : (
        <>
          {/* Free Delivery Progress */}
          {freeDeliveryLeft > 0 && (
            <div className="mx-4 mt-4 bg-card rounded-2xl border border-border/50 p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-primary" />
                <p className="text-xs text-foreground font-medium">
                  Add <span className="font-bold text-primary">{formatPrice(freeDeliveryLeft)}</span> for free delivery!
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
            <div className="mx-4 mt-4 bg-primary/10 rounded-2xl p-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-primary">You've unlocked FREE delivery! 🎉</p>
            </div>
          )}

          {/* Cart Items */}
          <div className="px-4 mt-4 space-y-3">
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
                      <p className="text-base font-extrabold text-foreground">{formatPrice(item.product.price * item.quantity)}</p>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center bg-secondary rounded-xl overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="p-2 hover:bg-muted transition-colors"
                          >
                            {item.quantity === 1 ? (
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            ) : (
                              <Minus className="w-3.5 h-3.5 text-foreground" />
                            )}
                          </button>
                          <span className="text-sm font-bold text-foreground w-7 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="p-2 hover:bg-muted transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5 text-foreground" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Coupon */}
          <div className="px-4 mt-5">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-card rounded-xl px-3.5 border border-border/50">
                <Tag className="w-4 h-4 text-primary" />
                <input
                  value={coupon}
                  onChange={e => setCoupon(e.target.value)}
                  placeholder="Got a coupon code?"
                  className="flex-1 bg-transparent text-sm py-3 outline-none text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <button className="px-5 bg-primary/10 text-primary font-bold text-sm rounded-xl hover:bg-primary/20 transition-colors">
                Apply
              </button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="mx-4 mt-5 bg-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="px-4 py-3 bg-secondary/30 border-b border-border/30">
              <h3 className="text-sm font-bold text-foreground">Order Summary</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({cartCount} items)</span>
                <span className="font-semibold text-foreground">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span className={`font-semibold ${deliveryFee === 0 ? "text-primary" : "text-foreground"}`}>
                  {deliveryFee === 0 ? "FREE ✨" : formatPrice(deliveryFee)}
                </span>
              </div>
              <div className="border-t border-border/50 pt-3 flex justify-between items-baseline">
                <span className="font-bold text-foreground">Total</span>
                <span className="text-xl font-extrabold text-foreground">{formatPrice(cartTotal + deliveryFee)}</span>
              </div>
            </div>
          </div>

          {/* Checkout Button */}
          <div className="px-4 mt-5">
            <motion.div whileTap={{ scale: 0.98 }}>
              <Link
                to="/checkout"
                className="block w-full text-center bg-primary text-primary-foreground font-bold py-4 rounded-2xl shadow-lg text-sm"
              >
                Proceed to Checkout · {formatPrice(cartTotal + deliveryFee)}
              </Link>
            </motion.div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
};

export default CartPage;
