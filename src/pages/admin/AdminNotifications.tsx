import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Send, Loader2, Bell, Users, Target, Clock, Package, Gift, Tag, Sparkles, Trash2, Eye, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

const typeOptions = [
  { value: "promotional", label: "Promotional", icon: Gift, color: "text-primary", bg: "bg-primary/10", desc: "Sales, discounts, new campaigns" },
  { value: "order", label: "Order Update", icon: Package, color: "text-emerald-600", bg: "bg-emerald-500/10", desc: "Order status changes" },
  { value: "product", label: "Product Alert", icon: Tag, color: "text-amber-600", bg: "bg-amber-500/10", desc: "New arrivals, back-in-stock, price drops" },
  { value: "personalized", label: "Personalized", icon: Sparkles, color: "text-violet-600", bg: "bg-violet-500/10", desc: "Targeted to specific users" },
];

const targetOptions = [
  { value: "all", label: "All Users", desc: "Send to everyone" },
  { value: "active", label: "Active Users", desc: "Users with orders in last 30 days" },
  { value: "inactive", label: "Inactive Users", desc: "Users with no orders in 30+ days" },
  { value: "new", label: "New Users", desc: "Signed up in last 7 days" },
];

const iconOptions = ["🔔", "🎉", "🛍️", "🎁", "💰", "🚚", "⭐", "💕", "🌸", "✨", "🔥", "💎", "🎯", "📦", "💄", "🧴"];

interface CampaignForm {
  title: string;
  body: string;
  type: string;
  icon: string;
  image_url: string;
  link_url: string;
  target_type: string;
}

const emptyForm: CampaignForm = {
  title: "",
  body: "",
  type: "promotional",
  icon: "🔔",
  image_url: "",
  link_url: "",
  target_type: "all",
};

