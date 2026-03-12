import { Home, LayoutGrid, ShoppingBag, Heart, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { motion } from "framer-motion";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: LayoutGrid, label: "Categories", path: "/categories" },
  { icon: ShoppingBag, label: "Cart", path: "/cart" },
  { icon: Heart, label: "Fav", path: "/wishlist" },
  { icon: UserRound, label: "Me", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const { cartCount } = useApp();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-lg mx-auto px-3 pb-[env(safe-area-inset-bottom,6px)]">
        <div className="bg-card/90 backdrop-blur-xl border border-border/60 rounded-2xl shadow-lg mx-1 mb-2">
          <div className="flex items-center justify-around py-2">
            {navItems.map(({ icon: Icon, label, path }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className="relative flex flex-col items-center gap-0.5 px-4 py-1.5"
                >
                  <div className="relative">
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute -inset-2 bg-primary/12 rounded-xl"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon
                      className={`relative w-[22px] h-[22px] transition-colors duration-200 ${
                        isActive
                          ? "text-primary stroke-[2.5px]"
                          : "text-muted-foreground stroke-[1.8px]"
                      }`}
                    />
                    {label === "Cart" && cartCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                      >
                        {cartCount}
                      </motion.span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] transition-colors duration-200 ${
                      isActive
                        ? "text-primary font-bold"
                        : "text-muted-foreground font-medium"
                    }`}
                  >
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
