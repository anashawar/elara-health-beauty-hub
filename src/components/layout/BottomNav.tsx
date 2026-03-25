import { memo, useCallback } from "react";
import { Home, LayoutGrid, ShoppingBag, UserRound, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/i18n/LanguageContext";

const BottomNav = memo(() => {
  const location = useLocation();
  const { cartCount } = useApp();
  const { t } = useLanguage();
  const path = location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" style={{ contain: 'layout style paint' }}>
      <div className="app-container relative">
        {/* Floating AI button — positioned above the bar */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-5 z-10">
          <Link to="/elara-ai" className="flex flex-col items-center">
            <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg ring-[3px] ring-card transition-all duration-75 ${
            path === "/elara-ai" ?
            "bg-primary scale-105" :
            "bg-gradient-to-br from-primary to-violet-600"}`
            }>
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className={`text-[9px] leading-tight mt-1 font-bold ${
            path === "/elara-ai" ? "text-primary" : "text-primary/70"}`
            }>ELARA AI</span>
          </Link>
        </div>

        <div className="bg-card border-t border-border/40 shadow-[0_-1px_3px_hsl(20_10%_12%/0.04)] bottom-nav-safe">
          <div className="flex items-center justify-around py-1 font-bold">
            <NavItem to="/home" icon={Home} label={t("nav.home")} isActive={path === "/home" || path === "/"} />
            <NavItem to="/categories" icon={LayoutGrid} label={t("nav.categories")} isActive={path === "/categories"} />
            
            {/* Spacer for center AI button */}
            <div className="w-16" />

            <NavItem to="/cart" icon={ShoppingBag} label={t("nav.cart")} isActive={path === "/cart"} badge={cartCount > 0 ? cartCount : undefined} />
            <NavItem to="/profile" icon={UserRound} label={t("nav.me")} isActive={path === "/profile"} />
          </div>
        </div>
      </div>
    </nav>);

});

/** Lightweight nav item — avoids re-render of parent */
const NavItem = memo(({ to, icon: Icon, label, isActive, badge

}: {to: string;icon: any;label: string;isActive: boolean;badge?: number;}) =>
<Link to={to} className="relative flex flex-col items-center gap-0.5 px-4 py-2 active:opacity-70 transition-opacity duration-75">
    <div className="relative">
      {isActive && <div className="absolute -inset-2.5 bg-primary/10 rounded-2xl" />}
      <Icon className={`relative w-[22px] h-[22px] transition-colors duration-75 ${
    isActive ? "text-primary stroke-[2.5px]" : "text-muted-foreground/70 stroke-[1.8px]"}`
    } />
      {badge !== undefined &&
    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-1">
          {badge}
        </span>
    }
    </div>
    <span className={`text-[10px] leading-tight transition-colors duration-75 ${
  isActive ? "text-primary font-bold" : "text-muted-foreground/60 font-medium"}`
  }>{label}</span>
  </Link>
);

NavItem.displayName = "NavItem";
BottomNav.displayName = "BottomNav";

export default BottomNav;