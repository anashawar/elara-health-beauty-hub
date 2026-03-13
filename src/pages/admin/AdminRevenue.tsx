import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/hooks/useProducts";
import { DollarSign, TrendingUp, TrendingDown, Package, ShoppingCart, ArrowUpRight } from "lucide-react";
import { useMemo } from "react";

export default function AdminRevenue() {
  // Fetch all orders with items
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-revenue-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total, subtotal, delivery_fee, discount, status, created_at, coupon_code, order_items(product_id, quantity, price)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch product costs (admin-only table)
  const { data: productCosts = [] } = useQuery({
    queryKey: ["admin-product-costs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_costs")
        .select("product_id, cost");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch products for names
  const { data: products = [] } = useQuery({
    queryKey: ["admin-revenue-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title");
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

  const stats = useMemo(() => {
    const deliveredOrders = orders.filter((o: any) => o.status === "delivered");
    const allNonCancelled = orders.filter((o: any) => o.status !== "cancelled");

    let totalRevenue = 0;
    let totalCost = 0;
    let totalItemsSold = 0;
    const productStats: Record<string, { sold: number; revenue: number; cost: number }> = {};

    deliveredOrders.forEach((order: any) => {
      totalRevenue += Number(order.total);
      (order.order_items || []).forEach((item: any) => {
        const itemRevenue = Number(item.price) * item.quantity;
        const itemCost = (costMap[item.product_id] || 0) * item.quantity;
        totalCost += itemCost;
        totalItemsSold += item.quantity;

        if (!productStats[item.product_id]) {
          productStats[item.product_id] = { sold: 0, revenue: 0, cost: 0 };
        }
        productStats[item.product_id].sold += item.quantity;
        productStats[item.product_id].revenue += itemRevenue;
        productStats[item.product_id].cost += itemCost;
      });
    });

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Sort products by profit
    const topProducts = Object.entries(productStats)
      .map(([id, s]) => ({ id, name: productNameMap[id] || "Unknown", ...s, profit: s.revenue - s.cost }))
      .sort((a, b) => b.profit - a.profit);

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      totalOrders: deliveredOrders.length,
      pendingOrders: allNonCancelled.filter((o: any) => o.status !== "delivered").length,
      totalItemsSold,
      topProducts,
    };
  }, [orders, costMap, productNameMap]);

  const summaryCards = [
    { title: "Total Revenue", value: formatPrice(stats.totalRevenue), icon: DollarSign, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600", desc: `${stats.totalOrders} delivered orders` },
    { title: "Total Cost", value: formatPrice(stats.totalCost), icon: TrendingDown, iconBg: "bg-red-500/10", iconColor: "text-red-600", desc: `${stats.totalItemsSold} items sold` },
    { title: "Net Profit", value: formatPrice(stats.totalProfit), icon: TrendingUp, iconBg: stats.totalProfit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10", iconColor: stats.totalProfit >= 0 ? "text-emerald-600" : "text-red-600", desc: `${stats.profitMargin.toFixed(1)}% margin` },
    { title: "Pending Revenue", value: `${stats.pendingOrders} orders`, icon: ShoppingCart, iconBg: "bg-amber-500/10", iconColor: "text-amber-600", desc: "Not yet delivered" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Revenue & Profitability</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your costs, revenue, and profit margins — visible only to admins.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card) => (
          <div key={card.title} className="bg-card rounded-2xl border border-border/50 p-5 shadow-premium">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{card.title}</p>
            <p className="text-xl font-bold text-foreground mt-1">{card.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{card.desc}</p>
          </div>
        ))}
      </div>

      {/* Product profitability table */}
      <div className="bg-card rounded-2xl border border-border/50 p-5 shadow-premium">
        <h2 className="text-lg font-display font-bold text-foreground mb-4">Product Profitability</h2>
        {stats.topProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No delivered orders yet. Profit data will appear once orders are fulfilled.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Product</th>
                  <th className="text-right py-3 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Sold</th>
                  <th className="text-right py-3 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Revenue</th>
                  <th className="text-right py-3 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cost</th>
                  <th className="text-right py-3 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Profit</th>
                  <th className="text-right py-3 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Margin</th>
                </tr>
              </thead>
              <tbody>
                {stats.topProducts.map((p) => {
                  const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={p.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 px-2 font-medium text-foreground max-w-[200px] truncate">{p.name}</td>
                      <td className="py-3 px-2 text-right text-muted-foreground">{p.sold}</td>
                      <td className="py-3 px-2 text-right text-foreground font-medium">{formatPrice(p.revenue)}</td>
                      <td className="py-3 px-2 text-right text-red-500 font-medium">{formatPrice(p.cost)}</td>
                      <td className={`py-3 px-2 text-right font-bold ${p.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatPrice(p.profit)}</td>
                      <td className={`py-3 px-2 text-right font-medium ${Number(margin) >= 0 ? "text-emerald-600" : "text-red-600"}`}>{margin}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
