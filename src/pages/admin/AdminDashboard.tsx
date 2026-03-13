import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingCart, FolderTree, Image, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatPrice } from "@/hooks/useProducts";

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [products, orders, categories, banners] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, total, status, created_at"),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("banners").select("id", { count: "exact", head: true }),
      ]);

      const orderData = orders.data || [];
      const totalRevenue = orderData.reduce((sum, o) => sum + Number(o.total), 0);
      const pendingOrders = orderData.filter((o) => o.status === "pending").length;

      return {
        products: products.count || 0,
        orders: orderData.length,
        categories: categories.count || 0,
        banners: banners.count || 0,
        revenue: totalRevenue,
        pending: pendingOrders,
      };
    },
  });

  const cards = [
    { title: "Revenue", value: stats ? formatPrice(stats.revenue) : "—", icon: DollarSign, gradient: "from-emerald-500 to-teal-600", iconBg: "bg-emerald-500/10", iconColor: "text-emerald-600" },
    { title: "Total Orders", value: stats?.orders ?? "—", icon: ShoppingCart, gradient: "from-blue-500 to-indigo-600", iconBg: "bg-blue-500/10", iconColor: "text-blue-600" },
    { title: "Pending Orders", value: stats?.pending ?? "—", icon: TrendingUp, gradient: "from-amber-500 to-orange-600", iconBg: "bg-amber-500/10", iconColor: "text-amber-600" },
    { title: "Products", value: stats?.products ?? "—", icon: Package, gradient: "from-primary to-violet-600", iconBg: "bg-primary/10", iconColor: "text-primary" },
    { title: "Categories", value: stats?.categories ?? "—", icon: FolderTree, gradient: "from-pink-500 to-rose-600", iconBg: "bg-pink-500/10", iconColor: "text-pink-600" },
    { title: "Banners", value: stats?.banners ?? "—", icon: Image, gradient: "from-cyan-500 to-sky-600", iconBg: "bg-cyan-500/10", iconColor: "text-cyan-600" },
  ];

  return (
    <div>
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Welcome back 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your store today.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="relative bg-card rounded-2xl border border-border/50 p-5 hover:shadow-premium transition-shadow overflow-hidden group">
            {/* Subtle gradient accent */}
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.gradient} opacity-5 rounded-bl-[60px] group-hover:opacity-10 transition-opacity`} />
            
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{card.title}</p>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
