import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, ShoppingCart, FolderTree, DollarSign, TrendingUp,
  Users, Eye, Clock, CheckCircle2, Truck, XCircle, BarChart3,
  ArrowUpRight, ArrowDownRight, Star, Zap,
} from "lucide-react";
import { formatPrice } from "@/hooks/useProducts";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { useAdmin } from "@/hooks/useAdmin";

export default function AdminDashboard() {
  const { isFullAdmin } = useAdmin();
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-dashboard-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total, subtotal, delivery_fee, discount, status, created_at, coupon_code, order_items(product_id, quantity, price)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: productCount = 0 } = useQuery({
    queryKey: ["admin-product-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("id", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: categoryCount = 0 } = useQuery({
    queryKey: ["admin-category-count"],
    queryFn: async () => {
      const { count } = await supabase.from("categories").select("id", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: productCosts = [] } = useQuery({
    queryKey: ["admin-product-costs"],
    queryFn: async () => {
      const allCosts: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("product_costs")
          .select("product_id, cost")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allCosts.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return allCosts;
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-dashboard-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, title, price, in_stock");
      if (error) throw error;
      return data || [];
    },
  });

  const costMap = useMemo(() => {
    const map: Record<string, number> = {};
    productCosts.forEach((pc: any) => { map[pc.product_id] = Number(pc.cost); });
    return map;
  }, [productCosts]);

  const stats = useMemo(() => {
    // Exclude cancelled orders from all analytics
    const activeOrders = orders.filter((o: any) => o.status !== "cancelled");
    const deliveredOrders = activeOrders.filter((o: any) => o.status === "delivered");
    const processingOrders = activeOrders.filter((o: any) => o.status === "processing");
    const preparedOrders = activeOrders.filter((o: any) => o.status === "prepared");
    const shippedOrders = activeOrders.filter((o: any) => o.status === "shipped");
    const cancelledOrders = orders.filter((o: any) => o.status === "cancelled");

    const totalRevenue = deliveredOrders.reduce((s: number, o: any) => s + Number(o.total), 0);
    const pendingRevenue = activeOrders
      .filter((o: any) => o.status !== "delivered")
      .reduce((s: number, o: any) => s + Number(o.total), 0);

    let totalCost = 0;
    let totalItemsSold = 0;
    let revenueWithCost = 0; // revenue from products that have cost data
    let revenueWithoutCost = 0; // revenue from products missing cost data
    let itemsMissingCost = 0;
    const missingCostProductIds = new Set<string>();

    deliveredOrders.forEach((order: any) => {
      (order.order_items || []).forEach((item: any) => {
        const hasCost = item.product_id in costMap;
        const itemRevenue = Number(item.price) * item.quantity;
        totalItemsSold += item.quantity;

        if (hasCost) {
          totalCost += costMap[item.product_id] * item.quantity;
          revenueWithCost += itemRevenue;
        } else {
          revenueWithoutCost += itemRevenue;
          itemsMissingCost += item.quantity;
          missingCostProductIds.add(item.product_id);
        }
      });
    });

    // Profit only from products with known costs
    const totalProfit = revenueWithCost - totalCost;
    const profitMargin = revenueWithCost > 0 ? (totalProfit / revenueWithCost) * 100 : 0;
    const avgOrderValue = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;

    // Today's stats
    const today = new Date().toISOString().split("T")[0];
    const todayOrders = activeOrders.filter((o: any) => o.created_at.startsWith(today));
    const todayRevenue = todayOrders
      .filter((o: any) => o.status === "delivered")
      .reduce((s: number, o: any) => s + Number(o.total), 0);

    // This week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekOrders = activeOrders.filter((o: any) => new Date(o.created_at) >= weekAgo);
    const weekRevenue = weekOrders
      .filter((o: any) => o.status === "delivered")
      .reduce((s: number, o: any) => s + Number(o.total), 0);

    // Last 7 days chart
    const dayMap = new Map<string, { orders: number; revenue: number }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      dayMap.set(key, { orders: 0, revenue: 0 });
    }
    activeOrders.forEach((o: any) => {
      const day = o.created_at.split("T")[0];
      if (dayMap.has(day)) {
        const entry = dayMap.get(day)!;
        entry.orders++;
        if (o.status === "delivered") entry.revenue += Number(o.total);
      }
    });
    const last7Days = [...dayMap.entries()].map(([date, data]) => ({
      date,
      label: new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }),
      ...data,
    }));

    // Top selling products
    const productSales: Record<string, { quantity: number; revenue: number }> = {};
    deliveredOrders.forEach((order: any) => {
      (order.order_items || []).forEach((item: any) => {
        if (!productSales[item.product_id]) productSales[item.product_id] = { quantity: 0, revenue: 0 };
        productSales[item.product_id].quantity += item.quantity;
        productSales[item.product_id].revenue += Number(item.price) * item.quantity;
      });
    });

    const productNameMap: Record<string, string> = {};
    products.forEach((p: any) => { productNameMap[p.id] = p.title; });

    const topProducts = Object.entries(productSales)
      .map(([id, s]) => ({ id, name: productNameMap[id] || "Unknown", ...s }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    // Status for pipeline
    const statusPipeline = [
      { key: "processing", label: "Processing", count: processingOrders.length, icon: Clock, color: "text-amber-600", bg: "bg-amber-500/10" },
      { key: "prepared", label: "Prepared", count: preparedOrders.length, icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-500/10" },
      { key: "shipped", label: "Shipped", count: shippedOrders.length, icon: Truck, color: "text-purple-600", bg: "bg-purple-500/10" },
      { key: "delivered", label: "Delivered", count: deliveredOrders.length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-500/10" },
      { key: "cancelled", label: "Cancelled", count: cancelledOrders.length, icon: XCircle, color: "text-red-600", bg: "bg-red-500/10" },
    ];

    const outOfStock = products.filter((p: any) => !p.in_stock).length;

    return {
      totalRevenue, totalCost, totalProfit, profitMargin, avgOrderValue,
      totalOrders: activeOrders.length, totalItemsSold,
      todayOrders: todayOrders.length, todayRevenue,
      weekOrders: weekOrders.length, weekRevenue,
      pendingRevenue,
      last7Days,
      topProducts,
      statusPipeline,
      outOfStock,
      revenueWithoutCost,
      itemsMissingCost,
      missingCostCount: missingCostProductIds.size,
    };
  }, [orders, costMap, products]);

  const maxDayOrders = Math.max(...stats.last7Days.map((d) => d.orders), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Real-time overview · Cancelled orders excluded from analytics
        </p>
      </div>

      {/* Top KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Revenue", value: formatPrice(stats.totalRevenue),
            sub: `${stats.totalOrders} orders delivered`,
            icon: DollarSign, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600",
            accent: "from-emerald-500/10 to-transparent",
            adminOnly: true,
          },
          {
            label: "Net Profit", value: formatPrice(stats.totalProfit),
            sub: stats.missingCostCount > 0
              ? `${stats.profitMargin.toFixed(1)}% margin · ${stats.missingCostCount} products missing cost`
              : `${stats.profitMargin.toFixed(1)}% margin`,
            icon: TrendingUp,
            iconBg: stats.totalProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10",
            iconColor: stats.totalProfit >= 0 ? "text-emerald-600" : "text-red-600",
            accent: stats.totalProfit >= 0 ? "from-emerald-500/10 to-transparent" : "from-red-500/10 to-transparent",
            adminOnly: true,
          },
          {
            label: "Today's Orders", value: stats.todayOrders,
            sub: stats.todayRevenue > 0 ? formatPrice(stats.todayRevenue) + " revenue" : "No deliveries today",
            icon: Zap, iconBg: "bg-primary/10", iconColor: "text-primary",
            accent: "from-primary/10 to-transparent",
            adminOnly: false,
          },
          {
            label: "Avg Order Value", value: formatPrice(stats.avgOrderValue),
            sub: `${stats.totalItemsSold} total items sold`,
            icon: BarChart3, iconBg: "bg-blue-500/10", iconColor: "text-blue-600",
            accent: "from-blue-500/10 to-transparent",
            adminOnly: false,
          },
        ].filter(card => !card.adminOnly || isFullAdmin).map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative bg-card rounded-2xl border border-border/50 p-5 overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.accent} pointer-events-none`} />
            <div className="relative">
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center mb-3`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{card.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{card.sub}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Second row: Pipeline + Quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Order Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-card rounded-2xl border border-border/50 p-5"
        >
          <h2 className="text-sm font-bold text-foreground mb-4">Order Pipeline</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {stats.statusPipeline.map((s) => (
              <div key={s.key} className={`rounded-xl ${s.bg} p-3 text-center`}>
                <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-1.5`} />
                <p className="text-xl font-bold text-foreground">{s.count}</p>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-2xl border border-border/50 p-5 space-y-4"
        >
          <h2 className="text-sm font-bold text-foreground">Quick Stats</h2>
          {[
            { label: "Products", value: productCount, icon: Package, color: "text-primary" },
            { label: "Categories", value: categoryCount, icon: FolderTree, color: "text-pink-600" },
            { label: "Out of Stock", value: stats.outOfStock, icon: XCircle, color: "text-red-600" },
            ...(isFullAdmin ? [{ label: "Pending Revenue", value: formatPrice(stats.pendingRevenue), icon: Clock, color: "text-amber-600" }] : []),
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <item.icon className={`w-4 h-4 ${item.color}`} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
              <span className="text-sm font-bold text-foreground">{item.value}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Third row: Chart + Top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Last 7 days chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border/50 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-foreground">Last 7 Days</h2>
            <span className="text-xs text-muted-foreground">{stats.weekOrders} orders this week</span>
          </div>
          <div className="space-y-2.5">
            {stats.last7Days.map((day) => (
              <div key={day.date} className="flex items-center gap-3">
                <span className="text-[11px] text-muted-foreground w-10 flex-shrink-0 font-medium">{day.label}</span>
                <div className="flex-1 h-8 bg-muted/20 rounded-lg overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(day.orders / maxDayOrders) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary/50 to-primary rounded-lg"
                  />
                  <div className="absolute inset-0 flex items-center px-3">
                    <span className="text-[10px] font-bold text-foreground">
                      {day.orders} order{day.orders !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top selling products */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-card rounded-2xl border border-border/50 p-5"
        >
          <h2 className="text-sm font-bold text-foreground mb-4">Top Selling Products</h2>
          {stats.topProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {stats.topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.quantity} sold · {formatPrice(p.revenue)}</p>
                  </div>
                  {i === 0 && <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* This week summary banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl bg-gradient-to-r from-primary/10 via-card to-primary/5 border border-primary/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">This Week Summary</p>
          <p className="text-xl font-bold text-foreground mt-1">
            {stats.weekOrders} orders{isFullAdmin ? ` · ${formatPrice(stats.weekRevenue)} revenue` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary">
            Avg {stats.weekOrders > 0 ? (stats.weekOrders / 7).toFixed(1) : "0"} orders/day
          </span>
        </div>
      </motion.div>
    </div>
  );
}
