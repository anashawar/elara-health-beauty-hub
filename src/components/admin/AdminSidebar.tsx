import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FolderTree,
  Image,
  Tag,
  Ticket,
  LogOut,
  Home,
  Sparkles,
  BarChart3,
  Percent,
  Bell,
  Languages,
  ImagePlus,
  Headphones,
  Users,
  Warehouse,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin, type AppRole } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import elaraLogo from "@/assets/elara-logo.png";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  roles: AppRole[]; // which roles can see this item
}

const navItems: NavItem[] = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, roles: ["admin", "operations"] },
  { title: "Products", url: "/admin/products", icon: Package, roles: ["admin", "operations", "data_entry"] },
  { title: "Orders", url: "/admin/orders", icon: ShoppingCart, roles: ["admin", "operations"] },
  { title: "Offers", url: "/admin/offers", icon: Percent, roles: ["admin", "operations"] },
  { title: "Revenue", url: "/admin/revenue", icon: BarChart3, roles: ["admin"] },
  { title: "Warehouse Costs", url: "/admin/warehouse-costs", icon: Warehouse, roles: ["admin"] },
  { title: "Categories", url: "/admin/categories", icon: FolderTree, roles: ["admin", "operations", "data_entry"] },
  { title: "Brands", url: "/admin/brands", icon: Tag, roles: ["admin", "operations", "data_entry"] },
  { title: "Banners", url: "/admin/banners", icon: Image, roles: ["admin", "operations"] },
  { title: "Coupons", url: "/admin/coupons", icon: Ticket, roles: ["admin", "operations"] },
  { title: "Notifications", url: "/admin/notifications", icon: Bell, roles: ["admin", "operations"] },
  { title: "Translate", url: "/admin/translate", icon: Languages, roles: ["admin", "operations", "data_entry"] },
  { title: "Image Finder", url: "/admin/images", icon: ImagePlus, roles: ["admin", "operations", "data_entry"] },
  { title: "Support Chat", url: "/admin/support", icon: Headphones, roles: ["admin", "operations"] },
  { title: "Team", url: "/admin/team", icon: Users, roles: ["admin"] },
];

export default function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { role } = useAdmin();

  const visibleItems = navItems.filter((item) => role && item.roles.includes(role));

  const isActive = (path: string) =>
    path === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-display font-bold text-sidebar-foreground tracking-tight">ELARA</h1>
              <p className="text-[10px] text-muted-foreground font-medium -mt-0.5">Admin Console</p>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mx-auto">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-bold">Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/admin"}
                      className="hover:bg-primary/5 rounded-xl transition-all"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick link back to store */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/70 font-bold">Quick Links</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="View Store">
                  <NavLink to="/home" className="hover:bg-primary/5 rounded-xl transition-all" activeClassName="">
                    <Home className="h-4 w-4" />
                    {!collapsed && <span>View Store</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-xl"
          onClick={async () => {
            await signOut();
            navigate("/auth");
          }}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
