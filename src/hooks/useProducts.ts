import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductWithRelations {
  id: string;
  title: string;
  slug: string;
  brand: string;
  brand_id: string | null;
  category_id: string | null;
  category_slug: string | null;
  subcategory_id: string | null;
  price: number;
  originalPrice: number | null;
  image: string;
  images: string[];
  tags: string[];
  description: string;
  benefits: string[];
  usage: string;
  isNew: boolean;
  isTrending: boolean;
  isPick: boolean;
  country_of_origin: string | null;
  form: string | null;
  gender: string | null;
  volume_ml: string | null;
  application: string | null;
  skin_type: string | null;
  condition: string | null;
}

async function fetchProducts(): Promise<ProductWithRelations[]> {
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      *,
      brands ( name ),
      categories ( slug ),
      product_images ( image_url, sort_order ),
      product_tags ( tag )
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (products || []).map((p: any) => ({
    id: p.id,
    title: p.title,
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
    tags: (p.product_tags || []).map((t: any) => t.tag),
    description: p.description || "",
    benefits: p.benefits || [],
    usage: p.usage_instructions || "",
    isNew: p.is_new || false,
    isTrending: p.is_trending || false,
    isPick: p.is_pick || false,
    country_of_origin: p.country_of_origin,
    form: p.form,
    gender: p.gender,
    volume_ml: p.volume_ml,
    application: p.application,
    skin_type: p.skin_type,
    condition: p.condition || null,
  }));
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
}

export function useProduct(id: string | undefined) {
  const { data: products, ...rest } = useProducts();
  return {
    ...rest,
    data: products?.find((p) => p.id === id),
  };
}

export interface CategoryRow {
  id: string;
  name: string;
  name_ar?: string | null;
  name_ku?: string | null;
  slug: string;
  icon: string | null;
  color: string | null;
  sort_order: number | null;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<CategoryRow[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });
}

export interface SubcategoryRow {
  id: string;
  category_id: string;
  name: string;
  name_ar: string | null;
  name_ku: string | null;
  slug: string;
  icon: string | null;
  sort_order: number | null;
}

export function useSubcategories() {
  return useQuery({
    queryKey: ["subcategories"],
    queryFn: async (): Promise<SubcategoryRow[]> => {
      const { data, error } = await supabase
        .from("subcategories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });
}

export interface BrandRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export function useBrands() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: async (): Promise<BrandRow[]> => {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });
}

export interface BannerRow {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  sort_order: number | null;
}

export function useBanners() {
  return useQuery({
    queryKey: ["banners"],
    queryFn: async (): Promise<BannerRow[]> => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });
}

export const formatPrice = (price: number) => `${price.toLocaleString()} IQD`;

// Keep concerns as static data since they're not in the DB
export const concerns = [
  { id: "acne", name: "Acne", icon: "🎯" },
  { id: "dryskin", name: "Dry Skin", icon: "💧" },
  { id: "hyperpigmentation", name: "Hyperpigmentation", icon: "🌟" },
  { id: "hairloss", name: "Hair Loss", icon: "💇" },
  { id: "dandruff", name: "Dandruff", icon: "❄️" },
  { id: "sensitive", name: "Sensitive Skin", icon: "🌸" },
  { id: "immunity", name: "Immunity", icon: "🛡️" },
  { id: "weightloss", name: "Weight Loss", icon: "⚡" },
];
