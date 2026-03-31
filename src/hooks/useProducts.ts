import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserCity, isBrandAvailableInCity } from "./useUserCity";

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
  volume_unit: string | null;
  application: string | null;
  skin_type: string | null;
  condition: string | null;
  inStock: boolean;
}

// Minimal select for list/card views — only what ProductCard needs
const CARD_SELECT = `
  id, title, title_ar, title_ku, slug, price, original_price,
  is_new, is_trending, is_pick, in_stock,
  brand_id, category_id, subcategory_id,
  brands ( name, restricted_cities ),
  categories ( slug ),
  product_images ( image_url, sort_order )
`;

function mapCardProduct(p: any, language: "en" | "ar" | "ku"): ProductWithRelations {
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

function mapRawProduct(p: any, language: "en" | "ar" | "ku"): ProductWithRelations {
  const localizedTitle =
    language === "ar" ? (p.title_ar || p.title) : language === "ku" ? (p.title_ku || p.title) : p.title;
  const localizedDescription =
    language === "ar"
      ? (p.description_ar || p.description || "")
      : language === "ku"
        ? (p.description_ku || p.description || "")
        : (p.description || "");
  const localizedBenefits =
    language === "ar"
      ? (p.benefits_ar || p.benefits || [])
      : language === "ku"
        ? (p.benefits_ku || p.benefits || [])
        : (p.benefits || []);
  const localizedUsage =
    language === "ar"
      ? (p.usage_instructions_ar || p.usage_instructions || "")
      : language === "ku"
        ? (p.usage_instructions_ku || p.usage_instructions || "")
        : (p.usage_instructions || "");

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
    tags: (p.product_tags || []).map((t: any) => t.tag),
    description: localizedDescription,
    benefits: localizedBenefits,
    usage: localizedUsage,
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
    _brandRestrictedCities: p.brands?.restricted_cities || null,
    _brandLogoUrl: p.brands?.logo_url || null,
    _brandSlug: p.brands?.slug || null,
  } as ProductWithRelations;
}

export function useProducts(options?: { enabled?: boolean }) {
  const { language } = useLanguage();
  const { userCity, isLoggedIn } = useUserCity();

  return useQuery<ProductWithRelations[]>({
    queryKey: ["products", language],
    queryFn: async () => {
      // Use card-level select — much lighter than fetching all columns
      const { data, error } = await supabase
        .from("products")
        .select(CARD_SELECT)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []).map((p: any) => mapCardProduct(p, language));
    },
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
    select: (data) => data.filter((p) => {
      return isBrandAvailableInCity((p as any)._brandRestrictedCities, userCity, isLoggedIn);
    }),
  });
}

/**
 * Fetch a single product by ID — much faster than loading all products.
 * Falls back gracefully if product not found.
 */
// Optimized select for single product — only needed columns, not *
const PRODUCT_DETAIL_SELECT = `
  id, title, title_ar, title_ku, slug, price, original_price,
  is_new, is_trending, is_pick, in_stock,
  brand_id, category_id, subcategory_id,
  description, description_ar, description_ku,
  benefits, benefits_ar, benefits_ku,
  usage_instructions, usage_instructions_ar, usage_instructions_ku,
  country_of_origin, form, gender, volume_ml, volume_unit, application, skin_type, condition,
  brands ( name, name_ar, name_ku, slug, logo_url, restricted_cities ),
  categories ( slug ),
  product_images ( image_url, sort_order ),
  product_tags ( tag )
`;

export function useProduct(id: string | undefined) {
  const { language } = useLanguage();
  const isUuid = !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  return useQuery<ProductWithRelations | null>({
    queryKey: ["product", id, language],
    queryFn: async ({ signal }) => {
      if (!id) return null;
      const query = supabase
        .from("products")
        .select(PRODUCT_DETAIL_SELECT)
        .abortSignal(signal ?? AbortSignal.timeout(15000));
      const { data, error } = await (isUuid
        ? query.eq("id", id)
        : query.eq("slug", id)
      ).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapRawProduct(data, language);
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });
}

/**
 * Fetch related products by category — limited to 8 for performance.
 */
export function useRelatedProducts(categoryId: string | null | undefined, excludeId: string | undefined) {
  const { language } = useLanguage();

  return useQuery<ProductWithRelations[]>({
    queryKey: ["related-products", categoryId, excludeId, language],
    queryFn: async ({ signal }) => {
      if (!categoryId) return [];
      const { data, error } = await supabase
        .from("products")
        .select(`
          id, title, title_ar, title_ku, slug, price, original_price,
          is_new, is_trending, is_pick, in_stock,
          brand_id, category_id, subcategory_id,
          brands ( name, name_ar, name_ku, restricted_cities ),
          categories ( slug ),
          product_images ( image_url, sort_order )
        `)
        .eq("category_id", categoryId)
        .neq("id", excludeId || "")
        .limit(8)
        .order("created_at", { ascending: false })
        .abortSignal(signal ?? AbortSignal.timeout(15000));
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...mapRawProduct({ ...p, product_tags: [] }, language),
        tags: [],
        description: "",
        benefits: [],
        usage: "",
      }));
    },
    enabled: !!categoryId,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });
}

/**
 * Fetch products by brand_id — direct DB query, no client-side filtering.
 */
/**
 * Fetch products filtered by category slug + optional subcategory — direct DB query.
 */
const CATEGORY_PAGE_SIZE = 20;

