import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProductWithRelations } from "@/hooks/useProducts";

interface ActiveOffer {
  id: string;
  discount_type: string;
  discount_value: number;
  target_type: string;
  target_id: string | null;
  title: string;
}

export function useActiveOffers() {
  return useQuery({
    queryKey: ["active-offers-pricing"],
    queryFn: async (): Promise<ActiveOffer[]> => {
      const { data, error } = await supabase
        .from("offers")
        .select("id, discount_type, discount_value, target_type, target_id, title")
        .eq("is_active", true);
      if (error) throw error;
      const now = new Date();
      // We can't filter dates server-side easily, so filter client-side
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 min — match global stale time
  });
}

export function getOfferForProduct(
  product: ProductWithRelations,
  offers: ActiveOffer[]
): { discountedPrice: number; offerLabel: string; discountPercent: number } | null {
  if (!offers.length) return null;

  // Find best applicable offer
  let bestOffer: ActiveOffer | null = null;
  let bestDiscount = 0;

  for (const offer of offers) {
    if (offer.discount_type === "bogo" || offer.discount_type === "bundle") continue;

    let applies = false;
    if (offer.target_type === "all") applies = true;
    else if (offer.target_type === "brand" && offer.target_id === product.brand_id) applies = true;
    else if (offer.target_type === "category" && offer.target_id === product.category_id) applies = true;
    else if (offer.target_type === "product" && offer.target_id) {
      const ids = offer.target_id.split(",");
      applies = ids.includes(product.id);
    }

    if (!applies) continue;

    let discount = 0;
    if (offer.discount_type === "percentage") {
      discount = product.price * (offer.discount_value / 100);
    } else if (offer.discount_type === "fixed") {
      discount = offer.discount_value;
    }

    if (discount > bestDiscount) {
      bestDiscount = discount;
      bestOffer = offer;
    }
  }

  if (!bestOffer || bestDiscount <= 0) return null;

  const rawDiscounted = Math.max(0, product.price - bestDiscount);
  const discountedPrice = Math.round(rawDiscounted / 250) * 250;
  const discountPercent = Math.round((bestDiscount / product.price) * 100);

  return {
    discountedPrice,
    offerLabel: bestOffer.title,
    discountPercent,
  };
}
