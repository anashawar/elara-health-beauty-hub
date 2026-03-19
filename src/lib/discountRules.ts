/**
 * Centralized discount & coupon rules engine for ELARA.
 *
 * Rules:
 * 1. First order → 15% discount only. Coupon code accepted (influencer gets commission) but user gets NO coupon discount.
 * 2. Already-discounted products (original_price set or active offer) are excluded from coupon discounts.
 * 3. Only one coupon per order.
 * 4. Max coupon discount capped at 50% of the eligible (non-discounted) subtotal.
 * 5. Each coupon can only be used once per user (enforced at apply time).
 * 6. Coupon min_order_amount checked against full cart total (before discounts).
 * 7. Expired / max-uses-reached coupons are rejected.
 * 8. User-restricted coupons checked via coupon_allowed_users table.
 */

import type { ProductWithRelations } from "@/hooks/useProducts";
import type { OfferPricing } from "@/hooks/useOfferPricing";

export const FIRST_ORDER_DISCOUNT_PERCENT = 15;
export const FIRST_ORDER_MIN_AMOUNT = 20000;
export const MAX_COUPON_DISCOUNT_PERCENT = 50; // max 50% of eligible subtotal

export interface AppliedCouponFull {
  code: string;
  discount_type: string;
  discount_value: number;
  influencer_name?: string | null;
  influencer_commission?: number | null;
}

export interface CartItem {
  product: ProductWithRelations;
  quantity: number;
}

/** Check if a product is already discounted (has original_price or an active offer). */
export function isProductDiscounted(
  product: ProductWithRelations,
  getOfferForProduct?: (p: ProductWithRelations) => OfferPricing | null
): boolean {
  // Product has a set original_price (manually discounted)
  if (product.original_price && product.original_price > product.price) return true;
  // Product has an active offer
  if (getOfferForProduct && getOfferForProduct(product)) return true;
  return false;
}

/** Calculate the subtotal of only non-discounted items (eligible for coupon). */
export function getEligibleSubtotal(
  cart: CartItem[],
  getOfferForProduct?: (p: ProductWithRelations) => OfferPricing | null
): number {
  return cart.reduce((sum, item) => {
    if (isProductDiscounted(item.product, getOfferForProduct)) return sum;
    return sum + item.product.price * item.quantity;
  }, 0);
}

/** Calculate first-order discount. */
export function calcFirstOrderDiscount(cartTotal: number, isFirstOrder: boolean): number {
  if (!isFirstOrder) return 0;
  if (cartTotal < FIRST_ORDER_MIN_AMOUNT) return 0;
  return Math.round((cartTotal * FIRST_ORDER_DISCOUNT_PERCENT) / 100 / 250) * 250;
}

/**
 * Calculate coupon discount.
 * - On first order: returns 0 (user gets no coupon discount, only first-order 15%).
 * - Only applies to non-discounted items.
 * - Capped at MAX_COUPON_DISCOUNT_PERCENT of eligible subtotal.
 */
export function calcCouponDiscount(
  coupon: AppliedCouponFull | null,
  cart: CartItem[],
  isFirstOrder: boolean,
  getOfferForProduct?: (p: ProductWithRelations) => OfferPricing | null
): number {
  if (!coupon) return 0;
  // First order: no coupon discount for user (influencer still tracked)
  if (isFirstOrder) return 0;

  const eligibleSubtotal = getEligibleSubtotal(cart, getOfferForProduct);
  if (eligibleSubtotal <= 0) return 0;

  let rawDiscount = 0;
  if (coupon.discount_type === "percentage") {
    rawDiscount = Math.round(eligibleSubtotal * (coupon.discount_value / 100));
  } else {
    // Fixed amount — but cannot exceed eligible subtotal
    rawDiscount = Math.min(coupon.discount_value, eligibleSubtotal);
  }

  // Cap at MAX_COUPON_DISCOUNT_PERCENT of eligible subtotal
  const maxDiscount = Math.round(eligibleSubtotal * (MAX_COUPON_DISCOUNT_PERCENT / 100));
  return Math.min(rawDiscount, maxDiscount);
}

/** Full discount summary for an order. */
export function calcOrderDiscounts(
  cart: CartItem[],
  cartTotal: number,
  isFirstOrder: boolean,
  coupon: AppliedCouponFull | null,
  getOfferForProduct?: (p: ProductWithRelations) => OfferPricing | null
) {
  const firstOrderDiscount = calcFirstOrderDiscount(cartTotal, isFirstOrder);
  const couponDiscount = calcCouponDiscount(coupon, cart, isFirstOrder, getOfferForProduct);
  const totalDiscount = firstOrderDiscount + couponDiscount;

  return {
    firstOrderDiscount,
    couponDiscount,
    totalDiscount,
    isFirstOrder,
    /** Whether coupon is accepted (for influencer tracking) even if discount = 0. */
    couponAccepted: !!coupon,
    /** Whether user actually gets a coupon discount (false on first order). */
    couponDiscountApplied: couponDiscount > 0,
  };
}