export function useCategoryProducts(categorySlug: string | undefined, subcategoryId: string | null) {
  const { language } = useLanguage();
  const { userCity, isLoggedIn } = useUserCity();

  return useQuery<ProductWithRelations[]>({
    queryKey: ["category-products", categorySlug, subcategoryId, language],
    queryFn: async () => {
      if (!categorySlug) return [];
      const { data: catRow } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", categorySlug)
        .maybeSingle();
      if (!catRow) return [];

      let query = supabase
        .from("products")
        .select(CARD_SELECT)
        .eq("category_id", catRow.id)
        .order("created_at", { ascending: false });

      if (subcategoryId) {
        query = query.eq("subcategory_id", subcategoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((p: any) => mapCardProduct(p, language));
    },
    enabled: !!categorySlug,
    staleTime: 5 * 60 * 1000,
    select: (data) => data.filter((p) => {
      return isBrandAvailableInCity((p as any)._brandRestrictedCities, userCity, isLoggedIn);
    }),
  });
}

export function useCategoryProductsPaginated(categorySlug: string | undefined, subcategoryId: string | null, page: number) {
  const { language } = useLanguage();
  const { userCity, isLoggedIn } = useUserCity();
  const from = page * CATEGORY_PAGE_SIZE;
  const to = from + CATEGORY_PAGE_SIZE - 1;

  return useQuery<{ products: ProductWithRelations[]; hasMore: boolean }>({
    queryKey: ["category-products-page", categorySlug, subcategoryId, page, language],
    queryFn: async () => {
      if (!categorySlug) return { products: [], hasMore: false };
      const { data: catRow } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", categorySlug)
        .maybeSingle();
      if (!catRow) return { products: [], hasMore: false };

      let query = supabase
        .from("products")
        .select(CARD_SELECT)
        .eq("category_id", catRow.id)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (subcategoryId) {
        query = query.eq("subcategory_id", subcategoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      const products = (data || []).map((p: any) => mapCardProduct(p, language));
      return { products, hasMore: products.length === CATEGORY_PAGE_SIZE };
    },
    enabled: !!categorySlug,
    staleTime: 5 * 60 * 1000,
    select: (result) => ({
      products: result.products.filter((p) => isBrandAvailableInCity((p as any)._brandRestrictedCities, userCity, isLoggedIn)),
      hasMore: result.hasMore,
    }),
  });
}

export function useCategoryProductCount(categorySlug: string | undefined, subcategoryId: string | null) {
  return useQuery<number>({
    queryKey: ["category-product-count", categorySlug, subcategoryId],
    queryFn: async () => {
      if (!categorySlug) return 0;
      const { data: catRow } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", categorySlug)
        .maybeSingle();
      if (!catRow) return 0;

      let query = supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", catRow.id);

      if (subcategoryId) {
        query = query.eq("subcategory_id", subcategoryId);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !!categorySlug,
    staleTime: 5 * 60 * 1000,
  });
}

const BRAND_PAGE_SIZE = 20;

export function useBrandProducts(brandId: string | undefined) {
  const { language } = useLanguage();

  return useQuery<ProductWithRelations[]>({
    queryKey: ["brand-products", brandId, language],
    queryFn: async () => {
      if (!brandId) return [];
      const { data, error } = await supabase
        .from("products")
        .select(CARD_SELECT)
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false })
        .range(0, BRAND_PAGE_SIZE - 1);
      if (error) throw error;
      return (data || []).map((p: any) => mapCardProduct(p, language));
    },
    enabled: !!brandId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBrandProductsPaginated(brandId: string | undefined, page: number) {
  const { language } = useLanguage();
  const from = page * BRAND_PAGE_SIZE;
  const to = from + BRAND_PAGE_SIZE - 1;

  return useQuery<{ products: ProductWithRelations[]; hasMore: boolean }>({
    queryKey: ["brand-products-page", brandId, page, language],
    queryFn: async () => {
      if (!brandId) return { products: [], hasMore: false };
      const { data, error } = await supabase
        .from("products")
        .select(CARD_SELECT)
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      const products = (data || []).map((p: any) => mapCardProduct(p, language));
      return { products, hasMore: products.length === BRAND_PAGE_SIZE };
    },
    enabled: !!brandId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useBrandProductCount(brandId: string | undefined) {
  return useQuery<number>({
    queryKey: ["brand-product-count", brandId],
    queryFn: async () => {
      if (!brandId) return 0;
      const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", brandId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!brandId,
    staleTime: 5 * 60 * 1000,
  });
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
  name_ar?: string | null;
  name_ku?: string | null;
  slug: string;
  logo_url: string | null;
  country_of_origin?: string | null;
  featured?: boolean;
  restricted_cities?: string[] | null;
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

export const formatPrice = (price: number, _lang?: string) => {
  return `${price.toLocaleString()} IQD`;
};

export function useFormatPrice() {
  const { language } = useLanguage();
  return (price: number) => formatPrice(price, language);
}

// Keep concerns as static data since they're not in the DB
export const concerns = [
  { id: "acne", name: "Acne", icon: "🎯" },
  { id: "dryskin", name: "Dry Skin", icon: "💧" },
  { id: "hyperpigmentation", name: "Hyperpigmentation", icon: "🌟" },
  { id: "hairloss", name: "Hair Loss", icon: "💇" },
  { id: "dandruff", name: "Dandruff", icon: "❄️" },
  { id: "sensitive", name: "Sensitive Skin", icon: "🌸" },
  { id: "oilyskin", name: "Oily Skin", icon: "💦" },
  { id: "antiaging", name: "Anti-Aging", icon: "✨" },
];
