import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2, Ticket, Users, Eye, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/hooks/useProducts";
import { format } from "date-fns";

interface CouponForm {
  id?: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  is_active: boolean;
  influencer_name: string;
  influencer_commission: number;
}

const emptyForm: CouponForm = {
  code: "", discount_type: "percentage", discount_value: 0, min_order_amount: 0,
  max_uses: null, is_active: true, influencer_name: "", influencer_commission: 0,
};

export default function AdminCoupons() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [detailCoupon, setDetailCoupon] = useState<any>(null);

  // Fetch coupons
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch orders that used coupons for stats
  const { data: couponOrders = [] } = useQuery({
    queryKey: ["admin-coupon-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, coupon_code, total, discount, created_at")
        .not("coupon_code", "is", null);
      if (error) throw error;
      return data || [];
    },
  });

  const getOrdersForCoupon = (code: string) => couponOrders.filter((o: any) => o.coupon_code === code);

  const save = useMutation({
    mutationFn: async (f: CouponForm) => {
      const payload: any = {
        code: f.code.toUpperCase(),
        discount_type: f.discount_type,
        discount_value: f.discount_value,
        min_order_amount: f.min_order_amount || 0,
        max_uses: f.max_uses,
        is_active: f.is_active,
        influencer_name: f.influencer_name || null,
        influencer_commission: f.influencer_commission || 0,
      };
      if (f.id) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Saved");
      setOpen(false);
      setForm(emptyForm);
      setEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Coupons & Influencers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{coupons.length} coupons</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setEditing(false); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl"><Plus className="h-4 w-4 mr-1.5" />Add</Button>
          </DialogTrigger>
          <DialogContent className="w-[min(96vw,880px)] max-w-none max-h-[92vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit Coupon" : "Add Coupon"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 mt-2">
              <div><Label>Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="uppercase" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Value *</Label><Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Min Order (IQD)</Label><Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: +e.target.value })} /></div>
                <div><Label>Max Uses</Label><Input type="number" value={form.max_uses ?? ""} onChange={(e) => setForm({ ...form, max_uses: e.target.value ? +e.target.value : null })} placeholder="∞" /></div>
              </div>

              {/* Influencer section */}
              <div className="border-t border-border/50 pt-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Influencer (Optional)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Influencer Name</Label><Input value={form.influencer_name} onChange={(e) => setForm({ ...form, influencer_name: e.target.value })} placeholder="e.g. @sara" /></div>
                  <div><Label>Commission %</Label><Input type="number" value={form.influencer_commission} onChange={(e) => setForm({ ...form, influencer_commission: +e.target.value })} placeholder="0" /></div>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Active
              </label>
              <Button className="rounded-xl" onClick={() => save.mutate(form)} disabled={!form.code || !form.discount_value || save.isPending}>
                {save.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}{editing ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {coupons.map((c: any) => {
            const orders = getOrdersForCoupon(c.code);
            const totalRevenue = orders.reduce((sum: number, o: any) => sum + Number(o.total), 0);
            const totalDiscount = orders.reduce((sum: number, o: any) => sum + Number(o.discount), 0);
            const commission = c.influencer_commission ? (totalRevenue * c.influencer_commission / 100) : 0;

            return (
              <div key={c.id} className="bg-card rounded-2xl border border-border/50 p-4 hover:shadow-premium transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-[40px]" />

                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-lg font-bold text-primary">{c.code}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {c.influencer_name && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Users className="w-3 h-3 text-primary" />
                      <span className="text-xs font-semibold text-primary">{c.influencer_name}</span>
                      {c.influencer_commission > 0 && (
                        <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20 px-1.5 py-0">{c.influencer_commission}% commission</Badge>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-bold text-foreground">
                        {c.discount_type === "percentage" ? `${c.discount_value}%` : `${c.discount_value.toLocaleString()} IQD`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Orders</span>
                      <span className="font-medium text-foreground">{orders.length}{c.max_uses ? ` / ${c.max_uses}` : ""}</span>
                    </div>
                    {orders.length > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Revenue</span>
                        <span className="font-medium text-foreground">{formatPrice(totalRevenue)}</span>
                      </div>
                    )}
                    {commission > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Owed</span>
                        <span className="font-bold text-primary">{formatPrice(commission)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1 mt-3 pt-3 border-t border-border/50">
                    {orders.length > 0 && (
                      <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs" onClick={() => setDetailCoupon(c)}>
                        <Eye className="h-3 w-3 mr-1" /> Details
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="flex-1 h-8 rounded-xl text-xs" onClick={() => {
                      setForm({
                        id: c.id, code: c.code, discount_type: c.discount_type, discount_value: c.discount_value,
                        min_order_amount: c.min_order_amount || 0, max_uses: c.max_uses, is_active: c.is_active,
                        influencer_name: c.influencer_name || "", influencer_commission: c.influencer_commission || 0,
                      });
                      setEditing(true);
                      setOpen(true);
                    }}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                    <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs text-destructive hover:bg-destructive/5" onClick={() => {
                      if (confirm("Delete?")) del.mutate(c.id);
                    }}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                  </div>
                </div>
              </div>
            );
          })}
          {coupons.length === 0 && (
            <div className="col-span-full text-center py-12 bg-card rounded-2xl border border-border/50">
              <Ticket className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No coupons yet</p>
            </div>
          )}
        </div>
      )}

      {/* Coupon detail dialog */}
      <Dialog open={!!detailCoupon} onOpenChange={(v) => { if (!v) setDetailCoupon(null); }}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          {detailCoupon && (() => {
            const orders = getOrdersForCoupon(detailCoupon.code);
            const totalRevenue = orders.reduce((sum: number, o: any) => sum + Number(o.total), 0);
            const totalDiscount = orders.reduce((sum: number, o: any) => sum + Number(o.discount), 0);
            const commission = detailCoupon.influencer_commission ? (totalRevenue * detailCoupon.influencer_commission / 100) : 0;

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-primary" />
                    {detailCoupon.code}
                    {detailCoupon.influencer_name && (
                      <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">{detailCoupon.influencer_name}</Badge>
                    )}
                  </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-secondary/50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{orders.length}</p>
                    <p className="text-[10px] text-muted-foreground">Orders</p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{formatPrice(totalRevenue)}</p>
                    <p className="text-[10px] text-muted-foreground">Revenue</p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{formatPrice(totalDiscount)}</p>
                    <p className="text-[10px] text-muted-foreground">Discounts Given</p>
                  </div>
                </div>

                {commission > 0 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mt-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">Commission Owed</p>
                      <p className="text-[10px] text-muted-foreground">{detailCoupon.influencer_commission}% of revenue</p>
                    </div>
                    <p className="text-xl font-bold text-primary">{formatPrice(commission)}</p>
                  </div>
                )}

                <div className="mt-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Orders using this coupon</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {orders.map((o: any) => (
                      <div key={o.id} className="flex items-center justify-between bg-secondary/30 rounded-lg p-2.5">
                        <div>
                          <p className="text-xs font-mono font-bold">#{o.id.slice(0, 8)}</p>
                          <p className="text-[10px] text-muted-foreground">{format(new Date(o.created_at), "MMM d, yyyy")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold">{formatPrice(Number(o.total))}</p>
                          <p className="text-[10px] text-muted-foreground">-{formatPrice(Number(o.discount))}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
