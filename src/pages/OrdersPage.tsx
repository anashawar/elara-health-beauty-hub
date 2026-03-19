import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, ChevronDown, ChevronUp, X, Clock, AlertTriangle, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFormatPrice } from "@/hooks/useProducts";
import BottomNav from "@/components/layout/BottomNav";
import DesktopHeader from "@/components/layout/DesktopHeader";
import SearchOverlay from "@/components/SearchOverlay";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MODIFY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const canModifyOrder = (createdAt: string, status: string) => {
  if (status === "cancelled" || status === "delivered" || status === "prepared" || status === "on_the_way") return false;
  const elapsed = Date.now() - new Date(createdAt).getTime();
  return elapsed < MODIFY_WINDOW_MS;
};

const getTimeRemaining = (createdAt: string) => {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  const remaining = MODIFY_WINDOW_MS - elapsed;
  if (remaining <= 0) return null;
  const mins = Math.ceil(remaining / 60000);
  return mins;
};

const OrdersPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const formatPrice = useFormatPrice();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelDialogId, setCancelDialogId] = useState<string | null>(null);
  const [, setTick] = useState(0); // force re-render for countdown
  const qc = useQueryClient();

  const statusConfig: Record<string, { label: string; color: string; step: number }> = {
    processing: { label: t("cart.processing"), color: "bg-violet-400", step: 0 },
    prepared: { label: t("cart.prepared"), color: "bg-emerald-400", step: 1 },
    on_the_way: { label: t("cart.onTheWay"), color: "bg-blue-400", step: 2 },
    delivered: { label: t("cart.delivered"), color: "bg-sage", step: 3 },
    cancelled: { label: t("cart.cancelled"), color: "bg-destructive", step: -1 },
  };

  const steps = [t("cart.processing"), t("cart.prepared"), t("cart.onTheWay"), t("cart.delivered")];

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(title, title_ar, title_ku, slug, price, product_images(image_url))), addresses(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Tick every 30s to update countdown timers
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('user-orders-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        qc.invalidateQueries({ queryKey: ["orders", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const order = orders.find(o => o.id === orderId);
      if (!order || !canModifyOrder(order.created_at, order.status)) {
        throw new Error(t("orders.cannotCancel") || "Cannot cancel this order");
      }
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(t("orders.orderCancelled") || "Order cancelled successfully");
      setCancelDialogId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (authLoading) return null;

  const renderContent = () => {
    if (!user) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground mb-4">{t("orders.signInToView")}</p>
          <Link to="/auth" className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm">
            {t("common.signIn")}
          </Link>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    if (orders.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Package className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-base font-semibold text-foreground mb-1">{t("orders.noOrders")}</p>
          <p className="text-sm text-muted-foreground mb-4">{t("orders.noOrdersDesc")}</p>
          <Link to="/home" className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm">
            {t("common.startShopping")}
          </Link>
        </div>
      );
    }

    return (
      <div className="px-4 md:px-6 mt-4 space-y-4 md:max-w-3xl">
        {orders.map((order, idx) => {
          const config = statusConfig[order.status] || statusConfig.pending;
          const items = (order as any).order_items || [];
          const isExpanded = expandedId === order.id;
          const modifiable = canModifyOrder(order.created_at, order.status);
          const minsLeft = getTimeRemaining(order.created_at);
          const address = (order as any).addresses;

          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-card rounded-2xl shadow-premium overflow-hidden"
            >
              {/* Tappable header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
                className="w-full p-4 text-left active:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">#{order.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold text-primary-foreground ${config.color}`}>
                      {config.label}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Progress steps */}
                {order.status !== "cancelled" && (
                  <div className="flex items-center gap-1 mb-3">
                    {steps.map((step, i) => (
                      <div key={step} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`w-full h-1.5 rounded-full transition-colors ${i <= config.step ? config.color : "bg-muted"}`} />
                        <span className={`text-[8px] ${i <= config.step ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Summary: item count + total */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {items.length} {items.length === 1 ? t("common.item") || "item" : t("common.items") || "items"}
                  </span>
                  <span className="text-sm font-bold text-foreground">{formatPrice(Number(order.total))}</span>
                </div>

                {/* Modifiable timer badge */}
                {modifiable && minsLeft && (
                  <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg w-fit">
                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
                      {t("orders.editableFor") || "Editable for"} {minsLeft} {t("orders.minutes") || "min"}
                    </span>
                  </div>
                )}
              </button>

              {/* Expanded details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3 border-t border-border/50">
                      {/* All items */}
                      <div className="pt-3 space-y-2.5">
                        <p className="text-xs font-bold text-foreground">{t("orders.orderItems") || "Order Items"}</p>
                        {items.map((item: any) => {
                          const img = item.products?.product_images?.[0]?.image_url;
                          return (
                            <Link
                              key={item.id}
                              to={`/product/${item.products?.slug || item.product_id}`}
                              className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50 transition-colors"
                            >
                              <div className="w-14 h-14 rounded-xl bg-secondary overflow-hidden flex-shrink-0">
                                {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <Package className="w-6 h-6 m-auto text-muted-foreground/30 mt-4" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{item.products?.title}</p>
                                <p className="text-xs text-muted-foreground">{t("orders.qty")}: {item.quantity} × {formatPrice(item.price)}</p>
                              </div>
                              <p className="text-sm font-semibold text-foreground">{formatPrice(item.price * item.quantity)}</p>
                            </Link>
                          );
                        })}
                      </div>

                      {/* Price breakdown */}
                      <div className="space-y-1.5 pt-3 border-t border-border/50">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                          <span className="text-foreground">{formatPrice(Number(order.subtotal))}</span>
                        </div>
                        {Number(order.discount) > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{t("orders.discount") || "Discount"}</span>
                            <span className="text-green-600">-{formatPrice(Number(order.discount))}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("cart.delivery")}</span>
                          <span className="text-foreground">{Number(order.delivery_fee) === 0 ? (t("common.free") || "FREE") : formatPrice(Number(order.delivery_fee))}</span>
                        </div>
                        {order.coupon_code && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{t("cart.coupon")}</span>
                            <span className="text-primary font-medium">{order.coupon_code}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-border/50">
                          <span className="text-foreground">{t("cart.total")}</span>
                          <span className="text-foreground">{formatPrice(Number(order.total))}</span>
                        </div>
                      </div>

                      {/* Delivery address */}
                      {address && (
                        <div className="pt-3 border-t border-border/50">
                          <p className="text-xs font-bold text-foreground mb-1">{t("checkout.deliveryAddress")}</p>
                          <p className="text-xs text-muted-foreground">
                            {[address.city, address.area, address.street, address.building].filter(Boolean).join(", ")}
                          </p>
                          {address.phone && <p className="text-xs text-muted-foreground mt-0.5">📞 {address.phone}</p>}
                        </div>
                      )}

                      {/* Payment method */}
                      <div className="pt-3 border-t border-border/50">
                        <p className="text-xs font-bold text-foreground mb-1">{t("checkout.paymentMethod")}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {order.payment_method === "cod" ? (t("checkout.cod")) : order.payment_method}
                        </p>
                      </div>

                      {/* Action buttons */}
                      {modifiable && (
                        <div className="pt-3 border-t border-border/50 flex gap-2">
                          <Button
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.id}/modify`); }}
                            className="flex-1 border-primary/30 text-primary hover:bg-primary/10 rounded-xl h-11"
                          >
                            <Pencil className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                            {t("orders.modifyOrder") || "Modify Order"}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); setCancelDialogId(order.id); }}
                            className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl h-11"
                          >
                            <X className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                            {t("orders.cancelOrder") || "Cancel Order"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border md:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/profile" className="p-1"><ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" /></Link>
          <h1 className="text-lg font-display font-bold text-foreground">{t("orders.title")}</h1>
        </div>
      </header>

      <div className="app-container">
        <div className="hidden md:flex items-center gap-2 px-6 pt-6 pb-2">
          <Link to="/profile" className="text-sm text-muted-foreground hover:text-foreground">← {t("profile.title")}</Link>
          <span className="text-sm text-muted-foreground">/</span>
          <h1 className="text-lg font-display font-bold text-foreground">{t("orders.title")}</h1>
        </div>
        {renderContent()}
      </div>

      <BottomNav />

      {/* Cancel confirmation dialog */}
      <AlertDialog open={!!cancelDialogId} onOpenChange={(open) => !open && setCancelDialogId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {t("orders.cancelOrderTitle") || "Cancel Order?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("orders.cancelOrderDesc") || "Are you sure you want to cancel this order? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t("common.cancel") || "No, Keep It"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelDialogId && cancelMutation.mutate(cancelDialogId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (t("auth.saving") || "...") : (t("orders.confirmCancel") || "Yes, Cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OrdersPage;
