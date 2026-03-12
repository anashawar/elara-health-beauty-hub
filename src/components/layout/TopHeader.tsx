import { Search, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import elaraLogo from "@/assets/elara-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TopHeaderProps {
  onSearchClick: () => void;
}

const TopHeader = ({ onSearchClick }: TopHeaderProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  
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

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
      <div className="max-w-lg mx-auto px-4 py-3 space-y-2.5">
        {/* Top row: Logo + Welcome */}
        <div className="flex items-center justify-between">
          <Link to="/home" className="flex-shrink-0">
            <img src={elaraLogo} alt="ELARA" className="h-7" />
          </Link>

          <div className="flex flex-col items-end rtl:items-start">
            <span className="text-xs font-medium text-foreground">
              {t("common.hey")}, <span className="font-bold text-primary">{firstName}</span> 👋
            </span>
            <Link to={user ? "/addresses" : "/auth"} className="flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-muted-foreground font-medium">
                {userCity ? `${userCity}, ${t("common.iraq")}` : t("common.setLocation") || "Set location"}
              </span>
            </Link>
          </div>
        </div>

        {/* Search bar */}
        <button
          onClick={onSearchClick}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-secondary/80 rounded-xl border border-border hover:border-primary/30 transition-all duration-200"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{t("common.search")}</span>
        </button>
      </div>
    </header>
  );
};

export default TopHeader;
