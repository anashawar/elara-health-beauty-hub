import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type AppRole = "admin" | "operations" | "data_entry" | "moderator" | "user";

const ADMIN_ROLES: AppRole[] = ["admin", "operations", "data_entry"];

export function useAdmin() {
  const { user, loading: authLoading } = useAuth();

  const { data: role = null, isLoading: roleLoading } = useQuery<AppRole | null>({
    queryKey: ["user-admin-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ADMIN_ROLES);
      if (!data || data.length === 0) return null;
      // Priority: admin > operations > data_entry
      const roles = data.map((r: any) => r.role as AppRole);
      if (roles.includes("admin")) return "admin" as AppRole;
      if (roles.includes("operations")) return "operations" as AppRole;
      return "data_entry" as AppRole;
    },
    enabled: !!user,
  });

  const isAdmin = !!role;
  const isFullAdmin = role === "admin";

  return { isAdmin, isFullAdmin, role, loading: authLoading || roleLoading, user };
}
