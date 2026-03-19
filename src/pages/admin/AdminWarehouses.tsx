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
import {
  Plus, Pencil, Trash2, Loader2, Warehouse, Users, Package, Tag, DollarSign,
  CheckCircle2, Clock, AlertTriangle, Eye
} from "lucide-react";
import { toast } from "sonner";

export default function AdminWarehouses() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("warehouses");

  // Warehouse form
  const [whOpen, setWhOpen] = useState(false);
  const [whForm, setWhForm] = useState({ id: "", name: "", location: "", contact_email: "", is_active: true });
  const [whEditing, setWhEditing] = useState(false);

  // Warehouse user form
  const [userOpen, setUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({ id: "", username: "", password: "", full_name: "", email: "", warehouse_id: "", is_active: true });
  const [userEditing, setUserEditing] = useState(false);

  // Fetch warehouses
  const { data: warehouses = [], isLoading: whLoading } = useQuery({
    queryKey: ["admin-warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("warehouses").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch warehouse users
  const { data: warehouseUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-warehouse-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("warehouse_users").select("*").order("created_at", { ascending: false });
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

  // Save warehouse user
  const saveUser = useMutation({
    mutationFn: async (f: typeof userForm) => {
      const payload: any = {
        username: f.username,
        full_name: f.full_name || null,
        email: f.email || null,
        warehouse_id: f.warehouse_id || null,
        is_active: f.is_active,
      };
      if (f.id) {
        if (f.password) payload.password_hash = f.password;
        const { error } = await supabase.from("warehouse_users").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        payload.password_hash = f.password;
        const { error } = await supabase.from("warehouse_users").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-warehouse-users"] }); toast.success("Saved"); setUserOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  // Delete warehouse user
  const delUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("warehouse_users").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-warehouse-users"] }); toast.success("Deleted"); },
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

      // Notify the warehouse
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
      <p className="text-sm text-muted-foreground mb-6">Manage warehouses, staff, and requests</p>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
          <TabsTrigger value="users">Staff</TabsTrigger>
          <TabsTrigger value="requests">
            Requests
            {requests.filter((r: any) => r.status === "pending").length > 0 && (
              <Badge className="ml-1.5 text-[9px] bg-destructive text-white px-1.5 py-0">
                {requests.filter((r: any) => r.status === "pending").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

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

        {/* Staff Tab */}
        <TabsContent value="users">
          <div className="flex justify-end mb-4">
            <Dialog open={userOpen} onOpenChange={(v) => { setUserOpen(v); if (!v) { setUserForm({ id: "", username: "", password: "", full_name: "", email: "", warehouse_id: "", is_active: true }); setUserEditing(false); } }}>
              <DialogTrigger asChild><Button size="sm" className="rounded-xl"><Plus className="h-4 w-4 mr-1.5" />Add Staff</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{userEditing ? "Edit" : "Add"} Staff Member</DialogTitle></DialogHeader>
                <div className="grid gap-3 mt-2">
                  <div><Label>Username *</Label><Input value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} /></div>
                  <div><Label>{userEditing ? "New Password (leave empty to keep)" : "Password *"}</Label><Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /></div>
                  <div><Label>Full Name</Label><Input value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} /></div>
                  <div><Label>Email</Label><Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></div>
                  <div>
                    <Label>Warehouse</Label>
                    <Select value={userForm.warehouse_id} onValueChange={(v) => setUserForm({ ...userForm, warehouse_id: v })}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w: any) => (
                          <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center gap-2 text-sm"><Switch checked={userForm.is_active} onCheckedChange={(v) => setUserForm({ ...userForm, is_active: v })} />Active</label>
                  <Button className="rounded-xl" onClick={() => saveUser.mutate(userForm)} disabled={!userForm.username || (!userEditing && !userForm.password) || saveUser.isPending}>
                    {saveUser.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}{userEditing ? "Update" : "Create"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {usersLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="space-y-2">
              {warehouseUsers.map((u: any) => (
                <div key={u.id} className="bg-card rounded-xl border border-border/50 p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-foreground text-sm">{u.full_name || u.username}</p>
                    <p className="text-xs text-muted-foreground">@{u.username} · {getWarehouseName(u.warehouse_id)}</p>
                    {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[9px] ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => {
                      setUserForm({ id: u.id, username: u.username, password: "", full_name: u.full_name || "", email: u.email || "", warehouse_id: u.warehouse_id || "", is_active: u.is_active });
                      setUserEditing(true); setUserOpen(true);
                    }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive" onClick={() => { if (confirm("Delete?")) delUser.mutate(u.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
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
                        <Select value={r.status} onValueChange={(v) => updateRequestStatus.mutate({ id: r.id, status: v })}>
                          <SelectTrigger className={`h-7 text-[10px] rounded-lg border-0 ${statusColors[r.status] || statusColors.pending}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
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
