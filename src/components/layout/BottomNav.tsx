import { memo } from "react";
import { Home, LayoutGrid, ShoppingBag, UserRound, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useTabMemoryTracker, getTabRoute, getActiveTab } from "@/hooks/useTabMemory";
import type { TabKey } from "@/hooks/useTabMemory";

const BottomNav = memo(() => {
  const location = useLocation();
  const { cartCount } = useApp();
  const { t } = useLanguage();
  const path = location.pathname;

  // Track current route into tab memory
  useTabMemoryTracker();

  const activeTab = getActiveTab(path);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" style={{ contain: "layout style paint" }}>
      <div className="app-container">
        <div className="bg-card border-t border-border/40 shadow-[0_-1px_3px_hsl(20_10%_12%/0.04)] bottom-nav-safe">
          <div className="grid grid-cols-5 py-1">
            <NavItem to={getTabRoute("home")} icon={Home} label={t("nav.home")} isActive={activeTab === "home"} />
            <NavItem to={getTabRoute("categories")} icon={LayoutGrid} label={t("nav.categories")} isActive={activeTab === "categories"} />

            {/* AI tab */}
            <Link
              to={getTabRoute("ai")}
              className="relative flex flex-col items-center justify-center gap-0.5 py-2 active:opacity-70 transition-opacity duration-75"
            >
              <div className="relative">
                {activeTab === "ai" && <div className="absolute -inset-2.5 bg-primary/10 rounded-2xl" />}
                <div
                  className={`relative w-[22px] h-[22px] rounded-md flex items-center justify-center ${
                    activeTab === "ai" ? "bg-primary" : "bg-gradient-to-br from-primary to-violet-600"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              </div>
              <span
                className={`text-[10px] leading-tight transition-colors duration-75 ${
                  activeTab === "ai" ? "text-primary font-bold" : "text-primary/70 font-medium"
                }`}
              >
                ELARA AI
              </span>
            </Link>

            <NavItem
              to={getTabRoute("cart")}
              icon={ShoppingBag}
              label={t("nav.cart")}
              isActive={activeTab === "cart"}
              badge={cartCount > 0 ? cartCount : undefined}
            />
            <NavItem to={getTabRoute("profile")} icon={UserRound} label={t("nav.me")} isActive={activeTab === "profile"} />
          </div>
        </div>
      </div>
    </nav>
  );
});

/** Lightweight nav item — avoids re-render of parent */
const NavItem = memo(
  ({
    to,
    icon: Icon,
    label,
    isActive,
    badge,
  }: {
    to: string;
    icon: any;
    label: string;
    isActive: boolean;
    badge?: number;
  }) => (
    <Link
      to={to}
      className="relative flex flex-col items-center justify-center gap-0.5 py-2 active:opacity-70 transition-opacity duration-75"
    >
      <div className="relative">
        {isActive && <div className="absolute -inset-2.5 bg-primary/10 rounded-2xl" />}
        <Icon
          className={`relative w-[22px] h-[22px] transition-colors duration-75 ${
            isActive ? "text-primary stroke-[2.5px]" : "text-muted-foreground/70 stroke-[1.8px]"
          }`}
        />
        {badge !== undefined && (
          <span className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-1">
            {badge}
          </span>
        )}
      </div>
      <span
        className={`text-[10px] leading-tight transition-colors duration-75 ${
          isActive ? "text-primary font-bold" : "text-muted-foreground/60 font-medium"
        }`}
      >
        {label}
      </span>
    </Link>
  ),
);

NavItem.displayName = "NavItem";
BottomNav.displayName = "BottomNav";

export default BottomNav;
