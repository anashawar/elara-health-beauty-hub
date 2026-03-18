import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  ShieldX,
  Box,
} from "lucide-react";
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
  const { token } = useParams<{ token: string }>();
  const [orders, setOrders] = useState<PrepOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preparingId, setPreparingId] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "prepared">("pending");

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const statuses = tab === "pending" ? "pending,processing" : "prepared";
      const res = await fetch(`${FUNC_URL}?token=${token}&status=${statuses}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load orders");
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, tab]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime: listen for new orders
  useEffect(() => {
    const channel = supabase
      .channel("prep-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

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

  if (error === "Invalid or expired link") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <ShieldX className="w-16 h-16 text-destructive/40 mb-4" />
        <h1 className="text-xl font-bold text-foreground">Invalid Link</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          This preparation link is invalid or has been deactivated. Please contact your admin for a new link.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={elaraLogo} alt="ELARA" className="h-7" />
            <div>
              <h1 className="text-sm font-bold text-foreground">Order Preparation</h1>
              <p className="text-[10px] text-muted-foreground">Live orders dashboard</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            disabled={loading}
            className="rounded-xl gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 bg-muted/50 p-1 rounded-xl">
          <button
            onClick={() => setTab("pending")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === "pending"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            To Prepare
          </button>
          <button
            onClick={() => setTab("prepared")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === "prepared"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            Prepared
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-16 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading orders...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="py-16 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchOrders} className="mt-3 rounded-xl">
              Try Again
            </Button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && orders.length === 0 && (
          <div className="py-16 text-center">
            <Box className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">
              {tab === "pending" ? "No orders to prepare" : "No prepared orders"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {tab === "pending"
                ? "New orders will appear here automatically."
                : "Prepared orders will show up here."}
            </p>
          </div>
        )}

        {/* Orders */}
        {!loading &&
          !error &&
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isPreparing={preparingId === order.id}
              onPrepare={tab === "pending" ? () => markPrepared(order.id) : undefined}
            />
          ))}
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
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Order header */}
      <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] font-bold uppercase ${
              order.status === "prepared"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
            }`}
          >
            {order.status}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {timeAgo}
        </div>
      </div>

      {/* Items */}
      <div className="divide-y divide-border/50">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3">
            {/* Product image */}
            <div className="w-14 h-14 rounded-xl bg-muted flex-shrink-0 overflow-hidden">
              {item.product?.image_url ? (
                <img
                  src={item.product.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Product info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-tight line-clamp-2">
                {item.product?.title || "Unknown product"}
              </p>
              {item.product?.volume && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {item.product.volume}
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
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
        <div className="px-4 py-2.5 bg-muted/20 border-t border-border/50 space-y-1">
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
              <a href={`tel:${order.address.phone}`} className="text-xs text-primary font-medium">
                {order.address.phone}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {totalItems} item{totalItems !== 1 ? "s" : ""} total
        </p>
        {onPrepare && (
          <Button
            onClick={onPrepare}
            disabled={isPreparing}
            size="sm"
            className="rounded-xl gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
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
