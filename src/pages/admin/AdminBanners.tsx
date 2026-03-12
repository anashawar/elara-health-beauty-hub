import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
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
        <h1 className="text-2xl font-display font-bold text-foreground">Banners</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setEditing(false); } }}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add</Button></DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>{editing ? "Edit Banner" : "Add Banner"}</DialogTitle></DialogHeader>
            <div className="grid gap-3 mt-2">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Subtitle</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
              <div><Label>Image URL *</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
              <div><Label>Link URL</Label><Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} /></div>
                <label className="flex items-center gap-2 text-sm pb-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Active
                </label>
              </div>
              <Button onClick={() => save.mutate(form)} disabled={!form.image_url || save.isPending}>
                {save.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}{editing ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Preview</TableHead><TableHead>Title</TableHead><TableHead className="hidden md:table-cell">Active</TableHead><TableHead>Order</TableHead><TableHead className="w-[100px]">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {banners.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell><img src={b.image_url} className="w-20 h-10 rounded-lg object-cover" alt="" /></TableCell>
                  <TableCell className="font-medium text-sm">{b.title || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell"><span className={`text-xs px-2 py-0.5 rounded-full ${b.is_active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>{b.is_active ? "Yes" : "No"}</span></TableCell>
                  <TableCell className="text-sm">{b.sort_order}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setForm({ id: b.id, title: b.title || "", subtitle: b.subtitle || "", image_url: b.image_url, link_url: b.link_url || "", is_active: b.is_active ?? true, sort_order: b.sort_order || 0 }); setEditing(true); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) del.mutate(b.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {banners.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No banners</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
