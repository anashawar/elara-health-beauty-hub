import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  body: string;
  type: string;
  icon: string;
  image_url: string | null;
  link_url: string | null;
  is_read: boolean;
  metadata: any;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${user!.id},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as Notification[];
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as any;
          // Only add if it's for this user or broadcast
          if (n.user_id === user.id || n.user_id === null) {
            qc.invalidateQueries({ queryKey: ["notifications", user.id] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  return { notifications, isLoading, unreadCount, markAsRead, markAllAsRead };
}
