import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useActiveOffers, getOfferForProduct } from "@/hooks/useOfferPricing";
import ProductCard from "@/components/ProductCard";

interface Props {
  productId: string;
  categoryId: string | null;
  brandId: string | null;
}

const CARD_SELECT = `
  id, title, title_ar, title_ku, slug, price, original_price,
  is_new, is_trending, is_pick, in_stock,
  brand_id, category_id,
  brands ( name ),
  product_images ( image_url, sort_order )
`;

function mapCard(p: any, language: string) {
  const localizedTitle =
    language === "ar" ? (p.title_ar || p.title) : language === "ku" ? (p.title_ku || p.title) : p.title;
  return {
    id: p.id, title: localizedTitle, slug: p.slug,
    brand: p.brands?.name || "", brand_id: p.brand_id,
    category_id: p.category_id, category_slug: null, subcategory_id: null,
    price: Number(p.price),
    originalPrice: p.original_price ? Number(p.original_price) : null,
    image: p.product_images?.[0]?.image_url || "/placeholder.svg",
    images: (p.product_images || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((img: any) => img.image_url),
    tags: [], description: "", benefits: [], usage: "",
    isNew: p.is_new || false, isTrending: p.is_trending || false,
    isPick: p.is_pick || false, inStock: p.in_stock !== false,
    country_of_origin: null, form: null, gender: null,
    volume_ml: null, volume_unit: "ml", application: null,
    skin_type: null, condition: null,
  };
}

const RelatedProducts = ({ productId, categoryId, brandId }: Props) => {
  const { language, t } = useLanguage();
  const { data: activeOffers = [] } = useActiveOffers();

  // "Customers also viewed" — same brand, different product
  const { data: sameBrand = [] } = useQuery({
    queryKey: ["also-viewed", brandId, productId, language],
    queryFn: async () => {
      if (!brandId) return [];
      const { data } = await supabase
        .from("products")
        .select(CARD_SELECT)
        .eq("brand_id", brandId)
        .neq("id", productId)
        .eq("in_stock", true)
        .limit(8)
        .order("is_trending", { ascending: false });
      return (data || []).map((p: any) => mapCard(p, language));
    },
    enabled: !!brandId,
    staleTime: 5 * 60 * 1000,
  });

  // "Related products" — same category, different brand
  const { data: sameCategory = [] } = useQuery({
    queryKey: ["related-cat", categoryId, productId, brandId, language],
    queryFn: async () => {
      if (!categoryId) return [];
      let q = supabase
        .from("products")
        .select(CARD_SELECT)
        .eq("category_id", categoryId)
        .neq("id", productId)
        .eq("in_stock", true)
        .limit(8)
        .order("is_pick", { ascending: false });
      if (brandId) q = q.neq("brand_id", brandId);
      const { data } = await q;
      return (data || []).map((p: any) => mapCard(p, language));
    },
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
  });

  const brandOfferMap = useMemo(() => {
    const map = new Map();
    for (const p of sameBrand) map.set(p.id, getOfferForProduct(p, activeOffers));
    return map;
  }, [sameBrand, activeOffers]);

  const catOfferMap = useMemo(() => {
    const map = new Map();
    for (const p of sameCategory) map.set(p.id, getOfferForProduct(p, activeOffers));
    return map;
  }, [sameCategory, activeOffers]);

  if (sameBrand.length === 0 && sameCategory.length === 0) return null;

  return (
    <div className="space-y-8 mt-8">
      {sameBrand.length > 0 && (
        <div>
          <h3 className="text-base font-display font-bold text-foreground mb-3">
            {t("product.customersAlsoViewed") || "Customers Also Viewed"}
          </h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 md:grid md:grid-cols-4 md:overflow-visible">
            {sameBrand.slice(0, 4).map(p => (
              <div key={p.id} className="min-w-[140px] md:min-w-0">
                <ProductCard product={p} offerPricing={brandOfferMap.get(p.id) ?? null} />
              </div>
            ))}
          </div>
        </div>
      )}

      {sameCategory.length > 0 && (
        <div>
          <h3 className="text-base font-display font-bold text-foreground mb-3">
            {t("product.relatedProducts") || "Related Products"}
          </h3>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 md:grid md:grid-cols-4 md:overflow-visible">
            {sameCategory.slice(0, 4).map(p => (
              <div key={p.id} className="min-w-[140px] md:min-w-0">
                <ProductCard product={p} offerPricing={catOfferMap.get(p.id) ?? null} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RelatedProducts;
