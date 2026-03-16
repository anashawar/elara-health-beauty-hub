import { useState, useEffect, useRef } from "react";
import { Headphones, Send, CheckCheck, Clock, User, X, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface Conversation {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  last_message_at: string;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export default function AdminSupport() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch all conversations
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["admin-support-convos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data as Conversation[];
    },
    refetchInterval: 5000,
  });

  // Fetch profiles for user names
  const userIds = [...new Set(conversations.map(c => c.user_id))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-support-profiles", userIds.join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, avatar_url")
        .in("user_id", userIds);
      return (data || []) as Profile[];
    },
    enabled: userIds.length > 0,
  });

  const profileMap = new Map(profiles.map(p => [p.user_id, p]));

  // Fetch messages for selected conversation
  const { data: messages = [] } = useQuery({
    queryKey: ["admin-support-messages", selected],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", selected!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
    },
    enabled: !!selected,
    refetchInterval: 3000,
  });

  // Realtime
  useEffect(() => {
    if (!selected) return;
    const channel = supabase
      .channel(`admin-support-${selected}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `conversation_id=eq.${selected}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-support-messages", selected] });
        queryClient.invalidateQueries({ queryKey: ["admin-support-convos"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send admin reply
  const sendReply = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("support_messages").insert({
        conversation_id: selected!,
        sender_type: "admin",
        sender_id: user!.id,
        content,
      });
      if (error) throw error;
      await supabase
        .from("support_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selected!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-messages", selected] });
      queryClient.invalidateQueries({ queryKey: ["admin-support-convos"] });
      setReply("");
    },
  });

  // Toggle conversation status
  const toggleStatus = useMutation({
    mutationFn: async (id: string) => {
      const convo = conversations.find(c => c.id === id);
      const newStatus = convo?.status === "open" ? "closed" : "open";
      const { error } = await supabase
        .from("support_conversations")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-convos"] });
    },
  });

  const filtered = conversations.filter(c => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search) {
      const profile = profileMap.get(c.user_id);
      const name = profile?.full_name?.toLowerCase() || "";
      return c.subject.toLowerCase().includes(search.toLowerCase()) || name.includes(search.toLowerCase());
    }
    return true;
  });

  const selectedConvo = conversations.find(c => c.id === selected);
  const selectedProfile = selectedConvo ? profileMap.get(selectedConvo.user_id) : null;

  const openCount = conversations.filter(c => c.status === "open").length;

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left panel — conversation list */}
      <div className={`w-full md:w-96 md:border-r border-border flex flex-col bg-background ${selected ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-display font-bold">Support</h1>
            </div>
            <Badge variant="secondary" className="text-xs">{openCount} open</Badge>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="pl-9 h-9 text-sm rounded-xl"
            />
          </div>
          <div className="flex gap-1.5">
            {(["all", "open", "closed"] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No conversations found</div>
          ) : (
            filtered.map(convo => {
              const profile = profileMap.get(convo.user_id);
              const isSelected = convo.id === selected;
              return (
                <button
                  key={convo.id}
                  onClick={() => setSelected(convo.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-border/30 text-left transition-colors hover:bg-secondary/50 ${
                    isSelected ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {profile?.full_name || "User"}
                      </h3>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {new Date(convo.last_message_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{convo.subject}</p>
                    <Badge variant={convo.status === "open" ? "default" : "secondary"} className="mt-1 text-[10px] h-4">
                      {convo.status}
                    </Badge>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel — chat */}
      <div className={`flex-1 flex flex-col bg-background ${!selected ? "hidden md:flex" : "flex"}`}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <Headphones className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Select a conversation to respond</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelected(null)} className="md:hidden w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary">
                  <X className="w-4 h-4" />
                </button>
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {selectedProfile?.avatar_url ? (
                    <img src={selectedProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">{selectedProfile?.full_name || "User"}</h2>
                  <p className="text-[11px] text-muted-foreground">{selectedConvo?.subject}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={selectedConvo?.status === "open" ? "outline" : "default"}
                className="text-xs h-8 rounded-lg"
                onClick={() => toggleStatus.mutate(selected)}
              >
                {selectedConvo?.status === "open" ? "Close Ticket" : "Reopen"}
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              <AnimatePresence>
                {messages.map(msg => {
                  const isAdmin = msg.sender_type === "admin";
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                        isAdmin
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card border border-border/50 rounded-bl-md"
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center gap-1 mt-1 ${isAdmin ? "justify-end" : ""}`}>
                          <span className={`text-[10px] ${isAdmin ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {isAdmin ? "You" : selectedProfile?.full_name || "User"} · {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {isAdmin && <CheckCheck className="w-3 h-3 text-primary-foreground/60" />}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Reply input */}
            <div className="border-t border-border bg-card px-4 py-3">
              <div className="flex items-center gap-2">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (reply.trim()) sendReply.mutate(reply.trim());
                    }
                  }}
                  placeholder="Type your reply..."
                  className="flex-1 rounded-full h-11 text-sm"
                />
                <Button
                  size="icon"
                  className="w-11 h-11 rounded-full"
                  disabled={!reply.trim() || sendReply.isPending}
                  onClick={() => reply.trim() && sendReply.mutate(reply.trim())}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
