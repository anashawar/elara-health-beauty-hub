import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Send, Sparkles, Loader2, Trash2, ShoppingCart, Plus, MessageCircle, Sun, CloudRain, Heart, Dumbbell, Cloud, Droplets, Calendar, Lightbulb } from "lucide-react";
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
import NativeAppGate from "@/components/NativeAppGate";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elara-chat`;

const KURDISTAN_CITIES = ["Erbil", "Sulaymaniyah", "Duhok"];

function isKurdistanUser(city: string | null): boolean {
  if (!city) return false;
  return KURDISTAN_CITIES.some(k => city.toLowerCase().includes(k.toLowerCase()));
}

// Gender-aware quick questions
const quickQuestions: Record<string, Record<string, Record<string, string[]>>> = {
  iraq: {
    male: {
      en: [
        "Best face wash for oily skin in Baghdad heat?",
        "How to grow a thicker beard?",
        "Hair loss solutions for men?",
        "Best SPF for men's skin?",
      ],
      ar: [
        "شنو أحسن غسول للبشرة الدهنية بحر بغداد؟",
        "شلون أكثف لحيتي؟",
        "شنو أحسن علاج لتساقط الشعر للرجال؟",
        "شنو أحسن واقي شمس للرجال؟",
      ],
      ku: [
        "باشترین شۆری دەموچاو بۆ پێستی چەور چییە؟",
        "چۆن ڕیشم ئەستوورتر بکەم؟",
        "چارەسەری ڕژانی قژ بۆ پیاوان چییە؟",
        "باشترین واقی خۆر بۆ پیاوان چییە؟",
      ],
    },
    female: {
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
  },
  kurdistan: {
    male: {
      en: [
        "Best moisturizer for Kurdistan's cold winters?",
        "How to prevent dry skin in Erbil?",
        "Beard care routine for Kurdish men?",
        "Best cologne for daily wear?",
      ],
      ar: [
        "شنو أحسن مرطب لشتاء كوردستان البارد؟",
        "شلون أمنع جفاف البشرة بأربيل؟",
        "روتين العناية باللحية؟",
        "شنو أحسن عطر للاستخدام اليومي؟",
      ],
      ku: [
        "باشترین شێداری بۆ زستانی ساردی کوردستان چییە؟",
        "چۆن لە وشکبوونی پێست لە هەولێر بپارێزم؟",
        "ڕوتینی چاودێری ڕیش بۆ پیاوانی کورد؟",
        "باشترین عەتر بۆ بەکارهێنانی ڕۆژانە؟",
      ],
    },
    female: {
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
  },
};

function getGreeting(language: string, name: string | null, isKurdistan: boolean, gender: string | null): { greeting: string; subtitle: string } {
  const hour = new Date().getHours();
  const firstName = name?.split(" ")[0] || null;
  const region = isKurdistan ? (language === "ar" ? "أربيل" : language === "ku" ? "هەولێر" : "Erbil") : (language === "ar" ? "بغداد" : language === "ku" ? "بەغدا" : "Baghdad");

  if (language === "ku") {
    const timeGreeting = hour < 12 ? "بەیانیت باش" : hour < 18 ? "ڕۆژت باش" : "ئێوارەت باش";
    return {
      greeting: firstName ? `${timeGreeting}، ${firstName}` : timeGreeting,
      subtitle: `من ئیلارام، فارماسیست و ڕاوێژکاری پێست لە ${region}`,
    };
  }
  if (language === "ar") {
    const timeGreeting = hour < 12 ? "صباح الخير" : hour < 18 ? "مساء الخير" : "مساء النور";
    return {
      greeting: firstName ? `${timeGreeting} ${firstName}` : timeGreeting,
      subtitle: `أنا إيلارا، صيدلانية ومستشارة عناية بالبشرة من ${region}`,
    };
  }
  const timeGreeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return {
    greeting: firstName ? `${timeGreeting}, ${firstName}` : timeGreeting,
    subtitle: `I'm Elara, your pharmacist & skincare consultant from ${region}`,
  };
}

