import { useState, useMemo } from "react";
import { Search, MapPin, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import elaraLogo from "@/assets/elara-logo.png";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function getTimeGreeting(lang: string): string {
  const hour = new Date().getHours();
  const greetings: Record<string, { morning: string; afternoon: string; evening: string; night: string }> = {
    en: { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening", night: "Good night" },
    ar: { morning: "صباح الخير", afternoon: "مساء الخير", evening: "مساء النور", night: "تصبح على خير" },
    ku: { morning: "بەیانیت باش", afternoon: "نیوەڕۆت باش", evening: "ئێوارەت باش", night: "شەوت باش" },
  };
  const g = greetings[lang] || greetings.en;
  if (hour < 12) return g.morning;
  if (hour < 17) return g.afternoon;
  if (hour < 21) return g.evening;
  return g.night;
}

function getRandomGreeting(lang: string, name: string): string {
  const timeGreet = getTimeGreeting(lang);
  const templates: Record<string, string[]> = {
    en: [
      `Hey, ${name} 👋`,
      `Welcome back, ${name} ✨`,
      `${timeGreet}, ${name} ☀️`,
      `Hi there, ${name} 💕`,
      `Great to see you, ${name} 🌸`,
      `Hello, ${name} 😊`,
    ],
    ar: [
      `هلا ${name} 👋`,
      `أهلاً بعودتك، ${name} ✨`,
      `${timeGreet} ${name} ☀️`,
      `نورتنا، ${name} 💕`,
      `يا هلا ${name} 🌸`,
      `مرحبا ${name} 😊`,
    ],
    ku: [
      `سڵاو ${name} 👋`,
      `بەخێربێیتەوە، ${name} ✨`,
      `${timeGreet} ${name} ☀️`,
      `چۆنی ${name} 💕`,
      `خۆشحاڵم بە بینینت، ${name} 🌸`,
    ],
  };
  const list = templates[lang] || templates.en;
  // Use day-of-year so it changes daily but stays consistent within a session
  const dayIndex = Math.floor((Date.now() / 86400000)) % list.length;
  return list[dayIndex];
}

interface TopHeaderProps {
  onSearchClick: () => void;
}

const TopHeader = ({ onSearchClick }: TopHeaderProps) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || t("common.guest");
  const greeting = useMemo(() => getRandomGreeting(language, firstName), [language, firstName]);

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

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("avatar_url").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const userCity = defaultAddress?.city || defaultAddress?.area || "";
  const avatarUrl = (profile as any)?.avatar_url;

  return (
    <header className="sticky top-0 z-40 glass-heavy border-b border-border/40 md:hidden">
      <div className="app-container px-4 py-3 space-y-2.5">
        {/* Top row: Logo + Welcome */}
        <div className="flex items-center justify-between">
          <Link to="/home" className="flex-shrink-0">
            <img src={elaraLogo} alt="ELARA" className="h-7" />
          </Link>

          <div className="flex items-center gap-2">
            {user ? (
              <>
                <div className="flex flex-col items-end rtl:items-start">
                  <span className="text-xs font-medium text-foreground">
                    {greeting}
                  </span>
                  <Link to="/addresses" className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {userCity ? `${userCity}, ${t("common.iraq")}` : t("common.setLocation") || "Set location"}
                    </span>
                  </Link>
                </div>
                <Link to="/profile" className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center overflow-hidden flex-shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">👤</span>
                  )}
                </Link>
                <Link to="/addresses" className="flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-primary" />
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {userCity ? `${userCity}, ${t("common.iraq")}` : t("common.setLocation") || "Set location"}
                  </span>
                </Link>
              </>
            ) : (
              <Link to="/auth" className="text-xs font-medium text-primary hover:underline">
                {t("common.signIn") || "Sign In"}
              </Link>
            )}
          </div>
        </div>

        {/* Search bar + AI button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onSearchClick}
            className="flex-1 flex items-center gap-2.5 px-4 py-2.5 bg-secondary/60 rounded-2xl border border-border/60 hover:border-primary/20 hover:bg-secondary/80 transition-all duration-300"
          >
            <Search className="w-4 h-4 text-muted-foreground/70" />
            <span className="text-[13px] text-muted-foreground/70">{t("common.search")}</span>
          </button>
          <Link
            to="/elara-ai"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-float hover:shadow-premium-lg transition-all duration-300 flex-shrink-0 active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-primary-foreground" />
            <span className="text-xs font-bold text-primary-foreground tracking-wide">AI</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
