import { memo } from "react";
import { Home, LayoutGrid, ShoppingBag, UserRound, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/i18n/LanguageContext";

const BottomNav = memo(() => {
  const location = useLocation();
  const { cartCount } = useApp();
  const { t } = useLanguage();

  const navItems = [
    { icon: Home, label: t("nav.home"), path: "/home" },
    { icon: LayoutGrid, label: t("nav.categories"), path: "/categories" },
    { icon: Sparkles, label: "ELARA AI", path: "/elara-ai", isAI: true },
    { icon: ShoppingBag, label: t("nav.cart"), path: "/cart" },
    { icon: UserRound, label: t("nav.me"), path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" style={{ contain: 'layout style' }}>
      <div className="app-container">
        <div className="bg-card border-t border-border/40 shadow-[0_-1px_3px_hsl(20_10%_12%/0.04)] bottom-nav-safe">
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
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-float border-2 transition-colors duration-100 ${
                        isActive
                          ? "bg-primary border-primary/30"
                          : "bg-gradient-to-br from-primary to-violet-600 border-primary/20"
                      }`}
                    >
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
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
                  className="relative flex flex-col items-center gap-0.5 px-4 py-2 active:opacity-70 transition-opacity duration-80"
                >
                  <div className="relative">
                    {isActive && (
                      <div className="absolute -inset-2.5 bg-primary/10 rounded-2xl" />
                    )}
                    <Icon
                      className={`relative w-[22px] h-[22px] transition-colors duration-100 ${
                        isActive
                          ? "text-primary stroke-[2.5px]"
                          : "text-muted-foreground/70 stroke-[1.8px]"
                      }`}
                    />
                    {path === "/cart" && cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                        {cartCount}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] leading-tight transition-colors duration-100 ${
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
});

BottomNav.displayName = "BottomNav";

export default BottomNav;
