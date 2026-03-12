import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Phone, Save, LogOut } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/components/ui/sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/layout/BottomNav";
import { motion } from "framer-motion";

const SettingsPage = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    } else if (user) {
      setFullName(user.user_metadata?.full_name || "");
    }
  }, [profile, user]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const payload = {
        user_id: user.id,
        full_name: fullName || null,
        phone: phone || null,
      };
      // Upsert: if profile exists update, otherwise insert
      if (profile) {
        const { error } = await supabase.from("profiles").update(payload).eq("id", profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast("Profile updated!");
    },
    onError: (e: any) => toast(e.message),
  });

  const handleSignOut = async () => {
    await signOut();
    toast("Signed out");
    navigate("/");
  };

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto">
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link to="/profile" className="p-1"><ArrowLeft className="w-5 h-5 text-foreground" /></Link>
            <h1 className="text-lg font-display font-bold text-foreground">Settings</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <User className="w-16 h-16 text-muted-foreground/30 mb-4" />
          <p className="text-sm text-muted-foreground mb-4">Sign in to manage your settings</p>
          <Link to="/auth" className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm">Sign In</Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 max-w-lg mx-auto">
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link to="/profile" className="p-1"><ArrowLeft className="w-5 h-5 text-foreground" /></Link>
          <h1 className="text-lg font-display font-bold text-foreground">Settings</h1>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 mt-4 space-y-4"
        >
          {/* Profile Info */}
          <div className="bg-card rounded-2xl p-4 shadow-premium space-y-4">
            <h3 className="text-sm font-bold text-foreground">Profile Information</h3>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <div className="h-11 px-4 rounded-xl bg-muted flex items-center">
                <span className="text-sm text-muted-foreground">{user.email}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="pl-10 h-11 rounded-xl bg-secondary border-border text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+964 XXX XXX XXXX"
                  type="tel"
                  className="pl-10 h-11 rounded-xl bg-secondary border-border text-sm"
                />
              </div>
            </div>

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="w-full h-11 rounded-xl text-sm font-semibold gap-2"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          {/* Account Actions */}
          <div className="bg-card rounded-2xl shadow-premium overflow-hidden">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-destructive/5 transition-colors text-destructive"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </motion.div>
      )}

      <BottomNav />
    </div>
  );
};

export default SettingsPage;
