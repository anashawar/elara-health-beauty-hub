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
import { Plus, Pencil, Trash2, Search, Loader2, Upload, X, ImageIcon, Languages, FileSpreadsheet, Sparkles, Wand2, ImagePlus } from "lucide-react";
import { formatPrice, useCategories, useBrands, useSubcategories } from "@/hooks/useProducts";
import { toast } from "sonner";
import BulkImportDialog, { ColumnMapping } from "@/components/admin/BulkImportDialog";
import { Progress } from "@/components/ui/progress";

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
  product_form: string;
}

const emptyForm: ProductForm = {
  title: "", slug: "", price: 0, original_price: null, cost: null, description: "",
  usage_instructions: "", benefits: "",
  category_id: "", subcategory_id: "", brand_id: "", is_new: false, is_trending: false, is_pick: false, in_stock: true,
  volume_ml: "", volume_unit: "ml", skin_type: "", country_of_origin: "", condition: "", product_form: "",
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

  // AI Enrichment state
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ done: 0, total: 0, current: "" });
  const [selectedForEnrich, setSelectedForEnrich] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  // Quick-add state
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddItems, setQuickAddItems] = useState<{ name: string; cost: string }[]>([{ name: "", cost: "" }]);

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

  // Fetch costs for margin display
  const { data: allCosts = [] } = useQuery({
    queryKey: ["admin-product-costs-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_costs").select("product_id, cost");
      if (error) throw error;
      return data || [];
    },
  });

  const costMap = useMemo(() => {
    const map: Record<string, number> = {};
    allCosts.forEach((c: any) => { map[c.product_id] = Number(c.cost); });
    return map;
  }, [allCosts]);

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
        form: f.product_form || null,
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

      // Auto-translate only for NEW products (not updates)
      if (productId && !f.id) {
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
      condition: (p as any).condition || "", product_form: (p as any).form || "",
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
    { key: "price", label: "price", example: "25000" },
    { key: "cost", label: "cost", example: "15000" },
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

  /** Map Arabic/common Excel headers to our keys */
  const normalizeRow = (row: Record<string, string>): { name: string; cost: string } | null => {
    // Try common header names (Arabic + English)
    const name = row["اسم_المادة"] || row["اسم_المادة"] || row["title"] || row["name"] || row["product_name"] || row["اسم"] || "";
    const costRaw = row["المذخر"] || row["cost"] || row["price"] || row["السعر"] || "";
    if (!name.trim()) return null;
    return { name: name.trim(), cost: costRaw.toString().replace(/,/g, "").trim() };
  };

  const handleBulkImport = async (rows: Record<string, string>[]) => {
    let success = 0;
    const errors: string[] = [];

    // Try to detect if this is a name+cost format (like user's Excel)
    const firstRow = rows[0];
    const hasNameCostFormat = firstRow && (firstRow["اسم_المادة"] || firstRow["المذخر"] || (!firstRow["price"] && (firstRow["cost"] || firstRow["name"])));

    if (hasNameCostFormat || (!firstRow?.price && !firstRow?.title)) {
      // Name + Cost format: use bulk-import edge function
      const products = rows
        .map(normalizeRow)
        .filter((p): p is { name: string; cost: string } => p !== null && p.name.length > 0);

      if (products.length === 0) {
        return { success: 0, errors: ["No valid products found. Check column headers."] };
      }

      // Send in batches of 500 to the edge function
      const BATCH = 500;
      for (let i = 0; i < products.length; i += BATCH) {
        const batch = products.slice(i, i + BATCH);
        try {
          const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-import-products`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ products: batch }),
          });
          const data = await resp.json();
          if (data.inserted) success += data.inserted;
          if (data.errors > 0) errors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${data.errors} failures`);
          if (data.error_details) errors.push(...data.error_details);
        } catch (err: any) {
          errors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${err.message}`);
        }
      }

      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      return { success, errors };
    }

    // Standard format with full column mapping
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        if (!row.title || !row.price) {
          errors.push(`Row ${rowNum}: Missing title or price`);
          continue;
        }

        let category_id: string | null = null;
        if (row.category) {
          const cat = categories.find((c: any) => c.name.toLowerCase() === row.category.toLowerCase());
          if (cat) category_id = cat.id;
        }

        let subcategory_id: string | null = null;
        if (row.subcategory && category_id) {
          const sub = allSubcategories.find(
            (s: any) => s.name.toLowerCase() === row.subcategory.toLowerCase() && s.category_id === category_id
          );
          if (sub) subcategory_id = sub.id;
        }

        let brand_id: string | null = null;
        if (row.brand) {
          const br = brands.find((b: any) => b.name.toLowerCase() === row.brand.toLowerCase());
          if (br) brand_id = br.id;
        }

        const benefitsArray = row.benefits ? row.benefits.split("|").map((b) => b.trim()).filter(Boolean) : null;
        const toBool = (v: string) => v?.toLowerCase() === "true" || v === "1";

        const cost = row.cost ? parseFloat(row.cost.replace(/,/g, "")) : null;
        const price = row.price ? parseFloat(row.price.replace(/,/g, "")) : (cost ? Math.round((cost * 1.35) / 250) * 250 : 0);

        const payload = {
          title: row.title,
          slug: row.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          price,
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

        const { data: inserted, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;

        // Save cost
        if (cost && cost > 0 && inserted) {
          await supabase.from("product_costs").upsert({ product_id: inserted.id, cost }, { onConflict: "product_id" });
        }

        success++;
      } catch (err: any) {
        errors.push(`Row ${rowNum} (${row.title || "?"}): ${err.message}`);
      }
    }

    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    return { success, errors };
  };

  // AI Enrichment handler
  const handleEnrichProducts = async (ids: string[]) => {
    if (ids.length === 0) { toast.error("No products selected"); return; }
    setEnriching(true);
    setEnrichProgress({ done: 0, total: ids.length, current: "Starting..." });

    const BATCH_SIZE = 10;
    let totalSuccess = 0;
    let totalFail = 0;

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const batchProducts = products.filter((p: any) => batch.includes(p.id));
      setEnrichProgress({ done: i, total: ids.length, current: `Processing ${batchProducts[0]?.title || "..."}` });

      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ product_ids: batch, markup_percent: 35 }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          toast.error(`Batch failed: ${err.error || resp.statusText}`);
          totalFail += batch.length;
          continue;
        }

        const result = await resp.json();
        totalSuccess += result.succeeded || 0;
        totalFail += result.failed || 0;

        if (result.rate_limited > 0) {
          toast.warning(`${result.rate_limited} products rate-limited, waiting...`);
          await new Promise(r => setTimeout(r, 5000));
        }
      } catch (err) {
        console.error("Enrich batch error:", err);
        totalFail += batch.length;
      }

      // Delay between batches
      if (i + BATCH_SIZE < ids.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    setEnrichProgress({ done: ids.length, total: ids.length, current: "Done!" });
    setEnriching(false);
    setSelectMode(false);
    setSelectedForEnrich(new Set());
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["admin-product-costs-list"] });
    toast.success(`AI Enrichment complete: ${totalSuccess} succeeded, ${totalFail} failed`);
  };

  const handleEnrichMissing = () => {
    // Select all products missing description
    const missing = products.filter((p: any) => !p.description || p.description.trim() === "");
    if (missing.length === 0) {
      toast.info("All products already have descriptions");
      return;
    }
    const ids = missing.map((p: any) => p.id);
    if (confirm(`Enrich ${ids.length} products missing descriptions with AI? This will auto-fill descriptions, benefits, pricing (+35% on cost), and more.`)) {
      handleEnrichProducts(ids);
    }
  };

  const handleEnrichSelected = () => {
    const ids = Array.from(selectedForEnrich);
    if (ids.length === 0) { toast.error("Select products first"); return; }
    if (confirm(`Enrich ${ids.length} selected products with AI?`)) {
      handleEnrichProducts(ids);
    }
  };

  // Image search handler
  const handleSearchImages = async (ids: string[]) => {
    if (ids.length === 0) { toast.error("No products selected"); return; }
    setEnriching(true);
    setEnrichProgress({ done: 0, total: ids.length, current: "Searching for product images..." });

    const BATCH_SIZE = 5;
    let totalSuccess = 0;
    let totalFail = 0;

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      setEnrichProgress({ done: i, total: ids.length, current: `Finding images batch ${Math.floor(i/BATCH_SIZE)+1}...` });

      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-product-images`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ product_ids: batch }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          toast.error(`Image search failed: ${err.error || resp.statusText}`);
          totalFail += batch.length;
          continue;
        }

        const result = await resp.json();
        totalSuccess += result.succeeded || 0;
        totalFail += result.failed || 0;
      } catch (err) {
        console.error("Image search error:", err);
        totalFail += batch.length;
      }

      if (i + BATCH_SIZE < ids.length) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    setEnrichProgress({ done: ids.length, total: ids.length, current: "Done!" });
    setEnriching(false);
    setSelectMode(false);
    setSelectedForEnrich(new Set());
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    toast.success(`Image search complete: ${totalSuccess} found, ${totalFail} failed`);
  };

  const handleSearchMissingImages = () => {
    const missing = products.filter((p: any) => !p.product_images || p.product_images.length === 0);
    if (missing.length === 0) {
      toast.info("All products already have images");
      return;
    }
    const ids = missing.map((p: any) => p.id);
    if (confirm(`Search web for images for ${ids.length} products without images?`)) {
      handleSearchImages(ids);
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedForEnrich(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedForEnrich.size === filtered.length) {
      setSelectedForEnrich(new Set());
    } else {
      setSelectedForEnrich(new Set(filtered.map((p: any) => p.id)));
    }
  };

  // Quick-add: create products with just name + cost, then auto-enrich
  const handleQuickAdd = async () => {
    const validItems = quickAddItems.filter(i => i.name.trim() && i.cost.trim());
    if (validItems.length === 0) { toast.error("Add at least one product with name and cost"); return; }

    setQuickAddOpen(false);
    setEnriching(true);
    setEnrichProgress({ done: 0, total: validItems.length, current: "Creating products..." });

    const createdIds: string[] = [];

    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
      const cost = parseFloat(item.cost);
      const price = Math.round(cost * 1.35 / 250) * 250; // Round to nearest 250 IQD

      setEnrichProgress({ done: i, total: validItems.length, current: `Creating: ${item.name}` });

      try {
        const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const { data, error } = await supabase.from("products").insert({
          title: item.name.trim(),
          slug,
          price,
          in_stock: true,
        }).select("id").single();

        if (error) { toast.error(`Failed: ${item.name} - ${error.message}`); continue; }

        // Save cost
        await supabase.from("product_costs").upsert({ product_id: data.id, cost }, { onConflict: "product_id" });
        createdIds.push(data.id);
      } catch (err) {
        console.error("Quick add error:", err);
      }
    }

    if (createdIds.length === 0) {
      setEnriching(false);
      toast.error("No products were created");
      return;
    }

    toast.success(`${createdIds.length} products created, now enriching with AI...`);

    // Now enrich all created products
    const BATCH_SIZE = 10;
    let totalSuccess = 0;

    for (let i = 0; i < createdIds.length; i += BATCH_SIZE) {
      const batch = createdIds.slice(i, i + BATCH_SIZE);
      setEnrichProgress({ done: i, total: createdIds.length, current: `AI enriching batch ${Math.floor(i/BATCH_SIZE)+1}...` });

      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-products`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ product_ids: batch, markup_percent: 35 }),
        });
        if (resp.ok) {
          const result = await resp.json();
          totalSuccess += result.succeeded || 0;
        }
      } catch (err) {
        console.error("Enrich error:", err);
      }

      if (i + BATCH_SIZE < createdIds.length) await new Promise(r => setTimeout(r, 2000));
    }

    // Also search for images
    setEnrichProgress({ done: createdIds.length, total: createdIds.length, current: "Searching for images..." });
    try {
      for (let i = 0; i < createdIds.length; i += 5) {
        const batch = createdIds.slice(i, i + 5);
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-product-images`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ product_ids: batch }),
        });
        if (i + 5 < createdIds.length) await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error("Image search error:", err);
    }

    setEnriching(false);
    setQuickAddItems([{ name: "", cost: "" }]);
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["admin-product-costs-list"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    toast.success(`Done! ${totalSuccess} products enriched with AI data + images`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-display font-bold text-foreground">Products</h1>
        <div className="flex gap-2 flex-wrap">
          {/* AI Enrichment Controls */}
          {!selectMode ? (
            <>
              <Button size="sm" variant="outline" className="text-primary border-primary/30" onClick={handleEnrichMissing} disabled={enriching}>
                <Sparkles className="h-4 w-4 mr-1.5" />AI Fill Missing
              </Button>
              <Button size="sm" variant="outline" className="border-primary/30" onClick={handleSearchMissingImages} disabled={enriching}>
                <ImagePlus className="h-4 w-4 mr-1.5" />Find Images
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectMode(true)} disabled={enriching}>
                <Wand2 className="h-4 w-4 mr-1.5" />Select & Enrich
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={toggleSelectAll}>
                {selectedForEnrich.size === filtered.length ? "Deselect All" : "Select All"}
              </Button>
              <Button size="sm" className="bg-primary" onClick={handleEnrichSelected} disabled={selectedForEnrich.size === 0 || enriching}>
                <Sparkles className="h-4 w-4 mr-1.5" />Enrich {selectedForEnrich.size} Products
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setSelectMode(false); setSelectedForEnrich(new Set()); }}>Cancel</Button>
            </>
          )}
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
        {/* Quick Add Dialog */}
        <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="default" className="bg-primary">
              <Sparkles className="h-4 w-4 mr-1.5" />Quick Add + AI
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Quick Add Products
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Just enter name & cost. AI will fill everything else: description, brand, category, benefits, pricing (+35%), and find images.</p>
            <div className="grid gap-3 mt-2 max-h-[50vh] overflow-y-auto pr-1">
              {quickAddItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    placeholder="Product name (e.g. CeraVe Moisturizer)"
                    value={item.name}
                    onChange={(e) => {
                      const updated = [...quickAddItems];
                      updated[idx].name = e.target.value;
                      setQuickAddItems(updated);
                    }}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Cost (IQD)"
                    type="number"
                    value={item.cost}
                    onChange={(e) => {
                      const updated = [...quickAddItems];
                      updated[idx].cost = e.target.value;
                      setQuickAddItems(updated);
                    }}
                    className="w-28"
                  />
                  {quickAddItems.length > 1 && (
                    <Button size="icon" variant="ghost" className="shrink-0" onClick={() => setQuickAddItems(prev => prev.filter((_, i) => i !== idx))}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={() => setQuickAddItems(prev => [...prev, { name: "", cost: "" }])}>
                <Plus className="h-4 w-4 mr-1" />Add Row
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                const rows = Array(10).fill(null).map(() => ({ name: "", cost: "" }));
                setQuickAddItems(prev => [...prev, ...rows]);
              }}>
                +10 Rows
              </Button>
            </div>
            <Button className="w-full mt-3" onClick={handleQuickAdd} disabled={enriching || quickAddItems.every(i => !i.name.trim())}>
              <Sparkles className="h-4 w-4 mr-1.5" />
              Create & Auto-Enrich {quickAddItems.filter(i => i.name.trim() && i.cost.trim()).length} Products
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1.5" />Manual Add</Button>
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Price (IQD) *</Label>
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} />
                </div>
                <div>
                  <Label>Original Price</Label>
                  <Input type="number" value={form.original_price ?? ""} onChange={(e) => setForm({ ...form, original_price: e.target.value ? +e.target.value : null })} />
                </div>
                <div>
                  <Label>Cost (IQD) 🔒</Label>
                  <Input type="number" placeholder="Confidential" value={form.cost ?? ""} onChange={(e) => setForm({ ...form, cost: e.target.value ? +e.target.value : null })} />
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
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label>Volume</Label>
                  <Input value={form.volume_ml} onChange={(e) => setForm({ ...form, volume_ml: e.target.value })} placeholder="e.g. 50" />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Select value={form.volume_unit} onValueChange={(v) => setForm({ ...form, volume_unit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["ml", "g", "oz", "fl oz", "L", "kg", "pcs", "sheets", "capsules", "tablets"].map(u => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Skin Type</Label>
                <Select value={form.skin_type} onValueChange={(v) => setForm({ ...form, skin_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select skin type" /></SelectTrigger>
                  <SelectContent>
                    {["All", "Oily", "Dry", "Combination", "Sensitive", "Normal", "Acne-Prone", "Mature"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Form</Label>
                <Select value={form.product_form} onValueChange={(v) => setForm({ ...form, product_form: v })}>
                  <SelectTrigger><SelectValue placeholder="Select form" /></SelectTrigger>
                  <SelectContent>
                    {["Cream", "Serum", "Gel", "Lotion", "Oil", "Foam", "Spray", "Powder", "Balm", "Mask", "Cleanser", "Toner", "Shampoo", "Conditioner", "Soap", "Capsules", "Tablets", "Drops", "Stick", "Patches"].map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      {/* AI Enrichment Progress */}
      {enriching && (
        <div className="mb-4 p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-foreground">AI Enriching Products...</span>
            <span className="text-xs text-muted-foreground ml-auto">{enrichProgress.done}/{enrichProgress.total}</span>
          </div>
          <Progress value={enrichProgress.total > 0 ? (enrichProgress.done / enrichProgress.total) * 100 : 0} className="h-2 mb-1" />
          <p className="text-xs text-muted-foreground truncate">{enrichProgress.current}</p>
        </div>
      )}

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
                {selectMode && <TableHead className="w-10"></TableHead>}
                <TableHead>Product</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="hidden md:table-cell">Cost</TableHead>
                <TableHead className="hidden md:table-cell">Margin</TableHead>
                <TableHead className="hidden md:table-cell">Flags</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p: any) => {
                const cost = costMap[p.id];
                const margin = cost !== undefined && cost > 0 ? ((p.price - cost) / cost * 100) : null;
                return (
                <TableRow key={p.id} className={selectMode && selectedForEnrich.has(p.id) ? "bg-primary/5" : ""}>
                  {selectMode && (
                    <TableCell className="w-10">
                      <input
                        type="checkbox"
                        checked={selectedForEnrich.has(p.id)}
                        onChange={() => toggleSelectProduct(p.id)}
                        className="rounded border-border"
                      />
                    </TableCell>
                  )}
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
                  <TableCell className="text-sm font-medium">{formatPrice(p.price)}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{cost !== undefined ? formatPrice(cost) : "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {margin !== null ? (
                      <span className={`text-xs font-bold ${margin >= 30 ? "text-emerald-600" : margin >= 15 ? "text-amber-600" : "text-red-600"}`}>
                        {margin.toFixed(1)}%
                      </span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex gap-1">
                      {!p.in_stock && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">OOS</span>}
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
              );})}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No products found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
