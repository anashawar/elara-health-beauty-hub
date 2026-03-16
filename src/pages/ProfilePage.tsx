import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Heart, MapPin, Settings, Package, LogOut, Sparkles, MessageCircle, Info, HelpCircle, FileText, Lock, UserRound, Crown, Star, Headphones, Scan } from "lucide-react";
import BottomNav from "@/components/layout/BottomNav";
import DesktopHeader from "@/components/layout/DesktopHeader";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import SearchOverlay from "@/components/SearchOverlay";
import { useLoyaltyPoints, TIER_THRESHOLDS } from "@/hooks/useLoyalty";

const ProfilePage = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: chatCount = 0 } = useQuery({
    queryKey: ["chat-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("chat_conversations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: loyaltyData } = useLoyaltyPoints();
  const loyaltyBalance = loyaltyData?.balance || 0;
  const loyaltyTier = loyaltyData?.tier || "bronze";
  const tierInfo = TIER_THRESHOLDS[loyaltyTier as keyof typeof TIER_THRESHOLDS] || TIER_THRESHOLDS.bronze;

  const menuItems = [
    { icon: Package, label: t("profile.myOrders"), path: "/orders" },
    { icon: Heart, label: t("profile.wishlist"), path: "/wishlist" },
    { icon: MapPin, label: t("profile.addresses"), path: "/addresses" },
    { icon: Headphones, label: "Contact Support", path: "/support" },
    { icon: Settings, label: t("profile.settings"), path: "/settings" },
    { icon: Info, label: t("profile.aboutElara"), path: "/about" },
    { icon: HelpCircle, label: t("profile.faq"), path: "/faq" },
    { icon: FileText, label: t("profile.termsConditions"), path: "/terms" },
    { icon: Lock, label: t("profile.privacyPolicy"), path: "/privacy" },
  ];

  const handleSignOut = async () => {
    await signOut();
    toast(t("profile.signedOut"));
    navigate("/home");
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/30 md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <UserRound className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-display font-bold text-foreground">{t("profile.title")}</h1>
        </div>
      </header>

      <div className="app-container">
        <div className="md:max-w-2xl md:mx-auto">
          {/* Desktop title */}
          <div className="hidden md:block px-6 pt-6 pb-2">
            <h1 className="text-2xl font-display font-bold text-foreground">{t("profile.title")}</h1>
          </div>

          {/* User Card */}
          <div className="mx-4 md:mx-6 mt-4 bg-card rounded-2xl p-5 shadow-premium">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">👤</span>
                )}
              </div>
              <div>
                {user ? (
                  <>
                    <h3 className="text-base font-bold text-foreground">
                      {user.user_metadata?.full_name || t("profile.elaraUser")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-bold text-foreground">{t("profile.welcome")}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("profile.signInForPersonalized")}</p>
                  </>
                )}
              </div>
            </div>
            {!user && (
              <Link to="/auth" className="block w-full mt-4 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity text-center">
                {t("profile.signInCreateAccount")}
              </Link>
            )}
          </div>

          {/* ELARA AI Section */}
          <Link to="/elara-ai" className="block mx-4 md:mx-6 mt-4">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 rounded-2xl p-4 shadow-premium border border-primary/20 relative overflow-hidden group hover:shadow-xl transition-all">
              <div className="absolute top-2 right-2 opacity-10">
                <Sparkles className="w-16 h-16 text-primary" />
              </div>
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Sparkles className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-display font-bold text-foreground">ELARA AI</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t("profile.yourPersonalExpert")}</p>
                  {user && chatCount > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <MessageCircle className="w-3 h-3 text-primary" />
                      <span className="text-[10px] text-primary font-medium">{chatCount} {chatCount !== 1 ? t("profile.conversations") : t("profile.conversation")}</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-primary rtl:rotate-180 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* ELARA Rewards */}
          {user && (
            <Link to="/rewards" className="block mx-4 md:mx-6 mt-3">
              <div className="bg-gradient-to-r from-amber-500/10 via-primary/5 to-amber-500/10 rounded-2xl p-4 shadow-premium border border-amber-500/20 relative overflow-hidden group hover:shadow-xl transition-all">
                <div className="absolute top-2 right-2 opacity-10">
                  <Crown className="w-14 h-14 text-amber-500" />
                </div>
                <div className="relative flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Star className="w-6 h-6 text-white fill-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-display font-bold text-foreground">{t("rewards.title")}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t("rewards.subtitle")}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs">{tierInfo.emoji}</span>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{loyaltyBalance.toLocaleString()} pts</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-amber-500 rtl:rotate-180 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          )}

          {/* Menu */}
          <div className="mx-4 md:mx-6 mt-4 bg-card rounded-2xl shadow-premium overflow-hidden">
            {menuItems.map((item, idx) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-4 transition-colors touch-item ${idx < menuItems.length - 1 ? "border-b border-border/50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4.5 h-4.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 rtl:rotate-180" />
              </Link>
            ))}
          </div>

          {/* Sign Out */}
          {user && (
            <div className="mx-4 md:mx-6 mt-4 bg-card rounded-2xl shadow-premium overflow-hidden">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-4 hover:bg-destructive/5 transition-colors text-destructive"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">{t("common.signOut")}</span>
              </button>
            </div>
          )}

          <div className="mx-4 md:mx-6 mt-4 text-center">
            <p className="text-[10px] text-muted-foreground">ELARA {t("common.version")} — {t("common.tagline")}</p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
