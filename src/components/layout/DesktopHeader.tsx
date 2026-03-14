import { Search, Heart, ShoppingBag, UserRound, Sparkles, MapPin, LayoutGrid, ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import elaraLogo from "@/assets/elara-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

interface DesktopHeaderProps {
  onSearchClick: () => void;
}

const DesktopHeader = ({ onSearchClick }: DesktopHeaderProps) => {
  const { user } = useAuth();
  const { cartCount } = useApp();
  const { t } = useLanguage();
  const location = useLocation();

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

  const navLinks = [
    { label: t("nav.home"), path: "/home" },
    { label: t("nav.categories"), path: "/categories" },
    { label: t("nav.fav"), path: "/wishlist" },
  ];

  const isActive = (path: string) =>
    location.pathname === path || (path === "/home" && location.pathname === "/");

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border hidden md:block">
      <div className="w-full">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3">
          {/* Logo */}
          <Link to="/home" className="flex-shrink-0">
            <img src={elaraLogo} alt="ELARA" className="h-8" />
          </Link>

          {/* Search bar */}
          <button
            onClick={onSearchClick}
            className="flex-1 max-w-md mx-8 flex items-center gap-2.5 px-5 py-2.5 bg-secondary/80 rounded-xl border border-border hover:border-primary/30 transition-all duration-200"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t("common.search")}</span>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {user && userCity && (
              <Link to="/addresses" className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-secondary transition-colors">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">{userCity}, {t("common.iraq")}</span>
              </Link>
            )}

            <Link
              to="/elara-ai"
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-primary to-primary/80 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Sparkles className="w-4 h-4 text-primary-foreground" />
              <span className="text-xs font-bold text-primary-foreground">AI</span>
            </Link>

            <NotificationCenter />

            <Link to="/wishlist" className="relative p-2.5 rounded-xl hover:bg-secondary transition-colors">
              <Heart className="w-5 h-5 text-muted-foreground" />
            </Link>

            <Link to="/cart" className="relative p-2.5 rounded-xl hover:bg-secondary transition-colors">
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

            {user ? (
              <Link to="/profile" className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-secondary transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
                  <UserRound className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{firstName}</span>
              </Link>
            ) : (
              <Link to="/auth" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
                {t("common.signIn") || "Sign In"}
              </Link>
            )}
          </div>
        </div>

        {/* Navigation bar */}
        <div className="flex items-center gap-1 px-6 pb-2">
          {navLinks.map(({ label, path }) => (
            <Link
              key={path}
              to={path}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive(path)
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
};

export default DesktopHeader;
