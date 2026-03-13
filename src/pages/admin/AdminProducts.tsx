import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Search, Loader2, Upload, X, ImageIcon, Languages, FileSpreadsheet } from "lucide-react";
import { formatPrice, useCategories, useBrands, useSubcategories } from "@/hooks/useProducts";
import { toast } from "sonner";
import BulkImportDialog, { ColumnMapping } from "@/components/admin/BulkImportDialog";

interface ProductForm {
  id?: string;
  title: string;
  slug: string;
  price: number;
  original_price: number | null;
  cost: number | null;
  description: string;
  usage_instructions: string;
  benefits: string;
  category_id: string;
  subcategory_id: string;
  brand_id: string;
  is_new: boolean;
  is_trending: boolean;
  is_pick: boolean;
  in_stock: boolean;
  volume_ml: string;
  volume_unit: string;
  skin_type: string;
  country_of_origin: string;
  condition: string;
}

const emptyForm: ProductForm = {
  title: "", slug: "", price: 0, original_price: null, cost: null, description: "",
  usage_instructions: "", benefits: "",
  category_id: "", subcategory_id: "", brand_id: "", is_new: false, is_trending: false, is_pick: false, in_stock: true,
  volume_ml: "", volume_unit: "ml", skin_type: "", country_of_origin: "", condition: "",
};

const BUCKET = "product-images";