export default function AdminNotifications() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [tab, setTab] = useState("compose");

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch user count for targeting preview
  const { data: userStats } = useQuery({
    queryKey: ["admin-user-stats"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      return { total: count || 0 };
    },
  });

  // Save campaign as draft
  const saveDraft = useMutation({
    mutationFn: async (f: CampaignForm) => {
      const { error } = await supabase.from("notification_campaigns").insert({
        title: f.title,
        body: f.body,
        type: f.type,
        icon: f.icon,
        image_url: f.image_url || null,
        link_url: f.link_url || null,
        target_type: f.target_type,
        status: "draft",
        created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
      toast.success("Draft saved");
      setForm(emptyForm);
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  // Send campaign now
  const sendNow = useMutation({
    mutationFn: async (campaignId: string) => {
      setSendingId(campaignId);
      // Get campaign details
      const { data: campaign, error: cErr } = await supabase
        .from("notification_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      if (cErr) throw cErr;

      // Get target users
      let userIds: string[] = [];
      const c = campaign as any;

      if (c.target_type === "all") {
        const { data: profiles } = await supabase.from("profiles").select("user_id");
        userIds = (profiles || []).map((p: any) => p.user_id);
      } else if (c.target_type === "active") {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
        const { data: orders } = await supabase.from("orders").select("user_id").gte("created_at", thirtyDaysAgo);
        userIds = [...new Set((orders || []).map((o: any) => o.user_id))];
      } else if (c.target_type === "inactive") {
        const { data: allUsers } = await supabase.from("profiles").select("user_id");
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
        const { data: activeOrders } = await supabase.from("orders").select("user_id").gte("created_at", thirtyDaysAgo);
        const activeIds = new Set((activeOrders || []).map((o: any) => o.user_id));
        userIds = (allUsers || []).filter((u: any) => !activeIds.has(u.user_id)).map((u: any) => u.user_id);
      } else if (c.target_type === "new") {
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const { data: newUsers } = await supabase.from("profiles").select("user_id").gte("created_at", sevenDaysAgo);
        userIds = (newUsers || []).map((u: any) => u.user_id);
      }

      if (userIds.length === 0) {
        throw new Error("No users match the target criteria");
      }

      // Insert notifications for each user
      const notifications = userIds.map((uid) => ({
        user_id: uid,
        title: c.title,
        body: c.body,
        type: c.type,
        icon: c.icon,
        image_url: c.image_url,
        link_url: c.link_url,
        metadata: { campaign_id: campaignId },
      }));

      // Batch insert (chunks of 100)
      for (let i = 0; i < notifications.length; i += 100) {
        const batch = notifications.slice(i, i + 100);
        const { error } = await supabase.from("notifications").insert(batch as any);
        if (error) throw error;
      }

      // Update campaign status
      await supabase.from("notification_campaigns").update({
        status: "sent",
        sent_count: userIds.length,
        sent_at: new Date().toISOString(),
      } as any).eq("id", campaignId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
      toast.success("Notifications sent successfully!");
      setSendingId(null);
    },
    onError: (e) => {
      toast.error(e.message);
      setSendingId(null);
    },
  });

  // Quick send (compose + send immediately)
  const quickSend = useMutation({
    mutationFn: async (f: CampaignForm) => {
      // First save campaign
      const { data: campaign, error: insertErr } = await supabase.from("notification_campaigns").insert({
        title: f.title,
        body: f.body,
        type: f.type,
        icon: f.icon,
        image_url: f.image_url || null,
        link_url: f.link_url || null,
        target_type: f.target_type,
        status: "draft",
        created_by: user!.id,
      } as any).select().single();
      if (insertErr) throw insertErr;
      // Then send it
      await sendNow.mutateAsync((campaign as any).id);
    },
    onSuccess: () => {
      setForm(emptyForm);
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notification_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
      toast.success("Deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const sentCount = campaigns.filter((c: any) => c.status === "sent").length;
  const draftCount = campaigns.filter((c: any) => c.status === "draft").length;

  return (
    <div>
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Send className="w-4 h-4 text-primary" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{sentCount}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Sent</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{draftCount}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Drafts</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{userStats?.total || 0}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Users</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{campaigns.length} campaigns</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setForm(emptyForm); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl">
              <Plus className="h-4 w-4 mr-1.5" />Compose
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Compose Notification
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 mt-2">
              {/* Type selection */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">TYPE</Label>
                <div className="grid grid-cols-2 gap-2">
                  {typeOptions.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setForm({ ...form, type: t.value })}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left ${
                        form.type === t.value
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-border"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${t.bg} flex items-center justify-center`}>
                        <t.icon className={`w-4 h-4 ${t.color}`} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{t.label}</p>
                        <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon picker */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">ICON</Label>
                <div className="flex flex-wrap gap-1.5">
                  {iconOptions.map((ico) => (
                    <button
                      key={ico}
                      onClick={() => setForm({ ...form, icon: ico })}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                        form.icon === ico ? "bg-primary/10 ring-2 ring-primary scale-110" : "bg-secondary hover:bg-secondary/80"
                      }`}
                    >
                      {ico}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Body */}
              <div>
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Flash Sale: 30% Off Everything!"
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label>Message *</Label>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Don't miss our biggest sale of the season. Use code FLASH30 at checkout."
                  rows={3}
                  className="rounded-xl resize-none"
                />
              </div>

              {/* Optional fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Image URL</Label>
                  <Input
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="https://..."
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label>Link URL</Label>
                  <Input
                    value={form.link_url}
                    onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                    placeholder="/collection/offers"
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Target */}
              <div>
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">TARGET AUDIENCE</Label>
                <div className="grid grid-cols-2 gap-2">
                  {targetOptions.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setForm({ ...form, target_type: t.value })}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        form.target_type === t.value
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-border"
                      }`}
                    >
                      <p className="text-xs font-bold text-foreground">{t.label}</p>
                      <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-secondary/50 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
                <div className="bg-card rounded-xl p-3 flex items-start gap-3 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl ${typeOptions.find(t => t.value === form.type)?.bg || "bg-primary/10"} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-lg">{form.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">{form.title || "Notification title"}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{form.body || "Notification message..."}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">Just now</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl"
                  onClick={() => saveDraft.mutate(form)}
                  disabled={!form.title || !form.body || saveDraft.isPending}
                >
                  {saveDraft.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Save Draft
                </Button>
                <Button
                  className="flex-1 rounded-xl"
                  onClick={() => quickSend.mutate(form)}
                  disabled={!form.title || !form.body || quickSend.isPending}
                >
                  {quickSend.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />}
                  Send Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaign List */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-xl mb-4">
          <TabsTrigger value="compose" className="rounded-lg text-xs">All</TabsTrigger>
          <TabsTrigger value="drafts" className="rounded-lg text-xs">Drafts ({draftCount})</TabsTrigger>
          <TabsTrigger value="sent" className="rounded-lg text-xs">Sent ({sentCount})</TabsTrigger>
        </TabsList>

        {["compose", "drafts", "sent"].map((tabVal) => (
          <TabsContent key={tabVal} value={tabVal} className="space-y-3 mt-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <AnimatePresence mode="popLayout">
                {campaigns
                  .filter((c: any) => {
                    if (tabVal === "drafts") return c.status === "draft";
                    if (tabVal === "sent") return c.status === "sent";
                    return true;
                  })
                  .map((c: any, i: number) => {
                    const typeConf = typeOptions.find((t) => t.value === c.type) || typeOptions[0];
                    return (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-card rounded-2xl border border-border/50 p-4 hover:shadow-premium transition-shadow"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl ${typeConf.bg} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-lg">{c.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-bold text-foreground">{c.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{c.body}</p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {c.status === "draft" && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-xl"
                                    onClick={() => sendNow.mutate(c.id)}
                                    disabled={sendingId === c.id}
                                  >
                                    {sendingId === c.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Send className="h-3.5 w-3.5 text-primary" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/5"
                                  onClick={() => { if (confirm("Delete campaign?")) deleteCampaign.mutate(c.id); }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                                c.status === "sent" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                              }`}>
                                {c.status === "sent" ? "Sent" : "Draft"}
                              </span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                {c.target_type === "all" ? "All users" : c.target_type}
                              </span>
                              {c.sent_count > 0 && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {c.sent_count} sent
                                </span>
                              )}
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(c.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            )}
            {!isLoading && campaigns.filter((c: any) => {
              if (tabVal === "drafts") return c.status === "draft";
              if (tabVal === "sent") return c.status === "sent";
              return true;
            }).length === 0 && (
              <div className="text-center py-12 bg-card rounded-2xl border border-border/50">
                <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No campaigns yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Create your first notification campaign</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
