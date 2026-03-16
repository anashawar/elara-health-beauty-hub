import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import type { ProductWithRelations } from "./useProducts";

/**
 * Lightweight product queries for the home page.
 * Instead of loading all ~2800 products, each section fetches only what it needs
 * with a server-side limit and minimal joins.
 */

const SECTION_LIMIT = 20;

// Minimal select for card display — skip description, benefits, usage, tags
const CARD_SELECT = `
  id, title, title_ar, title_ku, slug, price, original_price,
  is_new, is_trending, is_pick, in_stock,
  brand_id, category_id, subcategory_id,
  country_of_origin, form, gender, volume_ml, volume_unit, application, skin_type, condition,
  brands ( name, name_ar, name_ku ),
  categories ( slug ),
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
    category_slug: p.categories?.slug || null,
    subcategory_id: p.subcategory_id || null,
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
    country_of_origin: p.country_of_origin,
    form: p.form,
    gender: p.gender,
    volume_ml: p.volume_ml,
    volume_unit: p.volume_unit || "ml",
    application: p.application,
    skin_type: p.skin_type,
    condition: p.condition || null,
    inStock: p.in_stock !== false,
  };
}

async function fetchSection(
  filter: Record<string, boolean>,
  language: "en" | "ar" | "ku",
  limit = SECTION_LIMIT
): Promise<ProductWithRelations[]> {
  let query = supabase.from("products").select(CARD_SELECT);

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
  return useQuery<ProductWithRelations[]>({
    queryKey: ["home-trending", language],
    queryFn: () => fetchSection({ is_trending: true }, language),
  });
}

export function usePickProducts() {
  const { language } = useLanguage();
  return useQuery<ProductWithRelations[]>({
    queryKey: ["home-picks", language],
    queryFn: () => fetchSection({ is_pick: true }, language),
  });
}

export function useNewProducts() {
  const { language } = useLanguage();
  return useQuery<ProductWithRelations[]>({
    queryKey: ["home-new", language],
    queryFn: () => fetchSection({ is_new: true }, language),
  });
}

export function useOfferProducts() {
  const { language } = useLanguage();
  return useQuery<ProductWithRelations[]>({
    queryKey: ["home-offers", language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(CARD_SELECT)
        .not("original_price", "is", null)
        .order("created_at", { ascending: false })
        .limit(SECTION_LIMIT);
      if (error) throw error;
      return (data || []).map((p: any) => mapProduct(p, language));
    },
  });
}