function getContextualTips(language: string, isKurdistan: boolean, gender: string | null): { icon: React.ReactNode; text: string }[] {
  const month = new Date().getMonth();
  const tips: { icon: React.ReactNode; text: string }[] = [];

  // Season-based tips
  const isSummer = month >= 5 && month <= 8;
  const isWinter = month >= 10 || month <= 1;
  const isSpring = month >= 2 && month <= 4;

  if (language === "ar") {
    if (isSummer) tips.push({ icon: <Sun className="w-4 h-4 text-amber-500" />, text: "الجو حار — واقي الشمس SPF 50+ ضروري كل يوم" });
    else if (isWinter) tips.push({ icon: <CloudRain className="w-4 h-4 text-blue-400" />, text: "الجو بارد وجاف — بشرتك تحتاج ترطيب مكثف" });
    else if (isSpring) tips.push({ icon: <Sun className="w-4 h-4 text-amber-500" />, text: "الربيع — وقت مناسب لتجديد روتين العناية بالبشرة" });
    tips.push({ icon: <Lightbulb className="w-4 h-4 text-primary" />, text: "اسألني عن أي منتج أو مشكلة جلدية — أنا هنا للمساعدة" });
  } else if (language === "ku") {
    if (isSummer) tips.push({ icon: <Sun className="w-4 h-4 text-amber-500" />, text: "هەوا گەرمە — واقی خۆر SPF 50+ هەر ڕۆژ پێویستە" });
    else if (isWinter) tips.push({ icon: <CloudRain className="w-4 h-4 text-blue-400" />, text: "هەوا سارد و وشکە — پێستت پێویستی بە شێداری زیاترە" });
    else if (isSpring) tips.push({ icon: <Sun className="w-4 h-4 text-amber-500" />, text: "بەهار — کاتی باشە بۆ نوێکردنەوەی ڕوتینی چاودێری پێست" });
    tips.push({ icon: <Lightbulb className="w-4 h-4 text-primary" />, text: "هەر پرسیارێکت هەیە دەربارەی بەرهەم یان کێشەی پێست بپرسە" });
  } else {
    if (isSummer) tips.push({ icon: <Sun className="w-4 h-4 text-amber-500" />, text: "Hot weather — daily SPF 50+ is essential for skin protection" });
    else if (isWinter) tips.push({ icon: <CloudRain className="w-4 h-4 text-blue-400" />, text: "Cold & dry weather — your skin needs extra hydration" });
    else if (isSpring) tips.push({ icon: <Sun className="w-4 h-4 text-amber-500" />, text: "Spring — great time to refresh your skincare routine" });
    tips.push({ icon: <Lightbulb className="w-4 h-4 text-primary" />, text: "Ask me about any product or skin concern — I'm here to help" });
  }

  return tips.slice(0, 3);
}

function getPlaceholder(language: string, gender: string | null): string {
  const isMale = gender === "male";
  if (language === "ar") return isMale ? "اسألني عن العناية بالبشرة واللحية... 💪" : "اسأليني أي شي عن الجمال... 💕";
  if (language === "ku") return isMale ? "هەر شتێکم لێ بپرسە دەربارەی چاودێری پێست... 💪" : "هەر شتێکم لێ بپرسە... 💕";
  return isMale ? "Ask me about skincare & grooming... 💪" : "Ask me anything about beauty... 💕";
}

function getTryAskingLabel(language: string, gender: string | null): string {
  const isMale = gender === "male";
  if (language === "ar") return isMale ? "جرب تسألني 👇" : "جربي تسأليني 👇";
  if (language === "ku") return "بپرسە لێم 👇";
  return "Try asking me 👇";
}

