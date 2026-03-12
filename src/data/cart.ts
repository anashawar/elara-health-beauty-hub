import { create } from 'zustand';
import type { Product } from './products';

// Simple state management without external deps
export interface CartItem {
  product: Product;
  quantity: number;
}

export interface WishlistState {
  items: string[]; // product IDs
}

// We'll use React context instead - define types here
export interface CartState {
  items: CartItem[];
  wishlist: string[];
}
