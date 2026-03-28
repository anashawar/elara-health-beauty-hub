import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useApp } from "@/context/AppContext";
import { useActiveOffers, getOfferForProduct } from "@/hooks/useOfferPricing";
import { useFormatPrice } from "@/hooks/useProducts";
import { motion } from "framer-motion";
import { ShoppingBag, Plus, Check } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";

interface Props {
  productId: string;
  categoryId: string | null;
  brandId: string | null;
}

const CARD_SELECT = `
  id, title, title_ar, title_ku, slug, price, original_price,
  in_stock, brand_id, category_id,
  brands ( name ),
  product_images ( image_url, sort_order )
`;

export default function FrequentlyBoughtTogether({ productId, categoryId, brandId }: Props) {
  const { language, t } = useLanguage();
  const { addToCart } = useApp();
  const formatPrice = useFormatPrice();
  const { data: activeOffers = [] } = useActiveOffers();
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  // Find products frequently ordered together by querying order_items
  const { data: bundleProducts = [] } = useQuery({
    queryKey: ["frequently-bought", productId, language],
    queryFn: async () => {
      // Single query: find orders with this product, then co-purchased products
      const { data: orderIds } = await supabase
        .from("order_items")
        .select("order_id")
        .eq("product_id", productId)
        .limit(30);

      if (!orderIds?.length) return [];

      const ids = [...new Set(orderIds.map(o => o.order_id))].slice(0, 20);

      // Get co-purchased products with their details in one query
      const { data: coItems } = await supabase
        .from("order_items")
        .select(`
          product_id,
          products!inner (
            id, title, title_ar, title_ku, slug, price, original_price,
            in_stock, brand_id, category_id,
            brands ( name ),
            product_images ( image_url, sort_order )
          )
        `)
        .in("order_id", ids)
        .neq("product_id", productId)
        .eq("products.in_stock", true);

      if (!coItems?.length) return [];

      // Count co-occurrences and deduplicate
      const productMap = new Map<string, { count: number; product: any }>();
      for (const item of coItems) {
        const p = (item as any).products;
        if (!p) continue;
        const existing = productMap.get(p.id);
        if (existing) {
          existing.count++;
        } else {
          productMap.set(p.id, { count: 1, product: p });
        }
      }

      // Get top 3
      const top = [...productMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 3);

      return top.map(([, { product: p }]) => {
        const localTitle = language === "ar" ? (p.title_ar || p.title) : language === "ku" ? (p.title_ku || p.title) : p.title;
        return {
          id: p.id,
          title: localTitle,
          rawTitle: p.title,
          slug: p.slug,
          price: Number(p.price),
          originalPrice: p.original_price ? Number(p.original_price) : null,
          brand: p.brands?.name || "",
          brand_id: p.brand_id,
          category_id: p.category_id,
          image: p.product_images?.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))?.[0]?.image_url || "/placeholder.svg",
          images: (p.product_images || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0)).map((img: any) => img.image_url),
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  const bundleTotal = useMemo(() => {
    return bundleProducts.reduce((sum, p) => {
      const offer = getOfferForProduct(p as any, activeOffers);
      return sum + (offer ? offer.discountedPrice : p.price);
    }, 0);
  }, [bundleProducts, activeOffers]);

  const handleAddAll = () => {
    for (const p of bundleProducts) {
      if (addedIds.has(p.id)) continue;
      addToCart({
        id: p.id, title: p.rawTitle || p.title, slug: p.slug, price: p.price,
        originalPrice: p.originalPrice, image: p.image, images: p.images,
        brand: p.brand, brand_id: p.brand_id, category_id: p.category_id,
        category_slug: null, subcategory_id: null,
        tags: [], description: "", benefits: [], usage: "",
        isNew: false, isTrending: false, isPick: false, inStock: true,
        country_of_origin: null, form: null, gender: null,
        volume_ml: null, volume_unit: "ml", application: null,
        skin_type: null, condition: null,
      });
    }
    setAddedIds(new Set(bundleProducts.map(p => p.id)));
    toast.success(t("fbt.bundleAdded"));
  };

  if (bundleProducts.length < 2) return null;

  const allAdded = bundleProducts.every(p => addedIds.has(p.id));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mt-6 bg-card rounded-2xl border border-border/50 p-4"
    >
      <h3 className="text-sm font-display font-bold text-foreground mb-3 flex items-center gap-2">
        <ShoppingBag className="w-4 h-4 text-primary" />
        {t("fbt.title")}
      </h3>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        {bundleProducts.map((p, i) => {
          const offer = getOfferForProduct(p as any, activeOffers);
          const finalPrice = offer ? offer.discountedPrice : p.price;
          return (
            <div key={p.id} className="flex items-center gap-2 flex-shrink-0">
              {i > 0 && (
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-3 h-3 text-primary" />
                </div>
              )}
              <Link
                to={`/product/${p.slug}`}
                className="flex flex-col items-center w-24 p-2 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors"
              >
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-background mb-1.5">
                  <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                </div>
                <p className="text-[10px] font-medium text-foreground text-center leading-tight line-clamp-2 h-7">{p.title}</p>
                <p className="text-[11px] font-bold text-primary mt-0.5">{formatPrice(finalPrice)}</p>
              </Link>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
        <div>
          <p className="text-[10px] text-muted-foreground">{t("fbt.bundleTotal")}</p>
          <p className="text-sm font-bold text-foreground">{formatPrice(bundleTotal)}</p>
        </div>
        <button
          onClick={handleAddAll}
          disabled={allAdded}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
            allAdded
              ? "bg-green-500/10 text-green-600"
              : "bg-primary text-primary-foreground shadow-sm"
          }`}
        >
          {allAdded ? <Check className="w-3.5 h-3.5" /> : <ShoppingBag className="w-3.5 h-3.5" />}
          {allAdded
            ? t("fbt.added")
            : t("fbt.addAllToCart")}
        </button>
      </div>
    </motion.div>
  );
}