function getPublicUrl(path: string) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export default function AdminProducts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editing, setEditing] = useState(false);

  // Image state
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [additionalPreviews, setAdditionalPreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<{ id: string; image_url: string; sort_order: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [translating, setTranslating] = useState(false);

  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();
  const { data: allSubcategories = [] } = useSubcategories();

  // Filter subcategories by selected category
  const filteredSubcategories = useMemo(() => {
    if (!form.category_id) return [];
    return allSubcategories.filter(s => s.category_id === form.category_id);
  }, [form.category_id, allSubcategories]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, brands(name), categories(name), product_images(id, image_url, sort_order), subcategories(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const uploadImage = async (file: File, productId: string, sortOrder: number): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${productId}/${Date.now()}-${sortOrder}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (error) throw error;
    return getPublicUrl(path);
  };

  const saveMutation = useMutation({
    mutationFn: async (f: ProductForm) => {
      setUploading(true);
      const benefitsArray = f.benefits.trim() ? f.benefits.split("\n").map(b => b.trim()).filter(Boolean) : null;
      const payload: any = {
        title: f.title,
        slug: f.slug || f.title.toLowerCase().replace(/\s+/g, "-"),
        price: f.price,
        original_price: f.original_price || null,
        description: f.description || null,
        usage_instructions: f.usage_instructions || null,
        benefits: benefitsArray,
        category_id: f.category_id || null,
        subcategory_id: f.subcategory_id || null,
        brand_id: f.brand_id || null,
        is_new: f.is_new,
        is_trending: f.is_trending,
        is_pick: f.is_pick,
        in_stock: f.in_stock,
        volume_ml: f.volume_ml || null,
        volume_unit: f.volume_unit || "ml",
        skin_type: f.skin_type || null,
        country_of_origin: f.country_of_origin || null,
        condition: f.condition || null,
      };

      let productId = f.id;

      if (f.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }

      // Save cost in separate admin-only table
      if (productId && f.cost !== null && f.cost !== undefined) {
        await supabase.from("product_costs").upsert({ product_id: productId, cost: f.cost }, { onConflict: "product_id" });
      }

      // Upload main image
      if (mainImage && productId) {
        const url = await uploadImage(mainImage, productId, 0);
        await supabase.from("product_images").insert({ product_id: productId, image_url: url, sort_order: 0 });
      }

      // Upload additional images
      if (additionalImages.length > 0 && productId) {
        const startOrder = (existingImages.length > 0 ? Math.max(...existingImages.map(i => i.sort_order)) : 0) + 1;
        for (let i = 0; i < additionalImages.length; i++) {
          const url = await uploadImage(additionalImages[i], productId, startOrder + i);
          await supabase.from("product_images").insert({ product_id: productId, image_url: url, sort_order: startOrder + i });
        }
      }

      // Auto-translate in background
      if (productId) {
        try {
          setTranslating(true);
          const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-product`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ product_id: productId }),
          });
          if (resp.ok) {
            toast.success("Translations generated (AR & KU)");
          } else {
            const errData = await resp.json().catch(() => ({}));
            console.error("Translation error:", errData);
            toast.error("Translation failed: " + (errData.error || resp.statusText));
          }
        } catch (err) {
          console.error("Translation failed:", err);
        } finally {
          setTranslating(false);
        }
      }
    },
    onSuccess: () => {
      setUploading(false);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(editing ? "Product updated" : "Product created");
      resetForm();
    },
    onError: (e) => { setUploading(false); toast.error(e.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: imgs } = await supabase.from("product_images").select("id, image_url").eq("product_id", id);
      if (imgs && imgs.length > 0) {
        await supabase.from("product_images").delete().eq("product_id", id);
      }
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteExistingImage = async (imgId: string) => {
    const { error } = await supabase.from("product_images").delete().eq("id", imgId);
    if (error) { toast.error(error.message); return; }
    setExistingImages(prev => prev.filter(i => i.id !== imgId));
    toast.success("Image removed");
  };

  const resetForm = () => {
    setOpen(false);
    setForm(emptyForm);
    setEditing(false);
    setMainImage(null);
    setMainImagePreview(null);
    setAdditionalImages([]);
    setAdditionalPreviews([]);
    setExistingImages([]);
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainImage(file);
      setMainImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const maxNew = 10 - existingImages.length - additionalImages.length;
    const toAdd = files.slice(0, maxNew);
    setAdditionalImages(prev => [...prev, ...toAdd]);
    setAdditionalPreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))]);
  };

  const removeAdditional = (idx: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== idx));
    setAdditionalPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const filtered = products.filter((p: any) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = async (p: any) => {
    // Fetch cost from separate admin-only table
    let cost: number | null = null;
    const { data: costData } = await supabase.from("product_costs").select("cost").eq("product_id", p.id).maybeSingle();
    if (costData) cost = Number(costData.cost);

    setForm({
      id: p.id, title: p.title, slug: p.slug, price: p.price,
      original_price: p.original_price, cost, description: p.description || "",
      usage_instructions: p.usage_instructions || "",
      benefits: (p.benefits || []).join("\n"),
      category_id: p.category_id || "", subcategory_id: p.subcategory_id || "",
      brand_id: p.brand_id || "",
      is_new: p.is_new || false, is_trending: p.is_trending || false, is_pick: p.is_pick || false, in_stock: p.in_stock !== false,
      volume_ml: p.volume_ml || "", volume_unit: p.volume_unit || "ml", skin_type: p.skin_type || "", country_of_origin: p.country_of_origin || "",
      condition: (p as any).condition || "",
    });
    const sorted = [...(p.product_images || [])].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    setExistingImages(sorted);
    if (sorted.length > 0) {
      setMainImagePreview(sorted[0].image_url);
    }
    setEditing(true);
    setOpen(true);
  };

  const productBulkColumns: ColumnMapping[] = [
    { key: "title", label: "title", required: true, example: "Vitamin C Serum" },
    { key: "price", label: "price", required: true, example: "25000" },
    { key: "original_price", label: "original_price", example: "30000" },
    { key: "description", label: "description", example: "A brightening serum..." },
    { key: "category", label: "category", example: "Skincare" },
    { key: "subcategory", label: "subcategory", example: "Serums" },
    { key: "brand", label: "brand", example: "CeraVe" },
    { key: "volume_ml", label: "volume_ml", example: "30" },
    { key: "skin_type", label: "skin_type", example: "All" },
    { key: "country_of_origin", label: "country_of_origin", example: "France" },
    { key: "condition", label: "condition", example: "acne,dryskin" },
    { key: "benefits", label: "benefits", example: "Hydrates skin|Brightens complexion" },
    { key: "usage_instructions", label: "usage_instructions", example: "Apply morning and evening" },
    { key: "is_new", label: "is_new", example: "true" },
    { key: "is_trending", label: "is_trending", example: "false" },
    { key: "is_pick", label: "is_pick", example: "false" },
  ];

  const handleBulkImport = async (rows: Record<string, string>[]) => {
    let success = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // header is row 1
      try {
        if (!row.title || !row.price) {
          errors.push(`Row ${rowNum}: Missing title or price`);
          continue;
        }

        // Resolve category by name
        let category_id: string | null = null;
        if (row.category) {
          const cat = categories.find((c: any) => c.name.toLowerCase() === row.category.toLowerCase());
          if (cat) category_id = cat.id;
        }

        // Resolve subcategory by name
        let subcategory_id: string | null = null;
        if (row.subcategory && category_id) {
          const sub = allSubcategories.find(
            (s: any) => s.name.toLowerCase() === row.subcategory.toLowerCase() && s.category_id === category_id
          );
          if (sub) subcategory_id = sub.id;
        }

        // Resolve brand by name
        let brand_id: string | null = null;
        if (row.brand) {
          const br = brands.find((b: any) => b.name.toLowerCase() === row.brand.toLowerCase());
          if (br) brand_id = br.id;
        }

        const benefitsArray = row.benefits ? row.benefits.split("|").map((b) => b.trim()).filter(Boolean) : null;
        const toBool = (v: string) => v?.toLowerCase() === "true" || v === "1";

        const payload = {
          title: row.title,
          slug: row.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          price: parseFloat(row.price),
          original_price: row.original_price ? parseFloat(row.original_price) : null,
          description: row.description || null,
          usage_instructions: row.usage_instructions || null,
          benefits: benefitsArray,
          category_id,
          subcategory_id,
          brand_id,
          volume_ml: row.volume_ml || null,
          skin_type: row.skin_type || null,
          country_of_origin: row.country_of_origin || null,
          condition: row.condition || null,
          is_new: toBool(row.is_new),
          is_trending: toBool(row.is_trending),
          is_pick: toBool(row.is_pick),
        };

        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        success++;
      } catch (err: any) {
        errors.push(`Row ${rowNum} (${row.title || "?"}): ${err.message}`);
      }
    }

    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    return { success, errors };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold text-foreground">Products</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />Bulk Import
          </Button>
          <BulkImportDialog
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            title="Products"
            columns={productBulkColumns}
            onImport={handleBulkImport}
          />
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 mt-2">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price (IQD) *</Label>
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} />
                </div>
                <div>
                  <Label>Original Price</Label>
                  <Input type="number" value={form.original_price ?? ""} onChange={(e) => setForm({ ...form, original_price: e.target.value ? +e.target.value : null })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v, subcategory_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subcategory</Label>
                  <Select
                    value={form.subcategory_id}
                    onValueChange={(v) => setForm({ ...form, subcategory_id: v })}
                    disabled={!form.category_id || filteredSubcategories.length === 0}
                  >
                    <SelectTrigger><SelectValue placeholder={!form.category_id ? "Select category first" : "Select"} /></SelectTrigger>
                    <SelectContent>
                      {filteredSubcategories.map((s: any) => (
                        <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Brand</Label>
                <Select value={form.brand_id} onValueChange={(v) => setForm({ ...form, brand_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {brands.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label>Benefits <span className="text-muted-foreground font-normal">(one per line)</span></Label>
                <Textarea rows={3} placeholder="Hydrates skin deeply&#10;Reduces fine lines&#10;Brightens complexion" value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} />
              </div>
              <div>
                <Label>How to Use</Label>
                <Textarea rows={3} placeholder="Apply a small amount to clean, dry skin morning and evening..." value={form.usage_instructions} onChange={(e) => setForm({ ...form, usage_instructions: e.target.value })} />
              </div>

              {/* Main Image */}
              <div>
                <Label className="mb-2 block">Main Image</Label>
                {mainImagePreview ? (
                  <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border bg-muted">
                    <img src={mainImagePreview} className="w-full h-full object-cover" alt="Main" />
                    {!editing || mainImage ? (
                      <button onClick={() => { setMainImage(null); setMainImagePreview(null); }} className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground mb-1.5" />
                    <span className="text-sm text-muted-foreground">Click to upload main image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleMainImageChange} />
                  </label>
                )}
              </div>

              {/* Additional Images */}
              <div>
                <Label className="mb-2 block">Additional Images <span className="text-muted-foreground font-normal">(up to 10)</span></Label>
                <div className="grid grid-cols-4 gap-2">
                  {existingImages.slice(editing ? 1 : 0).map((img) => (
                    <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group">
                      <img src={img.image_url} className="w-full h-full object-cover" alt="" />
                      <button onClick={() => deleteExistingImage(img.id)} className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {additionalPreviews.map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group">
                      <img src={url} className="w-full h-full object-cover" alt="" />
                      <button onClick={() => removeAdditional(idx)} className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {(existingImages.length - (editing ? 1 : 0) + additionalImages.length) < 10 && (
                    <label className="aspect-square rounded-lg border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground mt-0.5">Add</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleAdditionalImagesChange} />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <Label>Skin Concerns <span className="text-muted-foreground font-normal">(multi-select)</span></Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { value: "acne", label: "🎯 Acne" },
                    { value: "dryskin", label: "💧 Dry Skin" },
                    { value: "hyperpigmentation", label: "🌟 Hyperpigmentation" },
                    { value: "hairloss", label: "💇 Hair Loss" },
                    { value: "dandruff", label: "❄️ Dandruff" },
                    { value: "sensitive", label: "🌸 Sensitive Skin" },
                    { value: "immunity", label: "🛡️ Immunity" },
                    { value: "weightloss", label: "⚡ Weight Loss" },
                  ].map(c => {
                    const selected = (form.condition || "").split(",").map(s => s.trim()).filter(Boolean);
                    const isSelected = selected.includes(c.value);
                    return (
                      <label key={c.value} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors text-sm ${
                        isSelected ? "bg-primary/10 border-primary/30 text-primary font-medium" : "border-border hover:bg-secondary"
                      }`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            const newSelected = isSelected
                              ? selected.filter(s => s !== c.value)
                              : [...selected, c.value];
                            setForm({ ...form, condition: newSelected.join(",") });
                          }}
                          className="sr-only"
                        />
                        {c.label}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Volume (ml)</Label>
                  <Input value={form.volume_ml} onChange={(e) => setForm({ ...form, volume_ml: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Skin Type</Label>
                <Input value={form.skin_type} onChange={(e) => setForm({ ...form, skin_type: e.target.value })} />
              </div>
              <div className="flex items-center gap-6 flex-wrap">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.in_stock} onCheckedChange={(v) => setForm({ ...form, in_stock: v })} />
                  <span className={form.in_stock ? "text-sage font-medium" : "text-destructive font-medium"}>{form.in_stock ? "In Stock" : "Out of Stock"}</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.is_new} onCheckedChange={(v) => setForm({ ...form, is_new: v })} /> New
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.is_trending} onCheckedChange={(v) => setForm({ ...form, is_trending: v })} /> Trending
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.is_pick} onCheckedChange={(v) => setForm({ ...form, is_pick: v })} /> Staff Pick
                </label>
              </div>
              <Button onClick={() => saveMutation.mutate(form)} disabled={!form.title || !form.price || saveMutation.isPending || uploading || translating}>
                {(saveMutation.isPending || uploading) && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {translating ? <><Languages className="h-4 w-4 mr-1.5 animate-pulse" />Translating...</> : editing ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead className="hidden md:table-cell">Subcategory</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="hidden md:table-cell">Flags</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.product_images?.[0]?.image_url ? (
                        <img src={p.product_images[0].image_url} className="w-10 h-10 rounded-lg object-cover" alt="" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                      )}
                      <div>
                        <p className="font-medium text-sm text-foreground line-clamp-1">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.brands?.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.categories?.name || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.subcategories?.name || "—"}</TableCell>
                  <TableCell className="text-sm font-medium">{formatPrice(p.price)}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex gap-1">
                      {p.is_new && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">New</span>}
                      {p.is_trending && <span className="text-[10px] bg-rose/10 text-rose px-1.5 py-0.5 rounded-full">Trend</span>}
                      {p.is_pick && <span className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded-full">Pick</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                        if (confirm("Delete this product?")) deleteMutation.mutate(p.id);
                      }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No products found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
