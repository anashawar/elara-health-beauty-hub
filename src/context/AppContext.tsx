import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { ProductWithRelations } from "@/hooks/useProducts";

interface CartItem {
  product: ProductWithRelations;
  quantity: number;
}

export interface AppliedCoupon {
  code: string;
  discount_type: string;
  discount_value: number;
  influencer_name?: string | null;
  influencer_commission?: number | null;
}

interface AppContextType {
  cart: CartItem[];
  wishlist: string[];
  addToCart: (product: ProductWithRelations) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  cartTotal: number;
  cartCount: number;
  clearCart: () => void;
  pendingCoupon: string | null;
  setPendingCoupon: (code: string | null) => void;
  appliedCoupon: AppliedCoupon | null;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
}

const CART_STORAGE_KEY = "elara_cart";
const WISHLIST_STORAGE_KEY = "elara_wishlist";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function loadWishlist(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(loadCart);
  const [wishlist, setWishlist] = useState<string[]>(loadWishlist);
  const [pendingCoupon, setPendingCoupon] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  // Persist cart to localStorage on every change
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // Persist wishlist to localStorage
  const wishlistInitial = useRef(true);
  useEffect(() => {
    if (wishlistInitial.current) {
      wishlistInitial.current = false;
      return;
    }
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    } catch {}
  }, [wishlist]);

  const addToCart = useCallback((product: ProductWithRelations) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(i => i.product.id !== productId));
    } else {
      setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity } : i));
    }
  }, []);

  const toggleWishlist = useCallback((productId: string) => {
    setWishlist(prev => prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]);
  }, []);

  const isInWishlist = useCallback((productId: string) => wishlist.includes(productId), [wishlist]);

  const cartTotal = useMemo(() => cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, i) => sum + i.quantity, 0), [cart]);

  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedCoupon(null);
  }, []);

  const value = useMemo(() => ({
    cart, wishlist, addToCart, removeFromCart, updateQuantity,
    toggleWishlist, isInWishlist, cartTotal, cartCount, clearCart,
    pendingCoupon, setPendingCoupon,
    appliedCoupon, setAppliedCoupon,
  }), [cart, wishlist, addToCart, removeFromCart, updateQuantity, toggleWishlist, isInWishlist, cartTotal, cartCount, clearCart, pendingCoupon, appliedCoupon]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
