import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Warehouse,
  DollarSign,
  Package,
  FileText,
  Loader2,
  ChevronDown,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WarehouseSummary {
  id: string;
  label: string;
  token: string;
  excluded_brand_ids: string[];
  excluded_product_ids: string[];
  total_cost: number;
  total_orders: number;
  total_items: number;
}

interface CostOrderItem {
  product_id: string;
  title: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

interface CostOrder {
  id: string;
  created_at: string;
  status: string;
  total_cost: number;
  item_count: number;
  items: CostOrderItem[];
}

function formatIQD(amount: number): string {
  return amount.toLocaleString("en-US") + " IQD";
}

function getDateRange(preset: string): { from: string; to: string } {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { from: d.toISOString().split("T")[0], to: today };
    }
    case "month": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return { from: d.toISOString().split("T")[0], to: today };
    }
    default:
      return { from: "", to: "" };
  }
}

export default function AdminWarehouseCosts() {
  const [warehouses, setWarehouses] = useState<WarehouseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState("week");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedWarehouse, setExpandedWarehouse] = useState<string | null>(null);
  const [warehouseOrders, setWarehouseOrders] = useState<Record<string, CostOrder[]>>({});
  const [loadingOrders, setLoadingOrders] = useState<string | null>(null);

  const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const FUNC_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/prep-orders`;

  const fetchWarehouseSummaries = useCallback(async () => {
    setLoading(true);
    try {
      // Get all active warehouse tokens
      const { data: tokens, error } = await supabase
        .from("prep_access_tokens")
        .select("id, label, token, excluded_brand_ids, excluded_product_ids, is_active")
        .eq("is_active", true);

      if (error) throw error;
      if (!tokens || tokens.length === 0) {
        setWarehouses([]);
        setLoading(false);
        return;
      }

      // For each warehouse, fetch cost summary
      let from = dateFrom;
      let to = dateTo;
      if (datePreset !== "custom") {
        const range = getDateRange(datePreset);
        from = range.from;
        to = range.to;
      }

      const summaries: WarehouseSummary[] = [];

      for (const t of tokens) {
        try {
          const params = new URLSearchParams({
            token: t.token,
            action: "costs-summary",
          });
          if (from) params.set("from", from);
          if (to) params.set("to", to);

          const res = await fetch(`${FUNC_URL}?${params}`);
          const data = await res.json();

          summaries.push({
            id: t.id,
            label: t.label,
            token: t.token,
            excluded_brand_ids: t.excluded_brand_ids || [],
            excluded_product_ids: t.excluded_product_ids || [],
            total_cost: data.summary?.total_cost || 0,
            total_orders: data.summary?.total_orders || 0,
            total_items: data.summary?.total_items || 0,
          });
        } catch {
          summaries.push({
            id: t.id,
            label: t.label,
            token: t.token,
            excluded_brand_ids: t.excluded_brand_ids || [],
            excluded_product_ids: t.excluded_product_ids || [],
            total_cost: 0,
            total_orders: 0,
            total_items: 0,
          });
        }
      }

      setWarehouses(summaries);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [datePreset, dateFrom, dateTo]);

  useEffect(() => {
    fetchWarehouseSummaries();
  }, [fetchWarehouseSummaries]);

  const loadWarehouseOrders = async (warehouse: WarehouseSummary) => {
    if (expandedWarehouse === warehouse.id) {
      setExpandedWarehouse(null);
      return;
    }

    setExpandedWarehouse(warehouse.id);
    if (warehouseOrders[warehouse.id]) return;

    setLoadingOrders(warehouse.id);
    try {
      let from = dateFrom;
      let to = dateTo;
      if (datePreset !== "custom") {
        const range = getDateRange(datePreset);
        from = range.from;
        to = range.to;
      }

      const params = new URLSearchParams({
        token: warehouse.token,
        action: "costs-summary",
      });
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`${FUNC_URL}?${params}`);
      const data = await res.json();

      setWarehouseOrders((prev) => ({
        ...prev,
        [warehouse.id]: data.orders || [],
      }));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingOrders(null);
    }
  };

  const grandTotal = warehouses.reduce((s, w) => s + w.total_cost, 0);
  const grandOrders = warehouses.reduce((s, w) => s + w.total_orders, 0);
  const grandItems = warehouses.reduce((s, w) => s + w.total_items, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Warehouse Costs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Track how much to pay each warehouse</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchWarehouseSummaries} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "today", label: "Today" },
          { key: "week", label: "This Week" },
          { key: "month", label: "This Month" },
          { key: "custom", label: "Custom" },
        ].map((p) => (
          <button
            key={p.key}
            onClick={() => { setDatePreset(p.key); setWarehouseOrders({}); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              datePreset === p.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
            }`}
          >
            {p.label}
          </button>
        ))}
        {datePreset === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setWarehouseOrders({}); }}
              className="h-8 text-xs rounded-lg w-36"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setWarehouseOrders({}); }}
              className="h-8 text-xs rounded-lg w-36"
            />
          </div>
        )}
      </div>

      {/* Grand total cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-primary/5 border border-primary/20 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Payable</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatIQD(grandTotal)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Across all warehouses</p>
        </div>

        <div className="rounded-2xl bg-card border border-border/50 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Orders</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{grandOrders}</p>
        </div>

        <div className="rounded-2xl bg-card border border-border/50 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
              <Package className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Items</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{grandItems}</p>
        </div>
      </div>

      {/* Warehouse list */}
      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading warehouse data...</p>
        </div>
      ) : warehouses.length === 0 ? (
        <div className="py-16 text-center">
          <Warehouse className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">No active warehouses</p>
          <p className="text-xs text-muted-foreground mt-1">Create warehouse access tokens in the Team page</p>
        </div>
      ) : (
        <div className="space-y-4">
          {warehouses.map((w) => (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/50 bg-card overflow-hidden"
            >
              <button
                onClick={() => loadWarehouseOrders(w)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Warehouse className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-bold text-foreground">{w.label}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">{w.total_orders} orders</span>
                      <span className="text-xs text-muted-foreground">{w.total_items} items</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">{formatIQD(w.total_cost)}</p>
                    <p className="text-[10px] text-muted-foreground">Amount to pay</p>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${expandedWarehouse === w.id ? "rotate-180" : ""}`} />
                </div>
              </button>

              <AnimatePresence>
                {expandedWarehouse === w.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border/30 px-5 py-4">
                      {loadingOrders === w.id ? (
                        <div className="py-8 flex justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        </div>
                      ) : !warehouseOrders[w.id] || warehouseOrders[w.id].length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No orders in this period</p>
                      ) : (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                          {warehouseOrders[w.id].map((order) => (
                            <WarehouseOrderRow key={order.id} order={order} />
                          ))}
                          <div className="flex items-center justify-between pt-3 border-t border-border/30">
                            <span className="text-sm font-bold text-foreground">Total Payment Due</span>
                            <span className="text-lg font-bold text-primary">{formatIQD(w.total_cost)}</span>
                          </div>
                        </div>
                      )}
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

function WarehouseOrderRow({ order }: { order: CostOrder }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border/40 bg-muted/10 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold font-mono text-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
          <Badge variant="outline" className={`text-[9px] font-bold uppercase ${
            order.status === "delivered" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
            order.status === "prepared" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
            "bg-amber-500/10 text-amber-600 border-amber-500/20"
          }`}>
            {order.status}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{order.item_count} items</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-primary">{formatIQD(order.total_cost)}</span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString()}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/20 divide-y divide-border/10">
              {order.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-5 px-4 py-2 items-center text-xs">
                  <span className="col-span-2 text-foreground truncate pr-2">{item.title}</span>
                  <span className="text-center text-muted-foreground">{item.quantity}</span>
                  <span className="text-right text-muted-foreground">{item.unit_cost.toLocaleString()}</span>
                  <span className="text-right font-semibold text-foreground">{formatIQD(item.total_cost)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
