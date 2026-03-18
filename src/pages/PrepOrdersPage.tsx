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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import elaraLogo from "@/assets/elara-logo.png";

interface PrepProduct {
  id: string;
  title: string;
  volume: string | null;
  image_url: string | null;
}

interface PrepItem {
  id: string;
  quantity: number;
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
  items: PrepItem[];
  address: PrepAddress | null;
}

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const FUNC_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/prep-orders`;

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
  const [tab, setTab] = useState<"pending" | "prepared">("pending");

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

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const statuses = tab === "pending" ? "pending,processing" : "prepared";
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

  useEffect(() => {
    if (authenticated) fetchOrders();
  }, [fetchOrders, authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    const channel = supabase
      .channel("prep-orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders, authenticated]);

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
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPreparingId(null);
    }
  };

  const pendingCount = tab === "pending" ? orders.length : 0;

  // ---- LOGIN SCREEN ----
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] via-[hsl(var(--muted)/0.3)] to-[hsl(var(--background))] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm space-y-8"
        >
          <div className="text-center space-y-3">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10 border border-primary/10">
              <img src={elaraLogo} alt="ELARA" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">ELARA Logistics</h1>
              <p className="text-sm text-muted-foreground mt-1">Sign in to your warehouse portal</p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-sm p-6 space-y-5 shadow-xl shadow-black/5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="pl-11 h-12 rounded-2xl border-border/60 bg-muted/30 text-sm focus:bg-background transition-colors"
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
                  className="pl-11 h-12 rounded-2xl border-border/60 bg-muted/30 text-sm focus:bg-background transition-colors"
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
              className="w-full h-12 rounded-2xl gap-2.5 text-sm font-semibold shadow-lg shadow-primary/20"
            >
              {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Sign In
            </Button>
          </div>

          <p className="text-center text-[11px] text-muted-foreground/60">
            Powered by ELARA · Contact your admin for access
          </p>
        </motion.div>
      </div>
    );
  }

  // ---- MAIN DASHBOARD ----
  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--muted)/0.3)] to-[hsl(var(--background))]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/90 backdrop-blur-xl border-b border-border/60 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
              <img src={elaraLogo} alt="ELARA" className="h-5 w-5 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-foreground tracking-tight">ELARA Prep</h1>
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-primary/20 px-1.5 py-0">
                  LIVE
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Warehouse className="w-3 h-3" />
                {warehouseLabel || "Warehouse"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchOrders}
              disabled={loading}
              className="rounded-xl h-9 w-9 border-border/60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-xl h-9 w-9 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1.5 bg-muted/40 p-1 rounded-2xl border border-border/40">
          <button
            onClick={() => setTab("pending")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              tab === "pending"
                ? "bg-card text-foreground shadow-md shadow-black/5 border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            To Prepare
            {tab === "pending" && orders.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {orders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("prepared")}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              tab === "prepared"
                ? "bg-card text-foreground shadow-md shadow-black/5 border border-border/40"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Prepared
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-20 flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Loading orders...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="py-20 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchOrders} className="mt-3 rounded-xl">
              Try Again
            </Button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && orders.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-muted/50 flex items-center justify-center">
              <Box className="w-7 h-7 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {tab === "pending" ? "All clear! No orders to prepare" : "No prepared orders yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {tab === "pending"
                ? "New orders will appear here in real-time."
                : "Orders you prepare will show up here."}
            </p>
          </div>
        )}

        {/* Orders list */}
        <AnimatePresence mode="popLayout">
          {!loading &&
            !error &&
            orders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <OrderCard
                  order={order}
                  isPreparing={preparingId === order.id}
                  onPrepare={tab === "pending" ? () => markPrepared(order.id) : undefined}
                />
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* Bottom branding */}
      <div className="text-center py-8 text-[10px] text-muted-foreground/40 font-medium tracking-wider uppercase">
        Powered by ELARA
      </div>
    </div>
  );
}

function OrderCard({
  order,
  isPreparing,
  onPrepare,
}: {
  order: PrepOrder;
  isPreparing: boolean;
  onPrepare?: () => void;
}) {
  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);
  const timeAgo = getTimeAgo(order.created_at);

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-muted/40 to-transparent border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Package className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="text-sm font-bold text-foreground font-mono tracking-wide">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="w-2.5 h-2.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] font-bold uppercase tracking-wider ${
            order.status === "prepared"
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
          }`}
        >
          {order.status === "prepared" ? "✓ Prepared" : "Awaiting"}
        </Badge>
      </div>

      {/* Items */}
      <div className="divide-y divide-border/30">
        {order.items.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-muted/50 flex-shrink-0 overflow-hidden border border-border/30">
                {item.product?.image_url ? (
                  <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-muted-foreground/20" />
                  </div>
                )}
              </div>
              <div className="absolute -top-1 -left-1 w-5 h-5 rounded-md bg-foreground text-background text-[10px] font-bold flex items-center justify-center shadow-sm">
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
            </div>
            <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">×{item.quantity}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <div className="px-4 py-2.5 bg-amber-500/5 border-t border-amber-500/10 flex items-start gap-2">
          <StickyNote className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">{order.notes}</p>
        </div>
      )}

      {/* Address */}
      {order.address && (
        <div className="px-4 py-2.5 bg-muted/10 border-t border-border/30 space-y-1">
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
              <a href={`tel:${order.address.phone}`} className="text-xs text-primary font-semibold">
                {order.address.phone}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/40 flex items-center justify-between bg-muted/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {totalItems} item{totalItems !== 1 ? "s" : ""}
          </span>
        </div>
        {onPrepare && (
          <Button
            onClick={onPrepare}
            disabled={isPreparing}
            size="sm"
            className="rounded-xl gap-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 font-semibold"
          >
            {isPreparing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Mark Prepared
          </Button>
        )}
      </div>
    </div>
  );
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
