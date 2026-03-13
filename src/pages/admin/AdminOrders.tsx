import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, User, Phone, MapPin, Package } from "lucide-react";
import { formatPrice } from "@/hooks/useProducts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

const statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  processing: "bg-violet-100 text-violet-800 border-violet-200",
  shipped: "bg-cyan-100 text-cyan-800 border-cyan-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function AdminOrders() {
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(title, product_images(image_url))), addresses(city, area, street, phone)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((o: any) => o.user_id))];
      const profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .in("user_id", userIds);
        if (profiles) {
          profiles.forEach((p: any) => { profilesMap[p.user_id] = p; });
        }
      }

      const missingAddrIds = (data || [])
        .filter((o: any) => !o.addresses && o.address_id)
        .map((o: any) => o.address_id);
      const addressMap: Record<string, any> = {};
      if (missingAddrIds.length > 0) {
        const { data: addrs } = await supabase
          .from("addresses")
          .select("id, city, area, street, phone")
          .in("id", missingAddrIds);
        if (addrs) {
          addrs.forEach((a: any) => { addressMap[a.id] = a; });
        }
      }

      return (data || []).map((o: any) => ({
        ...o,
        profile: profilesMap[o.user_id] || null,
        addresses: o.addresses || addressMap[o.address_id] || null,
      }));
    },
  });

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{orders.length} total orders</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {orders.map((o: any) => (
            <div key={o.id} className="bg-card rounded-2xl border border-border/50 p-4 hover:shadow-premium transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">#{o.id.slice(0, 8)}</span>
                    <Badge className={`${statusColors[o.status] || ""} text-[10px] font-bold border px-2 py-0.5`}>{o.status}</Badge>
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

              {/* Product thumbnails */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex -space-x-2">
                  {(o.order_items || []).slice(0, 4).map((item: any, i: number) => (
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

                <Select
                  value={o.status}
                  onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v })}
                >
                  <SelectTrigger className="h-8 w-[120px] text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        <span className="capitalize text-xs">{s}</span>
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
                  <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Order #{o.id.slice(0, 8)}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div className="bg-secondary/50 rounded-xl p-3 space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Customer</p>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{o.profile?.full_name || "Guest"}</span>
                        </div>
                        {(o.profile?.phone || o.addresses?.phone) && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{o.profile?.phone || o.addresses?.phone}</span>
                          </div>
                        )}
                        {o.addresses && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>{[o.addresses.area, o.addresses.street, o.addresses.city].filter(Boolean).join(", ")}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-sm space-y-1">
                        <p><span className="text-muted-foreground">Date:</span> {format(new Date(o.created_at), "PPP p")}</p>
                        <p><span className="text-muted-foreground">Payment:</span> {o.payment_method || "COD"}</p>
                        <p><span className="text-muted-foreground">Status:</span> <Badge className={`${statusColors[o.status] || ""} text-xs border ml-1`}>{o.status}</Badge></p>
                        {o.coupon_code && <p><span className="text-muted-foreground">Coupon:</span> {o.coupon_code}</p>}
                        {o.notes && <p><span className="text-muted-foreground">Notes:</span> {o.notes}</p>}
                      </div>

                      <div className="border-t border-border pt-3">
                        <p className="text-sm font-bold mb-2">Items</p>
                        {o.order_items?.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3 py-2">
                            {item.products?.product_images?.[0]?.image_url && (
                              <img src={item.products.product_images[0].image_url} className="w-10 h-10 rounded-lg object-cover" alt="" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium line-clamp-1">{item.products?.title}</p>
                              <p className="text-xs text-muted-foreground">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-border pt-3 space-y-1 text-sm">
                        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(o.subtotal)}</span></div>
                        {o.discount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-destructive">-{formatPrice(o.discount)}</span></div>}
                        <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>{formatPrice(o.delivery_fee)}</span></div>
                        <div className="flex justify-between font-bold pt-1 border-t border-border"><span>Total</span><span>{formatPrice(o.total)}</span></div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No orders yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
