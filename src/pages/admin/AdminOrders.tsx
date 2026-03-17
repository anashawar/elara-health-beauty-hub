import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, User, Phone, MapPin, Package, Filter, Calendar, CreditCard, Tag, StickyNote, Users } from "lucide-react";
import { formatPrice } from "@/hooks/useProducts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

const statuses = ["pending", "in_progress", "shipped", "on_the_way", "delivered", "cancelled"];

const statusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  shipped: "Shipped",
  on_the_way: "On the Way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  in_progress: "bg-violet-100 text-violet-800 border-violet-200",
  shipped: "bg-cyan-100 text-cyan-800 border-cyan-200",
  on_the_way: "bg-blue-100 text-blue-800 border-blue-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function AdminOrders() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(title, product_images(image_url))), addresses(city, area, street, phone, building, floor, apartment, label)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((o: any) => o.user_id))];
      const profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone, gender")
          .in("user_id", userIds);
        if (profiles) profiles.forEach((p: any) => { profilesMap[p.user_id] = p; });
      }

      const missingAddrIds = (data || [])
        .filter((o: any) => !o.addresses && o.address_id)
        .map((o: any) => o.address_id);
      const addressMap: Record<string, any> = {};
      if (missingAddrIds.length > 0) {
        const { data: addrs } = await supabase
          .from("addresses")
          .select("id, city, area, street, phone, building, floor, apartment, label")
          .in("id", missingAddrIds);
        if (addrs) addrs.forEach((a: any) => { addressMap[a.id] = a; });
      }

      return (data || []).map((o: any) => ({
        ...o,
        profile: profilesMap[o.user_id] || null,
        addresses: o.addresses || addressMap[o.address_id] || null,
      }));
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        qc.invalidateQueries({ queryKey: ["admin-orders"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Order status updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const filteredOrders = statusFilter === "all" ? orders : orders.filter((o: any) => o.status === statusFilter);

  // Count per status
  const statusCounts: Record<string, number> = { all: orders.length };
  statuses.forEach(s => { statusCounts[s] = orders.filter((o: any) => o.status === s).length; });

  const renderOrderDialog = (o: any) => (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle className="text-lg">Order #{o.id.slice(0, 8).toUpperCase()}</DialogTitle>
          <Badge className={`${statusColors[o.status] || ""} text-xs border px-3 py-1`}>
            {statusLabels[o.status] || o.status}
          </Badge>
        </div>
      </DialogHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        {/* Customer Info */}
        <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Customer</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="font-medium">{o.profile?.full_name || "Guest"}</span>
            </div>
            {o.profile?.gender && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="capitalize">{o.profile.gender}</span>
              </div>
            )}
            {(o.profile?.phone || o.addresses?.phone) && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span dir="ltr">{o.profile?.phone || o.addresses?.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Address Info */}
        <div className="bg-secondary/50 rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Delivery Address</p>
          {o.addresses ? (
            <div className="space-y-2">
              {o.addresses.label && (
                <p className="text-xs font-semibold text-primary">{o.addresses.label}</p>
              )}
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  {o.addresses.city && <p className="font-medium">{o.addresses.city}</p>}
                  {o.addresses.area && <p className="text-muted-foreground">{o.addresses.area}</p>}
                  {o.addresses.street && <p className="text-muted-foreground">{o.addresses.street}</p>}
                  {(o.addresses.building || o.addresses.floor || o.addresses.apartment) && (
                    <p className="text-muted-foreground">
                      {[
                        o.addresses.building && `Bldg: ${o.addresses.building}`,
                        o.addresses.floor && `Floor: ${o.addresses.floor}`,
                        o.addresses.apartment && `Apt: ${o.addresses.apartment}`,
                      ].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No address provided</p>
          )}
        </div>
      </div>

      {/* Order Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1">
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <Calendar className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">Date</p>
          <p className="text-xs font-semibold">{format(new Date(o.created_at), "MMM d, yyyy")}</p>
          <p className="text-[10px] text-muted-foreground">{format(new Date(o.created_at), "h:mm a")}</p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <CreditCard className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">Payment</p>
          <p className="text-xs font-semibold uppercase">{o.payment_method || "COD"}</p>
        </div>
        {o.coupon_code && (
          <div className="bg-secondary/30 rounded-lg p-3 text-center">
            <Tag className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Coupon</p>
            <p className="text-xs font-semibold">{o.coupon_code}</p>
          </div>
        )}
        <div className="bg-secondary/30 rounded-lg p-3 text-center">
          <Package className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
          <p className="text-[10px] text-muted-foreground">Items</p>
          <p className="text-xs font-semibold">{o.order_items?.length || 0}</p>
        </div>
      </div>

      {o.notes && (
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mt-1">
          <StickyNote className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Customer Notes</p>
            <p className="text-sm text-amber-900 dark:text-amber-200 mt-0.5">{o.notes}</p>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="border-t border-border pt-3 mt-1">
        <p className="text-sm font-bold mb-3">Order Items</p>
        <div className="space-y-2">
          {o.order_items?.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-secondary/30 transition-colors">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                {item.products?.product_images?.[0]?.image_url ? (
                  <img src={item.products.product_images[0].image_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <Package className="w-5 h-5 text-muted-foreground m-auto mt-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{item.products?.title || "Unknown Product"}</p>
                <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatPrice(item.price)}</p>
              </div>
              <p className="text-sm font-semibold flex-shrink-0">{formatPrice(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="border-t border-border pt-3 space-y-1.5 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(o.subtotal)}</span></div>
        {o.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-destructive">-{formatPrice(o.discount)}</span></div>}
        <div className="flex justify-between"><span className="text-muted-foreground">Delivery Fee</span><span>{formatPrice(o.delivery_fee)}</span></div>
        <div className="flex justify-between font-bold text-base pt-2 border-t border-border"><span>Total</span><span>{formatPrice(o.total)}</span></div>
      </div>
    </DialogContent>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filteredOrders.length} of {orders.length} orders</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {[{ key: "all", label: "All" }, ...statuses.map(s => ({ key: s, label: statusLabels[s] }))].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-muted-foreground hover:bg-accent"
            }`}
          >
            {label} <span className="ml-1 opacity-70">({statusCounts[key] || 0})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Desktop table view */}
          <div className="hidden md:block bg-card rounded-2xl border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">City</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Items</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Total</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o: any) => (
                  <tr key={o.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-foreground">#{o.id.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{o.profile?.full_name || "Guest"}</p>
                      {(o.profile?.phone || o.addresses?.phone) && (
                        <p className="text-xs text-muted-foreground" dir="ltr">{o.profile?.phone || o.addresses?.phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {o.addresses?.city || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {format(new Date(o.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                          {(o.order_items || []).slice(0, 3).map((item: any) => (
                            <div key={item.id} className="w-7 h-7 rounded-md border-2 border-card overflow-hidden bg-secondary">
                              {item.products?.product_images?.[0]?.image_url ? (
                                <img src={item.products.product_images[0].image_url} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <Package className="w-3 h-3 text-muted-foreground m-auto mt-1.5" />
                              )}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">×{o.order_items?.length || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-foreground whitespace-nowrap">
                      {formatPrice(o.total)}
                    </td>
                    <td className="px-4 py-3">
                      <Select value={o.status} onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v })}>
                        <SelectTrigger className="h-7 w-[120px] text-xs rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((s) => (
                            <SelectItem key={s} value={s}>
                              <span className="text-xs">{statusLabels[s]}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="h-7 rounded-lg text-xs">
                            <Eye className="h-3.5 w-3.5 mr-1" /> View
                          </Button>
                        </DialogTrigger>
                        {renderOrderDialog(o)}
                      </Dialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{statusFilter === "all" ? "No orders yet" : `No ${statusLabels[statusFilter]?.toLowerCase()} orders`}</p>
              </div>
            )}
          </div>

          {/* Mobile card view */}
          <div className="md:hidden space-y-3">
            {filteredOrders.map((o: any) => (
              <div key={o.id} className="bg-card rounded-2xl border border-border/50 p-4 hover:shadow-premium transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">#{o.id.slice(0, 8)}</span>
                      <Badge className={`${statusColors[o.status] || statusColors.pending} text-[10px] font-bold border px-2 py-0.5`}>
                        {statusLabels[o.status] || o.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>{o.profile?.full_name || "Guest"}</span>
                      <span>•</span>
                      <span>{format(new Date(o.created_at), "MMM d, yyyy")}</span>
                      <span>•</span>
                      <span>{o.order_items?.length} items</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-base font-bold text-foreground">{formatPrice(o.total)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <div className="flex -space-x-2">
                    {(o.order_items || []).slice(0, 4).map((item: any) => (
                      <div key={item.id} className="w-9 h-9 rounded-lg border-2 border-card overflow-hidden bg-secondary">
                        {item.products?.product_images?.[0]?.image_url ? (
                          <img src={item.products.product_images[0].image_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <Package className="w-4 h-4 text-muted-foreground m-auto mt-2" />
                        )}
                      </div>
                    ))}
                    {(o.order_items?.length || 0) > 4 && (
                      <div className="w-9 h-9 rounded-lg border-2 border-card bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        +{o.order_items.length - 4}
                      </div>
                    )}
                  </div>

                  <div className="flex-1" />

                  <Select value={o.status} onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v })}>
                    <SelectTrigger className="h-8 w-[130px] text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="text-xs">{statusLabels[s]}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs">
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                    </DialogTrigger>
                    {renderOrderDialog(o)}
                  </Dialog>
                </div>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
                <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{statusFilter === "all" ? "No orders yet" : `No ${statusLabels[statusFilter]?.toLowerCase()} orders`}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
