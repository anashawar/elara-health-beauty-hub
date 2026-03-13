import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Send, Sparkles, Loader2, Trash2, ShoppingCart, Plus, MessageCircle, Sun, CloudRain, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import BottomNav from "@/components/layout/BottomNav";
import DesktopHeader from "@/components/layout/DesktopHeader";
import SearchOverlay from "@/components/SearchOverlay";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { useProducts } from "@/hooks/useProducts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useApp } from "@/context/AppContext";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elara-chat`;

const KURDISTAN_CITIES = ["Erbil", "Sulaymaniyah", "Duhok"];

function isKurdistanUser(city: string | null): boolean {
  if (!city) return false;
  return KURDISTAN_CITIES.some(k => city.toLowerCase().includes(k.toLowerCase()));
}

const quickQuestions: Record<string, Record<string, string[]>> = {
  iraq: {
    en: [
      "What's a good skincare routine for Baghdad's heat?",
      "How to treat acne scars?",
      "Best vitamins for hair growth?",
      "Morning vs night skincare routine?",
    ],
    ar: [
      "شنو أحسن روتين للعناية بالبشرة بحر بغداد؟",
      "شلون أعالج آثار حب الشباب؟",
      "شنو أحسن فيتامينات للشعر؟",
      "روتين الصبح ولا الليل أهم؟",
    ],
    ku: [
      "ڕوتینێکی باشی چاودێری پێست چییە؟",
      "چۆن شوێنی دانەکان چارەسەر بکەم؟",
      "باشترین ڤیتامین بۆ قژ چییە؟",
      "ڕوتینی بەیانی یان شەو باشترە؟",
    ],
  },
  kurdistan: {
    en: [
      "Best skincare for Kurdistan's cold winters?",
      "How to protect skin from dry weather in Erbil?",
      "Recommend a gentle cleanser for sensitive skin",
      "Morning routine for glowing skin?",
    ],
    ar: [
      "شنو أحسن كريم للشتاء البارد بكوردستان؟",
      "شلون أحمي بشرتي من الجو الجاف بأربيل؟",
      "رشحيلي غسول لطيف للبشرة الحساسة",
      "روتين الصبح لبشرة مشرقة؟",
    ],
    ku: [
      "باشترین کریم بۆ زستانی ساردی کوردستان چییە؟",
      "چۆن پێستم بپارێزم لە کەشی وشکی هەولێر؟",
      "پاککەرەوەیەکی نەرم بۆ پێستی هەستیار پێشنیار بکە",
      "ڕوتینی بەیانی بۆ پێستی درەوشاوە؟",
    ],
  },
};

function getGreeting(language: string, name: string | null, isKurdistan: boolean): { greeting: string; subtitle: string } {
  const hour = new Date().getHours();
  const firstName = name?.split(" ")[0] || null;

  if (isKurdistan) {
    if (language === "ku") {
      const timeGreeting = hour < 12 ? "بەیانیت باش" : hour < 18 ? "ڕۆژت باش" : "ئێوارەت باش";
      return {
        greeting: firstName ? `${timeGreeting} ${firstName}! 💕` : `${timeGreeting}! 💕`,
        subtitle: "چۆنی گیانم؟ من ئیلارام، هاوڕێی جوانکاریت لە هەولێر ✨",
      };
    }
    if (language === "ar") {
      const timeGreeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء النور";
      return {
        greeting: firstName ? `${timeGreeting} ${firstName}! 💕` : `${timeGreeting}! 💕`,
        subtitle: "شلونك؟ أنا إيلارا، صيدلانيتك من أربيل ✨",
      };
    }
    const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    return {
      greeting: firstName ? `${timeGreeting}, ${firstName}! 💕` : `${timeGreeting}! 💕`,
      subtitle: "How are you? I'm Elara, your beauty bestie from Erbil ✨",
    };
  }

  // Iraqi personality
  if (language === "ar") {
    const timeGreeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء النور";
    return {
      greeting: firstName ? `${timeGreeting} ${firstName}! 💕` : `${timeGreeting}! 💕`,
      subtitle: "شلونچ اليوم يا گلبي؟ أنا إيلارا، صيدلانيتچ من بغداد ✨",
    };
  }
  if (language === "ku") {
    const timeGreeting = hour < 12 ? "بەیانیت باش" : hour < 18 ? "ڕۆژت باش" : "ئێوارەت باش";
    return {
      greeting: firstName ? `${timeGreeting} ${firstName}! 💕` : `${timeGreeting}! 💕`,
      subtitle: "چۆنی ئەمڕۆ؟ من ئیلارام، پسپۆڕی جوانکاریت ✨",
    };
  }
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return {
    greeting: firstName ? `${timeGreeting}, ${firstName}! 💕` : `${timeGreeting}! 💕`,
    subtitle: "How are you doing today? I'm Elara, your beauty bestie from Baghdad ✨",
  };
}

