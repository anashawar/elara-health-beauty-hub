import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";

interface BrandForm { id?: string; name: string; slug: string; logo_url: string; }
const emptyForm: BrandForm = { name: "", slug: "", logo_url: "" };

export default function AdminBrands() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BrandForm>(emptyForm);
  const [editing, setEditing] = useState(false);

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["admin-brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (f: BrandForm) => {
      const payload = { name: f.name, slug: f.slug || f.name.toLowerCase().replace(/\s+/g, "-"), logo_url: f.logo_url || null };
      if (f.id) {
        const { error } = await supabase.from("brands").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("brands").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-brands"] }); toast.success("Saved"); setOpen(false); setForm(emptyForm); setEditing(false); },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("brands").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-brands"] }); toast.success("Deleted"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Brands</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{brands.length} brands</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setEditing(false); } }}>
          <DialogTrigger asChild><Button size="sm" className="rounded-xl"><Plus className="h-4 w-4 mr-1.5" />Add</Button></DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>{editing ? "Edit Brand" : "Add Brand"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 mt-2">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" /></div>
              <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></div>
              <Button className="rounded-xl" onClick={() => save.mutate(form)} disabled={!form.name || save.isPending}>
                {save.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}{editing ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {brands.map((b: any) => (
            <div key={b.id} className="bg-card rounded-2xl border border-border/50 p-4 flex flex-col items-center hover:shadow-premium transition-shadow group">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary/50 mb-3 p-2">
                {b.logo_url ? (
                  <img src={b.logo_url} className="w-full h-full object-contain" alt={b.name} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Tag className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="text-sm font-bold text-foreground text-center">{b.name}</p>
              <p className="text-[10px] text-muted-foreground">{b.slug}</p>
              <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => {
                  setForm({ id: b.id, name: b.name, slug: b.slug, logo_url: b.logo_url || "" });
                  setEditing(true); setOpen(true);
                }}><Pencil className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-destructive" onClick={() => {
                  if (confirm("Delete?")) del.mutate(b.id);
                }}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
          {brands.length === 0 && (
            <div className="col-span-full text-center py-12 bg-card rounded-2xl border border-border/50">
              <Tag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No brands yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
