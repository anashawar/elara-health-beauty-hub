import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Star, Gift, TrendingUp, History, Crown, Sparkles, ChevronRight, Gem } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/layout/BottomNav";
import DesktopHeader from "@/components/layout/DesktopHeader";
import SearchOverlay from "@/components/SearchOverlay";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import {
  useLoyaltyPoints,
  useLoyaltyTransactions,
  useLoyaltyRewards,
  useRedeemReward,
  TIER_THRESHOLDS,
  getNextTier,
} from "@/hooks/useLoyalty";
import { useFormatPrice } from "@/hooks/useProducts";
import { toast } from "@/components/ui/sonner";

const RewardsPage = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const formatPrice = useFormatPrice();
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"rewards" | "history">("rewards");

  const { data: loyaltyData, isLoading: pointsLoading } = useLoyaltyPoints();
  const { data: transactions = [] } = useLoyaltyTransactions();
  const { data: rewards = [] } = useLoyaltyRewards();
  const redeemMutation = useRedeemReward();

  const balance = loyaltyData?.balance || 0;
  const lifetimeEarned = loyaltyData?.lifetime_earned || 0;
  const tier = loyaltyData?.tier || "bronze";
  const tierInfo = TIER_THRESHOLDS[tier as keyof typeof TIER_THRESHOLDS] || TIER_THRESHOLDS.bronze;
  const nextTierKey = getNextTier(tier);
  const nextTier = nextTierKey ? TIER_THRESHOLDS[nextTierKey as keyof typeof TIER_THRESHOLDS] : null;
  const progressToNext = nextTier ? Math.min((lifetimeEarned / nextTier.min) * 100, 100) : 100;

  const getRewardTitle = (r: any) =>
    language === "ar" ? (r.title_ar || r.title) : language === "ku" ? (r.title_ku || r.title) : r.title;
  const getRewardDesc = (r: any) =>
    language === "ar" ? (r.description_ar || r.description) : language === "ku" ? (r.description_ku || r.description) : r.description;

  const handleRedeem = async (reward: any) => {
    if (balance < reward.points_cost) {
      toast.error(t("rewards.notEnoughPoints"));
      return;
    }
    if (reward.stock !== null && reward.stock !== undefined && reward.stock <= 0) {
      toast.error(t("rewards.outOfStock") || "This reward is out of stock");
      return;
    }
    const title = getRewardTitle(reward);
    if (!confirm(`${t("rewards.confirmRedeem") || "Redeem"} "${title}" for ${reward.points_cost} points?`)) return;
    try {
      await redeemMutation.mutateAsync({ rewardId: reward.id, pointsCost: reward.points_cost, rewardTitle: reward.title });
      toast.success(`🎉 ${t("rewards.redeemed") || "Reward redeemed!"}`);
    } catch (e: any) {
      toast.error(e?.message?.includes("stock") ? (t("rewards.outOfStock") || "Out of stock") : (t("rewards.redeemFailed") || "Redemption failed"));
    }
  };

  const rewardTypeIcons: Record<string, string> = {
    discount: "🏷️",
    product: "🎁",
    gift: "🎀",
    shipping: "🚚",
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 pb-24">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Crown className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-xl font-display font-bold text-foreground mb-2">{t("rewards.title")}</h2>
        <p className="text-sm text-muted-foreground text-center mb-6">{t("rewards.signInToJoin")}</p>
        <Link to="/auth" className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-2xl text-sm">
          {t("common.signIn")}
        </Link>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/30 md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/profile" className="p-2 -ml-2 rounded-xl active:bg-secondary active:scale-90 transition-all">
            <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
          </Link>
          <h1 className="text-lg font-display font-bold text-foreground">{t("rewards.title")}</h1>
        </div>
      </header>

      <div className="app-container">
        <div className="md:max-w-2xl md:mx-auto">
          {/* Hero Points Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 md:mx-6 mt-4"
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-violet-600 p-6 shadow-float">
              <div className="absolute top-0 right-0 opacity-10">
                <Gem className="w-40 h-40 -mt-8 -mr-8" />
              </div>
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 -mb-16 -ml-16" />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{tierInfo.emoji}</span>
                  <span className="text-xs font-bold text-white/80 uppercase tracking-widest">{tierInfo.label} {t("rewards.member")}</span>
                </div>

                <div className="mt-3">
                  <p className="text-xs text-white/60 uppercase tracking-wider font-medium">{t("rewards.yourPoints")}</p>
                  {pointsLoading ? (
                    <div className="w-20 h-10 bg-white/10 rounded-lg animate-pulse mt-1" />
                  ) : (
                    <motion.p
                      key={balance}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="text-5xl font-display font-black text-white mt-1 tracking-tight"
                    >
                      {balance.toLocaleString()}
                    </motion.p>
                  )}
                </div>

                {/* Tier progress */}
                {nextTier && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[10px] text-white/60 mb-1.5">
                      <span>{tierInfo.emoji} {tierInfo.label}</span>
                      <span>{nextTier.emoji} {nextTier.label} — {nextTier.min} pts</span>
                    </div>
                    <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressToNext}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-white/80 rounded-full"
                      />
                    </div>
                    <p className="text-[10px] text-white/50 mt-1.5">
                      {nextTier.min - lifetimeEarned > 0
                        ? `${(nextTier.min - lifetimeEarned).toLocaleString()} ${t("rewards.pointsToNext")}`
                        : t("rewards.tierReached")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* How it works */}
          <div className="mx-4 md:mx-6 mt-4 grid grid-cols-3 gap-2.5">
            {[
              { icon: <TrendingUp className="w-5 h-5" />, title: t("rewards.earn"), desc: t("rewards.earnDesc") },
              { icon: <Star className="w-5 h-5" />, title: t("rewards.collect"), desc: t("rewards.collectDesc") },
              { icon: <Gift className="w-5 h-5" />, title: t("rewards.redeem"), desc: t("rewards.redeemDesc") },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (i + 1) }}
                className="bg-card rounded-2xl p-3.5 shadow-premium text-center border border-border/30"
              >
                <div className="w-10 h-10 mx-auto rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                  {step.icon}
                </div>
                <p className="text-xs font-bold text-foreground">{step.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Tabs */}
          <div className="mx-4 md:mx-6 mt-5 flex gap-2">
            <button
              onClick={() => setActiveTab("rewards")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === "rewards"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              <Gift className="w-3.5 h-3.5 inline-block mr-1" />
              {t("rewards.availableRewards")}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === "history"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              <History className="w-3.5 h-3.5 inline-block mr-1" />
              {t("rewards.history")}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "rewards" ? (
              <motion.div
                key="rewards"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="mx-4 md:mx-6 mt-3 space-y-3"
              >
                {rewards.length === 0 ? (
                  <div className="text-center py-12">
                    <Gift className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{t("rewards.noRewardsYet")}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{t("rewards.comingSoon")}</p>
                  </div>
                ) : (
                  rewards.map((reward) => (
                    <div
                      key={reward.id}
                      className="bg-card rounded-2xl p-4 shadow-premium border border-border/30 flex items-center gap-4"
                    >
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-2xl">
                        {reward.image_url ? (
                          <img src={reward.image_url} alt="" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          rewardTypeIcons[reward.reward_type] || "🎁"
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-foreground">{getRewardTitle(reward)}</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{getRewardDesc(reward)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-primary fill-primary" />
                            <span className="text-xs font-bold text-primary">{reward.points_cost} pts</span>
                          </div>
                          {reward.stock !== null && reward.stock !== undefined && (
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                              reward.stock > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
                            }`}>
                              {reward.stock > 0 ? `${reward.stock} left` : "Out of stock"}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRedeem(reward)}
                        disabled={balance < reward.points_cost || redeemMutation.isPending || (reward.stock !== null && reward.stock !== undefined && reward.stock <= 0)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                          balance >= reward.points_cost
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                        }`}
                      >
                        {t("rewards.redeem")}
                      </button>
                    </div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="mx-4 md:mx-6 mt-3 space-y-2"
              >
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{t("rewards.noHistory")}</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{t("rewards.startEarning")}</p>
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-card rounded-xl p-3.5 shadow-sm border border-border/20 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm ${
                          tx.type === "earn" || tx.type === "bonus"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-primary/10 text-primary"
                        }`}>
                          {tx.type === "earn" ? "+" : tx.type === "bonus" ? "🎁" : "−"}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{tx.description}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(tx.created_at).toLocaleDateString(language === "ar" ? "ar-IQ" : language === "ku" ? "ckb-IQ" : "en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${
                        tx.points > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
                      }`}>
                        {tx.points > 0 ? "+" : ""}{tx.points}
                      </span>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Motivation banner */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mx-4 md:mx-6 mt-6 mb-4"
          >
            <div className="bg-gradient-to-r from-primary/8 via-accent/5 to-primary/8 rounded-2xl p-4 border border-primary/10">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-primary flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-display font-bold text-foreground">{t("rewards.everyOrderCounts")}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{t("rewards.earnMessage")}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default RewardsPage;
