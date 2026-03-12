import { Link } from "react-router-dom";
import { ArrowLeft, Minus, Plus, Trash2, Tag } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { formatPrice } from "@/hooks/useProducts";
import BottomNav from "@/components/layout/BottomNav";
import { useState } from "react";

const CartPage = () => {
  const { cart, updateQuantity, removeFromCart, cartTotal, clearCart } = useApp();
  const [coupon, setCoupon] = useState("");
  const deliveryFee = cartTotal > 50000 ? 0 : 5000;

  return (
    <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-1"><ArrowLeft className="w-5 h-5 text-foreground" /></Link>
            <h1 className="text-lg font-display font-bold text-foreground">Cart</h1>
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-destructive font-medium">Clear All</button>
          )}
        </div>
      </header>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 px-4">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mb-4">
            <span className="text-3xl">🛒</span>
          </div>
          <h3 className="text-lg font-display font-bold text-foreground">Your cart is empty</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Start shopping to add items</p>
          <Link to="/" className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-2xl text-sm">
            Explore Products
          </Link>
        </div>
      ) : (
        <>
          <div className="px-4 mt-4 space-y-3">
            {cart.map(item => (
              <div key={item.product.id} className="flex gap-3 bg-card rounded-2xl p-3 shadow-premium">
                <Link to={`/product/${item.product.id}`}>
                  <img src={item.product.image} alt={item.product.title} className="w-20 h-20 rounded-xl object-cover bg-secondary" />
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">{item.product.brand}</p>
                  <p className="text-sm font-medium text-foreground truncate">{item.product.title}</p>
                  <p className="text-sm font-bold text-foreground mt-1">{formatPrice(item.product.price)}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 bg-secondary rounded-xl">
                      <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1.5">
                        <Minus className="w-3.5 h-3.5 text-foreground" />
                      </button>
                      <span className="text-sm font-semibold text-foreground w-5 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1.5">
                        <Plus className="w-3.5 h-3.5 text-foreground" />
                      </button>
                    </div>
                    <button onClick={() => removeFromCart(item.product.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Coupon */}
          <div className="px-4 mt-4">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-card rounded-xl px-3 border border-border">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <input value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="Coupon code" className="flex-1 bg-transparent text-sm py-3 outline-none text-foreground placeholder:text-muted-foreground" />
              </div>
              <button className="px-5 bg-secondary text-secondary-foreground font-semibold text-sm rounded-xl">Apply</button>
            </div>
          </div>

          {/* Summary */}
          <div className="px-4 mt-6 bg-card rounded-2xl p-4 mx-4 shadow-premium">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span className={`font-medium ${deliveryFee === 0 ? "text-sage" : "text-foreground"}`}>
                  {deliveryFee === 0 ? "Free" : formatPrice(deliveryFee)}
                </span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-bold text-foreground text-lg">{formatPrice(cartTotal + deliveryFee)}</span>
              </div>
            </div>
            {deliveryFee > 0 && (
              <p className="text-[10px] text-muted-foreground mt-2">Free delivery on orders over 50,000 IQD</p>
            )}
          </div>

          <div className="px-4 mt-4">
            <Link to="/checkout" className="block w-full text-center bg-primary text-primary-foreground font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity">
              Proceed to Checkout
            </Link>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
};

export default CartPage;
