import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Pencil, Trash2, Loader2, Warehouse, Package, Tag, DollarSign,
  CheckCircle2, Clock, AlertTriangle, Copy, Power, Filter, X, ChevronDown, ChevronUp, Settings2, Eye, EyeOff, Link2
} from "lucide-react";
import { toast } from "sonner";
import { useAdmin } from "@/hooks/useAdmin";

export default function AdminWarehouses() {
  const qc = useQueryClient();
  const { user } = useAdmin();
  const [activeTab, setActiveTab] = useState("accounts");

  // Warehouse form
  const [whOpen, setWhOpen] = useState(false);
  const [whForm, setWhForm] = useState({ id: "", name: "", location: "", contact_email: "", is_active: true });
  const [whEditing, setWhEditing] = useState(false);

  // Fetch warehouses
  const { data: warehouses = [], isLoading: whLoading } = useQuery({
    queryKey: ["admin-warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("warehouses").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch requests
  const { data: requests = [], isLoading: reqLoading } = useQuery({
    queryKey: ["admin-warehouse-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("warehouse_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Save warehouse
  const saveWh = useMutation({
    mutationFn: async (f: typeof whForm) => {
      const payload = { name: f.name, location: f.location || null, contact_email: f.contact_email || null, is_active: f.is_active };
      if (f.id) {
        const { error } = await supabase.from("warehouses").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("warehouses").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-warehouses"] }); toast.success("Saved"); setWhOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  // Delete warehouse
  const delWh = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("warehouses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-warehouses"] }); toast.success("Deleted"); },
    onError: (e) => toast.error(e.message),
  });

  // Update request status
  const updateRequestStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("warehouse_requests").update({
        status,
        resolved_at: status === "resolved" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;

      const req = requests.find((r: any) => r.id === id);
      if (req?.warehouse_id) {
        await supabase.from("warehouse_notifications").insert({
          warehouse_id: req.warehouse_id,
          title: `Request ${status === "resolved" ? "resolved" : "updated"}`,
          body: `"${req.title}" status changed to ${status}`,
          type: "update",
          reference_id: id,
        });
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-warehouse-requests"] }); toast.success("Updated"); },
    onError: (e) => toast.error(e.message),
  });

  const getWarehouseName = (id: string) => warehouses.find((w: any) => w.id === id)?.name || "—";

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    in_progress: "bg-blue-100 text-blue-700",
    resolved: "bg-emerald-100 text-emerald-700",
  };

  const priorityColors: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    normal: "bg-blue-50 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };

  const typeConfig: Record<string, { icon: any; label: string; color: string }> = {
    missing_brand: { icon: Tag, label: "Missing Brand", color: "text-amber-600" },
    missing_product: { icon: Package, label: "Missing Product", color: "text-blue-600" },
    price_note: { icon: DollarSign, label: "Price Note", color: "text-emerald-600" },
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-foreground mb-1">Warehouse Management</h1>
      <p className="text-sm text-muted-foreground mb-6">Manage warehouse accounts, locations, and requests</p>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
          <TabsTrigger value="requests">
            Requests
            {requests.filter((r: any) => r.status === "pending").length > 0 && (
              <Badge className="ml-1.5 text-[9px] bg-destructive text-white px-1.5 py-0">
                {requests.filter((r: any) => r.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Accounts Tab - from Team page */}
        <TabsContent value="accounts">
          <AccountsSection user={user} qc={qc} />
        </TabsContent>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses">
          <div className="flex justify-end mb-4">
            <Dialog open={whOpen} onOpenChange={(v) => { setWhOpen(v); if (!v) { setWhForm({ id: "", name: "", location: "", contact_email: "", is_active: true }); setWhEditing(false); } }}>
              <DialogTrigger asChild><Button size="sm" className="rounded-xl"><Plus className="h-4 w-4 mr-1.5" />Add Warehouse</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{whEditing ? "Edit" : "Add"} Warehouse</DialogTitle></DialogHeader>
                <div className="grid gap-3 mt-2">
                  <div><Label>Name *</Label><Input value={whForm.name} onChange={(e) => setWhForm({ ...whForm, name: e.target.value })} /></div>
                  <div><Label>Location</Label><Input value={whForm.location} onChange={(e) => setWhForm({ ...whForm, location: e.target.value })} placeholder="City / Area" /></div>
                  <div><Label>Contact Email</Label><Input type="email" value={whForm.contact_email} onChange={(e) => setWhForm({ ...whForm, contact_email: e.target.value })} /></div>
                  <label className="flex items-center gap-2 text-sm"><Switch checked={whForm.is_active} onCheckedChange={(v) => setWhForm({ ...whForm, is_active: v })} />Active</label>
                  <Button className="rounded-xl" onClick={() => saveWh.mutate(whForm)} disabled={!whForm.name || saveWh.isPending}>
                    {saveWh.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}{whEditing ? "Update" : "Create"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {whLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {warehouses.map((w: any) => (
                <div key={w.id} className="bg-card rounded-2xl border border-border/50 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-5 h-5 text-primary" />
                      <span className="font-bold text-foreground">{w.name}</span>
                    </div>
                    <Badge className={`text-[9px] ${w.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {w.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {w.location && <p className="text-xs text-muted-foreground">{w.location}</p>}
                  {w.contact_email && <p className="text-xs text-muted-foreground">{w.contact_email}</p>}
                  <div className="flex gap-1 mt-3">
                    <Button size="sm" variant="ghost" className="rounded-xl text-xs" onClick={() => {
                      setWhForm({ id: w.id, name: w.name, location: w.location || "", contact_email: w.contact_email || "", is_active: w.is_active });
                      setWhEditing(true); setWhOpen(true);
                    }}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                    <Button size="sm" variant="ghost" className="rounded-xl text-xs text-destructive" onClick={() => { if (confirm("Delete?")) delWh.mutate(w.id); }}>
                      <Trash2 className="h-3 w-3 mr-1" />Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests">
          {reqLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
              <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No requests yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((r: any) => {
                const tc = typeConfig[r.type] || typeConfig.missing_brand;
                const TypeIcon = tc.icon;
                return (
                  <div key={r.id} className="bg-card rounded-xl border border-border/50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <TypeIcon className={`w-4 h-4 mt-0.5 ${tc.color} shrink-0`} />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm">{r.title}</p>
                          {r.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>}
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            <span>{tc.label}</span>
                            <span>·</span>
                            <span>{getWarehouseName(r.warehouse_id)}</span>
                            <span>·</span>
                            <span>{r.created_by_username}</span>
                            <span>·</span>
                            <span>{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className={`text-[9px] ${priorityColors[r.priority] || priorityColors.normal}`}>{r.priority}</Badge>
                        <Badge className={`text-[9px] ${statusColors[r.status] || statusColors.pending}`}>{r.status}</Badge>
                        {r.status !== "resolved" && (
                          <Select value={r.status} onValueChange={(v) => updateRequestStatus.mutate({ id: r.id, status: v })}>
                            <SelectTrigger className="h-7 w-[110px] text-[10px] rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Accounts Section (moved from AdminTeam) ─── */

function AccountsSection({ user, qc }: { user: any; qc: any }) {
  const [label, setLabel] = useState("Warehouse A");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newExcludedBrands, setNewExcludedBrands] = useState<string[]>([]);
  const [newExcludedProducts, setNewExcludedProducts] = useState<string[]>([]);
  const [showNewFilters, setShowNewFilters] = useState(false);
  const [expandedLink, setExpandedLink] = useState<string | null>(null);

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["prep-links"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("prep_access_tokens" as any).select("*") as any).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allBrands = [] } = useQuery({
    queryKey: ["all-brands-for-filters"],
    queryFn: async () => {
      const { data } = await supabase.from("brands").select("id, name").order("name");
      return data || [];
    },
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["all-products-for-filters"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, title").order("title").limit(500);
      return data || [];
    },
  });

  const createLink = useMutation({
    mutationFn: async () => {
      if (!newUsername.trim() || !newPassword.trim()) throw new Error("Username and password required");
      const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_warehouse_password' as any, { _plain_password: newPassword.trim() } as any);
      if (hashError || !hashedPassword) throw new Error("Failed to hash password");
      const { error } = await (supabase.from("prep_access_tokens" as any).insert({
        label,
        username: newUsername.trim().toLowerCase(),
        password_hash: hashedPassword,
        created_by: user!.id,
        excluded_brand_ids: newExcludedBrands,
        excluded_product_ids: newExcludedProducts,
      } as any) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prep-links"] });
      toast.success("Warehouse account created!");
      setLabel("Warehouse A");
      setNewUsername("");
      setNewPassword("");
      setNewExcludedBrands([]);
      setNewExcludedProducts([]);
      setShowNewFilters(false);
    },
    onError: (e: any) => toast.error(e.message || "Failed to create"),
  });

  const toggleLink = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase.from("prep_access_tokens" as any).update({ is_active: active } as any) as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prep-links"] }); toast.success("Updated"); },
  });

  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("prep_access_tokens" as any).delete() as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["prep-links"] }); toast.success("Account deleted"); },
  });

  const copyLink = () => {
    navigator.clipboard.writeText("https://elarastore.co/warehouse");
    toast.success("Warehouse login link copied!");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Warehouse Accounts</span>
        </div>
        <Button variant="outline" size="sm" onClick={copyLink} className="rounded-xl gap-1.5 text-xs">
          <Copy className="w-3 h-3" /> Copy Login Link
        </Button>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Create accounts for warehouse staff. Use <strong>exclusion filters</strong> to prevent specific brands/products from showing in a warehouse — those items will only appear to Operations.
      </p>

      {/* Create new */}
      <div className="space-y-3 rounded-xl border border-border p-4 bg-muted/10">
        <p className="text-xs font-bold text-foreground">Create New Warehouse Account</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Warehouse name" className="rounded-xl" />
          <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Username" className="rounded-xl" />
        </div>
        <div className="flex gap-2">
          <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password" className="flex-1 rounded-xl" />
          <Button onClick={() => createLink.mutate()} disabled={createLink.isPending || !newUsername.trim() || !newPassword.trim()} className="rounded-xl gap-1.5">
            {createLink.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create
          </Button>
        </div>

        <button onClick={() => setShowNewFilters(!showNewFilters)} className="flex items-center gap-2 text-xs font-medium text-primary hover:underline">
          <Filter className="w-3 h-3" />
          {showNewFilters ? "Hide" : "Set"} Exclusion Filters
          {(newExcludedBrands.length + newExcludedProducts.length) > 0 && (
            <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20">
              {newExcludedBrands.length + newExcludedProducts.length} excluded
            </Badge>
          )}
          {showNewFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showNewFilters && (
          <ExclusionFilterEditor
            brandIds={newExcludedBrands}
            productIds={newExcludedProducts}
            onBrandsChange={setNewExcludedBrands}
            onProductsChange={setNewExcludedProducts}
            allBrands={allBrands}
            allProducts={allProducts}
          />
        )}
      </div>

      {/* Existing accounts */}
      {isLoading ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : links.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">No warehouse accounts yet.</div>
      ) : (
        <div className="space-y-3">
          {links.map((link: any) => (
            <WarehouseAccountCard
              key={link.id}
              link={link}
              expanded={expandedLink === link.id}
              onToggleExpand={() => setExpandedLink(expandedLink === link.id ? null : link.id)}
              onToggleActive={() => toggleLink.mutate({ id: link.id, active: !link.is_active })}
              onDelete={() => deleteLink.mutate(link.id)}
              onCopyLink={copyLink}
              allBrands={allBrands}
              allProducts={allProducts}
              qc={qc}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Individual Warehouse Account Card ─── */

function WarehouseAccountCard({
  link, expanded, onToggleExpand, onToggleActive, onDelete, onCopyLink, allBrands, allProducts, qc,
}: {
  link: any; expanded: boolean; onToggleExpand: () => void; onToggleActive: () => void;
  onDelete: () => void; onCopyLink: () => void; allBrands: any[]; allProducts: any[]; qc: any;
}) {
  const [editBrands, setEditBrands] = useState<string[]>(link.excluded_brand_ids || []);
  const [editProducts, setEditProducts] = useState<string[]>(link.excluded_product_ids || []);
  const [saving, setSaving] = useState(false);
  const [editUsername, setEditUsername] = useState<string>(link.username || "");
  const [editPassword, setEditPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [editLabel, setEditLabel] = useState<string>(link.label || "");
  const [savingCreds, setSavingCreds] = useState(false);

  const exclusionCount = (link.excluded_brand_ids?.length || 0) + (link.excluded_product_ids?.length || 0);
  const hasFilterChanges =
    JSON.stringify(editBrands.sort()) !== JSON.stringify((link.excluded_brand_ids || []).sort()) ||
    JSON.stringify(editProducts.sort()) !== JSON.stringify((link.excluded_product_ids || []).sort());
  const hasCredChanges = editUsername !== link.username || editPassword !== "" || editLabel !== link.label;

  const saveFilters = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase.from("prep_access_tokens" as any).update({
        excluded_brand_ids: editBrands,
        excluded_product_ids: editProducts,
      } as any) as any).eq("id", link.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["prep-links"] });
      toast.success("Filters saved!");
    } catch {
      toast.error("Failed to save filters");
    } finally {
      setSaving(false);
    }
  };

  const saveCredentials = async () => {
    if (!editUsername.trim()) { toast.error("Username is required"); return; }
    setSavingCreds(true);
    try {
      const update: any = { username: editUsername.trim().toLowerCase(), label: editLabel.trim() };
      if (editPassword) {
        const { data: hashed, error: hashErr } = await supabase.rpc('hash_warehouse_password' as any, { _plain_password: editPassword } as any);
        if (hashErr || !hashed) throw new Error("Failed to hash password");
        update.password_hash = hashed;
      }
      const { error } = await (supabase.from("prep_access_tokens" as any).update(update) as any).eq("id", link.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["prep-links"] });
      setEditPassword("");
      toast.success("Account updated!");
    } catch {
      toast.error("Failed to update account");
    } finally {
      setSavingCreds(false);
    }
  };

  const resetFilters = () => {
    setEditBrands(link.excluded_brand_ids || []);
    setEditProducts(link.excluded_product_ids || []);
  };

  return (
    <div className={`rounded-xl border overflow-hidden transition-all ${link.is_active ? "border-border bg-background" : "border-border/50 bg-muted/20 opacity-70"}`}>
      <div className="flex items-center gap-3 p-3.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{link.label}</p>
            <Badge variant="outline" className={`text-[9px] font-bold ${link.is_active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-muted text-muted-foreground"}`}>
              {link.is_active ? "Active" : "Disabled"}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <p className="text-[10px] text-muted-foreground">
              User: <span className="font-mono font-medium">{link.username}</span>
            </p>
            {exclusionCount > 0 && (
              <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                <Filter className="w-2.5 h-2.5" />
                {exclusionCount} exclusion{exclusionCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleExpand} title="Settings">
            <Settings2 className={`w-3.5 h-3.5 ${expanded ? "text-primary" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCopyLink}>
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleActive}>
            <Power className={`w-3.5 h-3.5 ${link.is_active ? "text-emerald-600" : "text-muted-foreground"}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 bg-muted/5 space-y-4">
          {/* Account credentials */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5 text-primary" />
              Account Settings
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Label</label>
                <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="h-8 text-xs rounded-lg" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Username</label>
                <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="h-8 text-xs rounded-lg font-mono" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-muted-foreground mb-1 block">New Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave empty to keep"
                    className="h-8 text-xs rounded-lg pr-8"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
            {hasCredChanges && (
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setEditUsername(link.username); setEditPassword(""); setEditLabel(link.label); }} className="rounded-xl text-xs h-7">Cancel</Button>
                <Button size="sm" onClick={saveCredentials} disabled={savingCreds} className="rounded-xl text-xs h-7 gap-1">
                  {savingCreds && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save Account
                </Button>
              </div>
            )}
          </div>

          {/* Exclusion filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-amber-600" />
                Exclusion Filters
              </p>
              {hasFilterChanges && (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="rounded-xl text-xs h-7">Cancel</Button>
                  <Button size="sm" onClick={saveFilters} disabled={saving} className="rounded-xl text-xs h-7 gap-1">
                    {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                    Save Filters
                  </Button>
                </div>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Products/brands selected here will <strong>NOT</strong> appear in this warehouse's order view.
            </p>
            <ExclusionFilterEditor
              brandIds={editBrands}
              productIds={editProducts}
              onBrandsChange={setEditBrands}
              onProductsChange={setEditProducts}
              allBrands={allBrands}
              allProducts={allProducts}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Reusable Exclusion Filter Editor ─── */

function ExclusionFilterEditor({
  brandIds, productIds, onBrandsChange, onProductsChange, allBrands, allProducts,
}: {
  brandIds: string[]; productIds: string[]; onBrandsChange: (ids: string[]) => void;
  onProductsChange: (ids: string[]) => void; allBrands: any[]; allProducts: any[];
}) {
  const [brandSearch, setBrandSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [tab, setTab] = useState<"brands" | "products">("brands");

  const toggleBrand = (id: string) => {
    onBrandsChange(brandIds.includes(id) ? brandIds.filter((b) => b !== id) : [...brandIds, id]);
  };
  const toggleProduct = (id: string) => {
    onProductsChange(productIds.includes(id) ? productIds.filter((p) => p !== id) : [...productIds, id]);
  };

  const filteredBrands = allBrands.filter((b: any) => b.name.toLowerCase().includes(brandSearch.toLowerCase()));
  const filteredProducts = allProducts.filter((p: any) => p.title.toLowerCase().includes(productSearch.toLowerCase()));

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2.5">
      {(brandIds.length > 0 || productIds.length > 0) && (
        <div>
          <p className="text-[10px] font-semibold text-foreground mb-1.5">Currently excluded:</p>
          <div className="flex flex-wrap gap-1.5">
            {brandIds.map((id) => (
              <Badge key={id} variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/20 gap-1 cursor-pointer hover:bg-amber-500/20" onClick={() => toggleBrand(id)}>
                🏷 {allBrands.find((b: any) => b.id === id)?.name || id.slice(0, 8)}
                <X className="w-2.5 h-2.5" />
              </Badge>
            ))}
            {productIds.map((id) => (
              <Badge key={id} variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/20 gap-1 cursor-pointer hover:bg-amber-500/20" onClick={() => toggleProduct(id)}>
                📦 {(allProducts.find((p: any) => p.id === id)?.title || id).slice(0, 35)}
                <X className="w-2.5 h-2.5" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 border-b border-border/50 pb-1">
        <button onClick={() => setTab("brands")} className={`text-[11px] font-semibold pb-1 border-b-2 transition-colors ${tab === "brands" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          Brands ({brandIds.length})
        </button>
        <button onClick={() => setTab("products")} className={`text-[11px] font-semibold pb-1 border-b-2 transition-colors ${tab === "products" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
          Products ({productIds.length})
        </button>
      </div>

      {tab === "brands" ? (
        <div className="space-y-1.5">
          <Input value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} placeholder="Search brands to exclude..." className="h-8 text-xs rounded-lg" />
          <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
            {filteredBrands.slice(0, 80).map((b: any) => (
              <label key={b.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
                <Checkbox checked={brandIds.includes(b.id)} onCheckedChange={() => toggleBrand(b.id)} className="h-3.5 w-3.5" />
                <span className="text-xs text-foreground">{b.name}</span>
              </label>
            ))}
            {filteredBrands.length === 0 && <p className="text-[10px] text-muted-foreground py-3 text-center">No brands found</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products to exclude..." className="h-8 text-xs rounded-lg" />
          <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
            {filteredProducts.slice(0, 80).map((p: any) => (
              <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
                <Checkbox checked={productIds.includes(p.id)} onCheckedChange={() => toggleProduct(p.id)} className="h-3.5 w-3.5" />
                <span className="text-xs text-foreground truncate">{p.title}</span>
              </label>
            ))}
            {filteredProducts.length === 0 && <p className="text-[10px] text-muted-foreground py-3 text-center">No products found</p>}
          </div>
        </div>
      )}
    </div>
  );
}
