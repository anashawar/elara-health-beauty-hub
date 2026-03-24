import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import type { ProductWithRelations } from "./useProducts";
import { useUserCity, isBrandAvailableInCity } from "./useUserCity";

/**
 * Lightweight product queries for the home page.
 * Instead of loading all ~2800 products, each section fetches only what it needs
 * with a server-side limit and minimal joins.
 */

const SECTION_LIMIT = 20;

// Minimal select for card display — only what ProductCard needs
const CARD_SELECT = `
  id, title, title_ar, title_ku, slug, price, original_price,
  is_new, is_trending, is_pick, in_stock,
  brand_id, category_id,
  brands ( name, restricted_cities ),
  product_images ( image_url, sort_order )
`;

function mapProduct(p: any, language: "en" | "ar" | "ku"): ProductWithRelations {
  const localizedTitle =
    language === "ar" ? (p.title_ar || p.title) : language === "ku" ? (p.title_ku || p.title) : p.title;

  return {
    id: p.id,
    title: localizedTitle,
    slug: p.slug,
    brand: p.brands?.name || "",
    brand_id: p.brand_id,
    category_id: p.category_id,
    category_slug: null,
    subcategory_id: null,
    price: Number(p.price),
    originalPrice: p.original_price ? Number(p.original_price) : null,
    image: p.product_images?.[0]?.image_url || "/placeholder.svg",
    images: (p.product_images || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((img: any) => img.image_url),
    tags: [],
    description: "",
    benefits: [],
    usage: "",
    isNew: p.is_new || false,
    isTrending: p.is_trending || false,
    isPick: p.is_pick || false,
    country_of_origin: null,
    form: null,
    gender: null,
    volume_ml: null,
    volume_unit: "ml",
    application: null,
    skin_type: null,
    condition: null,
    inStock: p.in_stock !== false,
    _brandRestrictedCities: p.brands?.restricted_cities || null,
  } as ProductWithRelations;
}

async function fetchSection(
  filter: Record<string, boolean>,
  language: "en" | "ar" | "ku",
  limit = SECTION_LIMIT
): Promise<ProductWithRelations[]> {
  let query = supabase.from("products").select(CARD_SELECT) as any;

  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map((p: any) => mapProduct(p, language));
}

export function useTrendingProducts() {
  const { language } = useLanguage();
  const { userCity, isLoggedIn } = useUserCity();
  return useQuery<ProductWithRelations[]>({
    queryKey: ["home-trending", language],
    queryFn: () => fetchSection({ is_trending: true }, language),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.filter((p) => isBrandAvailableInCity((p as any)._brandRestrictedCities, userCity, isLoggedIn)),
  });
}

export function usePickProducts() {
  const { language } = useLanguage();
  const { userCity, isLoggedIn } = useUserCity();
  return useQuery<ProductWithRelations[]>({
    queryKey: ["home-picks", language],
    queryFn: () => fetchSection({ is_pick: true }, language),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.filter((p) => isBrandAvailableInCity((p as any)._brandRestrictedCities, userCity, isLoggedIn)),
  });
}

export function useNewProducts() {
  const { language } = useLanguage();
  const userCity = useUserCity();
  return useQuery<ProductWithRelations[]>({
    queryKey: ["home-new", language],
    queryFn: () => fetchSection({ is_new: true }, language),
    staleTime: 5 * 60 * 1000,
    select: (data) => data.filter((p) => isBrandAvailableInCity((p as any)._brandRestrictedCities, userCity)),
  });
}

export function useOfferProducts() {
  const { language } = useLanguage();
  const userCity = useUserCity();
  return useQuery<ProductWithRelations[]>({
    queryKey: ["home-offers", language],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("products")
        .select(CARD_SELECT) as any)
        .not("original_price", "is", null)
        .order("created_at", { ascending: false })
        .limit(SECTION_LIMIT);
      if (error) throw error;
      return (data || []).map((p: any) => mapProduct(p, language));
    },
    staleTime: 5 * 60 * 1000,
    select: (data) => data.filter((p) => isBrandAvailableInCity((p as any)._brandRestrictedCities, userCity)),
  });
}

/**
 * Fetches products that belong to brands/categories targeted by active offers.
 * This dynamically syncs with the offers system — when an offer is added or removed,
 * the discounted products list updates automatically.
 */
export function useDiscountedProducts() {
  const { language } = useLanguage();
  const userCity = useUserCity();
  return useQuery<ProductWithRelations[]>({
    queryKey: ["home-discounted", language],
    queryFn: async () => {
      const { data: offers, error: offErr } = await supabase
        .from("offers")
        .select("target_type, target_id, discount_type, discount_value")
        .eq("is_active", true);

      if (offErr) throw offErr;
      if (!offers || offers.length === 0) return [];

      const brandIds: string[] = [];
      const categoryIds: string[] = [];
      let allProducts = false;

      for (const o of offers) {
        if (o.target_type === "all") { allProducts = true; break; }
        if (o.target_type === "brand" && o.target_id) brandIds.push(o.target_id);
        if (o.target_type === "category" && o.target_id) categoryIds.push(o.target_id);
      }

      let query = supabase.from("products").select(CARD_SELECT) as any;

      if (!allProducts) {
        const filters: string[] = [];
        if (brandIds.length > 0) filters.push(`brand_id.in.(${brandIds.join(",")})`);
        if (categoryIds.length > 0) filters.push(`category_id.in.(${categoryIds.join(",")})`);
        if (filters.length === 0) return [];
        query = query.or(filters.join(","));
      }

      query = query.eq("in_stock", true);

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(SECTION_LIMIT);

      if (error) throw error;
      return (data || []).map((p: any) => mapProduct(p, language));
    },
    staleTime: 5 * 60 * 1000,
    select: (data) => data.filter((p) => isBrandAvailableInCity((p as any)._brandRestrictedCities, userCity)),
  });
}

export function useGiftProducts() {
  const { language } = useLanguage();
  const userCity = useUserCity();
  return useQuery<ProductWithRelations[]>({
    queryKey: ["home-gifts", language],
    queryFn: async () => {
      const { data: tagData, error: tagErr } = await supabase
        .from("product_tags")
        .select("product_id")
        .eq("tag", "gift")
        .limit(30);

      if (tagErr) throw tagErr;
      const giftIds = (tagData || []).map((t: any) => t.product_id);
      if (giftIds.length === 0) return [];

      const { data, error } = await (supabase
        .from("products")
        .select(CARD_SELECT) as any)
        .in("id", giftIds)
        .eq("in_stock", true)
        .limit(SECTION_LIMIT);

      if (error) throw error;
      return (data || []).map((p: any) => mapProduct(p, language));
    },
    staleTime: 10 * 60 * 1000,
    select: (data) => data.filter((p) => isBrandAvailableInCity((p as any)._brandRestrictedCities, userCity)),
  });
}
