import { Home, LayoutGrid, ShoppingBag, Heart, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { motion } from "framer-motion";

const BottomNav = () => {
  const location = useLocation();
  const { cartCount } = useApp();
  const { t } = useLanguage();

  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/home" },
    { icon: LayoutGrid, label: t("nav.categories"), path: "/categories" },
    { icon: ShoppingBag, label: t("nav.cart"), path: "/cart" },
    { icon: Heart, label: t("nav.fav"), path: "/wishlist" },
    { icon: UserRound, label: t("nav.me"), path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="app-container">
        <div className="glass-heavy border-t border-border/30 shadow-glass bottom-nav-safe">
          <div className="flex items-center justify-around py-1.5">
            {navItems.map(({ icon: Icon, label, path }) => {
              const isActive = location.pathname === path || (path === "/home" && location.pathname === "/");
              return (
                <Link
                  key={path}
                  to={path}
                  className="relative flex flex-col items-center gap-0.5 px-4 py-1.5 active:scale-90 transition-transform duration-150"
                >
                  <div className="relative">
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute -inset-2.5 bg-primary/10 rounded-2xl"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                      />
                    )}
                    <Icon
                      className={`relative w-[21px] h-[21px] transition-all duration-200 ${
                        isActive
                          ? "text-primary stroke-[2.5px]"
                          : "text-muted-foreground/70 stroke-[1.8px]"
                      }`}
                    />
                    {label === t("nav.cart") && cartCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-1 shadow-float"
                      >
                        {cartCount}
                      </motion.span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] transition-all duration-200 ${
                      isActive
                        ? "text-primary font-bold"
                        : "text-muted-foreground/60 font-medium"
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
