import { Home, LayoutGrid, Heart, UserRound, Sparkles } from "lucide-react";
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
    { icon: Sparkles, label: "ELARA AI", path: "/elara-ai", isAI: true },
    { icon: Heart, label: t("nav.fav"), path: "/wishlist" },
    { icon: UserRound, label: t("nav.me"), path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="app-container">
        <div className="bg-card/95 backdrop-blur-xl border-t border-border/40 shadow-[0_-1px_3px_hsl(20_10%_12%/0.04)] bottom-nav-safe">
          <div className="flex items-center justify-around py-1">
            {navItems.map(({ icon: Icon, label, path, isAI }) => {
              const isActive = location.pathname === path || (path === "/home" && location.pathname === "/");

              if (isAI) {
                return (
                  <Link
                    key={path}
                    to={path}
                    className="relative flex flex-col items-center gap-0.5 px-4 -mt-4"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-float border-2 ${
                        isActive
                          ? "bg-primary border-primary/30"
                          : "bg-gradient-to-br from-primary to-violet-600 border-primary/20"
                      }`}
                    >
                      <Sparkles className="w-5 h-5 text-white" />
                    </motion.div>
                    <span className={`text-[9px] leading-tight mt-0.5 font-bold ${
                      isActive ? "text-primary" : "text-primary/70"
                    }`}>
                      {label}
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={path}
                  to={path}
                  className="relative flex flex-col items-center gap-0.5 px-4 py-2 active:opacity-70 transition-opacity duration-100"
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
                      className={`relative w-[22px] h-[22px] transition-all duration-200 ${
                        isActive
                          ? "text-primary stroke-[2.5px]"
                          : "text-muted-foreground/70 stroke-[1.8px]"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[10px] leading-tight transition-all duration-200 ${
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
