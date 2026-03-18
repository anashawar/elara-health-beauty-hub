import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, Plus, Trash2, Shield, ShieldCheck, Database, Loader2, Link2, Copy, ExternalLink, Power } from "lucide-react";
import { useAdmin, type AppRole } from "@/hooks/useAdmin";

interface TeamMember {
  id: string;
  user_id: string;
  role: AppRole;
  email?: string;
  full_name?: string;
  phone?: string;
}

const ROLE_CONFIG: Record<string, { label: string; description: string; color: string; icon: any }> = {
  admin: {
    label: "Admin",
    description: "Full access to everything",
    color: "bg-destructive/10 text-destructive border-destructive/20",
    icon: ShieldCheck,
  },
  operations: {
    label: "Operations",
    description: "Full access except cost & revenue data",
    color: "bg-primary/10 text-primary border-primary/20",
    icon: Shield,
  },
  data_entry: {
    label: "Data Entry",
    description: "Can only add and edit products",
    color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: Database,
  },
};

export default function AdminTeam() {
  const qc = useQueryClient();
  const { isFullAdmin, user } = useAdmin();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("data_entry");
  const [adding, setAdding] = useState(false);

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["admin-team-members"],
    queryFn: async () => {
      // Get all admin-level roles
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role")
        .in("role", ["admin", "operations", "data_entry"]);
      if (error) throw error;
      if (!roles || roles.length === 0) return [];

      // Get profiles for these users
      const userIds = [...new Set(roles.map((r: any) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return roles.map((r: any) => {
        const profile = profileMap.get(r.user_id);
        return {
          id: r.id,
          user_id: r.user_id,
          role: r.role as AppRole,
          full_name: profile?.full_name || null,
          phone: profile?.phone || null,
        };
      });
    },
  });

  const addMember = useMutation({
    mutationFn: async ({ identifier, role }: { identifier: string; role: string }) => {
      // Find user by email or phone
      const trimmed = identifier.trim();
      let targetUserId: string | null = null;

      // Try by phone in profiles
      const { data: profileByPhone } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("phone", trimmed)
        .maybeSingle();

      if (profileByPhone) {
        targetUserId = profileByPhone.user_id;
      }

      if (!targetUserId) {
        // It might be an email — we need an edge function to look up by email
        // For now, try to find via the identifier as a user_id or show guidance
        toast.error("User not found. Make sure they have signed up first and have a phone number in their profile.");
        throw new Error("User not found");
      }

      // Check if role already exists
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", targetUserId)
        .eq("role", role as any)
        .maybeSingle();

      if (existing) {
        toast.info("This user already has this role.");
        throw new Error("Already assigned");
      }

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: targetUserId, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-team-members"] });
      setEmailOrPhone("");
      toast.success("Team member added successfully!");
    },
    onError: (err: any) => {
      if (err.message !== "User not found" && err.message !== "Already assigned") {
        toast.error("Failed to add team member");
      }
    },
  });

  const removeMember = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-team-members"] });
      toast.success("Role removed");
    },
    onError: () => toast.error("Failed to remove role"),
  });

  const handleAdd = async () => {
    if (!emailOrPhone.trim()) return;
    setAdding(true);
    try {
      await addMember.mutateAsync({ identifier: emailOrPhone, role: selectedRole });
    } finally {
      setAdding(false);
    }
  };

  if (!isFullAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-bold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground mt-1">Only Admins can manage team members.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          Team Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Assign roles to your team members to control access.</p>
      </div>

      {/* Role cards info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.entries(ROLE_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <div key={key} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-bold text-foreground">{config.label}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{config.description}</p>
            </div>
          );
        })}
      </div>

      {/* Add member form */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Team Member
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            value={emailOrPhone}
            onChange={(e) => setEmailOrPhone(e.target.value)}
            placeholder="Phone number (e.g. +964...)"
            className="flex-1 rounded-xl"
          />
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger className="w-full sm:w-[180px] rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
              <SelectItem value="data_entry">Data Entry</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleAdd}
            disabled={adding || !emailOrPhone.trim()}
            className="rounded-xl"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          The user must have signed up on ELARA first. Use their registered phone number.
        </p>
      </div>

      {/* Team members list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/30">
          <h3 className="text-sm font-bold text-foreground">Current Team ({members.length})</h3>
        </div>

        {isLoading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No team members yet.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((member) => {
              const config = ROLE_CONFIG[member.role] || ROLE_CONFIG.admin;
              const Icon = config.icon;
              const isCurrentUser = member.user_id === user?.id;

              return (
                <div key={member.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.full_name || member.phone || member.user_id.slice(0, 8) + "..."}
                        {isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
                      </p>
                      {member.phone && (
                        <p className="text-[11px] text-muted-foreground">{member.phone}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
                      {config.label}
                    </Badge>
                    {!isCurrentUser && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMember.mutate(member.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Prep Links Section */}
      <PrepLinksSection />
    </div>
  );
}

