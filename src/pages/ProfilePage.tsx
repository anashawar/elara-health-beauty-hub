import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Heart, MapPin, Settings, Package, LogOut, Sparkles, MessageCircle, Info, HelpCircle, FileText, Lock, UserRound, Crown, Star, Headphones, Scan, ArrowRight } from "lucide-react";
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
  const { t, language } = useLanguage();
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
    { icon: Headphones, label: t("support.contactSupport"), path: "/support" },
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
            {user ? (
              <Link to="/settings" className="flex items-center gap-4 group">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">👤</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-foreground">
                    {profile?.full_name || user.user_metadata?.full_name || user.phone || t("profile.elaraUser")}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{user.email || user.phone}</p>
                  {(profile?.gender || user.user_metadata?.gender) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                      {profile?.gender || user.user_metadata?.gender}
                    </p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/50 rtl:rotate-180 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-accent flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">{t("profile.welcome")}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("profile.signInForPersonalized")}</p>
                  </div>
                </div>
                <Link to="/auth" className="block w-full mt-4 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity text-center">
                  {t("profile.signInCreateAccount")}
                </Link>
              </>
            )}
          </div>

          {/* ELARA AI Skin Analyzer Hero Banner */}
          <Link to="/skin-scan" className="block mx-4 md:mx-6 mt-4">
            <div className="relative rounded-2xl overflow-hidden shadow-premium group active:scale-[0.98] transition-transform duration-200">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500 via-primary to-violet-500" />
              <div className="absolute inset-0 opacity-20" style={{
                background: 'radial-gradient(circle at 85% 15%, hsl(352 80% 70% / 0.5) 0%, transparent 40%), radial-gradient(circle at 15% 85%, hsl(280 60% 60% / 0.4) 0%, transparent 40%)'
              }} />
              <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute inset-0 opacity-[0.05]" style={{
                backgroundImage: 'linear-gradient(0deg, white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
                backgroundSize: '18px 18px'
              }} />
              <div className="relative p-4 flex gap-3.5 items-center z-10">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
                  <Scan className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Sparkles className="w-3 h-3 text-white/70" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/60">
                      {t("skinScan.advancedFeature")}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-display font-bold text-white leading-tight">
                    {t("skinScan.skinAnalyzer")}
                  </h3>
                  <p className="text-[11px] text-white/60 leading-snug mt-0.5">
                    {t("skinScan.scanDesc")}
                  </p>
                </div>
                <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <ArrowRight className="w-4 h-4 text-rose-500 rtl:rotate-180" />
                </div>
              </div>
            </div>
          </Link>

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

          {/* Follow Us on Social Media */}
          <div className="mx-4 md:mx-6 mt-4 bg-card rounded-2xl shadow-premium p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-display font-bold text-foreground">{t("profile.followUs")}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t("profile.followUsDesc")}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <a href={language === "ku" ? "https://www.facebook.com/elara.krd" : "https://www.facebook.com/elara.iq"} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 group">
                <div className="w-12 h-12 rounded-2xl bg-[#1877F2]/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Facebook className="w-5 h-5 text-[#1877F2]" />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">Facebook</span>
              </a>
              <a href={language === "ku" ? "https://instagram.com/elara.krd" : "https://instagram.com/elara_iq"} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 group">
                <div className="w-12 h-12 rounded-2xl bg-[#E4405F]/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Instagram className="w-5 h-5 text-[#E4405F]" />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">Instagram</span>
              </a>
              <a href={language === "ku" ? "https://www.tiktok.com/@elara_krd" : "https://www.tiktok.com/@elara_iq"} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 group">
                <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-foreground"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.18 8.18 0 0 0 4.76 1.52V6.84a4.83 4.83 0 0 1-1-.15Z"/></svg>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">TikTok</span>
              </a>
              <a href="https://www.linkedin.com/company/elarastore" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1.5 group">
                <div className="w-12 h-12 rounded-2xl bg-[#0A66C2]/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#0A66C2]"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">LinkedIn</span>
              </a>
            </div>
          </div>

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
