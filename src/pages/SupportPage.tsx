import { useState, useEffect, useRef } from "react";
import { Send, Headphones, Plus, ArrowLeft, Clock, CheckCheck, X, Star, ThumbsUp, ThumbsDown, MessageSquareOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/layout/BottomNav";
import { toast } from "@/components/ui/sonner";
import { useLanguage } from "@/i18n/LanguageContext";

interface SupportConversation {
  id: string;
  subject: string;
  status: string;
  last_message_at: string;
  created_at: string;
  resolution: string | null;
  rating: number | null;
  feedback: string | null;
  closed_at: string | null;
}

interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_id: string;
  content: string;
  created_at: string;
}

type CloseStep = "choose" | "rate" | "feedback" | null;

export default function SupportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const isRtl = language === "ar" || language === "ku";

  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [closeStep, setCloseStep] = useState<CloseStep>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const txt = {
    closeChat: language === "ar" ? "إغلاق المحادثة" : language === "ku" ? "داخستنی گفتوگۆ" : "Close Chat",
    wasResolved: language === "ar" ? "هل تم حل مشكلتك؟" : language === "ku" ? "ئایا کێشەکەت چارەسەر بوو؟" : "Was your issue resolved?",
    yes: language === "ar" ? "نعم، تم الحل" : language === "ku" ? "بەڵێ، چارەسەر بوو" : "Yes, resolved",
    no: language === "ar" ? "لا، لم يتم الحل" : language === "ku" ? "نەخێر، چارەسەر نەبوو" : "No, not resolved",
    rateService: language === "ar" ? "كيف تقيم خدمتنا؟" : language === "ku" ? "چۆن خزمەتگوزاریمان هەڵدەسەنگێنیت؟" : "How would you rate our service?",
    submit: language === "ar" ? "إرسال" : language === "ku" ? "ناردن" : "Submit",
    skip: language === "ar" ? "تخطي" : language === "ku" ? "بازدان" : "Skip",
    feedbackPlaceholder: language === "ar" ? "ما الذي يمكننا تحسينه؟" : language === "ku" ? "چی دەتوانین باشتر بکەین؟" : "What could we improve? Share your feedback...",
    thankYou: language === "ar" ? "شكراً لملاحظاتك!" : language === "ku" ? "سوپاس بۆ بۆچوونەکەت!" : "Thank you for your feedback!",
    chatClosed: language === "ar" ? "تم إغلاق المحادثة" : language === "ku" ? "گفتوگۆ داخرا" : "Chat closed",
    resolved: language === "ar" ? "تم الحل" : language === "ku" ? "چارەسەر بوو" : "Resolved",
    notResolved: language === "ar" ? "لم يتم الحل" : language === "ku" ? "چارەسەر نەبوو" : "Not Resolved",
    closed: language === "ar" ? "مغلقة" : language === "ku" ? "داخراو" : "Closed",
  };

  // Fetch conversations
  const { data: conversations = [], isLoading: loadingConvos } = useQuery({
    queryKey: ["support-conversations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_conversations")
        .select("*")
        .eq("user_id", user!.id)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data as SupportConversation[];
    },
    enabled: !!user,
  });

  // Fetch messages for active conversation
  const { data: messages = [] } = useQuery({
    queryKey: ["support-messages", activeConversation],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("conversation_id", activeConversation!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as SupportMessage[];
    },
    enabled: !!activeConversation,
    refetchInterval: 3000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!activeConversation) return;
    const channel = supabase
      .channel(`support-${activeConversation}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `conversation_id=eq.${activeConversation}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["support-messages", activeConversation] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConversation, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create conversation
  const createConvo = useMutation({
    mutationFn: async (subject: string) => {
      const { data, error } = await supabase
        .from("support_conversations")
        .insert({ user_id: user!.id, subject })
        .select()
        .single();
      if (error) throw error;
      return data as SupportConversation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["support-conversations"] });
      setActiveConversation(data.id);
      setShowNewChat(false);
      setNewSubject("");
    },
  });

  // Send message
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase.from("support_messages").insert({
        conversation_id: activeConversation!,
        sender_type: "user",
        sender_id: user!.id,
        content,
      });
      if (error) throw error;
      await supabase
        .from("support_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", activeConversation!)
        .eq("user_id", user!.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-messages", activeConversation] });
      queryClient.invalidateQueries({ queryKey: ["support-conversations"] });
      setMessage("");
    },
    onError: () => toast.error("Failed to send message"),
  });

  // Close conversation mutation
  const closeConversation = useMutation({
    mutationFn: async (payload: { resolution: string; rating?: number; feedback?: string }) => {
      const { error } = await supabase
        .from("support_conversations")
        .update({
          status: "closed",
          resolution: payload.resolution,
          rating: payload.rating || null,
          feedback: payload.feedback || null,
          closed_at: new Date().toISOString(),
        })
        .eq("id", activeConversation!)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["support-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["support-messages", activeConversation] });
      toast.success(txt.thankYou);
      setCloseStep(null);
      setRating(0);
      setFeedback("");
    },
    onError: () => toast.error("Failed to close chat"),
  });

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || sendMessage.isPending) return;
    sendMessage.mutate(trimmed);
  };

  const handleNewChat = () => {
    const subject = newSubject.trim() || "General Support";
    createConvo.mutate(subject);
  };

  const handleResolved = () => {
    setCloseStep("rate");
  };

  const handleNotResolved = () => {
    setCloseStep("feedback");
  };

  const handleSubmitRating = () => {
    closeConversation.mutate({ resolution: "resolved", rating });
  };

  const handleSubmitFeedback = () => {
    closeConversation.mutate({ resolution: "not_resolved", feedback: feedback.trim() || undefined });
  };

  const handleSkipRating = () => {
    closeConversation.mutate({ resolution: "resolved" });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <div className="text-center px-6">
          <Headphones className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-lg font-display font-bold text-foreground mb-2">Contact Support</h2>
          <p className="text-sm text-muted-foreground mb-4">Sign in to chat with our team</p>
          <button onClick={() => navigate("/auth")} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold">
            Sign In
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ─── CHAT VIEW ────────────────────────────────
  if (activeConversation) {
    const convo = conversations.find(c => c.id === activeConversation);
    const isClosed = convo?.status === "closed";

    return (
      <div className="min-h-screen bg-background flex flex-col" dir={isRtl ? "rtl" : "ltr"}>
        {/* Chat header */}
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/30" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className="flex items-center gap-3 px-4 py-3">
            <button onClick={() => { setActiveConversation(null); setCloseStep(null); }} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-display font-bold text-foreground truncate">{convo?.subject || "Support"}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isClosed ? "bg-muted-foreground/40" : "bg-green-500"}`} />
                <span className="text-[10px] text-muted-foreground capitalize">
                  {isClosed ? txt.closed : "Active"}
                  {convo?.resolution === "resolved" && ` · ${txt.resolved}`}
                  {convo?.resolution === "not_resolved" && ` · ${txt.notResolved}`}
                </span>
              </div>
            </div>
            {!isClosed && (
              <button
                onClick={() => setCloseStep("choose")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-[11px] font-semibold active:scale-95 transition-all"
              >
                <MessageSquareOff className="w-3.5 h-3.5" />
                {txt.closeChat}
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {/* Auto greeting */}
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-card border border-border/50 px-4 py-3 shadow-sm">
              <p className="text-sm text-foreground">👋 Welcome to ELARA Support! How can we help you today?</p>
              <p className="text-[10px] text-muted-foreground mt-1">ELARA Team</p>
            </div>
          </div>

          <AnimatePresence>
            {messages.map((msg) => {
              const isUser = msg.sender_type === "user";
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                    isUser
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-card border border-border/50 rounded-bl-md"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div className={`flex items-center gap-1 mt-1 ${isUser ? "justify-end" : ""}`}>
                      <span className={`text-[10px] ${isUser ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {isUser && <CheckCheck className="w-3 h-3 text-primary-foreground/60" />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Closed banner */}
          {isClosed && (
            <div className="flex justify-center py-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
                <MessageSquareOff className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{txt.chatClosed}</span>
                {convo?.rating && (
                  <span className="flex items-center gap-0.5 text-xs text-amber-500">
                    {convo.rating}<Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  </span>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Close chat overlay */}
        <AnimatePresence>
          {closeStep && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
            >
              <div className="absolute inset-0 bg-black/40" onClick={() => setCloseStep(null)} />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 350 }}
                className="relative bg-background rounded-t-[20px] md:rounded-2xl w-full md:max-w-sm p-6 z-10"
                style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)" }}
              >
                {/* Step: Choose resolved or not */}
                {closeStep === "choose" && (
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <MessageSquareOff className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-base font-display font-bold text-foreground mb-1">{txt.closeChat}</h3>
                    <p className="text-sm text-muted-foreground mb-6">{txt.wasResolved}</p>
                    <div className="space-y-2.5">
                      <button
                        onClick={handleResolved}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-green-500/10 text-green-600 font-semibold text-sm active:scale-[0.98] transition-transform"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        {txt.yes}
                      </button>
                      <button
                        onClick={handleNotResolved}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm active:scale-[0.98] transition-transform"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        {txt.no}
                      </button>
                    </div>
                    <button onClick={() => setCloseStep(null)} className="mt-4 text-sm text-muted-foreground">
                      Cancel
                    </button>
                  </div>
                )}

                {/* Step: Rate service (resolved) */}
                {closeStep === "rate" && (
                  <div className="text-center">
                    <h3 className="text-base font-display font-bold text-foreground mb-1">{txt.rateService}</h3>
                    <p className="text-sm text-muted-foreground mb-5">
                      {language === "ar" ? "اختر تقييمك" : language === "ku" ? "هەڵسەنگاندنت هەڵبژێرە" : "Tap to rate"}
                    </p>
                    <div className="flex items-center justify-center gap-2 mb-6">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className="p-1 active:scale-110 transition-transform"
                        >
                          <Star
                            className={`w-9 h-9 transition-colors ${
                              star <= rating
                                ? "text-amber-400 fill-amber-400"
                                : "text-muted-foreground/20"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleSubmitRating}
                      disabled={closeConversation.isPending}
                      className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
                    >
                      {closeConversation.isPending ? "..." : txt.submit}
                    </button>
                    <button onClick={handleSkipRating} className="mt-3 text-sm text-muted-foreground">
                      {txt.skip}
                    </button>
                  </div>
                )}

                {/* Step: Feedback (not resolved) */}
                {closeStep === "feedback" && (
                  <div>
                    <h3 className="text-base font-display font-bold text-foreground mb-1 text-center">
                      {language === "ar" ? "ملاحظاتك" : language === "ku" ? "بۆچوونەکانت" : "Your Feedback"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 text-center">
                      {language === "ar" ? "نأسف أن مشكلتك لم تُحل. شاركنا ملاحظاتك." : language === "ku" ? "ببوورە کێشەکەت چارەسەر نەبوو. بۆچوونەکانت لەگەڵمان بەش بکە." : "Sorry your issue wasn't resolved. Share what we can improve."}
                    </p>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder={txt.feedbackPlaceholder}
                      rows={4}
                      maxLength={1000}
                      className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none mb-4"
                    />
                    <button
                      onClick={handleSubmitFeedback}
                      disabled={closeConversation.isPending}
                      className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
                    >
                      {closeConversation.isPending ? "..." : txt.submit}
                    </button>
                    <button onClick={() => setCloseStep(null)} className="w-full mt-2 text-sm text-muted-foreground text-center py-2">
                      Cancel
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        {!isClosed && (
          <div className="sticky bottom-0 bg-card/95 backdrop-blur-xl border-t border-border/30 px-4 py-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}>
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Type your message..."
                className="flex-1 bg-secondary rounded-full px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || sendMessage.isPending}
                className="w-11 h-11 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 transition-opacity shadow-md"
              >
                <Send className="w-4.5 h-4.5 text-primary-foreground" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── CONVERSATION LIST VIEW ────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-24" dir={isRtl ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/30" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/profile")} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
            </button>
            <div className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-display font-bold text-foreground">Support</h1>
            </div>
          </div>
          <button
            onClick={() => setShowNewChat(true)}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-md"
          >
            <Plus className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
      </header>

      <div className="app-container">
        <div className="md:max-w-2xl md:mx-auto">
          {/* New chat dialog */}
          <AnimatePresence>
            {showNewChat && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mx-4 mt-4 bg-card rounded-2xl border border-border shadow-premium p-4"
              >
                <h3 className="text-sm font-bold text-foreground mb-3">New Conversation</h3>
                <input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="What do you need help with?"
                  className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 mb-3"
                  onKeyDown={(e) => e.key === "Enter" && handleNewChat()}
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowNewChat(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground bg-secondary">
                    Cancel
                  </button>
                  <button
                    onClick={handleNewChat}
                    disabled={createConvo.isPending}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground bg-primary disabled:opacity-50"
                  >
                    {createConvo.isPending ? "Creating..." : "Start Chat"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick topics */}
          {!showNewChat && conversations.length === 0 && !loadingConvos && (
            <div className="mx-4 mt-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Headphones className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-base font-display font-bold text-foreground mb-1">Contact ELARA Support</h2>
              <p className="text-sm text-muted-foreground mb-6">Chat directly with our team — we're here to help!</p>
              
              <div className="space-y-2">
                {["Order Issue", "Product Question", "Delivery & Shipping", "Returns & Refunds", "General Question"].map((topic) => (
                  <button
                    key={topic}
                    onClick={() => createConvo.mutate(topic)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 bg-card rounded-xl border border-border/50 shadow-sm hover:border-primary/30 transition-colors text-start"
                  >
                    <span className="text-sm font-medium text-foreground">{topic}</span>
                    <ArrowLeft className="w-4 h-4 text-muted-foreground/50 ms-auto rotate-180 rtl:rotate-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation list */}
          {conversations.length > 0 && (
            <div className="mx-4 mt-4 space-y-2">
              {conversations.map((convo) => {
                const isClosed = convo.status === "closed";
                return (
                  <motion.button
                    key={convo.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveConversation(convo.id)}
                    className="w-full flex items-center gap-3 px-4 py-4 bg-card rounded-2xl border border-border/50 shadow-sm hover:border-primary/20 transition-all text-start"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Headphones className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate">{convo.subject}</h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          isClosed
                            ? convo.resolution === "resolved"
                              ? "bg-green-500/10 text-green-600"
                              : "bg-destructive/10 text-destructive"
                            : "bg-green-500/10 text-green-600"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isClosed
                              ? convo.resolution === "resolved" ? "bg-green-500" : "bg-destructive"
                              : "bg-green-500"
                          }`} />
                          {isClosed
                            ? convo.resolution === "resolved" ? txt.resolved : txt.notResolved
                            : "Active"}
                        </span>
                        {convo.rating && (
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-medium">
                            {convo.rating}<Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(convo.last_message_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-muted-foreground/40 rotate-180 rtl:rotate-0 flex-shrink-0" />
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Email fallback */}
          <div className="mx-4 mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              You can also reach us at{" "}
              <a href="mailto:info@elarastore.co" className="text-primary font-semibold">info@elarastore.co</a>
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
