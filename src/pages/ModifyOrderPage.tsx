import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Minus, Trash2, Package, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFormatPrice } from "@/hooks/useProducts";
import BottomNav from "@/components/layout/BottomNav";
import DesktopHeader from "@/components/layout/DesktopHeader";
import SearchOverlay from "@/components/SearchOverlay";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { getDeliveryFee } from "@/lib/deliveryFee";

const MODIFY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const ModifyOrderPage = () => {
  const { id: orderId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const formatPrice = useFormatPrice();
  const qc = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [items, setItems] = useState<{ id: string; product_id: string; quantity: number; price: number; title: string; image?: string }[]>([]);
  const [initialized, setInitialized] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-modify", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(title, title_ar, title_ku, slug, price, product_images(image_url))), addresses(city)")
        .eq("id", orderId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!user,
  });

  // Initialize items from order
  useEffect(() => {
    if (order && !initialized) {
      const orderItems = (order as any).order_items || [];
      setItems(orderItems.map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        title: item.products?.title || "Product",
        image: item.products?.product_images?.[0]?.image_url,
      })));
      setInitialized(true);
    }
  }, [order, initialized]);

  const canModify = order && order.status !== "cancelled" && order.status !== "delivered" && order.status !== "shipped" && order.status !== "on_the_way"
    && (Date.now() - new Date(order.created_at).getTime()) < MODIFY_WINDOW_MS;

  const minsLeft = order ? Math.max(0, Math.ceil((MODIFY_WINDOW_MS - (Date.now() - new Date(order.created_at).getTime())) / 60000)) : 0;

  const newSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const city = (order as any)?.addresses?.city;
  const newDeliveryFee = getDeliveryFee(city, newSubtotal);
  const newTotal = newSubtotal + newDeliveryFee - Number(order?.discount || 0);

  const updateQuantity = (itemId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const newQty = item.quantity + delta;
      if (newQty < 1) return item;
      return { ...item, quantity: newQty };
    }));
  };

  const removeItem = (itemId: string) => {
    if (items.length <= 1) {
      toast.error(t("orders.cantRemoveLastItem") || "Can't remove the last item. Cancel the order instead.");
      return;
    }
    setItems(prev => prev.filter(item => item.id !== itemId));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!order || !user || !canModify) throw new Error("Cannot modify");

      const originalItems = (order as any).order_items || [];
      const removedIds = originalItems.filter((oi: any) => !items.find(i => i.id === oi.id)).map((oi: any) => oi.id);

      // Delete removed items
      if (removedIds.length > 0) {
        const { error } = await supabase.from("order_items").delete().in("id", removedIds);
        if (error) throw error;
      }

      // Update quantities for existing items
      for (const item of items) {
        const original = originalItems.find((oi: any) => oi.id === item.id);
        if (original && original.quantity !== item.quantity) {
          const { error } = await supabase.from("order_items").update({ quantity: item.quantity }).eq("id", item.id);
          if (error) throw error;
        }
      }

      // Update order totals
      const { error: orderError } = await supabase.from("orders").update({
        subtotal: newSubtotal,
        delivery_fee: newDeliveryFee,
        total: Math.max(newTotal, 0),
      }).eq("id", order.id);
      if (orderError) throw orderError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(t("orders.orderModified") || "Order updated successfully!");
      navigate("/orders");
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order || !canModify) {
    return (
      <div className="min-h-screen bg-background pb-24 md:pb-8">
        <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
        <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border md:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link to="/orders" className="p-1"><ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" /></Link>
            <h1 className="text-lg font-display font-bold text-foreground">{t("orders.modifyOrder") || "Modify Order"}</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Clock className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-base font-semibold text-foreground mb-1">{t("orders.modifyExpired") || "Modification window expired"}</p>
          <p className="text-sm text-muted-foreground mb-4">{t("orders.modifyExpiredDesc") || "Orders can only be modified within 5 minutes of placement."}</p>
          <Link to="/orders" className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm">
            {t("orders.backToOrders") || "Back to Orders"}
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border md:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/orders" className="p-1"><ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" /></Link>
          <h1 className="text-lg font-display font-bold text-foreground">{t("orders.modifyOrder") || "Modify Order"}</h1>
        </div>
      </header>

      <div className="app-container">
        <div className="hidden md:flex items-center gap-2 px-6 pt-6 pb-2">
          <Link to="/orders" className="text-sm text-muted-foreground hover:text-foreground">← {t("orders.title")}</Link>
          <span className="text-sm text-muted-foreground">/</span>
          <h1 className="text-lg font-display font-bold text-foreground">{t("orders.modifyOrder") || "Modify Order"}</h1>
        </div>

        {/* Timer warning */}
        <div className="mx-4 md:mx-6 mt-4 flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
            {t("orders.editableFor") || "Editable for"} {minsLeft} {t("orders.minutes") || "min"}
          </span>
        </div>

        {/* Items list */}
        <div className="px-4 md:px-6 mt-4 space-y-3 md:max-w-2xl">
          <p className="text-xs font-bold text-foreground">{t("orders.orderItems") || "Order Items"} ({items.length})</p>

          {items.map(item => (
            <div key={item.id} className="bg-card rounded-2xl p-3 shadow-premium flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-secondary overflow-hidden flex-shrink-0">
                {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 m-auto text-muted-foreground/30 mt-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground">{formatPrice(item.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                  <Minus className="w-3.5 h-3.5 text-foreground" />
                </button>
                <span className="text-sm font-bold text-foreground w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5 text-foreground" />
                </button>
                <button onClick={() => removeItem(item.id)} className="w-8 h-8 rounded-xl hover:bg-destructive/10 flex items-center justify-center ml-1">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            </div>
          ))}

          {/* Updated totals */}
          <div className="bg-card rounded-2xl p-4 shadow-premium space-y-2 mt-4">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("cart.subtotal")}</span>
              <span className="text-foreground">{formatPrice(newSubtotal)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{t("cart.delivery")}</span>
              <span className="text-foreground">{newDeliveryFee === 0 ? (t("common.free") || "FREE") : formatPrice(newDeliveryFee)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t("orders.discount") || "Discount"}</span>
                <span className="text-green-600">-{formatPrice(Number(order.discount))}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-border/50">
              <span className="text-foreground">{t("cart.total")}</span>
              <span className="text-foreground">{formatPrice(Math.max(newTotal, 0))}</span>
            </div>
          </div>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || items.length === 0}
            className="w-full h-12 rounded-xl text-sm font-semibold mt-4"
          >
            {saveMutation.isPending ? (t("auth.saving") || "Saving...") : (t("orders.saveChanges") || "Save Changes")}
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ModifyOrderPage;
