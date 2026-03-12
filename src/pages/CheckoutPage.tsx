import { Link } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { formatPrice } from "@/hooks/useProducts";
import BottomNav from "@/components/layout/BottomNav";
import { useState } from "react";

const CheckoutPage = () => {
  const { cart, cartTotal, clearCart } = useApp();
  const [submitted, setSubmitted] = useState(false);
  const deliveryFee = cartTotal >= 40000 ? 0 : 5000;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    clearCart();
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 max-w-lg mx-auto">
        <div className="w-20 h-20 rounded-full bg-sage/20 flex items-center justify-center mb-4">
          <Check className="w-10 h-10 text-sage" />
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground mb-2">Order Placed!</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">Your order has been placed successfully. We'll notify you when it ships.</p>
        <Link to="/" className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-2xl text-sm">
          Continue Shopping
        </Link>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/cart" className="p-1"><ArrowLeft className="w-5 h-5 text-foreground" /></Link>
          <h1 className="text-lg font-display font-bold text-foreground">Checkout</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-4 mt-4 space-y-4">
        <div className="bg-card rounded-2xl p-4 shadow-premium space-y-3">
          <h3 className="text-sm font-bold text-foreground">Delivery Address</h3>
          <input required placeholder="Full Name" className="w-full bg-secondary text-foreground text-sm px-4 py-3 rounded-xl outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20" />
          <input required placeholder="Mobile Number" type="tel" className="w-full bg-secondary text-foreground text-sm px-4 py-3 rounded-xl outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20" />
          <input required placeholder="City" className="w-full bg-secondary text-foreground text-sm px-4 py-3 rounded-xl outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20" />
          <input required placeholder="Address / Area" className="w-full bg-secondary text-foreground text-sm px-4 py-3 rounded-xl outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20" />
          <textarea placeholder="Order Notes (optional)" rows={2} className="w-full bg-secondary text-foreground text-sm px-4 py-3 rounded-xl outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 resize-none" />
        </div>

        <div className="bg-card rounded-2xl p-4 shadow-premium">
          <h3 className="text-sm font-bold text-foreground mb-3">Payment Method</h3>
          <label className="flex items-center gap-3 p-3 bg-secondary rounded-xl cursor-pointer">
            <input type="radio" name="payment" defaultChecked className="accent-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Cash on Delivery (COD)</p>
              <p className="text-[10px] text-muted-foreground">Pay when you receive your order</p>
            </div>
          </label>
        </div>

        <div className="bg-card rounded-2xl p-4 shadow-premium">
          <h3 className="text-sm font-bold text-foreground mb-3">Order Summary</h3>
          <div className="space-y-1.5">
            {cart.map(item => (
              <div key={item.product.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground truncate max-w-[200px]">{item.product.title} ×{item.quantity}</span>
                <span className="text-foreground font-medium">{formatPrice(item.product.price * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Delivery</span>
              <span className={deliveryFee === 0 ? "text-sage font-medium" : "text-foreground font-medium"}>
                {deliveryFee === 0 ? "Free" : formatPrice(deliveryFee)}
              </span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="font-bold text-foreground">Total</span>
              <span className="font-bold text-foreground text-lg">{formatPrice(cartTotal + deliveryFee)}</span>
            </div>
          </div>
        </div>

        <button type="submit" className="w-full bg-primary text-primary-foreground font-semibold py-4 rounded-2xl hover:opacity-90 transition-opacity text-sm">
          Place Order — {formatPrice(cartTotal + deliveryFee)}
        </button>
      </form>

      <BottomNav />
    </div>
  );
};

export default CheckoutPage;
