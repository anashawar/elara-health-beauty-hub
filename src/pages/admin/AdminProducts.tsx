import { useState } from "react";
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
import { Plus, Pencil, Trash2, Search, Loader2 } from "lucide-react";
import { formatPrice, useCategories, useBrands } from "@/hooks/useProducts";
import { toast } from "sonner";

interface ProductForm {
  id?: string;
  title: string;
  slug: string;
  price: number;
  original_price: number | null;
  description: string;
  category_id: string;
  brand_id: string;
  is_new: boolean;
  is_trending: boolean;
  is_pick: boolean;
  volume_ml: string;
  skin_type: string;
  country_of_origin: string;
}

const emptyForm: ProductForm = {
  title: "", slug: "", price: 0, original_price: null, description: "",
  category_id: "", brand_id: "", is_new: false, is_trending: false, is_pick: false,
  volume_ml: "", skin_type: "", country_of_origin: "",
};

export default function AdminProducts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editing, setEditing] = useState(false);

  const { data: categories = [] } = useCategories();
  const { data: brands = [] } = useBrands();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, brands(name), categories(name), product_images(image_url)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: ProductForm) => {
      const payload = {
        title: f.title,
        slug: f.slug || f.title.toLowerCase().replace(/\s+/g, "-"),
        price: f.price,
        original_price: f.original_price || null,
        description: f.description || null,
        category_id: f.category_id || null,
        brand_id: f.brand_id || null,
        is_new: f.is_new,
        is_trending: f.is_trending,
        is_pick: f.is_pick,
        volume_ml: f.volume_ml || null,
        skin_type: f.skin_type || null,
        country_of_origin: f.country_of_origin || null,
      };
      if (f.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(editing ? "Product updated" : "Product created");
      setOpen(false);
      setForm(emptyForm);
      setEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
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

  const filtered = products.filter((p: any) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (p: any) => {
    setForm({
      id: p.id, title: p.title, slug: p.slug, price: p.price,
      original_price: p.original_price, description: p.description || "",
      category_id: p.category_id || "", brand_id: p.brand_id || "",
      is_new: p.is_new || false, is_trending: p.is_trending || false, is_pick: p.is_pick || false,
      volume_ml: p.volume_ml || "", skin_type: p.skin_type || "", country_of_origin: p.country_of_origin || "",
    });
    setEditing(true);
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold text-foreground">Products</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(emptyForm); setEditing(false); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Volume (ml)</Label>
                  <Input value={form.volume_ml} onChange={(e) => setForm({ ...form, volume_ml: e.target.value })} />
                </div>
                <div>
                  <Label>Skin Type</Label>
                  <Input value={form.skin_type} onChange={(e) => setForm({ ...form, skin_type: e.target.value })} />
                </div>
                <div>
                  <Label>Origin</Label>
                  <Input value={form.country_of_origin} onChange={(e) => setForm({ ...form, country_of_origin: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-6">
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
              <Button onClick={() => saveMutation.mutate(form)} disabled={!form.title || !form.price || saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                {editing ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                      {p.product_images?.[0]?.image_url && (
                        <img src={p.product_images[0].image_url} className="w-10 h-10 rounded-lg object-cover" alt="" />
                      )}
                      <div>
                        <p className="font-medium text-sm text-foreground line-clamp-1">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.brands?.name}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.categories?.name || "—"}</TableCell>
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
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No products found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
