import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/hooks/useProducts";
import {
  DollarSign, TrendingUp, TrendingDown, Package, ShoppingCart,
  ArrowUpRight, Calendar, Filter, BarChart3, Percent, Wallet,
  CreditCard, Truck, Clock, AlertTriangle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

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
    case "quarter": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return { from: d.toISOString().split("T")[0], to: today };
    }
    case "all":
      return { from: "", to: "" };
    default:
      return { from: "", to: "" };
  }
}

export default function AdminRevenue() {
  const [datePreset, setDatePreset] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const { data: orders = [] } = useQuery({
    queryKey: ["admin-revenue-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total, subtotal, delivery_fee, discount, status, created_at, coupon_code, payment_method, order_items(product_id, quantity, price)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: productCosts = [] } = useQuery({
    queryKey: ["admin-product-costs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_costs").select("product_id, cost");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-revenue-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, title, price, brand_id");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["admin-revenue-brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id, name");
      if (error) throw error;
      return data || [];
    },
  });

  const costMap = useMemo(() => {
    const map: Record<string, number> = {};
    productCosts.forEach((pc: any) => { map[pc.product_id] = Number(pc.cost); });
    return map;
  }, [productCosts]);

  const productNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((p: any) => { map[p.id] = p.title; });
    return map;
  }, [products]);

  const productBrandMap = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((p: any) => { if (p.brand_id) map[p.id] = p.brand_id; });
    return map;
  }, [products]);

  const brandNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    brands.forEach((b: any) => { map[b.id] = b.name; });
    return map;
  }, [brands]);

  const stats = useMemo(() => {
    // Get date range
    let from = dateFrom;
    let to = dateTo;
    if (datePreset !== "custom") {
      const range = getDateRange(datePreset);
      from = range.from;
      to = range.to;
    }

    // Filter orders by date and exclude cancelled
    let filtered = orders.filter((o: any) => o.status !== "cancelled");
    if (from) filtered = filtered.filter((o: any) => o.created_at.split("T")[0] >= from);
    if (to) filtered = filtered.filter((o: any) => o.created_at.split("T")[0] <= to);

    const deliveredOrders = filtered.filter((o: any) => o.status === "delivered");
    const allActive = filtered;

    let totalRevenue = 0;
    let totalCost = 0;
    let totalItemsSold = 0;
    let totalDeliveryFees = 0;
    let totalDiscounts = 0;
    let revenueWithCost = 0;
    let revenueWithoutCost = 0;
    let itemsMissingCost = 0;
    const missingCostProductIds = new Set<string>();
    const productStats: Record<string, { sold: number; revenue: number; cost: number; hasCost: boolean }> = {};
    const brandStats: Record<string, { sold: number; revenue: number; cost: number; profit: number }> = {};
    const dailyRevenue = new Map<string, { revenue: number; cost: number; orders: number; profit: number }>();
    const paymentMethods: Record<string, number> = {};
    const couponUsage: Record<string, { count: number; discount: number }> = {};

    deliveredOrders.forEach((order: any) => {
      totalRevenue += Number(order.total);
      totalDeliveryFees += Number(order.delivery_fee || 0);
      totalDiscounts += Number(order.discount || 0);

      // Payment method
      const pm = order.payment_method || "cod";
      paymentMethods[pm] = (paymentMethods[pm] || 0) + 1;

      // Coupon
      if (order.coupon_code) {
        if (!couponUsage[order.coupon_code]) couponUsage[order.coupon_code] = { count: 0, discount: 0 };
        couponUsage[order.coupon_code].count++;
        couponUsage[order.coupon_code].discount += Number(order.discount || 0);
      }

      // Daily
      const day = order.created_at.split("T")[0];
      if (!dailyRevenue.has(day)) dailyRevenue.set(day, { revenue: 0, cost: 0, orders: 0, profit: 0 });
      const dayEntry = dailyRevenue.get(day)!;
      dayEntry.revenue += Number(order.total);
      dayEntry.orders++;

      (order.order_items || []).forEach((item: any) => {
        const itemRevenue = Number(item.price) * item.quantity;
        const hasCost = item.product_id in costMap;
        const itemCost = hasCost ? costMap[item.product_id] * item.quantity : 0;
        totalItemsSold += item.quantity;

        if (hasCost) {
          totalCost += itemCost;
          revenueWithCost += itemRevenue;
        } else {
          revenueWithoutCost += itemRevenue;
          itemsMissingCost += item.quantity;
          missingCostProductIds.add(item.product_id);
        }

        dayEntry.cost += itemCost;
        dayEntry.profit = dayEntry.revenue - dayEntry.cost;

        if (!productStats[item.product_id]) {
          productStats[item.product_id] = { sold: 0, revenue: 0, cost: 0, hasCost };
        }
        productStats[item.product_id].sold += item.quantity;
        productStats[item.product_id].revenue += itemRevenue;
        productStats[item.product_id].cost += itemCost;

        // Brand stats
        const brandId = productBrandMap[item.product_id];
        if (brandId) {
          if (!brandStats[brandId]) brandStats[brandId] = { sold: 0, revenue: 0, cost: 0, profit: 0 };
          brandStats[brandId].sold += item.quantity;
          brandStats[brandId].revenue += itemRevenue;
          brandStats[brandId].cost += itemCost;
          brandStats[brandId].profit = brandStats[brandId].revenue - brandStats[brandId].cost;
        }
      });
    });

    // Profit only from products with known cost data
    const totalProfit = revenueWithCost - totalCost;
    const profitMargin = revenueWithCost > 0 ? (totalProfit / revenueWithCost) * 100 : 0;
    const avgOrderValue = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;

    // Products sorted by profit
    const topProducts = Object.entries(productStats)
      .map(([id, s]) => ({
        id,
        name: productNameMap[id] || "Unknown",
        ...s,
        profit: s.hasCost ? s.revenue - s.cost : null as number | null,
        margin: s.hasCost && s.revenue > 0 ? ((s.revenue - s.cost) / s.revenue * 100) : null as number | null,
      }))
      .sort((a, b) => {
        // Products with cost data first, sorted by profit
        if (a.hasCost && !b.hasCost) return -1;
        if (!a.hasCost && b.hasCost) return 1;
        return (b.profit ?? 0) - (a.profit ?? 0);
      });

    // Brands sorted by revenue
    const topBrands = Object.entries(brandStats)
      .map(([id, s]) => ({ id, name: brandNameMap[id] || "Unknown", ...s }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Daily data sorted
    const dailyData = [...dailyRevenue.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }));

    // Coupon leaderboard
    const couponLeaderboard = Object.entries(couponUsage)
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.count - a.count);

    return {
      totalRevenue, totalCost, totalProfit, profitMargin, avgOrderValue,
      totalOrders: deliveredOrders.length, allOrders: allActive.length,
      totalItemsSold, totalDeliveryFees, totalDiscounts,
      topProducts, topBrands, dailyData, paymentMethods, couponLeaderboard,
      pendingRevenue: allActive.filter((o: any) => o.status !== "delivered").reduce((s: number, o: any) => s + Number(o.total), 0),
      pendingCount: allActive.filter((o: any) => o.status !== "delivered").length,
      revenueWithCost,
      revenueWithoutCost,
      itemsMissingCost,
      missingCostCount: missingCostProductIds.size,
    };
  }, [orders, costMap, productNameMap, productBrandMap, brandNameMap, datePreset, dateFrom, dateTo]);

  const maxDailyRevenue = Math.max(...stats.dailyData.map((d) => d.revenue), 1);

  const filteredProducts = stats.topProducts.filter((p) =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Revenue & Profitability</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Detailed financial analytics · Cancelled orders excluded
          </p>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "today", label: "Today" },
          { key: "week", label: "7 Days" },
          { key: "month", label: "30 Days" },
          { key: "quarter", label: "90 Days" },
          { key: "all", label: "All Time" },
          { key: "custom", label: "Custom" },
        ].map((p) => (
          <button
            key={p.key}
            onClick={() => setDatePreset(p.key)}
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
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs rounded-lg w-36" />
            <span className="text-xs text-muted-foreground">to</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs rounded-lg w-36" />
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: formatPrice(stats.totalRevenue), sub: `${stats.totalOrders} delivered`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-500/10", accent: "from-emerald-500/10" },
          { label: "Total Cost (COGS)", value: formatPrice(stats.totalCost), sub: `${stats.totalItemsSold} items`, icon: TrendingDown, color: "text-red-600", bg: "bg-red-500/10", accent: "from-red-500/10" },
          { label: "Net Profit", value: formatPrice(stats.totalProfit), sub: `${stats.profitMargin.toFixed(1)}% margin`, icon: TrendingUp, color: stats.totalProfit >= 0 ? "text-emerald-600" : "text-red-600", bg: stats.totalProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10", accent: stats.totalProfit >= 0 ? "from-emerald-500/10" : "from-red-500/10" },
          { label: "Avg Order Value", value: formatPrice(stats.avgOrderValue), sub: `${stats.allOrders} total orders`, icon: BarChart3, color: "text-blue-600", bg: "bg-blue-500/10", accent: "from-blue-500/10" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative bg-card rounded-2xl border border-border/50 p-5 overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} to-transparent pointer-events-none`} />
            <div className="relative">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{card.label}</p>
              <p className="text-xl font-bold text-foreground mt-1">{card.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{card.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Delivery Fees", value: formatPrice(stats.totalDeliveryFees), icon: Truck },
          { label: "Discounts Given", value: formatPrice(stats.totalDiscounts), icon: Percent },
          { label: "Pending Revenue", value: formatPrice(stats.pendingRevenue), icon: Clock },
          { label: "Pending Orders", value: stats.pendingCount, icon: ShoppingCart },
        ].map((item) => (
          <div key={item.label} className="bg-card rounded-xl border border-border/40 p-4 flex items-center gap-3">
            <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{item.label}</p>
              <p className="text-sm font-bold text-foreground">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart + Payment methods */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily revenue chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-card rounded-2xl border border-border/50 p-5"
        >
          <h2 className="text-sm font-bold text-foreground mb-4">Daily Revenue & Profit</h2>
          {stats.dailyData.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No data for this period</p>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {stats.dailyData.map((day) => (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground w-16 flex-shrink-0 font-mono">
                    {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <div className="flex-1 h-8 bg-muted/20 rounded-lg overflow-hidden relative">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(day.revenue / maxDailyRevenue) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-primary/50 to-primary rounded-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-between px-3">
                      <span className="text-[9px] font-bold text-foreground">{formatPrice(day.revenue)}</span>
                      <span className={`text-[9px] font-semibold ${day.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        P: {formatPrice(day.profit)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground w-6 text-right">{day.orders}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Payment methods + Coupons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl border border-border/50 p-5 space-y-6"
        >
          <div>
            <h2 className="text-sm font-bold text-foreground mb-3">Payment Methods</h2>
            <div className="space-y-2">
              {Object.entries(stats.paymentMethods).length === 0 ? (
                <p className="text-xs text-muted-foreground">No data</p>
              ) : (
                Object.entries(stats.paymentMethods)
                  .sort(([, a], [, b]) => b - a)
                  .map(([method, count]) => (
                    <div key={method} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-foreground capitalize">
                          {method === "cod" ? "Cash on Delivery" : method}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">{count}</Badge>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold text-foreground mb-3">Top Coupons Used</h2>
            <div className="space-y-2">
              {stats.couponLeaderboard.length === 0 ? (
                <p className="text-xs text-muted-foreground">No coupons used</p>
              ) : (
                stats.couponLeaderboard.slice(0, 5).map((c) => (
                  <div key={c.code} className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-primary">{c.code}</span>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground">{c.count}x · </span>
                      <span className="text-[10px] font-semibold text-red-600">-{formatPrice(c.discount)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Brand Performance */}
      {stats.topBrands.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border/50 p-5"
        >
          <h2 className="text-sm font-bold text-foreground mb-4">Brand Performance</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {stats.topBrands.map((b) => (
              <div key={b.id} className="rounded-xl bg-muted/20 border border-border/30 p-3 text-center">
                <p className="text-xs font-bold text-foreground truncate">{b.name}</p>
                <p className="text-sm font-bold text-primary mt-1">{formatPrice(b.revenue)}</p>
                <p className="text-[10px] text-muted-foreground">{b.sold} items</p>
                <p className={`text-[10px] font-semibold mt-0.5 ${b.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  Profit: {formatPrice(b.profit)}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Product profitability table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-card rounded-2xl border border-border/50 p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">Product Profitability</h2>
          <div className="relative w-48">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products..."
              className="pl-8 h-8 text-xs rounded-lg"
            />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No product data for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">#</th>
                  <th className="text-left py-3 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Product</th>
                  <th className="text-right py-3 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sold</th>
                  <th className="text-right py-3 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Revenue</th>
                  <th className="text-right py-3 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cost</th>
                  <th className="text-right py-3 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Profit</th>
                  <th className="text-right py-3 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Margin</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p, i) => (
                  <tr key={p.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 px-2 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="py-2.5 px-2 font-medium text-foreground max-w-[200px] truncate text-xs">{p.name}</td>
                    <td className="py-2.5 px-2 text-right text-xs text-muted-foreground">{p.sold}</td>
                    <td className="py-2.5 px-2 text-right text-xs font-medium text-foreground">{formatPrice(p.revenue)}</td>
                    <td className="py-2.5 px-2 text-right text-xs font-medium text-red-500">{formatPrice(p.cost)}</td>
                    <td className={`py-2.5 px-2 text-right text-xs font-bold ${p.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatPrice(p.profit)}
                    </td>
                    <td className={`py-2.5 px-2 text-right text-xs font-medium ${p.margin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {p.margin.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/10">
                  <td colSpan={2} className="py-3 px-2 text-xs font-bold text-foreground">Totals</td>
                  <td className="py-3 px-2 text-right text-xs font-bold text-foreground">{stats.totalItemsSold}</td>
                  <td className="py-3 px-2 text-right text-xs font-bold text-foreground">{formatPrice(stats.totalRevenue)}</td>
                  <td className="py-3 px-2 text-right text-xs font-bold text-red-500">{formatPrice(stats.totalCost)}</td>
                  <td className={`py-3 px-2 text-right text-xs font-bold ${stats.totalProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatPrice(stats.totalProfit)}
                  </td>
                  <td className={`py-3 px-2 text-right text-xs font-bold ${stats.profitMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {stats.profitMargin.toFixed(1)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
