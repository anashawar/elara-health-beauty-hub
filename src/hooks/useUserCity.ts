import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Returns the city from the user's default delivery address.
 * Used to filter city-restricted brands and their products.
 * Returns null if no address or not logged in.
 */
export function useUserCity() {
  const { user } = useAuth();

  const { data: userCity = null } = useQuery({
    queryKey: ["user-city", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Try default address first
      const { data: defaultAddr } = await supabase
        .from("addresses")
        .select("city")
        .eq("user_id", user.id)
        .eq("is_default", true)
        .maybeSingle();

      if (defaultAddr?.city) return defaultAddr.city;

      // Fall back to most recent address
      const { data: anyAddr } = await supabase
        .from("addresses")
        .select("city")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return anyAddr?.city || null;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  return userCity;
}

/**
 * Check if a brand is available for the given user city.
 * If brand has no restricted_cities (null/empty), it's available everywhere.
 * Guests (not logged in) can always see all brands.
 * Only logged-in users outside the allowed cities are blocked.
 */
export function isBrandAvailableInCity(
  brandRestrictedCities: string[] | null | undefined,
  userCity: string | null,
  isLoggedIn?: boolean
): boolean {
  // No restriction = available everywhere
  if (!brandRestrictedCities || brandRestrictedCities.length === 0) return true;
  // Guests can see all brands (including restricted ones)
  if (!isLoggedIn) return true;
  // Logged in but no city set = show restricted brands (benefit of the doubt)
  if (!userCity) return true;
  // Check if user's city is in the allowed list (case-insensitive)
  return brandRestrictedCities.some(
    (c) => c.toLowerCase() === userCity.toLowerCase()
  );
}
