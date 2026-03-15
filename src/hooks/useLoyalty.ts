import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LoyaltyPoints {
  id: string;
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  tier: string;
}

export interface LoyaltyTransaction {
  id: string;
  user_id: string;
  type: string;
  points: number;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface LoyaltyReward {
  id: string;
  title: string;
  title_ar: string | null;
  title_ku: string | null;
  description: string | null;
  description_ar: string | null;
  description_ku: string | null;
  points_cost: number;
  reward_type: string;
  reward_value: number;
  image_url: string | null;
  is_active: boolean;
  stock: number | null;
  sort_order: number | null;
}

// Points formula: 1 point per 1,000 IQD
export const calculatePoints = (orderTotal: number): number => {
  return Math.floor(orderTotal / 1000);
};

export const TIER_THRESHOLDS = {
  bronze: { min: 0, label: "Bronze", emoji: "🥉" },
  silver: { min: 200, label: "Silver", emoji: "🥈" },
  gold: { min: 500, label: "Gold", emoji: "🥇" },
  platinum: { min: 1000, label: "Platinum", emoji: "💎" },
};

export const getNextTier = (tier: string) => {
  const tiers = ["bronze", "silver", "gold", "platinum"];
  const idx = tiers.indexOf(tier);
  if (idx < tiers.length - 1) return tiers[idx + 1];
  return null;
};

export function useLoyaltyPoints() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["loyalty-points", user?.id],
    queryFn: async (): Promise<LoyaltyPoints | null> => {
      const { data, error } = await supabase
        .from("loyalty_points")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as LoyaltyPoints | null;
    },
    enabled: !!user,
  });
}

export function useLoyaltyTransactions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["loyalty-transactions", user?.id],
    queryFn: async (): Promise<LoyaltyTransaction[]> => {
      const { data, error } = await supabase
        .from("loyalty_transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as LoyaltyTransaction[];
    },
    enabled: !!user,
  });
}

export function useLoyaltyRewards() {
  return useQuery({
    queryKey: ["loyalty-rewards"],
    queryFn: async (): Promise<LoyaltyReward[]> => {
      const { data, error } = await supabase
        .from("loyalty_rewards")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as LoyaltyReward[];
    },
  });
}

export function useRedeemReward() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rewardId, pointsCost, rewardTitle }: { rewardId: string; pointsCost: number; rewardTitle: string }) => {
      // Call redeem function
      const { data, error } = await supabase.rpc("redeem_loyalty_points", {
        _user_id: user!.id,
        _points: pointsCost,
        _description: `Redeemed: ${rewardTitle}`,
        _reference_id: rewardId,
      });
      if (error) throw error;
      if (!data) throw new Error("Insufficient points or out of stock");

      // Create redemption record
      const { error: redemptionError } = await supabase.from("loyalty_redemptions").insert({
        user_id: user!.id,
        reward_id: rewardId,
        points_spent: pointsCost,
      });
      if (redemptionError) throw redemptionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-points"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty-transactions"] });
    },
  });
}

export function useAwardPoints() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ points, description, referenceId }: { points: number; description: string; referenceId?: string }) => {
      const { error } = await supabase.rpc("award_loyalty_points", {
        _user_id: user!.id,
        _points: points,
        _description: description,
        _reference_id: referenceId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loyalty-points"] });
      queryClient.invalidateQueries({ queryKey: ["loyalty-transactions"] });
    },
  });
}
