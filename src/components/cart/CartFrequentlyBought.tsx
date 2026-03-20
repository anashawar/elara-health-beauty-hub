import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useApp } from "@/context/AppContext";
import { useActiveOffers, getOfferForProduct } from "@/hooks/useOfferPricing";
import { useFormatPrice } from "@/hooks/useProducts";
import { motion } from "framer-motion";
import { Sparkles, Plus, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/components/ui/sonner";

interface Props {
  cartProductIds: string[];
}

const CARD_SELECT = `
  id, title, title_ar, title_ku, slug, price, original_price,
  in_stock, brand_id, category_id,
  brands ( name ),
  product_images ( image_url, sort_order )
`;

export default function CartFrequentlyBought({ cartProductIds }: Props) {
  const { language, t } = useLanguage();
  const { addToCart, cart } = useApp();
  const formatPrice = useFormatPrice();
  const { data: activeOffers = [] } = useActiveOffers();
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const cartIdSet = useMemo(() => new Set(cartProductIds), [cartProductIds]);

  const { data: suggestions = [] } = useQuery({
    queryKey: ["cart-fbt", cartProductIds.sort().join(","), language],
    queryFn: async () => {
      if (cartProductIds.length === 0) return [];

      // Find orders containing any of the cart products
      const { data: orderData } = await supabase
        .from("order_items")
        .select("order_id")
        .in("product_id", cartProductIds)
        .limit(80);

      if (!orderData?.length) return [];

      const orderIds = [...new Set(orderData.map(o => o.order_id))];

      // Find co-purchased products
      const { data: coItems } = await supabase
        .from("order_items")
        .select("product_id")
        .in("order_id", orderIds)
        .limit(500);

      if (!coItems?.length) return [];

      // Count co-occurrences, excluding items already in cart
      const counts = new Map<string, number>();
      for (const item of coItems) {
        if (cartProductIds.includes(item.product_id)) continue;
        counts.set(item.product_id, (counts.get(item.product_id) || 0) + 1);
      }

      const topIds = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([id]) => id);

      if (!topIds.length) return [];

      const { data: products } = await supabase
        .from("products")
        .select(CARD_SELECT)
        .in("id", topIds)
        .eq("in_stock", true);

      return (products || []).map((p: any) => {
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
    enabled: cartProductIds.length > 0,
  });

  // Filter out any that got added to cart after this rendered
  const visible = suggestions.filter(s => !cartIdSet.has(s.id));

  if (visible.length === 0) return null;

  const handleAdd = (p: typeof visible[0]) => {
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
    setAddedIds(prev => new Set(prev).add(p.id));
    toast.success(language === "ar" ? "تمت الإضافة للسلة" : language === "ku" ? "زیادکرا بۆ سەبەتە" : "Added to cart");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="mx-4 md:mx-0 mt-5"
    >
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-foreground leading-tight">
              {language === "ar" ? "عملاء آخرون اشتروا أيضاً" : language === "ku" ? "کڕیارانی تر ئەمانەیان کڕیوە" : "Customers Also Bought"}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {language === "ar" ? "بناءً على طلبات مشابهة" : language === "ku" ? "لەسەر بنەمای داواکاری هاوشێوە" : "Based on similar orders"}
            </p>
          </div>
        </div>

        {/* Products */}
        <div className="px-3 pb-3 space-y-2">
          {visible.map((p) => {
            const offer = getOfferForProduct(p as any, activeOffers);
            const finalPrice = offer ? offer.discountedPrice : p.price;
            const isAdded = addedIds.has(p.id);

            return (
              <div
                key={p.id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors"
              >
                <Link to={`/product/${p.slug}`} className="flex-shrink-0">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-background">
                    <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{p.brand}</p>
                  <p className="text-xs font-semibold text-foreground truncate">{p.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-bold text-foreground">{formatPrice(finalPrice)}</span>
                    {offer && (
                      <span className="text-[10px] text-muted-foreground line-through">{formatPrice(p.price)}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleAdd(p)}
                  disabled={isAdded}
                  className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                    isAdded
                      ? "bg-primary/15 text-primary"
                      : "bg-primary text-primary-foreground shadow-sm"
                  }`}
                >
                  {isAdded ? (
                    <ShoppingBag className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
