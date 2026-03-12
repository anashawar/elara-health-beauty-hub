import { Home, Grid3X3, Heart, ShoppingBag, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Grid3X3, label: "Categories", path: "/categories" },
  { icon: Heart, label: "Wishlist", path: "/wishlist" },
  { icon: ShoppingBag, label: "Cart", path: "/cart" },
  { icon: User, label: "Profile", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const { cartCount } = useApp();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border shadow-premium-lg">
      <div className="flex items-center justify-around py-2 pb-[env(safe-area-inset-bottom,8px)] max-w-lg mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-all ${isActive ? "stroke-[2.5px]" : ""}`} />
                {label === "Cart" && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? "font-semibold" : ""}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
