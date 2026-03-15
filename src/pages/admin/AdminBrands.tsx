import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Trash2, Loader2, Tag, Sparkles, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface BrandForm { id?: string; name: string; slug: string; logo_url: string; country_of_origin: string; featured: boolean; }
const emptyForm: BrandForm = { name: "", slug: "", logo_url: "", country_of_origin: "", featured: false };

export default function AdminBrands() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BrandForm>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [findingLogos, setFindingLogos] = useState(false);
  const [logoProgress, setLogoProgress] = useState<{ done: number; total: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [multiSelect, setMultiSelect] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === brands.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(brands.map((b: any) => b.id)));
    }
  };

  const bulkFeatured = useMutation({
    mutationFn: async (featured: boolean) => {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        const { error } = await supabase.from("brands").update({ featured }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-brands"] });
      toast.success("Updated");
      setSelectedIds(new Set());
      setMultiSelect(false);
    },
    onError: (e) => toast.error(e.message),
  });

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
      const payload = { name: f.name, slug: f.slug || f.name.toLowerCase().replace(/\s+/g, "-"), logo_url: f.logo_url || null, country_of_origin: f.country_of_origin || null, featured: f.featured };
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

  const handleFindMissingLogos = async () => {
    const missing = brands.filter((b: any) => !b.logo_url);
    if (missing.length === 0) { toast.info("All brands already have logos"); return; }
    if (!confirm(`Search for logos for ${missing.length} brands without logos?`)) return;

    setFindingLogos(true);
    const BATCH_SIZE = 5;
    let totalSuccess = 0;
    let totalFail = 0;
    const ids = missing.map((b: any) => b.id);

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      setLogoProgress({ done: i, total: ids.length });

      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-brand-logos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ brand_ids: batch }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          toast.error(`Logo search failed: ${err.error || resp.statusText}`);
          totalFail += batch.length;
          continue;
        }

        const result = await resp.json();
        totalSuccess += result.succeeded || 0;
        totalFail += result.failed || 0;
      } catch (err) {
        console.error("Logo search error:", err);
        totalFail += batch.length;
      }

      if (i + BATCH_SIZE < ids.length) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    setLogoProgress(null);
    setFindingLogos(false);
    qc.invalidateQueries({ queryKey: ["admin-brands"] });
    toast.success(`Logo search complete: ${totalSuccess} found, ${totalFail} failed`);
  };

  const brandsWithoutLogos = brands.filter((b: any) => !b.logo_url).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Brands</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{brands.length} brands{brandsWithoutLogos > 0 && ` · ${brandsWithoutLogos} without logos`}</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={handleFindMissingLogos}
            disabled={findingLogos || brandsWithoutLogos === 0}
          >
            {findingLogos ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
            Find Logos
          </Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setEditing(false); } }}>
            <DialogTrigger asChild><Button size="sm" className="rounded-xl"><Plus className="h-4 w-4 mr-1.5" />Add</Button></DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>{editing ? "Edit Brand" : "Add Brand"}</DialogTitle></DialogHeader>
              <div className="grid gap-3 mt-2">
                <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Slug</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated" /></div>
                <div><Label>Logo URL</Label><Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} /></div>
                <div><Label>Country of Origin</Label><Input value={form.country_of_origin} onChange={(e) => setForm({ ...form, country_of_origin: e.target.value })} placeholder="e.g. France, South Korea" /></div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="featured" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="h-4 w-4 rounded border-border accent-primary" />
                  <Label htmlFor="featured">Featured on Homepage</Label>
                </div>
                <Button className="rounded-xl" onClick={() => save.mutate(form)} disabled={!form.name || save.isPending}>
                  {save.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}{editing ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {findingLogos && logoProgress && (
        <div className="mb-4 p-3 bg-primary/5 rounded-xl border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium text-foreground">
              Finding logos... {logoProgress.done}/{logoProgress.total}
            </span>
          </div>
          <Progress value={(logoProgress.done / logoProgress.total) * 100} className="h-1.5" />
        </div>
      )}

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
              {b.featured && <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">FEATURED</span>}
              {b.country_of_origin && <p className="text-[10px] text-muted-foreground">{b.country_of_origin}</p>}
              <p className="text-[10px] text-muted-foreground">{b.slug}</p>
              <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => {
                  setForm({ id: b.id, name: b.name, slug: b.slug, logo_url: b.logo_url || "", country_of_origin: b.country_of_origin || "", featured: b.featured || false });
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
