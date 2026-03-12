import { Link } from "react-router-dom";
import { ArrowLeft, Package, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/hooks/useProducts";
import BottomNav from "@/components/layout/BottomNav";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";

const OrdersPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const statusConfig: Record<string, { label: string; color: string; step: number }> = {
    pending: { label: t("cart.pending"), color: "bg-amber-400", step: 0 },
    processing: { label: t("cart.processing"), color: "bg-blue-400", step: 1 },
    shipped: { label: t("cart.onTheWay"), color: "bg-primary", step: 2 },
    delivered: { label: t("cart.delivered"), color: "bg-sage", step: 3 },
  };

  const steps = [t("cart.pending"), t("cart.processing"), t("cart.onTheWay"), t("cart.delivered")];

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(title, slug, product_images(image_url)))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link to="/profile" className="p-1"><ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" /></Link>
            <h1 className="text-lg font-display font-bold text-foreground">{t("orders.title")}</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground mb-4">{t("orders.signInToView")}</p>
          <Link to="/auth" className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm">
            {t("common.signIn")}
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/profile" className="p-1"><ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" /></Link>
          <h1 className="text-lg font-display font-bold text-foreground">{t("orders.title")}</h1>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-base font-semibold text-foreground mb-1">{t("orders.noOrders")}</p>
          <p className="text-sm text-muted-foreground mb-4">{t("orders.noOrdersDesc")}</p>
          <Link to="/home" className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm">
            {t("common.startShopping")}
          </Link>
        </div>
      ) : (
        <div className="px-4 mt-4 space-y-4">
          {orders.map((order, idx) => {
            const config = statusConfig[order.status] || statusConfig.pending;
            const items = (order as any).order_items || [];
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-card rounded-2xl p-4 shadow-premium"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">#{order.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold text-primary-foreground ${config.color}`}>
                    {config.label}
                  </span>
                </div>

                <div className="flex items-center gap-1 mb-4">
                  {steps.map((step, i) => (
                    <div key={step} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`w-full h-1.5 rounded-full transition-colors ${i <= config.step ? config.color : "bg-muted"}`} />
                      <span className={`text-[8px] ${i <= config.step ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 mb-3">
                  {items.slice(0, 3).map((item: any) => {
                    const img = item.products?.product_images?.[0]?.image_url;
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        {img && (
                          <img src={img} alt="" className="w-10 h-10 rounded-lg object-cover bg-secondary" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{item.products?.title}</p>
                          <p className="text-[10px] text-muted-foreground">{t("orders.qty")}: {item.quantity}</p>
                        </div>
                        <p className="text-xs font-semibold text-foreground">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    );
                  })}
                  {items.length > 3 && (
                    <p className="text-[10px] text-muted-foreground">{t("orders.moreItems", { count: items.length - 3 })}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">{t("cart.total")}</span>
                  <span className="text-sm font-bold text-foreground">{formatPrice(Number(order.total))}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default OrdersPage;
