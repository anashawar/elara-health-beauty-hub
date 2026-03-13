import { useEffect, useState, useCallback } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";
import { useAdmin } from "@/hooks/useAdmin";
import { Loader2, Bell, X, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/hooks/useProducts";
import elaraLogo from "@/assets/elara-logo.png";
import { AnimatePresence, motion } from "framer-motion";

const pageTitles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/products": "Products",
  "/admin/orders": "Orders",
  "/admin/revenue": "Revenue",
  "/admin/categories": "Categories",
  "/admin/brands": "Brands",
  "/admin/banners": "Banners",
  "/admin/coupons": "Coupons",
};

interface OrderNotification {
  id: string;
  total: number;
  created_at: string;
}

export default function AdminLayout() {
  const { isAdmin, loading } = useAdmin();
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || "Admin";
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Listen for new orders in realtime
  useEffect(() => {
    const channel = supabase
      .channel('admin-new-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const newOrder = payload.new as any;
        const notif: OrderNotification = {
          id: newOrder.id,
          total: Number(newOrder.total),
          created_at: newOrder.created_at,
        };
        setNotifications(prev => [notif, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);

        // Play a subtle sound or show browser notification if possible
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("New Order! 🛒", {
            body: `Order #${newOrder.id.slice(0, 8)} — ${formatPrice(Number(newOrder.total))}`,
            icon: "/app-icon.png",
          });
        }
      })
      .subscribe();

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleBellClick = useCallback(() => {
    setShowPanel(prev => !prev);
    setUnreadCount(0);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <img src={elaraLogo} alt="ELARA" className="h-10 opacity-60" />
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-16 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-lg px-4 md:px-6 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="hidden md:block h-6 w-px bg-border" />
              <h2 className="text-base font-display font-bold text-foreground hidden md:block">{pageTitle}</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button onClick={handleBellClick} className="relative p-2 rounded-xl hover:bg-secondary transition-colors">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification panel */}
                <AnimatePresence>
                  {showPanel && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute right-0 top-12 w-80 bg-card rounded-2xl border border-border shadow-xl z-50 overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <h3 className="text-sm font-bold text-foreground">Notifications</h3>
                        <button onClick={() => setShowPanel(false)} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="py-10 text-center">
                            <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">No new notifications</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">New orders will appear here in real-time</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/30 hover:bg-secondary/50 transition-colors">
                              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <ShoppingCart className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">New Order #{n.id.slice(0, 8)}</p>
                                <p className="text-[11px] text-muted-foreground">{formatPrice(n.total)} • {new Date(n.created_at).toLocaleTimeString()}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-sm font-bold">
                A
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
