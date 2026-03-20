import { useState, useEffect, useRef } from "react";
import { Send, Headphones, Plus, ArrowLeft, Clock, CheckCheck, X, Star, ThumbsUp, ThumbsDown, MessageSquareOff, Bot, UserRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/layout/BottomNav";
import { toast } from "@/components/ui/sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import ReactMarkdown from "react-markdown";

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
type SupportMode = null | "ai" | "human";

// ─── AI CHAT COMPONENT ─────────────────────────
function AISupportChat({ onBack, language }: { onBack: () => void; language: string }) {
  const isRtl = language === "ar" || language === "ku";
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg = { role: "user" as const, content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    let assistantContent = "";

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-ai-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
            user_language: language,
          }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to connect to AI");
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No reader");
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch { /* partial json */ }
        }
      }
    } catch (err: any) {
      toast.error(err.message || "AI service error");
      setMessages(prev => [...prev, { role: "assistant", content: language === "ar" ? "عذراً، حدث خطأ. يرجى المحاولة مرة أخرى." : "Sorry, something went wrong. Please try again." }]);
    }

    setIsStreaming(false);
  };

  const greetingMsg = language === "ar"
    ? "مرحباً! 👋 أنا مساعد ELARA الذكي للدعم. كيف أقدر أساعدك اليوم؟ يمكنك سؤالي عن الطلبات، التوصيل، المنتجات، الاسترجاع، أو أي شي يخص ELARA!"
    : language === "ku"
      ? "سڵاو! 👋 من یاریدەدەری زیرەکی ELARA م بۆ پشتگیری. چۆن دەتوانم یارمەتیت بدەم ئەمڕۆ؟"
      : "Hi there! 👋 I'm ELARA's AI Support Assistant. How can I help you today? Ask me about orders, delivery, products, returns, or anything about ELARA!";

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRtl ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/30" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
          </button>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-display font-bold text-foreground">
                {language === "ar" ? "مساعد ELARA الذكي" : language === "ku" ? "یاریدەدەری زیرەکی ELARA" : "ELARA AI Support"}
              </h1>
              <p className="text-[10px] text-muted-foreground">
                {isStreaming
                  ? (language === "ar" ? "يكتب..." : "Typing...")
                  : (language === "ar" ? "متصل الآن" : "Online")}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* AI greeting */}
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-card border border-border/50 px-4 py-3 shadow-sm">
            <div className="text-sm text-foreground prose prose-sm max-w-none">
              <ReactMarkdown>{greetingMsg}</ReactMarkdown>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">ELARA AI</p>
          </div>
        </div>

        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                isUser
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border/50 rounded-bl-md"
              }`}>
                {isUser ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="text-sm prose prose-sm max-w-none text-foreground">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-card border border-border/50 px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 bg-card/95 backdrop-blur-xl border-t border-border/30 px-4 py-3" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={language === "ar" ? "اكتب سؤالك..." : language === "ku" ? "پرسیارەکەت بنووسە..." : "Type your question..."}
            className="flex-1 bg-secondary rounded-full px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="w-11 h-11 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 transition-opacity shadow-md active:scale-95"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN SUPPORT PAGE ─────────────────────────
export default function SupportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language, t } = useLanguage();
  const isRtl = language === "ar" || language === "ku";

  const [supportMode, setSupportMode] = useState<SupportMode>(null);
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
  const { data: humanMessages = [] } = useQuery({
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
  }, [humanMessages]);

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

  const handleResolved = () => setCloseStep("rate");
  const handleNotResolved = () => setCloseStep("feedback");
  const handleSubmitRating = () => closeConversation.mutate({ resolution: "resolved", rating });
  const handleSubmitFeedback = () => closeConversation.mutate({ resolution: "not_resolved", feedback: feedback.trim() || undefined });
  const handleSkipRating = () => closeConversation.mutate({ resolution: "resolved" });

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

  // ─── AI SUPPORT MODE ─────────────────────────
  if (supportMode === "ai") {
    return <AISupportChat onBack={() => setSupportMode(null)} language={language} />;
  }

  // ─── HUMAN CHAT VIEW ────────────────────────────
  if (activeConversation) {
    const convo = conversations.find(c => c.id === activeConversation);
    const isClosed = convo?.status === "closed";

    return (
      <div className="min-h-screen bg-background flex flex-col" dir={isRtl ? "rtl" : "ltr"}>
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

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-card border border-border/50 px-4 py-3 shadow-sm">
              <p className="text-sm text-foreground">👋 Welcome to ELARA Support! How can we help you today?</p>
              <p className="text-[10px] text-muted-foreground mt-1">ELARA Team</p>
            </div>
          </div>

          <AnimatePresence>
            {humanMessages.map((msg) => {
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
                {closeStep === "choose" && (
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <MessageSquareOff className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-base font-display font-bold text-foreground mb-1">{txt.closeChat}</h3>
                    <p className="text-sm text-muted-foreground mb-6">{txt.wasResolved}</p>
                    <div className="space-y-2.5">
                      <button onClick={handleResolved} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-green-500/10 text-green-600 font-semibold text-sm active:scale-[0.98] transition-transform">
                        <ThumbsUp className="w-4 h-4" />{txt.yes}
                      </button>
                      <button onClick={handleNotResolved} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm active:scale-[0.98] transition-transform">
                        <ThumbsDown className="w-4 h-4" />{txt.no}
                      </button>
                    </div>
                    <button onClick={() => setCloseStep(null)} className="mt-4 text-sm text-muted-foreground">Cancel</button>
                  </div>
                )}
                {closeStep === "rate" && (
                  <div className="text-center">
                    <h3 className="text-base font-display font-bold text-foreground mb-1">{txt.rateService}</h3>
                    <p className="text-sm text-muted-foreground mb-5">{language === "ar" ? "اختر تقييمك" : "Tap to rate"}</p>
                    <div className="flex items-center justify-center gap-2 mb-6">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} onClick={() => setRating(star)} className="p-1 active:scale-110 transition-transform">
                          <Star className={`w-9 h-9 transition-colors ${star <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`} />
                        </button>
                      ))}
                    </div>
                    <button onClick={handleSubmitRating} disabled={closeConversation.isPending} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
                      {closeConversation.isPending ? "..." : txt.submit}
                    </button>
                    <button onClick={handleSkipRating} className="mt-3 text-sm text-muted-foreground">{txt.skip}</button>
                  </div>
                )}
                {closeStep === "feedback" && (
                  <div>
                    <h3 className="text-base font-display font-bold text-foreground mb-1 text-center">
                      {language === "ar" ? "ملاحظاتك" : "Your Feedback"}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4 text-center">
                      {language === "ar" ? "نأسف أن مشكلتك لم تُحل. شاركنا ملاحظاتك." : "Sorry your issue wasn't resolved. Share what we can improve."}
                    </p>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder={txt.feedbackPlaceholder}
                      rows={4}
                      maxLength={1000}
                      className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 resize-none mb-4"
                    />
                    <button onClick={handleSubmitFeedback} disabled={closeConversation.isPending} className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-50">
                      {closeConversation.isPending ? "..." : txt.submit}
                    </button>
                    <button onClick={() => setCloseStep(null)} className="w-full mt-2 text-sm text-muted-foreground text-center py-2">Cancel</button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
                <Send className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── MAIN SUPPORT VIEW — MODE CHOOSER + CONVERSATION LIST ─────────
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
              <h1 className="text-lg font-display font-bold text-foreground">
                {language === "ar" ? "الدعم" : language === "ku" ? "پشتگیری" : "Support"}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="app-container">
        <div className="md:max-w-2xl md:mx-auto">
          {/* Support mode chooser */}
          <div className="mx-4 mt-5 space-y-3">
            <h2 className="text-sm font-display font-bold text-foreground text-center mb-1">
              {language === "ar" ? "كيف تحب نساعدك؟" : language === "ku" ? "چۆن دەتەوێت یارمەتیت بدەین؟" : "How would you like to get help?"}
            </h2>

            {/* AI option */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setSupportMode("ai")}
              className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 via-primary/5 to-violet-500/10 rounded-2xl border border-primary/20 hover:border-primary/40 transition-all text-start"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center flex-shrink-0 shadow-md">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground">
                  {t("support.talkWithAI")}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {t("support.talkWithAIDesc")}
                </p>
              </div>
              <div className="flex-shrink-0 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                {language === "ar" ? "فوري" : language === "ku" ? "خێرا" : "Instant"}
              </div>
            </motion.button>

            {/* Human option */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowNewChat(true)}
              className="w-full flex items-center gap-4 p-4 bg-card rounded-2xl border border-border/50 hover:border-primary/20 transition-all text-start"
            >
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0">
                <UserRound className="w-6 h-6 text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground">
                  {t("support.talkWithHuman")}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {t("support.talkWithHumanDesc")}
                </p>
              </div>
            </motion.button>
          </div>

          {/* New chat dialog */}
          <AnimatePresence>
            {showNewChat && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mx-4 mt-4 bg-card rounded-2xl border border-border shadow-premium p-4"
              >
                <h3 className="text-sm font-bold text-foreground mb-3">
                  {language === "ar" ? "محادثة جديدة" : "New Conversation"}
                </h3>
                <input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder={language === "ar" ? "شنو تحتاج مساعدة بيه؟" : "What do you need help with?"}
                  className="w-full bg-secondary rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 mb-3"
                  onKeyDown={(e) => e.key === "Enter" && handleNewChat()}
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowNewChat(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground bg-secondary">
                    {language === "ar" ? "إلغاء" : "Cancel"}
                  </button>
                  <button
                    onClick={handleNewChat}
                    disabled={createConvo.isPending}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground bg-primary disabled:opacity-50"
                  >
                    {createConvo.isPending ? "..." : (language === "ar" ? "بدء المحادثة" : "Start Chat")}
                  </button>
                </div>

                {/* Quick topics */}
                <div className="mt-3 pt-3 border-t border-border/30 space-y-1.5">
                  <p className="text-[10px] text-muted-foreground font-medium mb-1.5">
                    {language === "ar" ? "أو اختر موضوع:" : "Or pick a topic:"}
                  </p>
                  {["Order Issue", "Product Question", "Delivery & Shipping", "Returns & Refunds", "General Question"].map((topic) => (
                    <button
                      key={topic}
                      onClick={() => createConvo.mutate(topic)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors text-start text-xs font-medium text-foreground"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Conversation list */}
          {conversations.length > 0 && (
            <div className="mx-4 mt-5">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                {language === "ar" ? "المحادثات السابقة" : language === "ku" ? "گفتوگۆکانی پێشوو" : "Previous Conversations"}
              </h3>
              <div className="space-y-2">
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
            </div>
          )}

          {/* Email fallback */}
          <div className="mx-4 mt-8 text-center">
            <p className="text-xs text-muted-foreground">
              {language === "ar" ? "يمكنك أيضاً التواصل عبر " : "You can also reach us at "}
              <a href="mailto:info@elarastore.co" className="text-primary font-semibold">info@elarastore.co</a>
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