const ElaraChatPage = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { data: products = [] } = useProducts();
  const { addToCart } = useApp();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isNewConversation, setIsNewConversation] = useState(false);
  const [productContextHandled, setProductContextHandled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isStreamingRef = useRef(false);

  const userFullName = user?.user_metadata?.full_name || null;
  const userName = userFullName ? userFullName.split(" ")[0] : null;

  // Get user's profile for gender + other data
  const { data: userProfile } = useQuery({
    queryKey: ["profile-chat", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("gender, full_name, birthdate").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

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
  const userGender = userProfile?.gender || user?.user_metadata?.gender || null;
  const displayName = userProfile?.full_name ? userProfile.full_name.split(" ")[0] : userName;
  const userBirthdate = userProfile?.birthdate || user?.user_metadata?.birthdate || null;

  const greeting = useMemo(() => getGreeting(language, displayName, isKurdistan, userGender), [language, displayName, isKurdistan, userGender]);
  const contextualTips = useMemo(() => getContextualTips(language, isKurdistan, userGender), [language, isKurdistan, userGender]);
  const placeholder = useMemo(() => getPlaceholder(language, userGender), [language, userGender]);
  const tryAskingLabel = useMemo(() => getTryAskingLabel(language, userGender), [language, userGender]);

  // Fetch daily brief (weather, events, tips)
  const BRIEF_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-brief`;
  const { data: dailyBrief } = useQuery({
    queryKey: ["daily-brief", userCity, language, userGender, isKurdistan],
    queryFn: async () => {
      const resp = await fetch(BRIEF_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ city: userCity, language, gender: userGender, is_kurdistan: isKurdistan }),
      });
      if (!resp.ok) return null;
      return resp.json();
    },
    staleTime: 30 * 60 * 1000, // 30 min
    refetchOnWindowFocus: false,
  });

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

  // Scroll to top on page load (landing view), scroll to bottom only during conversations
  useEffect(() => {
    if (messages.length === 0 && !isLoading) {
      scrollRef.current?.scrollTo({ top: 0 });
      return;
    }
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
    // Match both 4-part [PRODUCT:id:slug:title:price] and 3-part [PRODUCT:id:slug:price] formats
    const productRegex = /\[PRODUCT:([0-9a-f-]{36}):([a-z0-9][a-z0-9-]*[a-z0-9]):([^\]]+?)(?::([^\]]+?))?\]/gi;
    const parts: (string | { id: string; slug: string; title: string; price: string })[] = [];
    let lastIndex = 0;
    let match;

    while ((match = productRegex.exec(content)) !== null) {
      if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index));
      const id = match[1];
      const slug = match[2];
      // If 4 groups matched, group 3=title, group 4=price; if 3 groups, group 3=price, derive title from product data
      const hasTitle = !!match[4];
      const product = products.find(p => p.id === id);
      const title = hasTitle ? match[3] : (product?.title || slug.replace(/-/g, ' '));
      const price = hasTitle ? match[4] : match[3];
      parts.push({ id, slug, title, price });
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
            <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 my-2 p-2.5 rounded-xl bg-secondary/70 border border-border transition-all hover:border-primary/30">
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
            </motion.div>
          );
        })}
      </div>
    );
  };

  const streamChat = async (allMessages: Msg[]) => {
    isStreamingRef.current = true;
    
    // Get the user's session token for authentication
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const accessToken = currentSession?.access_token;
    if (!accessToken) {
      isStreamingRef.current = false;
      throw new Error("Please sign in to use ELARA AI");
    }

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        messages: allMessages,
        user_name: displayName,
        user_gender: userGender,
        user_birthdate: userBirthdate,
        user_city: userCity,
        user_language: language,
      }),
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

  // Auto-start conversation when navigated from a product page
  useEffect(() => {
    if (productContextHandled) return;
    const productName = searchParams.get("product");
    const brandName = searchParams.get("brand");
    if (!productName) return;
    
    setProductContextHandled(true);
    // Clear query params so refresh doesn't re-trigger
    setSearchParams({}, { replace: true });
    
    const brandText = brandName ? ` by ${brandName}` : "";
    const aiGreeting: Msg = {
      role: "assistant",
      content: `Hi! 👋 I see you're looking at **${productName}**${brandText}. I'd love to help!\n\nWhat would you like to know? I can tell you about:\n• **Ingredients** & what they do\n• **How to use it** for best results\n• Whether it's **right for your skin type**\n• How it **compares** to similar products\n\nJust ask away! ✨`
    };
    setMessages([aiGreeting]);
  }, [searchParams, productContextHandled, setSearchParams]);

  const startNewChat = () => { setConversationId(null); setMessages([]); setShowHistory(false); setIsNewConversation(false); setProductContextHandled(false); };
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

  const genderKey = userGender === "male" ? "male" : "female";
  const regionKey = isKurdistan ? "kurdistan" : "iraq";
  const currentQuickQuestions = quickQuestions[regionKey]?.[genderKey]?.[language] || quickQuestions[regionKey]?.[genderKey]?.en || [];

  const headerSubtitle = userGender === "male" 
    ? (language === "ar" ? "خبير العناية بالبشرة 💪" : language === "ku" ? "پسپۆڕی چاودێری پێست 💪" : "Your Grooming Expert 💪")
    : (language === "ar" ? "صديقتك بالجمال 💕" : language === "ku" ? "هاوڕێی جوانکاریت 💕" : "Your Beauty Bestie 💕");

  return (
    <div className="fixed inset-0 flex flex-col bg-background" style={{ height: '100dvh' }}>
      <DesktopHeader onSearchClick={() => setSearchOpen(true)} />
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Mobile Header — compact, native-feeling */}
      <header className="flex-shrink-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border/30 md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-2.5">
            <Link to="/home" className="p-1 -ml-1 rounded-lg active:bg-secondary/80 transition-colors">
              <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
            </Link>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="leading-none">
              <h1 className="text-[13px] font-bold text-foreground">ELARA AI</h1>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{headerSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {user && conversations.length > 0 && (
              <button onClick={() => setShowHistory(!showHistory)} className="p-2 rounded-lg active:bg-secondary/80 transition-colors">
                <MessageCircle className="w-[18px] h-[18px] text-muted-foreground" />
              </button>
            )}
            <button onClick={startNewChat} className="p-2 rounded-lg active:bg-secondary/80 transition-colors">
              <Plus className="w-[18px] h-[18px] text-muted-foreground" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden border-t border-border/30">
              <div className="max-h-52 overflow-y-auto px-3 py-2 space-y-0.5">
                {conversations.map(conv => (
                  <button key={conv.id} onClick={() => loadConversation(conv.id)} className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${conversationId === conv.id ? "bg-primary/10" : "active:bg-secondary/80"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{conv.title}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(conv.updated_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={(e) => deleteConversation(conv.id, e)} className="p-1.5 rounded-lg active:bg-destructive/10 transition-colors ml-2 flex-shrink-0">
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Desktop layout with sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop sidebar */}
        <div className="hidden md:flex flex-col w-72 border-r border-border bg-card/50 flex-shrink-0">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-display font-bold text-foreground">ELARA AI</h2>
                <p className="text-[10px] text-muted-foreground">{headerSubtitle}</p>
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
          <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain scroll-bounce">
            <div className="px-4 md:px-8 py-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center text-center pt-4 md:pt-10 pb-4">
                  {/* Avatar */}
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-primary/20 via-accent/30 to-primary/10 flex items-center justify-center mb-3 border-2 border-primary/20"
                  >
                    <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                  </motion.div>

                  {/* Greeting */}
                  <motion.h2 
                    initial={{ opacity: 0, y: 8 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.1 }}
                    className="text-xl md:text-2xl font-display font-bold text-foreground mb-0.5"
                  >
                    {greeting.greeting}
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0, y: 8 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.2 }}
                    className="text-[13px] text-muted-foreground mb-4 max-w-[320px] leading-relaxed"
                  >
                    {greeting.subtitle}
                  </motion.p>

                  {/* Daily Brief — weather, events, tip */}
                  {dailyBrief && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="w-full max-w-sm space-y-2 mb-4"
                    >
                      {/* Date & Weather card */}
                      {dailyBrief.weather && (
                        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/50 border border-primary/15 p-3.5 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {dailyBrief.date}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{dailyBrief.weather.icon}</span>
                            <div className="flex-1">
                              <p className="text-lg font-bold text-foreground">{dailyBrief.weather.temp}</p>
                              <p className="text-[11px] text-muted-foreground">{dailyBrief.weather.condition} · {dailyBrief.city}</p>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary/60 rounded-lg px-2 py-1">
                              <Droplets className="w-3 h-3" />
                              {dailyBrief.weather.humidity}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Daily skincare tip */}
                      {dailyBrief.tip && (
                        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-card border border-border/40 text-left rtl:text-right">
                          <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                            <Lightbulb className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">{dailyBrief.tip.label}</p>
                            <p className="text-[11px] text-muted-foreground leading-snug">{dailyBrief.tip.text}</p>
                          </div>
                        </div>
                      )}

                      {/* Events */}
                      {dailyBrief.events && dailyBrief.events.items.length > 0 && (
                        <div className="px-3 py-2.5 rounded-xl bg-card border border-border/40 text-left rtl:text-right">
                          <p className="text-[10px] font-bold text-accent-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            {dailyBrief.events.label}
                          </p>
                          <div className="space-y-1">
                            {dailyBrief.events.items.map((event: string, i: number) => (
                              <p key={i} className="text-[11px] text-muted-foreground leading-snug">{event}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Contextual tips — compact cards */}
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.3 }}
                    className="w-full max-w-sm space-y-1.5 mb-4"
                  >
                    {contextualTips.map((tip, i) => (
                      <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card border border-border/40 text-left rtl:text-right">
                        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-secondary/70 flex items-center justify-center">
                          {tip.icon}
                        </div>
                        <p className="text-[11px] text-muted-foreground flex-1 leading-snug">{tip.text}</p>
                      </div>
                    ))}
                  </motion.div>

                  {/* Quick questions — pill-style */}
                  <motion.div 
                    initial={{ opacity: 0, y: 8 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.4 }}
                    className="w-full max-w-sm"
                  >
                    <p className="text-[11px] font-semibold text-muted-foreground/70 mb-2 uppercase tracking-wider">
                      {tryAskingLabel}
                    </p>
                    <div className="space-y-1.5">
                      {currentQuickQuestions.map((q, i) => (
                        <button key={i} onClick={() => sendMessage(q)}
                          className="w-full text-left rtl:text-right px-3.5 py-2.5 rounded-xl bg-card border border-border/50 active:bg-primary/5 active:border-primary/30 transition-colors text-[13px] text-foreground leading-snug"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "assistant" && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center flex-shrink-0 mt-1">
                          <Sparkles className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className={`max-w-[80%] md:max-w-[60%] rounded-2xl px-3.5 py-2.5 overflow-hidden ${
                        msg.role === "user" 
                          ? "bg-primary text-primary-foreground rounded-tr-sm" 
                          : "bg-card border border-border/50 rounded-tl-sm"
                      }`}>
                        {msg.role === "assistant" ? renderAssistantContent(msg.content) : <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>}
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.role === "user" && (
                    <div className="flex gap-2 justify-start">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center flex-shrink-0 mt-1">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                      <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {language === "ar" ? "أفكر..." : language === "ku" ? "بیر دەکەمەوە..." : "Thinking..."}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={bottomRef} className="h-px" />
            </div>
          </div>

          {/* Input Area — fixed at bottom, no BottomNav overlap on mobile */}
          <div className="flex-shrink-0 border-t border-border/30 bg-card/95 backdrop-blur-xl">
            {/* Mobile input */}
            <div className="md:hidden px-3 py-2" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))' }}>
              <form onSubmit={handleSubmit} className="flex items-end gap-2 bg-secondary/50 rounded-2xl px-3 py-1.5">
                <textarea ref={inputRef} value={input} onChange={handleTextareaChange} onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  rows={1}
                  className="flex-1 bg-transparent text-foreground text-[14px] py-2 resize-none outline-none placeholder:text-muted-foreground/60 max-h-24 leading-snug"
                  style={{ minHeight: "36px" }}
                />
                <button type="submit" disabled={!input.trim() || isLoading} className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 transition-all active:scale-90 mb-0.5">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </form>
            </div>

            {/* Desktop input */}
            <div className="hidden md:block px-8 py-4">
              <form onSubmit={handleSubmit} className="flex items-end gap-3 bg-secondary/40 border border-border/50 rounded-2xl px-4 py-2 max-w-3xl mx-auto">
                <textarea ref={inputRef} value={input} onChange={handleTextareaChange} onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  rows={1}
                  className="flex-1 bg-transparent text-foreground text-sm py-2 resize-none outline-none placeholder:text-muted-foreground/60 max-h-32"
                  style={{ minHeight: "40px" }}
                />
                <button type="submit" disabled={!input.trim() || isLoading} className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 transition-opacity hover:opacity-90">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ElaraChatPageWrapper = () => (
  <NativeAppGate featureName="ELARA AI">
    <ElaraChatPage />
  </NativeAppGate>
);

export default ElaraChatPageWrapper;
