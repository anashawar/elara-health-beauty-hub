import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Package,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Clock,
  MapPin,
  Phone,
  StickyNote,
  Box,
  LogIn,
  Lock,
  User,
  LogOut,
  Warehouse,
  LayoutGrid,
  List,
  Search,
  ChevronRight,
  X,
  ZoomIn,
  ChevronLeft,
  Calendar,
  CreditCard,
  UserCircle,
  DollarSign,
  BarChart3,
  TrendingUp,
  CalendarDays,
  ChevronDown,
  FileText,
  Send,
  MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import elaraLogo from "@/assets/elara-logo.png";

interface PrepProduct {
  id: string;
  title: string;
  volume: string | null;
  image_url: string | null;
  all_images?: string[];
}

interface PrepItem {
  id: string;
  quantity: number;
  price?: number;
  cost?: number;
  total_cost?: number;
  product: PrepProduct | null;
}

interface PrepAddress {
  city: string;
  area: string | null;
  street: string | null;
  building: string | null;
  floor: string | null;
  apartment: string | null;
  phone: string | null;
  label: string | null;
}

interface PrepOrder {
  id: string;
  status: string;
  created_at: string;
  notes: string | null;
  customer_name?: string;
  payment_method?: string;
  total_cost?: number;
  items: PrepItem[];
  address: PrepAddress | null;
}

interface CostOrder {
  id: string;
  created_at: string;
  status: string;
  total_cost: number;
  item_count: number;
  items: {
    product_id: string;
    title: string;
    quantity: number;
    unit_cost: number;
    total_cost: number;
    sale_price: number;
  }[];
}

