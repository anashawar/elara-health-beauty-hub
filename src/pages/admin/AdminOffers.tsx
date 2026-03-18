import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Search, Percent, Tag, Eye, EyeOff, Image as ImageIcon, Upload } from "lucide-react";
import { useBrands, useCategories, useProducts, formatPrice } from "@/hooks/useProducts";
import { toast } from "sonner";
import { format } from "date-fns";

interface OfferForm {
  id?: string;
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  image_url_ar: string;
  image_url_ku: string;
  discount_type: string;
  discount_value: number;
  target_type: string;
  target_id: string;
  target_name: string;
  link_url: string;
  banner_style: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
}

const emptyForm: OfferForm = {
  title: "", subtitle: "", description: "", image_url: "",
  image_url_ar: "", image_url_ku: "",
  discount_type: "percentage", discount_value: 0,
  target_type: "all", target_id: "", target_name: "", link_url: "",
  banner_style: "none", is_active: true, starts_at: "", ends_at: "",
};

const BUCKET = "product-images";

export default function AdminOffers() {
  const qc = useQueryClient();
  const [form, setForm] = useState<OfferForm>(emptyForm);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: brands = [] } = useBrands();
  const { data: categories = [] } = useCategories();
  const { data: allProducts = [] } = useProducts();
  const [productSearch, setProductSearch] = useState("");

  const { data: offers = [], isLoading } = useQuery({
    queryKey: ["admin-offers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .order("sort_order")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(false);
    setOpen(false);
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `offers/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async (f: OfferForm) => {
      setUploading(true);
      let imageUrl = f.image_url;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const payload: any = {
        title: f.title,
        subtitle: f.subtitle || null,
        description: f.description || null,
        image_url: imageUrl || null,
        image_url_ar: f.image_url_ar || null,
        image_url_ku: f.image_url_ku || null,
        discount_type: f.discount_type,
        discount_value: f.discount_value,
        target_type: f.target_type,
        target_id: f.target_id && !f.target_id.includes(",") ? f.target_id : null,
        target_name: f.target_name || null,
        link_url: f.link_url || null,
        banner_style: f.banner_style,
        is_active: f.is_active,
        starts_at: f.starts_at || null,
        ends_at: f.ends_at || null,
      };

      if (f.id) {
        const { error } = await supabase.from("offers").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("offers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setUploading(false);
      qc.invalidateQueries({ queryKey: ["admin-offers"] });
      qc.invalidateQueries({ queryKey: ["active-offers-gallery"] });
      qc.invalidateQueries({ queryKey: ["active-offers-hero"] });
      qc.invalidateQueries({ queryKey: ["active-offers-pricing"] });
      qc.invalidateQueries({ queryKey: ["today-offers-slider"] });
      toast.success(editing ? "Offer updated" : "Offer created");
      resetForm();
    },
    onError: (e) => { setUploading(false); toast.error(e.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("offers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-offers"] });
      qc.invalidateQueries({ queryKey: ["active-offers-gallery"] });
      qc.invalidateQueries({ queryKey: ["active-offers-hero"] });
      qc.invalidateQueries({ queryKey: ["active-offers-pricing"] });
      toast.success("Offer deleted");
    },
  });

  const openEdit = (o: any) => {
    setForm({
      id: o.id,
      title: o.title,
      subtitle: o.subtitle || "",
      description: o.description || "",
      image_url: o.image_url || "",
      discount_type: o.discount_type,
      discount_value: o.discount_value,
      target_type: o.target_type,
      target_id: o.target_id || "",
      target_name: o.target_name || "",
      link_url: o.link_url || "",
      banner_style: o.banner_style || "none",
      is_active: o.is_active,
      starts_at: o.starts_at ? o.starts_at.split("T")[0] : "",
      ends_at: o.ends_at ? o.ends_at.split("T")[0] : "",
    });
    if (o.image_url) setImagePreview(o.image_url);
    setEditing(true);
    setOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Auto-fill target_name when selecting a target
  const handleTargetChange = (targetId: string) => {
    let name = "";
    if (form.target_type === "brand") {
      const brand = brands.find((b: any) => b.id === targetId);
      name = brand?.name || "";
    } else if (form.target_type === "category") {
      const cat = categories.find((c: any) => c.id === targetId);
      name = cat?.name || "";
    }
    setForm({ ...form, target_id: targetId, target_name: name });
  };

  const filtered = offers.filter((o: any) =>
    o.title.toLowerCase().includes(search.toLowerCase())
  );

  const targetTypeOptions = [
    { value: "all", label: "All Products" },
    { value: "brand", label: "Specific Brand" },
    { value: "category", label: "Specific Category" },
    { value: "product", label: "Specific Product" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Discounts & Offers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{offers.length} offers</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />New Offer</Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Offer" : "Create New Offer"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 mt-2">
              <div>
                <Label>Offer Name *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Summer Sale 30% Off" />
              </div>
              <div>
                <Label>Subtitle</Label>
                <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="e.g. Limited time only" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details about this offer..." />
              </div>

              {/* Banner Image */}
              <div>
                <Label className="mb-2 block">Banner Image</Label>
                {imagePreview ? (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden border border-border bg-muted">
                    <img src={imagePreview} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => { setImageFile(null); setImagePreview(null); setForm({ ...form, image_url: "" }); }} className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-28 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Upload banner image</span>
                    <span className="text-[10px] text-muted-foreground/70 mt-0.5">📐 1200×400px · PNG/WebP · Max 500KB</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>

              {/* Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Discount Type</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (IQD)</SelectItem>
                      <SelectItem value="bogo">Buy One Get One</SelectItem>
                      <SelectItem value="bundle">Bundle Deal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: +e.target.value })} placeholder={form.discount_type === "percentage" ? "e.g. 30" : "e.g. 5000"} />
                </div>
              </div>

              {/* Target */}
              <div>
                <Label>Applies To</Label>
                <Select value={form.target_type} onValueChange={(v) => setForm({ ...form, target_type: v, target_id: "", target_name: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {targetTypeOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {form.target_type === "brand" && (
                <div>
                  <Label>Select Brand</Label>
                  <Select value={form.target_id} onValueChange={handleTargetChange}>
                    <SelectTrigger><SelectValue placeholder="Choose brand" /></SelectTrigger>
                    <SelectContent>
                      {brands.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.target_type === "category" && (
                <div>
                  <Label>Select Category</Label>
                  <Select value={form.target_id} onValueChange={handleTargetChange}>
                    <SelectTrigger><SelectValue placeholder="Choose category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.target_type === "product" && (
                <div>
                  <Label>Search & Select Products</Label>
                  <Input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Type product name to search..."
                  />
                  {productSearch.length >= 2 && (
                    <div className="mt-1 max-h-48 overflow-y-auto border border-border rounded-xl bg-card shadow-lg">
                      {allProducts
                        .filter((p: any) => {
                          const selectedIds = form.target_id ? form.target_id.split(",") : [];
                          if (selectedIds.includes(p.id)) return false;
                          return p.title.toLowerCase().includes(productSearch.toLowerCase()) || p.brand?.toLowerCase().includes(productSearch.toLowerCase());
                        })
                        .slice(0, 10)
                        .map((p: any) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              const ids = form.target_id ? form.target_id.split(",").filter(Boolean) : [];
                              const names = form.target_name ? form.target_name.split("||").filter(Boolean) : [];
                              ids.push(p.id);
                              names.push(p.title);
                              setForm({ ...form, target_id: ids.join(","), target_name: names.join("||") });
                              setProductSearch("");
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary transition-colors text-left border-b border-border/30 last:border-0"
                          >
                            <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-secondary flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{p.title}</p>
                              <p className="text-[10px] text-muted-foreground">{p.brand} · {formatPrice(p.price)}</p>
                            </div>
                          </button>
                        ))}
                      {allProducts.filter((p: any) => p.title.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                        <p className="text-xs text-muted-foreground p-3 text-center">No products found</p>
                      )}
                    </div>
                  )}
                  {/* Selected products chips */}
                  {form.target_id && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.target_id.split(",").filter(Boolean).map((pid, idx) => {
                        const names = form.target_name ? form.target_name.split("||") : [];
                        const name = names[idx] || allProducts.find((p: any) => p.id === pid)?.title || pid.slice(0, 8);
                        return (
                          <span key={pid} className="inline-flex items-center gap-1 text-[11px] font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
                            {name}
                            <button
                              type="button"
                              onClick={() => {
                                const ids = form.target_id.split(",").filter(Boolean).filter(id => id !== pid);
                                const updatedNames = names.filter((_, i) => i !== idx);
                                setForm({ ...form, target_id: ids.join(","), target_name: updatedNames.join("||") });
                              }}
                              className="hover:text-destructive ml-0.5"
                            >×</button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Link URL */}
              <div>
                <Label>Link URL <span className="text-muted-foreground font-normal">(where banner clicks go)</span></Label>
                <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="e.g. /category/skincare or /collection/offers" />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <span className={form.is_active ? "text-emerald-600 font-medium" : "text-muted-foreground"}>Active</span>
                </label>
                <div>
                  <Label>Show on Home Page</Label>
                  <Select value={form.banner_style} onValueChange={(v) => setForm({ ...form, banner_style: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Don't show on home</SelectItem>
                      <SelectItem value="hero">Main Hero Banner (full-width, big)</SelectItem>
                      <SelectItem value="gallery">Gallery Banner (carousel with others)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={() => saveMutation.mutate(form)} disabled={!form.title || saveMutation.isPending || uploading}>
                {(saveMutation.isPending || uploading) && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {editing ? "Update Offer" : "Create Offer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search offers..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o: any) => {
            const isExpired = o.ends_at && new Date(o.ends_at) < new Date();
            return (
              <div key={o.id} className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-premium transition-shadow">
                <div className="flex">
                  {/* Image thumbnail */}
                  {o.image_url ? (
                    <div className="w-24 md:w-32 flex-shrink-0">
                      <img src={o.image_url} className="w-full h-full object-cover" alt="" />
                    </div>
                  ) : (
                    <div className="w-24 md:w-32 flex-shrink-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Percent className="w-8 h-8 text-primary/40" />
                    </div>
                  )}

                  <div className="flex-1 p-4 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-foreground truncate">{o.title}</h3>
                          {o.is_active && !isExpired ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">Active</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">{isExpired ? "Expired" : "Inactive"}</Badge>
                          )}
                          {o.banner_style === "hero" && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Hero Banner</Badge>
                          )}
                          {o.banner_style === "gallery" && (
                            <Badge className="bg-accent text-accent-foreground border-border text-[10px]">Gallery Banner</Badge>
                          )}
                        </div>
                        {o.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{o.subtitle}</p>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(o)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Delete this offer?")) deleteMutation.mutate(o.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary rounded-lg font-medium">
                        <Percent className="w-3 h-3" />
                        {o.discount_type === "percentage" ? `${o.discount_value}%` : o.discount_type === "fixed" ? formatPrice(o.discount_value) : o.discount_type === "bogo" ? "BOGO" : "Bundle"}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary rounded-lg">
                        <Tag className="w-3 h-3" />
                        {o.target_type === "all" ? "All Products" : o.target_name || o.target_type}
                      </span>
                      {o.ends_at && (
                        <span className={isExpired ? "text-red-500" : ""}>
                          {isExpired ? "Ended" : "Ends"} {format(new Date(o.ends_at), "MMM d, yyyy")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
              <Percent className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No offers yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">Create your first discount or promotional offer</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
