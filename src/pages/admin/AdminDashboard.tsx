import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingCart, FolderTree, Image, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    { title: "Total Products", value: stats?.products ?? "—", icon: Package, color: "text-primary" },
    { title: "Total Orders", value: stats?.orders ?? "—", icon: ShoppingCart, color: "text-rose" },
    { title: "Revenue", value: stats ? formatPrice(stats.revenue) : "—", icon: DollarSign, color: "text-sage" },
    { title: "Pending Orders", value: stats?.pending ?? "—", icon: TrendingUp, color: "text-gold" },
    { title: "Categories", value: stats?.categories ?? "—", icon: FolderTree, color: "text-primary" },
    { title: "Banners", value: stats?.banners ?? "—", icon: Image, color: "text-rose" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-foreground mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.title} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