interface AnalyticsData {
  total_orders: number;
  total_items: number;
  status_breakdown: Record<string, number>;
  orders_by_day: { date: string; count: number }[];
}

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const FUNC_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/prep-orders`;

type TabType = "pending" | "prepared" | "costs" | "analytics";

function formatOrderTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatOrderTimeShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatIQD(amount: number): string {
  return amount.toLocaleString("en-US") + " IQD";
}

function getDateRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  
  switch (preset) {
    case "today": {
      return { from: today, to: today };
    }
    case "week": {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { from: weekAgo.toISOString().split("T")[0], to: today };
    }
    case "month": {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { from: monthAgo.toISOString().split("T")[0], to: today };
    }
    default:
      return { from: "", to: "" };
  }
}

export default function PrepOrdersPage() {
  const { token: urlToken } = useParams<{ token: string }>();
  const [token, setToken] = useState<string | null>(urlToken || null);
  const [authenticated, setAuthenticated] = useState(false);
  const [warehouseLabel, setWarehouseLabel] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [orders, setOrders] = useState<PrepOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preparingId, setPreparingId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Costs state
  const [costOrders, setCostOrders] = useState<CostOrder[]>([]);
  const [costSummary, setCostSummary] = useState({ total_cost: 0, total_orders: 0, total_items: 0 });
  const [costLoading, setCostLoading] = useState(false);
  const [costDatePreset, setCostDatePreset] = useState("week");
  const [costDateFrom, setCostDateFrom] = useState("");
  const [costDateTo, setCostDateTo] = useState("");
  const [expandedCostOrder, setExpandedCostOrder] = useState<string | null>(null);

  // Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDatePreset, setAnalyticsDatePreset] = useState("month");
  const [analyticsDateFrom, setAnalyticsDateFrom] = useState("");
  const [analyticsDateTo, setAnalyticsDateTo] = useState("");

  useEffect(() => {
    if (urlToken) {
      setToken(null);
      setAuthenticated(false);
    }
  }, [urlToken]);

  useEffect(() => {
    const saved = sessionStorage.getItem("prep-session");
    if (saved) {
      try {
        const { token: t, label } = JSON.parse(saved);
        setToken(t);
        setWarehouseLabel(label);
        setAuthenticated(true);
      } catch {
        sessionStorage.removeItem("prep-session");
      }
    }
  }, []);

  const handleLogin = async () => {
    setLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch(FUNC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || "Login failed");
        return;
      }
      setToken(data.token);
      setWarehouseLabel(data.label || "");
      setAuthenticated(true);
      sessionStorage.setItem("prep-session", JSON.stringify({ token: data.token, label: data.label }));
    } catch {
      setLoginError("Connection error. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setToken(null);
    setOrders([]);
    sessionStorage.removeItem("prep-session");
  };

  const fetchOrders = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const statuses = tab === "pending" ? "processing" : "prepared";
      const res = await fetch(`${FUNC_URL}?token=${token}&status=${statuses}`);
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "Invalid or expired link") {
          handleLogout();
          return;
        }
        throw new Error(data.error || "Failed to load orders");
      }
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, tab]);

  const fetchCosts = useCallback(async () => {
    if (!token) return;
    setCostLoading(true);
    try {
      let from = costDateFrom;
      let to = costDateTo;
      if (costDatePreset !== "custom") {
        const range = getDateRange(costDatePreset);
        from = range.from;
        to = range.to;
      }
      const params = new URLSearchParams({ token, action: "costs-summary" });
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`${FUNC_URL}?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load costs");
      setCostOrders(data.orders || []);
      setCostSummary(data.summary || { total_cost: 0, total_orders: 0, total_items: 0 });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCostLoading(false);
    }
  }, [token, costDatePreset, costDateFrom, costDateTo]);

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    setAnalyticsLoading(true);
    try {
      let from = analyticsDateFrom;
      let to = analyticsDateTo;
      if (analyticsDatePreset !== "custom") {
        const range = getDateRange(analyticsDatePreset);
        from = range.from;
        to = range.to;
      }
      const params = new URLSearchParams({ token, action: "analytics" });
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`${FUNC_URL}?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load analytics");
      setAnalytics(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [token, analyticsDatePreset, analyticsDateFrom, analyticsDateTo]);

  useEffect(() => {
    if (authenticated && (tab === "pending" || tab === "prepared")) fetchOrders();
  }, [fetchOrders, authenticated, tab]);

  useEffect(() => {
    if (authenticated && tab === "costs") fetchCosts();
  }, [fetchCosts, authenticated, tab]);

  useEffect(() => {
    if (authenticated && tab === "analytics") fetchAnalytics();
  }, [fetchAnalytics, authenticated, tab]);

  // Live sync for orders tabs
  useEffect(() => {
    if (!authenticated || (tab !== "pending" && tab !== "prepared")) return;
    const channel = supabase
      .channel("prep-orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders(true);
      })
      .subscribe();
    const interval = setInterval(() => fetchOrders(true), 15000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchOrders, authenticated, tab]);

  const markPrepared = async (orderId: string) => {
    setPreparingId(orderId);
    try {
      const res = await fetch(`${FUNC_URL}?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(`Order #${orderId.slice(0, 8)} marked as prepared!`);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      if (selectedOrder === orderId) setSelectedOrder(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPreparingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.id.toLowerCase().includes(q) ||
      o.items.some((i) => i.product?.title?.toLowerCase().includes(q)) ||
      o.address?.city?.toLowerCase().includes(q) ||
      o.address?.phone?.includes(q) ||
      o.customer_name?.toLowerCase().includes(q)
    );
  });

  const selectedOrderData = selectedOrder ? orders.find((o) => o.id === selectedOrder) : null;
  const totalItemsAll = orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0);

  // ---- LOGIN SCREEN ----
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex">
        {/* Left branding panel */}
        <div className="hidden lg:flex lg:w-[520px] xl:w-[600px] bg-gradient-to-br from-primary/10 via-primary/5 to-background border-r border-border/50 flex-col justify-between p-12">
          <div className="flex items-center gap-4">
            <img src={elaraLogo} alt="ELARA" className="h-20 w-auto object-contain drop-shadow-lg" />
          </div>
          <div className="space-y-6">
            <h2 className="text-5xl font-display font-bold text-foreground tracking-tight leading-[1.1]">
              Warehouse<br />Operations<br /><span className="text-primary">Hub</span>
            </h2>
            <p className="text-base text-muted-foreground max-w-sm leading-relaxed">
              Prepare orders, track costs, and keep your warehouse running at peak efficiency.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} ELARA · elarastore.co
          </p>
        </div>

        {/* Right login form */}
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-sm space-y-8"
          >
            <div className="text-center space-y-4 lg:text-left">
              <div className="mx-auto lg:mx-0 lg:hidden">
                <img src={elaraLogo} alt="ELARA" className="h-24 w-auto object-contain mx-auto lg:mx-0 drop-shadow-lg" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Sign In</h1>
                <p className="text-sm text-muted-foreground mt-1">Access your warehouse dashboard</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Username</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="pl-11 h-12 rounded-xl border-border/60 bg-muted/30 text-sm focus:bg-background transition-colors"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pl-11 h-12 rounded-xl border-border/60 bg-muted/30 text-sm focus:bg-background transition-colors"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                </div>
              </div>

              <AnimatePresence>
                {loginError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-xl"
                  >
                    {loginError}
                  </motion.p>
                )}
              </AnimatePresence>

              <Button
                onClick={handleLogin}
                disabled={loggingIn || !username.trim() || !password.trim()}
                className="w-full h-12 rounded-xl gap-2.5 text-sm font-semibold shadow-lg shadow-primary/20"
              >
                {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                Sign In
              </Button>
            </div>

            <p className="text-center lg:text-left text-[11px] text-muted-foreground/60">
              elarastore.co/warehouse · Contact admin for access
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // ---- MAIN DASHBOARD ----
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Image zoom overlay */}
      <AnimatePresence>
        {zoomImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setZoomImage(null)}
          >
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={zoomImage}
              alt=""
              className="max-w-full max-h-[85vh] object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border/60 shadow-sm">
        <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={elaraLogo} alt="ELARA" className="h-10 w-auto object-contain drop-shadow-md" />
              <div className="hidden sm:block">
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-display font-bold text-foreground tracking-tight">ELARA Warehouse</h1>
                  <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-1.5 py-0 gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Warehouse className="w-3 h-3" />
                  {warehouseLabel || "Warehouse"}
                </div>
              </div>
            </div>

            {/* Search — desktop (only for order tabs) */}
            {(tab === "pending" || tab === "prepared") && (
              <div className="hidden md:block relative w-64 lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search orders, products, customers..."
                  className="pl-10 h-9 rounded-xl bg-muted/40 border-border/40 text-sm"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(tab === "pending" || tab === "prepared") && (
              <div className="hidden md:flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/30">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (tab === "costs") fetchCosts();
                else if (tab === "analytics") fetchAnalytics();
                else fetchOrders();
              }}
              disabled={loading || costLoading || analyticsLoading}
              className="rounded-xl h-9 gap-1.5 border-border/60 text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(loading || costLoading || analyticsLoading) ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="rounded-xl h-9 gap-1.5 text-muted-foreground hover:text-destructive text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>

        {/* Mobile search */}
        {(tab === "pending" || tab === "prepared") && (
          <div className="px-4 pb-3 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders..."
                className="pl-10 h-9 rounded-xl bg-muted/40 border-border/40 text-sm"
              />
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 flex">
        {/* Left sidebar */}
        <aside className="hidden lg:flex w-64 xl:w-72 border-r border-border/50 flex-col bg-card/50 p-5 gap-5">
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Overview</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-muted/40 border border-border/40 p-3">
                <p className="text-2xl font-bold text-foreground">{orders.length}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {tab === "pending" ? "To Prepare" : tab === "prepared" ? "Prepared" : "Orders"}
                </p>
              </div>
              <div className="rounded-xl bg-muted/40 border border-border/40 p-3">
                <p className="text-2xl font-bold text-foreground">{totalItemsAll}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Total Items</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Orders</p>
            <button
              onClick={() => { setTab("pending"); setSelectedOrder(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === "pending"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Package className="w-4 h-4" />
              To Prepare
              {tab === "pending" && orders.length > 0 && (
                <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5">
                  {orders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setTab("prepared"); setSelectedOrder(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === "prepared"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Prepared
            </button>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Finance</p>
            <button
              onClick={() => { setTab("costs"); setSelectedOrder(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === "costs"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Costs & Payments
            </button>
            <button
              onClick={() => { setTab("analytics"); setSelectedOrder(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === "analytics"
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
          </div>

          <div className="mt-auto pt-4 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground/50 text-center">
              Powered by ELARA · v3.0
            </p>
          </div>
        </aside>

        {/* Mobile bottom tabs */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-xl border-t border-border/60 px-2 py-1.5 flex gap-1">
          {[
            { key: "pending" as TabType, icon: Package, label: "Prepare" },
            { key: "prepared" as TabType, icon: CheckCircle2, label: "Done" },
            { key: "costs" as TabType, icon: DollarSign, label: "Costs" },
            { key: "analytics" as TabType, icon: BarChart3, label: "Stats" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSelectedOrder(null); }}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold rounded-xl transition-all ${
                tab === t.key
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6 overflow-auto">
            {/* ORDERS TABS (pending/prepared) */}
            {(tab === "pending" || tab === "prepared") && (
              <>
                {loading && (
                  <div className="py-20 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">Loading orders...</p>
                  </div>
                )}

                {error && !loading && (
                  <div className="py-20 text-center">
                    <p className="text-sm text-destructive">{error}</p>
                    <Button variant="outline" size="sm" onClick={() => fetchOrders()} className="mt-3 rounded-xl">
                      Try Again
                    </Button>
                  </div>
                )}

                {!loading && !error && filteredOrders.length === 0 && (
                  <div className="py-20 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-muted/50 flex items-center justify-center">
                      <Box className="w-7 h-7 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {searchQuery ? "No matching orders" : tab === "pending" ? "All clear! No orders to prepare" : "No prepared orders yet"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchQuery ? "Try a different search term." : tab === "pending" ? "New orders will appear here in real-time." : "Orders you prepare will show up here."}
                    </p>
                  </div>
                )}

                {!loading && !error && filteredOrders.length > 0 && (
                  <div className="flex gap-6">
                    <div className={`flex-1 min-w-0 ${
                      selectedOrder && viewMode === "grid" ? "hidden xl:block" : ""
                    }`}>
                      <AnimatePresence mode="popLayout">
                        <div className={
                          viewMode === "grid"
                            ? "grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4"
                            : "space-y-3"
                        }>
                          {filteredOrders.map((order, i) => (
                            <motion.div
                              key={order.id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -100 }}
                              transition={{ duration: 0.25, delay: i * 0.03 }}
                            >
                              {viewMode === "grid" ? (
                                <OrderCardGrid
                                  order={order}
                                  isPreparing={preparingId === order.id}
                                  isSelected={selectedOrder === order.id}
                                  onSelect={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                                  onPrepare={tab === "pending" ? () => markPrepared(order.id) : undefined}
                                />
                              ) : (
                                <OrderCardList
                                  order={order}
                                  isPreparing={preparingId === order.id}
                                  isSelected={selectedOrder === order.id}
                                  onSelect={() => setSelectedOrder(selectedOrder === order.id ? null : order.id)}
                                  onPrepare={tab === "pending" ? () => markPrepared(order.id) : undefined}
                                />
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </AnimatePresence>
                    </div>

                    {selectedOrderData && (
                      <div className={`${viewMode === "grid" ? "w-full xl:w-[420px] xl:flex-shrink-0" : "hidden xl:block xl:w-[420px] xl:flex-shrink-0"}`}>
                        <div className="sticky top-[73px]">
                          <OrderDetailPanel
                            order={selectedOrderData}
                            isPreparing={preparingId === selectedOrderData.id}
                            onPrepare={tab === "pending" ? () => markPrepared(selectedOrderData.id) : undefined}
                            onClose={() => setSelectedOrder(null)}
                            onZoomImage={setZoomImage}
                            token={token}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* COSTS TAB */}
            {tab === "costs" && (
              <CostsTab
                loading={costLoading}
                orders={costOrders}
                summary={costSummary}
                datePreset={costDatePreset}
                setDatePreset={setCostDatePreset}
                dateFrom={costDateFrom}
                setDateFrom={setCostDateFrom}
                dateTo={costDateTo}
                setDateTo={setCostDateTo}
                expandedOrder={expandedCostOrder}
                setExpandedOrder={setExpandedCostOrder}
                onRefresh={fetchCosts}
              />
            )}

            {/* ANALYTICS TAB */}
            {tab === "analytics" && (
              <AnalyticsTab
                loading={analyticsLoading}
                data={analytics}
                datePreset={analyticsDatePreset}
                setDatePreset={setAnalyticsDatePreset}
                dateFrom={analyticsDateFrom}
                setDateFrom={setAnalyticsDateFrom}
                dateTo={analyticsDateTo}
                setDateTo={setAnalyticsDateTo}
                onRefresh={fetchAnalytics}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── Date Range Picker Component ─── */
function DateRangeFilter({
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
}: {
  preset: string;
  setPreset: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {[
        { key: "today", label: "Today" },
        { key: "week", label: "This Week" },
        { key: "month", label: "This Month" },
        { key: "custom", label: "Custom" },
      ].map((p) => (
        <button
          key={p.key}
          onClick={() => setPreset(p.key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            preset === p.key
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
          }`}
        >
          {p.label}
        </button>
      ))}
      {preset === "custom" && (
        <div className="flex items-center gap-2 ml-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 text-xs rounded-lg w-36"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 text-xs rounded-lg w-36"
          />
        </div>
      )}
    </div>
  );
}

/* ─── Costs Tab ─── */
function CostsTab({
  loading,
  orders,
  summary,
  datePreset,
  setDatePreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  expandedOrder,
  setExpandedOrder,
  onRefresh,
}: {
  loading: boolean;
  orders: CostOrder[];
  summary: { total_cost: number; total_orders: number; total_items: number };
  datePreset: string;
  setDatePreset: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  expandedOrder: string | null;
  setExpandedOrder: (v: string | null) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Costs & Payments</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Track cost of goods for warehouse settlement</p>
        </div>
        <DateRangeFilter
          preset={datePreset}
          setPreset={setDatePreset}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-primary/5 border border-primary/20 p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Cost</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatIQD(summary.total_cost)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Amount to settle with warehouse</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl bg-card border border-border/50 p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Orders</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{summary.total_orders}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Orders in selected period</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card border border-border/50 p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{summary.total_items}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Total products handled</p>
        </motion.div>
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading cost data...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-muted/50 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-muted-foreground/30" />
          </div>
          <p className="text-sm font-semibold text-foreground">No orders found</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting the date range</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Order Breakdown ({orders.length} orders)
          </p>
          {orders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border/50 bg-card overflow-hidden"
            >
              <button
                onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold font-mono text-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
                  <Badge variant="outline" className={`text-[9px] font-bold uppercase ${
                    order.status === "delivered" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                    order.status === "prepared" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                    "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  }`}>
                    {order.status}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">{order.item_count} items</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">{formatIQD(order.total_cost)}</span>
                  <span className="text-[11px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedOrder === order.id ? "rotate-180" : ""}`} />
                </div>
              </button>

              <AnimatePresence>
                {expandedOrder === order.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border/30 divide-y divide-border/20">
                      <div className="grid grid-cols-5 px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/20">
                        <span className="col-span-2">Product</span>
                        <span className="text-center">Qty</span>
                        <span className="text-right">Unit Cost</span>
                        <span className="text-right">Total Cost</span>
                      </div>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-5 px-4 py-2.5 items-center text-sm">
                          <span className="col-span-2 text-xs text-foreground truncate pr-2">{item.title}</span>
                          <span className="text-center text-xs text-muted-foreground">{item.quantity}</span>
                          <span className="text-right text-xs text-muted-foreground">{item.unit_cost.toLocaleString()}</span>
                          <span className="text-right text-xs font-semibold text-foreground">{formatIQD(item.total_cost)}</span>
                        </div>
                      ))}
                      <div className="grid grid-cols-5 px-4 py-2.5 bg-primary/5">
                        <span className="col-span-4 text-xs font-bold text-foreground text-right pr-4">Order Total:</span>
                        <span className="text-right text-sm font-bold text-primary">{formatIQD(order.total_cost)}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Analytics Tab ─── */
function AnalyticsTab({
  loading,
  data,
  datePreset,
  setDatePreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  onRefresh,
}: {
  loading: boolean;
  data: AnalyticsData | null;
  datePreset: string;
  setDatePreset: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  onRefresh: () => void;
}) {
  const maxDayCount = data?.orders_by_day?.reduce((max, d) => Math.max(max, d.count), 0) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Analytics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Order statistics and performance overview</p>
        </div>
        <DateRangeFilter
          preset={datePreset}
          setPreset={setDatePreset}
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
        />
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      ) : !data ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">No data available</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-primary/5 border border-primary/20 p-5">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-primary" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Orders</p>
              </div>
              <p className="text-3xl font-bold text-foreground">{data.total_orders}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-card border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Items</p>
              </div>
              <p className="text-3xl font-bold text-foreground">{data.total_items}</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl bg-card border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Avg/Day</p>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {data.orders_by_day.length > 0 ? (data.total_orders / data.orders_by_day.length).toFixed(1) : "0"}
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl bg-card border border-border/50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active Days</p>
              </div>
              <p className="text-3xl font-bold text-foreground">{data.orders_by_day.length}</p>
            </motion.div>
          </div>

          {/* Status Breakdown */}
          <div className="rounded-2xl border border-border/50 bg-card p-5">
            <h3 className="text-sm font-bold text-foreground mb-4">Status Breakdown</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(data.status_breakdown).map(([status, count]) => (
                <div key={status} className="rounded-xl bg-muted/30 border border-border/30 p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{count}</p>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mt-0.5 capitalize">{status}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Orders by Day Chart */}
          {data.orders_by_day.length > 0 && (
            <div className="rounded-2xl border border-border/50 bg-card p-5">
              <h3 className="text-sm font-bold text-foreground mb-4">Orders by Day</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {data.orders_by_day.map((day) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground w-20 flex-shrink-0 font-mono">
                      {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <div className="flex-1 h-7 bg-muted/20 rounded-lg overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(day.count / maxDayCount) * 100}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-lg flex items-center justify-end px-2"
                      >
                        <span className="text-[10px] font-bold text-primary-foreground">{day.count}</span>
                      </motion.div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Grid Card ─── */
function OrderCardGrid({
  order,
  isPreparing,
  isSelected,
  onSelect,
  onPrepare,
}: {
  order: PrepOrder;
  isPreparing: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onPrepare?: () => void;
}) {
  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);
  const timeAgo = getTimeAgo(order.created_at);

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border bg-card overflow-hidden cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "border-primary ring-1 ring-primary/20 shadow-md" : "border-border/60 hover:border-border"
      }`}
    >
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="text-sm font-bold text-foreground font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="w-2.5 h-2.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{timeAgo} · {formatOrderTimeShort(order.created_at)}</span>
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] font-bold uppercase ${
            order.status === "prepared"
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          }`}
        >
          {order.status === "prepared" ? "✓ Done" : "Awaiting"}
        </Badge>
      </div>

      {/* Customer name */}
      {order.customer_name && (
        <div className="px-4 pt-2.5 flex items-center gap-1.5">
          <UserCircle className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground truncate">{order.customer_name}</span>
        </div>
      )}

      {/* Compact item preview */}
      <div className="px-4 py-2.5 space-y-2">
        {order.items.slice(0, 3).map((item) => (
          <div key={item.id} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-muted/50 overflow-hidden border border-border/30 flex-shrink-0">
              {item.product?.image_url ? (
                <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-3.5 h-3.5 text-muted-foreground/20" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground truncate">{item.product?.title || "Unknown"}</p>
              {item.cost != null && item.cost > 0 && (
                <p className="text-[10px] text-muted-foreground">Cost: {formatIQD(item.cost)}</p>
              )}
            </div>
            <span className="text-xs font-bold text-primary flex-shrink-0">×{item.quantity}</span>
          </div>
        ))}
        {order.items.length > 3 && (
          <p className="text-[10px] text-muted-foreground">+{order.items.length - 3} more items</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border/30 flex items-center justify-between bg-muted/5">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium text-muted-foreground">
            {totalItems} item{totalItems !== 1 ? "s" : ""}
          </span>
          {order.total_cost != null && order.total_cost > 0 && (
            <span className="text-[11px] font-semibold text-primary">
              Cost: {formatIQD(order.total_cost)}
            </span>
          )}
          {order.address?.city && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />
              {order.address.city}
            </span>
          )}
        </div>
        {onPrepare && (
          <Button
            onClick={(e) => { e.stopPropagation(); onPrepare(); }}
            disabled={isPreparing}
            size="sm"
            className="rounded-lg gap-1.5 h-7 px-3 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {isPreparing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Prepared
          </Button>
        )}
      </div>
    </div>
  );
}

/* ─── List Card ─── */
function OrderCardList({
  order,
  isPreparing,
  isSelected,
  onSelect,
  onPrepare,
}: {
  order: PrepOrder;
  isPreparing: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onPrepare?: () => void;
}) {
  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);
  const timeAgo = getTimeAgo(order.created_at);

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border bg-card px-4 py-3 flex items-center gap-4 cursor-pointer transition-all hover:shadow-sm ${
        isSelected ? "border-primary ring-1 ring-primary/20" : "border-border/60 hover:border-border"
      }`}
    >
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Package className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
          {order.customer_name && (
            <span className="text-xs text-muted-foreground truncate">· {order.customer_name}</span>
          )}
          <Badge
            variant="outline"
            className={`text-[9px] font-bold uppercase ${
              order.status === "prepared"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
            }`}
          >
            {order.status === "prepared" ? "✓ Done" : "Awaiting"}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] text-muted-foreground">{totalItems} items</span>
          {order.total_cost != null && order.total_cost > 0 && (
            <span className="text-[11px] font-semibold text-primary">Cost: {formatIQD(order.total_cost)}</span>
          )}
          <span className="text-[11px] text-muted-foreground">{timeAgo} · {formatOrderTimeShort(order.created_at)}</span>
          {order.address?.city && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" /> {order.address.city}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onPrepare && (
          <Button
            onClick={(e) => { e.stopPropagation(); onPrepare(); }}
            disabled={isPreparing}
            size="sm"
            className="rounded-lg gap-1.5 h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {isPreparing ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
            Prepared
          </Button>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
      </div>
    </div>
  );
}

/* ─── Detail Panel ─── */
function OrderDetailPanel({
  order,
  isPreparing,
  onPrepare,
  onClose,
  onZoomImage,
  token,
}: {
  order: PrepOrder;
  isPreparing: boolean;
  onPrepare?: () => void;
  onClose: () => void;
  onZoomImage: (url: string) => void;
  token: string | null;
}) {
  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);
  const [noteText, setNoteText] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [noteSent, setNoteSent] = useState(false);

  const sendNoteToOps = async () => {
    if (!noteText.trim() || !token) return;
    setSendingNote(true);
    try {
      const res = await fetch(`${FUNC_URL}?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-note", order_id: order.id, note: noteText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send note");
      toast.success("Operations team has been notified!");
      setNoteText("");
      setNoteSent(true);
      setTimeout(() => setNoteSent(false), 3000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSendingNote(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-lg"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/40 bg-gradient-to-r from-muted/30 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground font-mono">#{order.id.slice(0, 8).toUpperCase()}</h3>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold uppercase ${
                  order.status === "prepared"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                }`}
              >
                {order.status === "prepared" ? "✓ Prepared" : "Awaiting Prep"}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-lg text-xs text-muted-foreground">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Order meta */}
        <div className="mt-3 space-y-1.5">
          {order.customer_name && (
            <div className="flex items-center gap-2">
              <UserCircle className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">{order.customer_name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{formatOrderTime(order.created_at)}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">{totalItems} items</span>
            {order.payment_method && (
              <div className="flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground capitalize">
                  {order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method}
                </span>
              </div>
            )}
            {order.total_cost != null && order.total_cost > 0 && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-primary" />
                <span className="text-xs font-semibold text-primary">Cost: {formatIQD(order.total_cost)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-border/30 max-h-[50vh] overflow-y-auto">
        {order.items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-3 px-5 py-3">
            <div className="relative">
              <div
                className="w-16 h-16 rounded-xl bg-muted/50 overflow-hidden border border-border/30 flex-shrink-0 cursor-pointer group relative"
                onClick={() => item.product?.image_url && onZoomImage(item.product.image_url)}
              >
                {item.product?.image_url ? (
                  <>
                    <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ZoomIn className="w-4 h-4 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-muted-foreground/20" />
                  </div>
                )}
              </div>
              <div className="absolute -top-1 -left-1 w-5 h-5 rounded-md bg-foreground text-background text-[10px] font-bold flex items-center justify-center">
                {idx + 1}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">
                {item.product?.title || "Unknown product"}
              </p>
              {item.product?.volume && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{item.product.volume}</p>
              )}
              {item.cost != null && item.cost > 0 && (
                <p className="text-[10px] text-primary font-medium mt-0.5">
                  Cost: {formatIQD(item.cost)} × {item.quantity} = {formatIQD(item.total_cost || 0)}
                </p>
              )}
              {/* Show all images thumbnails if multiple */}
              {item.product?.all_images && item.product.all_images.length > 1 && (
                <div className="flex items-center gap-1 mt-1.5">
                  {item.product.all_images.slice(0, 4).map((img, imgIdx) => (
                    <div
                      key={imgIdx}
                      className="w-7 h-7 rounded-md bg-muted/50 overflow-hidden border border-border/30 cursor-pointer hover:ring-1 hover:ring-primary/40 transition-all"
                      onClick={() => onZoomImage(img)}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {item.product.all_images.length > 4 && (
                    <span className="text-[9px] text-muted-foreground">+{item.product.all_images.length - 4}</span>
                  )}
                </div>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">×{item.quantity}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Order cost summary */}
      {order.total_cost != null && order.total_cost > 0 && (
        <div className="px-5 py-3 bg-primary/5 border-t border-primary/10 flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">Total Order Cost</span>
          <span className="text-sm font-bold text-primary">{formatIQD(order.total_cost)}</span>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="px-5 py-3 bg-amber-500/5 border-t border-amber-500/10 flex items-start gap-2">
          <StickyNote className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">{order.notes}</p>
        </div>
      )}

      {/* Address */}
      {order.address && (
        <div className="px-5 py-3 bg-muted/10 border-t border-border/30 space-y-1.5">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              {[order.address.city, order.address.area, order.address.street, order.address.building]
                .filter(Boolean)
                .join(", ")}
              {order.address.floor && ` — Floor ${order.address.floor}`}
              {order.address.apartment && `, Apt ${order.address.apartment}`}
            </p>
          </div>
          {order.address.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <a href={`tel:${order.address.phone}`} className="text-xs text-primary font-semibold hover:underline">
                {order.address.phone}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Notify Operations */}
      <div className="px-5 py-4 border-t border-border/40 space-y-2.5">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-bold text-foreground">Notify Operations</span>
          {noteSent && (
            <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 ml-auto">
              ✓ Sent
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="e.g. Product X out of stock, cost changed..."
            className="h-9 rounded-xl text-xs bg-muted/30 border-border/40"
            onKeyDown={(e) => e.key === "Enter" && sendNoteToOps()}
          />
          <Button
            onClick={sendNoteToOps}
            disabled={sendingNote || !noteText.trim()}
            size="sm"
            className="rounded-xl h-9 px-3 gap-1.5 flex-shrink-0"
          >
            {sendingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">This will instantly notify all operations admins.</p>
      </div>

      {/* Action */}
      {onPrepare && (
        <div className="px-5 py-4 border-t border-border/40">
          <Button
            onClick={onPrepare}
            disabled={isPreparing}
            className="w-full rounded-xl gap-2.5 h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 font-semibold"
          >
            {isPreparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Mark as Prepared
          </Button>
        </div>
      )}
    </motion.div>
  );
}
