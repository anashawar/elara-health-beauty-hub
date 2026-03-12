import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye } from "lucide-react";
import { formatPrice } from "@/hooks/useProducts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

const statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-cyan-100 text-cyan-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminOrders() {
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, products(title, product_images(image_url))), addresses(city, area, street, phone), profiles!orders_user_id_fkey(full_name, phone)")
        .order("created_at", { ascending: false });
      if (error) {
        // fallback without profile join
        const { data: d2, error: e2 } = await supabase
          .from("orders")
          .select("*, order_items(*, products(title, product_images(image_url))), addresses(city, area, street, phone)")
          .order("created_at", { ascending: false });
        if (e2) throw e2;
        return d2;
      }
      return data;
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
      <h1 className="text-2xl font-display font-bold text-foreground mb-6">Orders</h1>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">#{o.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{o.order_items?.length} items</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {format(new Date(o.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{formatPrice(o.total)}</TableCell>
                  <TableCell>
                    <Select
                      value={o.status}
                      onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v })}
                    >
                      <SelectTrigger className="h-8 w-[130px]">
                        <Badge className={`${statusColors[o.status] || ""} text-xs border-0`}>{o.status}</Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map((s) => (
                          <SelectItem key={s} value={s}>
                            <span className="capitalize">{s}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="icon" variant="ghost"><Eye className="h-4 w-4" /></Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Order #{o.id.slice(0, 8)}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-2">
                          <div className="text-sm space-y-1">
                            <p><span className="text-muted-foreground">Date:</span> {format(new Date(o.created_at), "PPP p")}</p>
                            <p><span className="text-muted-foreground">Payment:</span> {o.payment_method || "COD"}</p>
                            {o.addresses && (
                              <p><span className="text-muted-foreground">Address:</span> {[o.addresses.area, o.addresses.street, o.addresses.city].filter(Boolean).join(", ")}</p>
                            )}
                            {o.coupon_code && <p><span className="text-muted-foreground">Coupon:</span> {o.coupon_code}</p>}
                            {o.notes && <p><span className="text-muted-foreground">Notes:</span> {o.notes}</p>}
                          </div>
                          <div className="border-t border-border pt-3">
                            <p className="text-sm font-medium mb-2">Items</p>
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
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No orders yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
