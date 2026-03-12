import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useCategories, useSubcategories } from "@/hooks/useProducts";

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

  const { data: categories = [], isLoading } = useCategories();
  const { data: subcategories = [] } = useSubcategories();

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
        <h1 className="text-2xl font-display font-bold text-foreground">Categories & Subcategories</h1>
        <div className="flex gap-2">
          {/* Add Subcategory */}
          <Dialog open={subOpen} onOpenChange={(v) => { setSubOpen(v); if (!v) { setSubForm(emptySubForm); setSubEditing(false); } }}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1.5" />Subcategory</Button></DialogTrigger>
            <DialogContent className="max-w-sm">
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
                <Button onClick={() => saveSub.mutate(subForm)} disabled={!subForm.name || !subForm.category_id || saveSub.isPending}>
                  {saveSub.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}{subEditing ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add Category */}
          <Dialog open={catOpen} onOpenChange={(v) => { setCatOpen(v); if (!v) { setCatForm(emptyCatForm); setCatEditing(false); } }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Category</Button></DialogTrigger>
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
                <Button onClick={() => saveCat.mutate(catForm)} disabled={!catForm.name || saveCat.isPending}>
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
        <div className="space-y-2">
          {categories.map((c: any) => {
            const subs = subcategories.filter(s => s.category_id === c.id);
            const isExpanded = expandedCatId === c.id;

            return (
              <div key={c.id} className="rounded-xl border border-border overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-card">
                  <button onClick={() => setExpandedCatId(isExpanded ? null : c.id)} className="p-0.5">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <span className="text-lg">{c.icon}</span>
                  <span className="flex-1 font-medium text-sm text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{c.slug}</span>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">{subs.length} subs</span>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                      setCatForm({ id: c.id, name: c.name, slug: c.slug, icon: c.icon || "", color: c.color || "", sort_order: c.sort_order || 0 });
                      setCatEditing(true); setCatOpen(true);
                    }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => {
                      if (confirm("Delete this category and all its subcategories?")) delCat.mutate(c.id);
                    }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/30">
                    {subs.length === 0 ? (
                      <p className="px-6 py-4 text-sm text-muted-foreground">No subcategories yet</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="pl-10">Icon</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead className="w-[80px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subs.map((s: any) => (
                            <TableRow key={s.id}>
                              <TableCell className="pl-10 text-lg">{s.icon}</TableCell>
                              <TableCell className="text-sm font-medium">{s.name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{s.slug}</TableCell>
                              <TableCell className="text-sm">{s.sort_order}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                    setSubForm({ id: s.id, category_id: s.category_id, name: s.name, slug: s.slug, icon: s.icon || "", sort_order: s.sort_order || 0 });
                                    setSubEditing(true); setSubOpen(true);
                                  }}><Pencil className="h-3 w-3" /></Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => {
                                    if (confirm("Delete?")) delSub.mutate(s.id);
                                  }}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                    <div className="px-6 py-2 border-t border-border/50">
                      <Button size="sm" variant="ghost" className="text-xs" onClick={() => {
                        setSubForm({ ...emptySubForm, category_id: c.id });
                        setSubEditing(false); setSubOpen(true);
                      }}>
                        <Plus className="h-3 w-3 mr-1" /> Add subcategory to {c.name}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {categories.length === 0 && (
            <p className="text-center py-8 text-muted-foreground">No categories yet</p>
          )}
        </div>
      )}
    </div>
  );
}
