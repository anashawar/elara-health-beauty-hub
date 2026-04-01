import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  LogOut, Plus, Package, Tag, DollarSign, Bell, Loader2, AlertTriangle,
  CheckCircle2, Clock, Search, Filter, ChevronDown
} from "lucide-react";
import { toast } from "sonner";

type TabType = "missing_brand" | "missing_product" | "price_note";

interface WarehouseUser {
  id: string;
  username: string;
  full_name: string;
  warehouse_id: string;
}

export default function WarehouseSystemPage() {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<WarehouseUser | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [logging, setLogging] = useState(false);

  const [tab, setTab] = useState<TabType>("missing_brand");
  const [requests, setRequests] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  // Form state
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const handleLogin = async () => {
    if (!username || !password) return;
    setLogging(true);
    
    try {
      // Try warehouse_users table first
      const { data, error } = await supabase.rpc("validate_warehouse_login", {
        _username: username.toLowerCase().trim(),
        _password: password,
      }) as { data: any; error: any };

      if (!error && data?.valid) {
        const userData = {
          id: data.id,
          username: data.username,
          full_name: data.full_name,
          warehouse_id: data.warehouse_id,
        } as WarehouseUser;
        setUser(userData);
        setAuthed(true);
        localStorage.setItem("warehouse_user", JSON.stringify(userData));
        setLogging(false);
        return;
      }

      // Fallback: try prep_access_tokens table
      const { data: prepData, error: prepError } = await supabase.rpc("validate_prep_token", {
        _username: username,
        _token: "login",
      }) as { data: any; error: any };

      if (!prepError && prepData?.valid) {
        // Verify password against stored hash
        const { data: passValid } = await supabase.rpc("verify_prep_password", {
          _plain_password: password,
          _stored_hash: prepData.password_hash,
        }) as { data: any; error: any };

        if (passValid) {
          const userData = {
            id: prepData.id,
            username: username,
            full_name: prepData.label || username,
            warehouse_id: "",
          } as WarehouseUser;
          setUser(userData);
          setAuthed(true);
          localStorage.setItem("warehouse_user", JSON.stringify(userData));
          setLogging(false);
          return;
        }
      }

      toast.error("Invalid credentials");
      setLogging(false);
      return;
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Connection error. Please try again.");
      setLogging(false);
      return;
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("warehouse_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        setAuthed(true);
      } catch {}
    }
  }, []);

  const handleLogout = () => {
    setAuthed(false);
    setUser(null);
    localStorage.removeItem("warehouse_user");
  };

  const fetchData = useCallback(async () => {
    if (!authed || !user) return;
    setLoading(true);

    const [warehouseRes, brandRes, prodRes] = await Promise.all([
      supabase.functions.invoke("prep-orders", {
        body: null,
        method: "GET",
      }).then(() => null).catch(() => null),
      supabase.from("brands").select("id, name").order("name"),
      supabase.from("products").select("id, title, price").order("title").limit(500),
    ]);

    // Fetch warehouse data via edge function
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prep-orders?action=warehouse-data&warehouse_id=${user.warehouse_id}&user_id=${user.id}`,
        { headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" } }
      );
      const wData = await res.json();
      setRequests(wData.requests || []);
      setNotifications(wData.notifications || []);
      setUnreadCount((wData.notifications || []).filter((n: any) => !n.is_read).length);
    } catch {
      setRequests([]);
      setNotifications([]);
      setUnreadCount(0);
    }

    setBrands(brandRes.data || []);
    setProducts(prodRes.data || []);
    setLoading(false);
  }, [authed, user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddRequest = async () => {
    if (!title.trim() || !user) return;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prep-orders`,
        {
          method: "POST",
          headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "warehouse-add-request",
            user_id: user.id,
            warehouse_id: user.warehouse_id,
            type: tab,
            title: title.trim(),
            description: description.trim() || null,
            priority,
            created_by_username: user.username,
            brand_id: selectedBrandId || null,
            product_id: selectedProductId || null,
          }),
        }
      );
      const result = await res.json();
      if (!res.ok) { toast.error(result.error || "Failed to add request"); return; }

      toast.success("Request added");
      setAddOpen(false);
      setTitle("");
      setDescription("");
      setSelectedBrandId("");
      setSelectedProductId("");
      setPriority("normal");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to add request");
    }
  };

  const markNotifsRead = async () => {
    if (!user) return;
    const unread = notifications.filter((n: any) => !n.is_read);
    if (unread.length === 0) return;
    try {
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prep-orders`,
        {
          method: "POST",
          headers: { "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "warehouse-mark-read",
            user_id: user.id,
            warehouse_id: user.warehouse_id,
            notification_ids: unread.map((n: any) => n.id),
          }),
        }
      );
    } catch {}
    setUnreadCount(0);
    fetchData();
  };

  const filteredRequests = requests.filter((r: any) => {
    if (r.type !== tab) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tabConfig = [
    { key: "missing_brand" as TabType, label: "Missing Brands", icon: Tag, color: "text-amber-600" },
    { key: "missing_product" as TabType, label: "Missing Products", icon: Package, color: "text-blue-600" },
    { key: "price_note" as TabType, label: "Price Notes", icon: DollarSign, color: "text-emerald-600" },
  ];

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

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border border-border/50 p-6 w-full max-w-sm shadow-premium">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Package className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-display font-bold text-foreground">Warehouse System</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to manage requests</p>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Username</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            </div>
            <Button className="w-full rounded-xl" onClick={handleLogin} disabled={logging || !username || !password}>
              {logging && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />} Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border/50 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">Warehouse System</h1>
            <p className="text-xs text-muted-foreground">{user?.full_name || user?.username}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs) markNotifsRead(); }} className="relative p-2 rounded-xl hover:bg-secondary/50">
              <Bell className="w-5 h-5 text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <Button size="sm" variant="ghost" className="rounded-xl" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Notifications dropdown */}
      {showNotifs && (
        <div className="bg-card border-b border-border/50 px-4 py-3 max-w-4xl mx-auto">
          <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Recent Notifications</p>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications</p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {notifications.slice(0, 20).map((n: any) => (
                <div key={n.id} className={`rounded-lg px-3 py-2 text-sm ${n.is_read ? "bg-secondary/30" : "bg-primary/5 border border-primary/10"}`}>
                  <p className="font-medium text-foreground">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {tabConfig.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.key ? "bg-primary text-primary-foreground" : "bg-card border border-border/50 text-foreground hover:bg-secondary/50"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Search + Filter + Add */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 rounded-xl" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl shrink-0"><Plus className="h-4 w-4 mr-1" />Add</Button>
            </DialogTrigger>
            <DialogContent className="w-[min(96vw,500px)] max-w-none">
              <DialogHeader>
                <DialogTitle>
                  Add {tab === "missing_brand" ? "Missing Brand" : tab === "missing_product" ? "Missing Product" : "Price Note"}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 mt-2">
                <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tab === "missing_brand" ? "Brand name" : tab === "missing_product" ? "Product name" : "Product with price issue"} /></div>
                <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details..." rows={3} /></div>

                {tab === "price_note" && (
                  <div>
                    <Label>Product (optional)</Label>
                    <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {products.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.title} — {p.price?.toLocaleString()} IQD</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {tab === "missing_product" && (
                  <div>
                    <Label>Brand (optional)</Label>
                    <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select brand" /></SelectTrigger>
                      <SelectContent className="max-h-60">
                        {brands.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="rounded-xl" onClick={handleAddRequest} disabled={!title.trim()}>Submit</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Requests list */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No requests yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRequests.map((r: any) => (
              <div key={r.id} className="bg-card rounded-xl border border-border/50 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm">{r.title}</h3>
                    {r.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className={`text-[9px] ${priorityColors[r.priority] || priorityColors.normal}`}>{r.priority}</Badge>
                    <Badge className={`text-[9px] ${statusColors[r.status] || statusColors.pending}`}>{r.status}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span>By {r.created_by_username}</span>
                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
