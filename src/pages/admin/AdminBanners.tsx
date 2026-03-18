import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2, ImageIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";

interface BannerForm { id?: string; title: string; subtitle: string; image_url: string; image_url_ar: string; image_url_ku: string; link_url: string; is_active: boolean; sort_order: number; }
const emptyForm: BannerForm = { title: "", subtitle: "", image_url: "", image_url_ar: "", image_url_ku: "", link_url: "", is_active: true, sort_order: 0 };

export default function AdminBanners() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "webp";
    const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    // Show local preview immediately
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);

    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, image_url: url }));
      toast.success("Image uploaded!");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setForm((f) => ({ ...f, image_url: "" }));
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = useMutation({
    mutationFn: async (f: BannerForm) => {
      const payload = { title: f.title || null, subtitle: f.subtitle || null, image_url: f.image_url, image_url_ar: f.image_url_ar || null, image_url_ku: f.image_url_ku || null, link_url: f.link_url || null, is_active: f.is_active, sort_order: f.sort_order };
      if (f.id) {
        const { error } = await supabase.from("banners").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("banners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      qc.invalidateQueries({ queryKey: ["banners"] });
      toast.success("Saved");
      setOpen(false);
      setForm(emptyForm);
      setEditing(false);
      setPreviewUrl(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("banners").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-banners"] }); toast.success("Deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const openDialog = (banner?: any) => {
    if (banner) {
      setForm({ id: banner.id, title: banner.title || "", subtitle: banner.subtitle || "", image_url: banner.image_url, image_url_ar: banner.image_url_ar || "", image_url_ku: banner.image_url_ku || "", link_url: banner.link_url || "", is_active: banner.is_active ?? true, sort_order: banner.sort_order || 0 });
      setPreviewUrl(banner.image_url);
      setEditing(true);
    } else {
      setForm(emptyForm);
      setPreviewUrl(null);
      setEditing(false);
    }
    setOpen(true);
  };

  const displayPreview = previewUrl || form.image_url;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Banners</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{banners.length} banners</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setEditing(false); setPreviewUrl(null); } }}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl" onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-1.5" />Add
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Banner" : "Add Banner"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 mt-2">
              {/* Image upload area */}
              <div>
                <Label className="mb-2 block">Banner Image *</Label>
                {displayPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-border bg-muted">
                    <img src={displayPreview} alt="Preview" className="w-full h-48 object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg shadow-md" onClick={() => fileRef.current?.click()}>
                        <Upload className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg shadow-md" onClick={clearImage}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    {uploading && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-48 rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-muted/30 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer"
                  >
                    {uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-muted-foreground">Click to upload image</p>
                        <p className="text-[10px] text-muted-foreground/60">PNG, JPG, WebP · Max 5MB · 1200×400px recommended</p>
                      </>
                    )}
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label>Subtitle</Label>
                  <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="rounded-xl mt-1" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Link URL</Label>
                  <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/category/skincare" className="rounded-xl mt-1" />
                </div>
                <div>
                  <Label>Sort Order</Label>
                  <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: +e.target.value })} className="rounded-xl mt-1" />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /> Active
              </label>

              <Button className="rounded-xl" onClick={() => save.mutate(form)} disabled={!form.image_url || save.isPending || uploading}>
                {save.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {editing ? "Update Banner" : "Create Banner"}
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
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl" onClick={() => openDialog(b)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/5" onClick={() => { if (confirm("Delete?")) del.mutate(b.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
