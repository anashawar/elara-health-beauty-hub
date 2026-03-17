import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight, FileSpreadsheet, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { useCategories, useSubcategories } from "@/hooks/useProducts";
import BulkImportDialog, { ColumnMapping } from "@/components/admin/BulkImportDialog";

interface CatForm { id?: string; name: string; slug: string; icon: string; color: string; sort_order: number; }
const emptyCatForm: CatForm = { name: "", slug: "", icon: "", color: "", sort_order: 0 };

interface SubForm { id?: string; category_id: string; name: string; slug: string; icon: string; sort_order: number; }
const emptySubForm: SubForm = { category_id: "", name: "", slug: "", icon: "", sort_order: 0 };

export default function AdminCategories() {
  const qc = useQueryClient();
  const [catOpen, setCatOpen] = useState(false);
  const [catForm, setCatForm] = useState<CatForm>(emptyCatForm);
  const [catEditing, setCatEditing] = useState(false);

  const [subOpen, setSubOpen] = useState(false);
  const [subForm, setSubForm] = useState<SubForm>(emptySubForm);
  const [subEditing, setSubEditing] = useState(false);

  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [bulkCatOpen, setBulkCatOpen] = useState(false);
  const [bulkSubOpen, setBulkSubOpen] = useState(false);

  const { data: categories = [], isLoading } = useCategories();
  const { data: subcategories = [] } = useSubcategories();

  const catBulkColumns: ColumnMapping[] = [
    { key: "name", label: "name", required: true, example: "Skincare" },
    { key: "slug", label: "slug", example: "skincare" },
    { key: "icon", label: "icon", example: "✨" },
    { key: "color", label: "color", example: "#f5e6d3" },
    { key: "sort_order", label: "sort_order", example: "1" },
  ];

  const subBulkColumns: ColumnMapping[] = [
    { key: "name", label: "name", required: true, example: "Serums" },
    { key: "category", label: "category", required: true, example: "Skincare" },
    { key: "slug", label: "slug", example: "serums" },
    { key: "icon", label: "icon", example: "💧" },
    { key: "sort_order", label: "sort_order", example: "1" },
  ];

  const handleBulkCatImport = async (rows: Record<string, string>[]) => {
    let success = 0;
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.name) { errors.push(`Row ${i + 2}: Missing name`); continue; }
        const { error } = await supabase.from("categories").insert({
          name: row.name,
          slug: row.slug || row.name.toLowerCase().replace(/\s+/g, "-"),
          icon: row.icon || null,
          color: row.color || null,
          sort_order: row.sort_order ? parseInt(row.sort_order) : 0,
        });
        if (error) throw error;
        success++;
      } catch (err: any) {
        errors.push(`Row ${i + 2} (${row.name || "?"}): ${err.message}`);
      }
    }
    qc.invalidateQueries({ queryKey: ["categories"] });
    return { success, errors };
  };

  const handleBulkSubImport = async (rows: Record<string, string>[]) => {
    const { data: latestCats } = await supabase.from("categories").select("id, name");
    let success = 0;
    const errors: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.name || !row.category) { errors.push(`Row ${i + 2}: Missing name or category`); continue; }
        const cat = (latestCats || []).find((c: any) => c.name.toLowerCase() === row.category.toLowerCase());
        if (!cat) { errors.push(`Row ${i + 2}: Category "${row.category}" not found`); continue; }
        const { error } = await supabase.from("subcategories").insert({
          name: row.name,
          category_id: cat.id,
          slug: row.slug || row.name.toLowerCase().replace(/\s+/g, "-"),
          icon: row.icon || null,
          sort_order: row.sort_order ? parseInt(row.sort_order) : 0,
        });
        if (error) throw error;
        success++;
      } catch (err: any) {
        errors.push(`Row ${i + 2} (${row.name || "?"}): ${err.message}`);
      }
    }
    qc.invalidateQueries({ queryKey: ["subcategories"] });
    return { success, errors };
  };

  const saveCat = useMutation({
    mutationFn: async (f: CatForm) => {
      const payload = { name: f.name, slug: f.slug || f.name.toLowerCase().replace(/\s+/g, "-"), icon: f.icon || null, color: f.color || null, sort_order: f.sort_order };
      if (f.id) {
        const { error } = await supabase.from("categories").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category saved");
      setCatOpen(false); setCatForm(emptyCatForm); setCatEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const delCat = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Category deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const saveSub = useMutation({
    mutationFn: async (f: SubForm) => {
      const payload = {
        category_id: f.category_id,
        name: f.name,
        slug: f.slug || f.name.toLowerCase().replace(/\s+/g, "-"),
        icon: f.icon || null,
        sort_order: f.sort_order,
      };
      if (f.id) {
        const { error } = await supabase.from("subcategories").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subcategories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subcategories"] });
      toast.success("Subcategory saved");
      setSubOpen(false); setSubForm(emptySubForm); setSubEditing(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const delSub = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subcategories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subcategories"] }); toast.success("Subcategory deleted"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{categories.length} categories, {subcategories.length} subcategories</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setBulkCatOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />Import
          </Button>
          <BulkImportDialog open={bulkCatOpen} onOpenChange={setBulkCatOpen} title="Categories" columns={catBulkColumns} onImport={handleBulkCatImport} />
          <BulkImportDialog open={bulkSubOpen} onOpenChange={setBulkSubOpen} title="Subcategories" columns={subBulkColumns} onImport={handleBulkSubImport} />
          <Dialog open={subOpen} onOpenChange={(v) => { setSubOpen(v); if (!v) { setSubForm(emptySubForm); setSubEditing(false); } }}>
            <DialogTrigger asChild><Button size="sm" variant="outline" className="rounded-xl"><Plus className="h-4 w-4 mr-1.5" />Subcategory</Button></DialogTrigger>
            <DialogContent className="w-[min(96vw,760px)] max-w-none max-h-[92vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{subEditing ? "Edit Subcategory" : "Add Subcategory"}</DialogTitle></DialogHeader>
              <div className="grid gap-3 mt-2">
                <div>
                  <Label>Parent Category *</Label>
                  <Select value={subForm.category_id} onValueChange={(v) => setSubForm({ ...subForm, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Name *</Label><Input value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value })} /></div>
                <div><Label>Slug</Label><Input value={subForm.slug} onChange={(e) => setSubForm({ ...subForm, slug: e.target.value })} placeholder="auto-generated" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Icon (emoji)</Label><Input value={subForm.icon} onChange={(e) => setSubForm({ ...subForm, icon: e.target.value })} /></div>
                  <div><Label>Sort Order</Label><Input type="number" value={subForm.sort_order} onChange={(e) => setSubForm({ ...subForm, sort_order: +e.target.value })} /></div>
                </div>
                <Button className="rounded-xl" onClick={() => saveSub.mutate(subForm)} disabled={!subForm.name || !subForm.category_id || saveSub.isPending}>
                  {saveSub.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}{subEditing ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={catOpen} onOpenChange={(v) => { setCatOpen(v); if (!v) { setCatForm(emptyCatForm); setCatEditing(false); } }}>
            <DialogTrigger asChild><Button size="sm" className="rounded-xl"><Plus className="h-4 w-4 mr-1.5" />Category</Button></DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>{catEditing ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
              <div className="grid gap-3 mt-2">
                <div><Label>Name *</Label><Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} /></div>
                <div><Label>Slug</Label><Input value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })} placeholder="auto-generated" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Icon (emoji)</Label><Input value={catForm.icon} onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })} /></div>
                  <div><Label>Color</Label><Input value={catForm.color} onChange={(e) => setCatForm({ ...catForm, color: e.target.value })} placeholder="#f5e6d3" /></div>
                </div>
                <div><Label>Sort Order</Label><Input type="number" value={catForm.sort_order} onChange={(e) => setCatForm({ ...catForm, sort_order: +e.target.value })} /></div>
                <Button className="rounded-xl" onClick={() => saveCat.mutate(catForm)} disabled={!catForm.name || saveCat.isPending}>
                  {saveCat.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}{catEditing ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-3">
          {categories.map((c: any) => {
            const subs = subcategories.filter(s => s.category_id === c.id);
            const isExpanded = expandedCatId === c.id;

            return (
              <div key={c.id} className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:shadow-premium transition-shadow">
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <button onClick={() => setExpandedCatId(isExpanded ? null : c.id)} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                    {c.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm text-foreground block">{c.name}</span>
                    <span className="text-[11px] text-muted-foreground">{c.slug} · {subs.length} subcategories</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl" onClick={() => {
                      setCatForm({ id: c.id, name: c.name, slug: c.slug, icon: c.icon || "", color: c.color || "", sort_order: c.sort_order || 0 });
                      setCatEditing(true); setCatOpen(true);
                    }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/5" onClick={() => {
                      if (confirm("Delete this category?")) delCat.mutate(c.id);
                    }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border/50 bg-secondary/20 px-4 py-3">
                    {subs.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">No subcategories</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {subs.map((s: any) => (
                          <div key={s.id} className="flex items-center gap-3 bg-card rounded-xl px-3 py-2.5 border border-border/30">
                            <span className="text-lg">{s.icon}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-foreground block">{s.name}</span>
                              <span className="text-[10px] text-muted-foreground">{s.slug}</span>
                            </div>
                            <div className="flex gap-0.5">
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => {
                                setSubForm({ id: s.id, category_id: s.category_id, name: s.name, slug: s.slug, icon: s.icon || "", sort_order: s.sort_order || 0 });
                                setSubEditing(true); setSubOpen(true);
                              }}><Pencil className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-destructive" onClick={() => {
                                if (confirm("Delete?")) delSub.mutate(s.id);
                              }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button size="sm" variant="ghost" className="text-xs mt-2 rounded-xl" onClick={() => {
                      setSubForm({ ...emptySubForm, category_id: c.id });
                      setSubEditing(false); setSubOpen(true);
                    }}>
                      <Plus className="h-3 w-3 mr-1" /> Add subcategory
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          {categories.length === 0 && (
            <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
              <FolderTree className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No categories yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