function PrepLinksSection() {
  const qc = useQueryClient();
  const { user } = useAdmin();
  const [label, setLabel] = useState("Warehouse A");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["prep-links"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("prep_access_tokens" as any)
        .select("*") as any)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createLink = useMutation({
    mutationFn: async () => {
      if (!newUsername.trim() || !newPassword.trim()) throw new Error("Username and password required");
      const { error } = await (supabase
        .from("prep_access_tokens" as any)
        .insert({
          label,
          username: newUsername.trim().toLowerCase(),
          password_hash: newPassword,
          created_by: user!.id,
        } as any) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prep-links"] });
      toast.success("Prep account created!");
      setLabel("Warehouse A");
      setNewUsername("");
      setNewPassword("");
    },
    onError: (e: any) => toast.error(e.message || "Failed to create"),
  });

  const toggleLink = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase
        .from("prep_access_tokens" as any)
        .update({ is_active: active } as any) as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prep-links"] });
      toast.success("Link updated");
    },
  });

  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("prep_access_tokens" as any).delete() as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prep-links"] });
      toast.success("Account deleted");
    },
  });

  const copyLink = () => {
    const url = `${window.location.origin}/prep/login`;
    navigator.clipboard.writeText(url);
    toast.success("Prep page link copied!");
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Order Preparation Accounts</h3>
        </div>
        <Button variant="outline" size="sm" onClick={copyLink} className="rounded-xl gap-1.5 text-xs">
          <Copy className="w-3 h-3" /> Copy Login Page Link
        </Button>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Create username & password accounts for your logistics team. They'll log in at the prep page to view orders (no prices) and mark them as prepared.
        </p>

        {/* Create new account */}
        <div className="space-y-3 rounded-xl border border-border p-4 bg-muted/10">
          <p className="text-xs font-bold text-foreground">Create New Account</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (e.g. Warehouse A)"
              className="rounded-xl"
            />
            <Input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="Username"
              className="rounded-xl"
            />
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Password"
              className="flex-1 rounded-xl"
            />
            <Button
              onClick={() => createLink.mutate()}
              disabled={createLink.isPending || !newUsername.trim() || !newPassword.trim()}
              className="rounded-xl gap-1.5"
            >
              {createLink.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create
            </Button>
          </div>
        </div>

        {/* Existing links */}
        {isLoading ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : links.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No prep links yet. Generate one above.
          </div>
        ) : (
          <div className="space-y-2">
            {links.map((link: any) => (
              <div
                key={link.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                  link.is_active ? "border-border bg-background" : "border-border/50 bg-muted/30 opacity-60"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{link.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Username: <span className="font-mono">{link.username}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      link.is_active
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {link.is_active ? "Active" : "Disabled"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyLink()}
                    title="Copy link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(`/prep/${link.token}`, "_blank")}
                    title="Open link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleLink.mutate({ id: link.id, active: !link.is_active })}
                    title={link.is_active ? "Disable" : "Enable"}
                  >
                    <Power className={`w-3.5 h-3.5 ${link.is_active ? "text-emerald-600" : "text-muted-foreground"}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteLink.mutate(link.id)}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
