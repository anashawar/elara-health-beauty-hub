import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, User, Phone, MapPin, Package, Calendar, CreditCard, Tag, StickyNote, Users, Trash2, Bell, Send } from "lucide-react";
import { formatPrice } from "@/hooks/useProducts";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

const statuses = ["processing", "prepared", "on_the_way", "delivered", "cancelled"];

const statusLabels: Record<string, string> = {
  processing: "Processing",
  prepared: "Prepared",
  on_the_way: "On the Way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const statusColors: Record<string, string> = {
  processing: "bg-violet-100 text-violet-800 border-violet-200",
  prepared: "bg-emerald-100 text-emerald-800 border-emerald-200",
  on_the_way: "bg-blue-100 text-blue-800 border-blue-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function AdminOrders() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [notifyOrderId, setNotifyOrderId] = useState<string | null>(null);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [sendingNotify, setSendingNotify] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      // Delete order items first, then the order
      const { error: itemsErr } = await supabase.from("order_items").delete().eq("order_id", id);
      if (itemsErr) throw itemsErr;
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Order deleted");
      setDeleteConfirmId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleNotifyUser = async (order: any) => {
    if (!notifyMessage.trim()) return;
    setSendingNotify(true);
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: `Update on Order #${order.id.slice(0, 8).toUpperCase()}`,
        body: notifyMessage.trim(),
        type: "order",
        icon: "📦",
        link_url: "/orders",
      });
      if (error) throw error;
      toast.success("Notification sent to customer");
      setNotifyOrderId(null);
      setNotifyMessage("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSendingNotify(false);
    }
  };

  const filteredOrders = statusFilter === "all" ? orders : orders.filter((o: any) => o.status === statusFilter);

  const statusCounts: Record<string, number> = { all: orders.length };
  statuses.forEach(s => { statusCounts[s] = orders.filter((o: any) => o.status === s).length; });

  const renderOrderDialog = (o: any) => (
    <DialogContent className="flex h-[92vh] max-h-[92vh] w-[min(96vw,1120px)] max-w-none flex-col overflow-hidden p-0 md:h-[min(92vh,820px)] md:max-h-[min(92vh,820px)]">
      <DialogHeader className="border-b border-border px-6 py-5">
        <div className="flex items-start justify-between gap-4 pr-8">
          <div className="space-y-1">
            <DialogTitle className="text-2xl font-display">Order #{o.id.slice(0, 8).toUpperCase()}</DialogTitle>
            <DialogDescription>
              Full order details for {o.profile?.full_name || "Guest"}, created on {format(new Date(o.created_at), "PPP p")}.
            </DialogDescription>
          </div>
          <Badge className={`${statusColors[o.status] || ""} text-xs border px-3 py-1`}>
            {statusLabels[o.status] || o.status}
          </Badge>
        </div>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-secondary/20 p-5 md:border-b-0 md:border-r md:overflow-y-auto">
          <div className="space-y-5">
            <section className="rounded-2xl bg-card p-4 shadow-sm">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Customer</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="font-medium text-foreground">{o.profile?.full_name || "Guest"}</span>
                </div>
                {o.profile?.gender && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="capitalize text-foreground">{o.profile.gender}</span>
                  </div>
                )}
                {(o.profile?.phone || o.addresses?.phone) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <span className="text-foreground" dir="ltr">{o.profile?.phone || o.addresses?.phone}</span>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl bg-card p-4 shadow-sm">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Delivery Address</p>
              {o.addresses ? (
                <div className="space-y-2.5 text-sm">
                  {o.addresses.label && <p className="font-semibold text-primary">{o.addresses.label}</p>}
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="space-y-1 text-foreground">
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
            </section>

            <section className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-card p-4 text-center shadow-sm">
                <Calendar className="mx-auto mb-2 h-4 w-4 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">Date</p>
                <p className="text-sm font-semibold text-foreground">{format(new Date(o.created_at), "MMM d, yyyy")}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(o.created_at), "h:mm a")}</p>
              </div>
              <div className="rounded-2xl bg-card p-4 text-center shadow-sm">
                <CreditCard className="mx-auto mb-2 h-4 w-4 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">Payment</p>
                <p className="text-sm font-semibold uppercase text-foreground">{o.payment_method || "COD"}</p>
              </div>
              <div className="rounded-2xl bg-card p-4 text-center shadow-sm">
                <Package className="mx-auto mb-2 h-4 w-4 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">Items</p>
                <p className="text-sm font-semibold text-foreground">{o.order_items?.length || 0}</p>
              </div>
              <div className="rounded-2xl bg-card p-4 text-center shadow-sm">
                <Tag className="mx-auto mb-2 h-4 w-4 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">Coupon</p>
                <p className="truncate text-sm font-semibold text-foreground">{o.coupon_code || "—"}</p>
              </div>
            </section>

            {o.notes && (
              <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-2">
                  <StickyNote className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Customer Notes</p>
                    <p className="mt-1 text-sm text-foreground">{o.notes}</p>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Totals</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">{formatPrice(o.subtotal)}</span></div>
                {o.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-destructive">-{formatPrice(o.discount)}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Delivery Fee</span><span className="text-foreground">{formatPrice(o.delivery_fee)}</span></div>
                <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><span className="text-foreground">Total</span><span className="text-foreground">{formatPrice(o.total)}</span></div>
              </div>
            </section>

            {/* Notify User */}
            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-primary">Notify Customer</p>
              <Textarea
                placeholder="e.g. A product in your order is out of stock, we'll replace it with..."
                className="text-xs min-h-[60px] bg-background"
                value={notifyOrderId === o.id ? notifyMessage : ""}
                onFocus={() => { if (notifyOrderId !== o.id) { setNotifyOrderId(o.id); setNotifyMessage(""); } }}
                onChange={(e) => { setNotifyOrderId(o.id); setNotifyMessage(e.target.value); }}
              />
              <Button
                size="sm"
                className="mt-2 w-full rounded-xl gap-1.5 text-xs h-8"
                disabled={sendingNotify || !notifyMessage.trim() || notifyOrderId !== o.id}
                onClick={() => handleNotifyUser(o)}
              >
                {sendingNotify ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Send Notification
              </Button>
            </section>
          </div>
        </aside>

        <div className="min-h-0 overflow-y-auto p-5">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">Order Items</h3>
                <p className="text-sm text-muted-foreground">Review every product included in this order.</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Grand Total</p>
                <p className="text-lg font-bold text-foreground">{formatPrice(o.total)}</p>
              </div>
            </div>

            <div className="space-y-3">
              {o.order_items?.map((item: any, index: number) => (
                <div key={item.id} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border bg-background px-3 py-3">
                  <div className="h-16 w-16 overflow-hidden rounded-xl bg-secondary">
                    {item.products?.product_images?.[0]?.image_url ? (
                      <img src={item.products.product_images[0].image_url} className="h-full w-full object-cover" alt="" />
                    ) : (
                      <Package className="m-auto mt-5 h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Item {index + 1}</p>
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">{item.products?.title || "Unknown Product"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                  </div>
                  <p className="whitespace-nowrap text-sm font-bold text-foreground">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
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

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete order #{deleteConfirmId?.slice(0, 8).toUpperCase()}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" disabled={deleteOrder.isPending} onClick={() => deleteConfirmId && deleteOrder.mutate(deleteConfirmId)}>
              {deleteOrder.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                      <div className="flex items-center justify-end gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="h-7 rounded-lg text-xs">
                              <Eye className="h-3.5 w-3.5 mr-1" /> View
                            </Button>
                          </DialogTrigger>
                          {renderOrderDialog(o)}
                        </Dialog>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          onClick={() => setDeleteConfirmId(o.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
                      <Badge className={`${statusColors[o.status] || statusColors.processing} text-[10px] font-bold border px-2 py-0.5`}>
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

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                    onClick={() => setDeleteConfirmId(o.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
