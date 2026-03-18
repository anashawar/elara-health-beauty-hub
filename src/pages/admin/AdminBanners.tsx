import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface BannerForm { id?: string; title: string; subtitle: string; image_url: string; link_url: string; is_active: boolean; sort_order: number; }
const emptyForm: BannerForm = { title: "", subtitle: "", image_url: "", link_url: "", is_active: true, sort_order: 0 };

export default function AdminBanners() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [editing, setEditing] = useState(false);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (f: BannerForm) => {
      const payload = { title: f.title || null, subtitle: f.subtitle || null, image_url: f.image_url, link_url: f.link_url || null, is_active: f.is_active, sort_order: f.sort_order };
      if (f.id) {
        const { error } = await supabase.from("banners").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("banners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners"] }); qc.invalidateQueries({ queryKey: ["banners"] }); toast.success("Saved"); setOpen(false); setForm(emptyForm); setEditing(false); },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("banners").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners"] }); toast.success("Deleted"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Banners</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{banners.length} banners</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setEditing(false); } }}>
          <DialogTrigger asChild><Button size="sm" className="rounded-xl"><Plus className="h-4 w-4 mr-1.5" />Add</Button></DialogTrigger>
          <DialogContent className="w-[min(96vw,760px)] max-w-none max-h-[92vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit Banner" : "Add Banner"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 mt-2">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Subtitle</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
              <div>
                <Label>Image URL *</Label>
                <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
                <p className="text-[11px] text-muted-foreground mt-1">📐 Recommended: <strong>1200×400px</strong> (3:1 ratio) · PNG or WebP · Max 500KB · The entire banner is this image — include all text/CTAs in the design</p>
              </div>
              <div><Label>Link URL</Label><Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} /></div>
                <label className="flex items-center gap-2 text-sm pb-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Active
                </label>
              </div>
              <Button className="rounded-xl" onClick={() => save.mutate(form)} disabled={!form.image_url || save.isPending}>
                {save.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}{editing ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((b: any) => (
            <div key={b.id} className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-premium transition-shadow">
              <div className="relative h-36 bg-secondary">
                <img src={b.image_url} className="w-full h-full object-cover" alt="" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm ${b.is_active ? "bg-emerald-500/90 text-white" : "bg-black/50 text-white"}`}>
                    {b.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">{b.title || "Untitled"}</p>
                    {b.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{b.subtitle}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">Order: {b.sort_order}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl" onClick={() => {
                      setForm({ id: b.id, title: b.title || "", subtitle: b.subtitle || "", image_url: b.image_url, link_url: b.link_url || "", is_active: b.is_active ?? true, sort_order: b.sort_order || 0 });
                      setEditing(true); setOpen(true);
                    }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/5" onClick={() => {
                      if (confirm("Delete?")) del.mutate(b.id);
                    }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {banners.length === 0 && (
            <div className="col-span-full text-center py-12 bg-card rounded-2xl border border-border/50">
              <ImageIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No banners yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
