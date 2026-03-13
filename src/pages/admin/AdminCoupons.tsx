import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";

interface CouponForm { id?: string; code: string; discount_type: string; discount_value: number; min_order_amount: number; max_uses: number | null; is_active: boolean; }
const emptyForm: CouponForm = { code: "", discount_type: "percentage", discount_value: 0, min_order_amount: 0, max_uses: null, is_active: true };

export default function AdminCoupons() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [editing, setEditing] = useState(false);

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (f: CouponForm) => {
      const payload = { code: f.code.toUpperCase(), discount_type: f.discount_type, discount_value: f.discount_value, min_order_amount: f.min_order_amount || 0, max_uses: f.max_uses, is_active: f.is_active };
      if (f.id) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-coupons"] }); toast.success("Saved"); setOpen(false); setForm(emptyForm); setEditing(false); },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("coupons").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-coupons"] }); toast.success("Deleted"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Coupons</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{coupons.length} coupons</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setEditing(false); } }}>
          <DialogTrigger asChild><Button size="sm" className="rounded-xl"><Plus className="h-4 w-4 mr-1.5" />Add</Button></DialogTrigger>
          <DialogContent className="max-w-sm">
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
          {coupons.map((c: any) => (
            <div key={c.id} className="bg-card rounded-2xl border border-border/50 p-4 hover:shadow-premium transition-shadow relative overflow-hidden group">
              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-[40px]" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-lg font-bold text-primary">{c.code}</span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                    {c.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="font-bold text-foreground">
                      {c.discount_type === "percentage" ? `${c.discount_value}%` : `${c.discount_value.toLocaleString()} IQD`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uses</span>
                    <span className="font-medium text-foreground">{c.current_uses}{c.max_uses ? ` / ${c.max_uses}` : " / ∞"}</span>
                  </div>
                  {c.min_order_amount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Min order</span>
                      <span className="font-medium text-foreground">{c.min_order_amount.toLocaleString()} IQD</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-1 mt-3 pt-3 border-t border-border/50">
                  <Button size="sm" variant="ghost" className="flex-1 h-8 rounded-xl text-xs" onClick={() => {
                    setForm({ id: c.id, code: c.code, discount_type: c.discount_type, discount_value: c.discount_value, min_order_amount: c.min_order_amount || 0, max_uses: c.max_uses, is_active: c.is_active });
                    setEditing(true); setOpen(true);
                  }}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                  <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs text-destructive hover:bg-destructive/5" onClick={() => {
                    if (confirm("Delete?")) del.mutate(c.id);
                  }}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
                </div>
              </div>
            </div>
          ))}
          {coupons.length === 0 && (
            <div className="col-span-full text-center py-12 bg-card rounded-2xl border border-border/50">
              <Ticket className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No coupons yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