function getContextualTips(language: string, isKurdistan: boolean): { icon: React.ReactNode; text: string }[] {
  const month = new Date().getMonth();
  const tips: { icon: React.ReactNode; text: string }[] = [];

  if (isKurdistan) {
    // Kurdistan-specific
    if (language === "ku") {
      if (month >= 4 && month <= 8) {
        tips.push({ icon: <Sun className="w-4 h-4 text-amber-500" />, text: "هەوا گەرمە لە هەولێر 🥵 واقی خۆرت لەبیر نەچێت SPF 50+!" });
      } else if (month >= 10 || month <= 2) {
        tips.push({ icon: <CloudRain className="w-4 h-4 text-blue-400" />, text: "زستانی کوردستان وشک و ساردە ❄️ پێستت پێویستی بە شێداری زۆرە!" });
      }
      if (month === 2) {
        tips.push({ icon: <Sparkles className="w-4 h-4 text-green-500" />, text: "نەورۆز پیرۆزبێت! 🌷🔥 ئامادەبە بۆ جەژنەکە بە پێستێکی درەوشاوە" });
      }
      tips.push({ icon: <Heart className="w-4 h-4 text-pink-400" />, text: "هەر پرسیارێکت هەیە دەربارەی جوانکاری بپرسە گیانم 💆‍♀️" });
    } else if (language === "ar") {
      if (month >= 4 && month <= 8) {
        tips.push({ icon: <Sun className="w-4 h-4 text-amber-500" />, text: "الجو حار بأربيل 🥵 لا تنسي واقي شمس SPF 50+!" });
      } else if (month >= 10 || month <= 2) {
        tips.push({ icon: <CloudRain className="w-4 h-4 text-blue-400" />, text: "شتاء كوردستان بارد وجاف ❄️ بشرتك تحتاج ترطيب مكثف!" });
      }
      if (month === 2) {
        tips.push({ icon: <Sparkles className="w-4 h-4 text-green-500" />, text: "نوروز مبارك! 🌷🔥 جهزي لوكك للعيد" });
      }
      tips.push({ icon: <Heart className="w-4 h-4 text-pink-400" />, text: "اسأليني عن أي شي يخص جمالك 💆‍♀️" });
    } else {
      if (month >= 4 && month <= 8) {
        tips.push({ icon: <Sun className="w-4 h-4 text-amber-500" />, text: "Summer in Kurdistan 🥵 Don't skip SPF 50+ sunscreen!" });
      } else if (month >= 10 || month <= 2) {
        tips.push({ icon: <CloudRain className="w-4 h-4 text-blue-400" />, text: "Kurdistan winters are cold & dry ❄️ Extra hydration is key!" });
      }
      if (month === 2) {
        tips.push({ icon: <Sparkles className="w-4 h-4 text-green-500" />, text: "Happy Newroz! 🌷🔥 Get your glow ready for the celebration" });
      }
      tips.push({ icon: <Heart className="w-4 h-4 text-pink-400" />, text: "Ask me anything about skincare and beauty 💆‍♀️" });
    }
  } else {
    // Iraqi Arab
    if (language === "ar") {
      if (month >= 4 && month <= 8) {
        tips.push({ icon: <Sun className="w-4 h-4 text-amber-500" />, text: "الجو حار هواية ببغداد 🥵 لا تنسين واقي الشمس SPF 50+ كل يوم!" });
      } else if (month >= 10 || month <= 2) {
        tips.push({ icon: <CloudRain className="w-4 h-4 text-blue-400" />, text: "الجو بارد وجاف هالفترة ❄️ بشرتچ تحتاج ترطيب مكثف!" });
      }
      if (month === 2 || month === 3) {
        tips.push({ icon: <Heart className="w-4 h-4 text-primary" />, text: "رمضان كريم 🌙 خليني أساعدچ تحافظين على بشرتچ خلال الصيام" });
      }
      tips.push({ icon: <Heart className="w-4 h-4 text-pink-400" />, text: "اسأليني عن أي شي يخص بشرتچ وشعرچ وجمالچ يا گلبي 💆‍♀️" });
    } else if (language === "ku") {
      if (month >= 4 && month <= 8) {
        tips.push({ icon: <Sun className="w-4 h-4 text-amber-500" />, text: "کەش زۆر گەرمە ئەم ڕۆژانە 🥵 واقی خۆرت لەبیر نەچێت!" });
      } else if (month >= 10 || month <= 2) {
        tips.push({ icon: <CloudRain className="w-4 h-4 text-blue-400" />, text: "کەش ساردە ئەم ماوەیە ❄️ پێستت پێویستی بە شێداری زۆرە!" });
      }
      tips.push({ icon: <Heart className="w-4 h-4 text-pink-400" />, text: "هەر پرسیارێکت هەیە دەربارەی پێست و قژ بپرسە 💆‍♀️" });
    } else {
      if (month >= 4 && month <= 8) {
        tips.push({ icon: <Sun className="w-4 h-4 text-amber-500" />, text: "It's scorching in Baghdad 🥵 Don't skip SPF 50+ sunscreen!" });
      } else if (month >= 10 || month <= 2) {
        tips.push({ icon: <CloudRain className="w-4 h-4 text-blue-400" />, text: "Cold & dry weather in Iraq ❄️ Your skin needs extra hydration!" });
      }
      if (month === 2 || month === 3) {
        tips.push({ icon: <Heart className="w-4 h-4 text-primary" />, text: "Ramadan Kareem 🌙 Let me help you maintain your skin routine during fasting" });
      }
      tips.push({ icon: <Heart className="w-4 h-4 text-pink-400" />, text: "Ask me anything about skincare, hair care, or beauty 💆‍♀️" });
    }
  }

  return tips.slice(0, 3);
}

