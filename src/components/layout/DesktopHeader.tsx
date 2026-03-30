import { Search, Heart, ShoppingBag, UserRound, Sparkles, MapPin, ChevronDown, Smartphone } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import elaraLogo from "@/assets/elara-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useProducts";
import { motion } from "framer-motion";
import { useState } from "react";

interface DesktopHeaderProps {
  onSearchClick: () => void;
}

const DesktopHeader = ({ onSearchClick }: DesktopHeaderProps) => {
  const { user } = useAuth();
  const { cartCount, cart } = useApp();
  const { t, language } = useLanguage();
  const location = useLocation();
  const { data: categories = [] } = useCategories();
  const [showCategories, setShowCategories] = useState(false);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || t("common.guest");

  const { data: defaultAddress } = useQuery({
    queryKey: ["default-address", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("addresses")
        .select("city, area")
        .eq("user_id", user!.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const userCity = defaultAddress?.city || defaultAddress?.area || "";

  const getCatName = (cat: any) => {
    if (language === "ar" && cat.name_ar) return cat.name_ar;
    if (language === "ku" && cat.name_ku) return cat.name_ku;
    return cat.name;
  };

  const navLinks = [
    { label: t("nav.home"), path: "/home" },
    { label: t("nav.categories"), path: "/categories", hasDropdown: true },
    { label: t("nav.fav"), path: "/wishlist" },
    { label: t("profile.myOrders"), path: "/orders" },
    { label: t("profile.aboutElara"), path: "/about" },
  ];

  const isActive = (path: string) =>
    location.pathname === path || (path === "/home" && location.pathname === "/");

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border hidden md:block">
      {/* Top utility bar */}
      <div className="bg-primary/5 border-b border-border/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between py-1.5">
          <div className="flex items-center gap-4">
            {user && userCity && (
              <Link to="/addresses" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <MapPin className="w-3 h-3 text-primary" />
                <span>Deliver to <strong className="text-foreground">{userCity}</strong></span>
              </Link>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Smartphone className="w-3 h-3" />
              <span>Download the App — <strong className="text-primary">15% OFF</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/faq" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("profile.faq")}</Link>
            <span className="text-border">|</span>
            <Link to="/settings" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t("profile.settings")}</Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between py-4 gap-6">
          {/* Logo */}
          <Link to="/home" className="flex-shrink-0">
            <img src={elaraLogo} alt="ELARA" className="h-9" />
          </Link>

          {/* Search bar — wider on desktop */}
          <button
            onClick={onSearchClick}
            className="flex-1 max-w-xl flex items-center gap-3 px-5 py-3 bg-secondary/60 rounded-2xl border border-border hover:border-primary/30 hover:bg-secondary/80 transition-all duration-200"
          >
            <Search className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("common.search")}...</span>
            <span className="ms-auto text-[10px] text-muted-foreground/50 bg-card px-2 py-0.5 rounded-lg border border-border/50">⌘K</span>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <Link
              to="/elara-ai"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-violet-600 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 group"
            >
              <Sparkles className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
              <span className="text-xs font-bold text-white">ELARA AI</span>
            </Link>

            <NotificationCenter />

            <Link to="/wishlist" className="relative p-2.5 rounded-xl hover:bg-secondary transition-colors">
              <Heart className="w-5 h-5 text-muted-foreground" />
            </Link>

            <Link to="/cart" className="relative p-2.5 rounded-xl hover:bg-secondary transition-colors group">
              <ShoppingBag className="w-5 h-5 text-muted-foreground" />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                >
                  {cartCount}
                </motion.span>
              )}
            </Link>

            <div className="w-px h-6 bg-border mx-1" />

            {user ? (
              <Link to="/profile" className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-secondary transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
                  <UserRound className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left rtl:text-right">
                  <p className="text-xs font-semibold text-foreground leading-tight">{firstName}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">My Account</p>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/auth" className="px-4 py-2.5 text-sm font-medium text-foreground hover:bg-secondary rounded-xl transition-colors">
                  {t("common.signIn") || "Sign In"}
                </Link>
                <Link to="/auth" className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:opacity-90 transition-opacity shadow-sm">
                  {t("common.signUp") || "Sign Up"}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Navigation bar */}
        <div className="flex items-center gap-1 pb-3 border-t border-border/30 pt-3 -mt-1">
          {navLinks.map(({ label, path, hasDropdown }) => (
            <div
              key={path}
              className="relative"
              onMouseEnter={() => hasDropdown && setShowCategories(true)}
              onMouseLeave={() => hasDropdown && setShowCategories(false)}
            >
              <Link
                to={path}
                className={`flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive(path)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {label}
                {hasDropdown && <ChevronDown className="w-3.5 h-3.5" />}
              </Link>

              {/* Categories dropdown */}
              {hasDropdown && showCategories && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full left-0 rtl:left-auto rtl:right-0 mt-1 w-[480px] bg-card rounded-2xl shadow-premium-lg border border-border/50 p-5 z-50"
                >
                  <div className="grid grid-cols-3 gap-3">
                    {categories.slice(0, 12).map(cat => (
                      <Link
                        key={cat.id}
                        to={`/category/${cat.slug}`}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors group"
                        onClick={() => setShowCategories(false)}
                      >
                        <span className="text-xl">{cat.icon}</span>
                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{getCatName(cat)}</span>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <Link to="/categories" className="text-xs font-semibold text-primary hover:underline" onClick={() => setShowCategories(false)}>
                      {t("common.viewAll")} →
                    </Link>
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
};

export default DesktopHeader;