const ElaraChatPage = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { data: products = [] } = useProducts();
  const { addToCart } = useApp();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isNewConversation, setIsNewConversation] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isStreamingRef = useRef(false);

  const userName = user?.user_metadata?.full_name || null;

  // Get user's city for region detection
  const { data: defaultAddress } = useQuery({
    queryKey: ["default-address-chat", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("addresses").select("city").eq("user_id", user!.id).order("is_default", { ascending: false }).limit(1).maybeSingle();
      return data;
    },
    enabled: !!user,
  });
  const userCity = defaultAddress?.city || null;
  const isKurdistan = isKurdistanUser(userCity);

  const greeting = useMemo(() => getGreeting(language, userName, isKurdistan), [language, userName, isKurdistan]);
  const contextualTips = useMemo(() => getContextualTips(language, isKurdistan), [language, isKurdistan]);

  const { data: conversations = [] } = useQuery({
    queryKey: ["chat-conversations", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_conversations")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!conversationId || !user || isNewConversation) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data as Msg[]);
    };
    loadMessages();
  }, [conversationId, user, isNewConversation]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: isStreamingRef.current ? "instant" : "smooth" });
    }
  }, [messages, isLoading]);

  const saveMessage = useCallback(async (convId: string, role: string, content: string) => {
    if (!user) return;
    await supabase.from("chat_messages").insert({ conversation_id: convId, role, content });
  }, [user]);

  const ensureConversation = useCallback(async (firstMessage: string): Promise<string> => {
    if (conversationId) return conversationId;
    if (!user) return "";
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
    const { data } = await supabase
      .from("chat_conversations")
      .insert({ user_id: user.id, title })
      .select("id")
      .single();
    if (data) {
      setIsNewConversation(true);
      setConversationId(data.id);
      queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
      queryClient.invalidateQueries({ queryKey: ["chat-count"] });
      return data.id;
    }
    return "";
  }, [conversationId, user, queryClient]);

  const renderAssistantContent = (content: string) => {
    const productRegex = /\[PRODUCT:([^:]+):([^:]+):([^\]]+?):([^\]]+?)\]/g;
    const parts: (string | { id: string; slug: string; title: string; price: string })[] = [];
    let lastIndex = 0;
    let match;

    while ((match = productRegex.exec(content)) !== null) {
      if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index));
      parts.push({ id: match[1], slug: match[2], title: match[3], price: match[4] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) parts.push(content.slice(lastIndex));

    return (
      <div className="break-words overflow-hidden">
        {parts.map((part, i) => {
          if (typeof part === "string") {
            return (
              <div key={i} className="prose prose-sm dark:prose-invert max-w-none text-sm [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all">
                <ReactMarkdown>{part}</ReactMarkdown>
              </div>
            );
          }
          const product = products.find(p => p.id === part.id);
          const image = product?.image || "/placeholder.svg";
          return (
            <div key={i} className="flex items-center gap-3 my-2 p-2.5 rounded-xl bg-secondary/70 border border-border transition-all">
              <Link to={`/product/${part.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-lg bg-card overflow-hidden flex-shrink-0">
                  <img src={image} alt={part.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{part.title}</p>
                  <p className="text-[11px] text-primary font-bold">{part.price}</p>
                </div>
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (product) { addToCart(product); toast.success(`${part.title} added to cart`); }
                  else { toast.error("Product not found"); }
                }}
                className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-95"
              >
                <ShoppingCart className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const streamChat = async (allMessages: Msg[]) => {
    isStreamingRef.current = true;
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: allMessages, user_name: userName, user_gender: user?.user_metadata?.gender || null, user_birthdate: user?.user_metadata?.birthdate || null, user_city: userCity }),
    });

    if (!resp.ok) {
      isStreamingRef.current = false;
      const err = await resp.json().catch(() => ({ error: "Request failed" }));
      throw new Error(err.error || `Error ${resp.status}`);
    }
    if (!resp.body) { isStreamingRef.current = false; throw new Error("No response body"); }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") { streamDone = true; break; }
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantSoFar += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, idx) => (idx === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
              }
              return [...prev, { role: "assistant", content: assistantSoFar }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantSoFar += content;
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, idx) => (idx === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
              }
              return [...prev, { role: "assistant", content: assistantSoFar }];
            });
          }
        } catch { /* ignore */ }
      }
    }

    isStreamingRef.current = false;
    return assistantSoFar;
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    setShowHistory(false);

    try {
      const convId = await ensureConversation(text.trim());
      if (convId) await saveMessage(convId, "user", text.trim());
      const assistantContent = await streamChat(updatedMessages);
      if (convId && assistantContent) {
        await saveMessage(convId, "assistant", assistantContent);
        await supabase.from("chat_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to get response");
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => { setConversationId(null); setMessages([]); setShowHistory(false); setIsNewConversation(false); };
  const loadConversation = (id: string) => { setIsNewConversation(false); setConversationId(id); setShowHistory(false); };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("chat_conversations").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["chat-conversations"] });
    queryClient.invalidateQueries({ queryKey: ["chat-count"] });
    if (conversationId === id) startNewChat();
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background" style={{ height: '100dvh' }}>
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile Header */}
      <header className="flex-shrink-0 z-40 glass-heavy border-b border-border/30 md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/home" className="p-1.5 -ml-1 rounded-xl hover:bg-secondary transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-display font-bold text-foreground">ELARA AI</h1>
                <p className="text-[10px] text-muted-foreground">Your Beauty Bestie 💕</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {user && conversations.length > 0 && (
              <button onClick={() => setShowHistory(!showHistory)} className="p-2 rounded-xl hover:bg-secondary transition-colors">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <button onClick={startNewChat} className="p-2 rounded-xl hover:bg-secondary transition-colors">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border">
              <div className="max-h-60 overflow-y-auto px-4 py-2 space-y-1">
                {conversations.map(conv => (
                  <button key={conv.id} onClick={() => loadConversation(conv.id)} className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${conversationId === conv.id ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{conv.title}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(conv.updated_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={(e) => deleteConversation(conv.id, e)} className="p-1 rounded-lg hover:bg-destructive/10 transition-colors ml-2 flex-shrink-0">
                      <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Desktop layout with sidebar */}
      <div className="flex-1 flex min-h-0 app-container">
        {/* Desktop sidebar */}
        <div className="hidden md:flex flex-col w-72 border-r border-border bg-card/50 flex-shrink-0">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-display font-bold text-foreground">ELARA AI</h2>
                <p className="text-[10px] text-muted-foreground">Your Beauty Bestie 💕</p>
              </div>
            </div>
            <button onClick={startNewChat} className="p-2 rounded-xl hover:bg-secondary transition-colors" title="New chat">
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.map(conv => (
              <button key={conv.id} onClick={() => loadConversation(conv.id)} className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all group ${conversationId === conv.id ? "bg-primary/10 border border-primary/20" : "hover:bg-secondary"}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{conv.title}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(conv.updated_at).toLocaleDateString()}</p>
                </div>
                <button onClick={(e) => deleteConversation(conv.id, e)} className="p-1 rounded-lg hover:bg-destructive/10 transition-colors ml-2 flex-shrink-0 opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Scrollable messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-8 py-4 space-y-4">
            {messages.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center mt-6 md:mt-12">
                {/* Avatar */}
                <motion.div 
                  initial={{ scale: 0.8 }} 
                  animate={{ scale: 1 }} 
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 via-accent/30 to-primary/10 flex items-center justify-center mb-4 border-2 border-primary/20"
                >
                  <Sparkles className="w-10 h-10 text-primary" />
                </motion.div>

                {/* Personalized greeting */}
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.15 }}
                  className="text-2xl font-display font-bold text-foreground mb-1"
                >
                  {greeting.greeting}
                </motion.h2>
                <motion.p 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.25 }}
                  className="text-sm text-muted-foreground mb-5 max-w-[360px]"
                >
                  {greeting.subtitle}
                </motion.p>

                {/* Contextual tips */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.35 }}
                  className="w-full max-w-md space-y-2 mb-5"
                >
                  {contextualTips.map((tip, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-card/80 border border-border/50 text-left rtl:text-right">
                      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-secondary/80 flex items-center justify-center">
                        {tip.icon}
                      </div>
                      <p className="text-xs text-muted-foreground flex-1">{tip.text}</p>
                    </div>
                  ))}
                </motion.div>

                {/* Quick questions */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: 0.45 }}
                  className="w-full max-w-md space-y-2"
                >
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    {language === "ar" ? "جربي تسأليني 👇" : language === "ku" ? "بپرسە لێم 👇" : "Try asking me 👇"}
                  </p>
                  {(quickQuestions[isKurdistan ? "kurdistan" : "iraq"][language] || quickQuestions[isKurdistan ? "kurdistan" : "iraq"].en).map((q, i) => (
                    <motion.button key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.06 }} onClick={() => sendMessage(q)}
                      className="w-full text-left rtl:text-right p-3 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all text-sm text-foreground"
                    >
                      {q}
                    </motion.button>
                  ))}
                </motion.div>
              </motion.div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[88%] md:max-w-[65%] rounded-2xl px-4 py-3 overflow-hidden ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border rounded-bl-md"}`}>
                      {msg.role === "assistant" ? renderAssistantContent(msg.content) : <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                    </div>
                  </motion.div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        <span className="text-xs text-muted-foreground">
                          {language === "ar" ? "أفكر... 💭" : language === "ku" ? "بیر دەکەمەوە... 💭" : "Thinking... 💭"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}
            <div ref={bottomRef} className="h-1" />
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 z-40">
            {/* Mobile input */}
            <div className="md:hidden px-3 pb-2" style={{ paddingBottom: `calc(68px + env(safe-area-inset-bottom, 0px))` }}>
              <form onSubmit={handleSubmit} className="flex items-end gap-2 glass-heavy border border-border/30 rounded-2xl p-2 shadow-float">
                <textarea ref={inputRef} value={input} onChange={handleTextareaChange} onKeyDown={handleKeyDown}
                  placeholder={language === "ar" ? "اسأليني أي شي عن الجمال... 💕" : language === "ku" ? "هەر شتێکم لێ بپرسە... 💕" : "Ask me anything about beauty... 💕"}
                  rows={1}
                  className="flex-1 bg-transparent text-foreground text-sm px-3 py-2 resize-none outline-none placeholder:text-muted-foreground max-h-24"
                  style={{ minHeight: "36px" }}
                />
                <button type="submit" disabled={!input.trim() || isLoading} className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-opacity active:scale-95">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Desktop input */}
            <div className="hidden md:block px-8 pb-6 pt-2 border-t border-border bg-background">
              <form onSubmit={handleSubmit} className="flex items-end gap-3 bg-card border border-border rounded-2xl p-3 shadow-sm max-w-3xl mx-auto">
                <textarea ref={inputRef} value={input} onChange={handleTextareaChange} onKeyDown={handleKeyDown}
                  placeholder={language === "ar" ? "اسأليني أي شي عن الجمال... 💕" : language === "ku" ? "هەر شتێکم لێ بپرسە... 💕" : "Ask me anything about beauty... 💕"}
                  rows={1}
                  className="flex-1 bg-transparent text-foreground text-sm px-3 py-2 resize-none outline-none placeholder:text-muted-foreground max-h-32"
                  style={{ minHeight: "40px" }}
                />
                <button type="submit" disabled={!input.trim() || isLoading} className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-opacity hover:opacity-90">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ElaraChatPage;
