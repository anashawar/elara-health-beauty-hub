import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ONESIGNAL_APP_ID = "13744f00-e92d-4e78-84ca-4dffe5a16cea";
const ONESIGNAL_API_URL = "https://api.onesignal.com/notifications";
const MAX_DAILY_NOTIFICATIONS = 4;
const BAGHDAD_OFFSET_MS = 3 * 3600000;

type Lang = "en" | "ar" | "ku";
interface LocalizedText { en: string; ar: string; ku: string; }

interface NotificationPayload {
  title: string; body: string; icon?: string; image_url?: string;
  link_url?: string; user_ids: string[]; sound?: string;
  headings?: Record<string, string>; contents?: Record<string, string>;
}

// ─── HELPER: Baghdad time ────────────────────────────────────────────────
function getBaghdadHour(): number {
  const now = new Date();
  const baghdadMs = now.getTime() + now.getTimezoneOffset() * 60000 + BAGHDAD_OFFSET_MS;
  return new Date(baghdadMs).getHours();
}

function getBaghdadDate(): string {
  const now = new Date();
  const baghdadMs = now.getTime() + now.getTimezoneOffset() * 60000 + BAGHDAD_OFFSET_MS;
  return new Date(baghdadMs).toISOString().slice(0, 10);
}

function isInQuietHours(): boolean {
  const h = getBaghdadHour();
  return h < 9 || h >= 21;
}

// ─── CORE HELPERS ────────────────────────────────────────────────────────

function tl(localized: LocalizedText, lang: Lang): string { return localized[lang] || localized.en; }

function tTemplate(localized: LocalizedText, lang: Lang, params: Record<string, string | number>): string {
  let text = localized[lang] || localized.en;
  for (const [k, v] of Object.entries(params)) text = text.replace(`{{${k}}}`, String(v));
  return text;
}

async function getUserLang(sb: ReturnType<typeof createClient>, userId: string): Promise<Lang> {
  const { data } = await sb.from("profiles").select("language").eq("user_id", userId).single();
  const l = (data as any)?.language;
  return (l === "ar" || l === "ku") ? l : "en";
}

async function getUserLangsMap(sb: ReturnType<typeof createClient>, ids: string[]): Promise<Record<string, Lang>> {
  if (ids.length === 0) return {};
  const m: Record<string, Lang> = {};
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await sb.from("profiles").select("user_id, language").in("user_id", ids.slice(i, i + 100));
    for (const r of (data || [])) { const l = (r as any).language; m[(r as any).user_id] = (l === "ar" || l === "ku") ? l : "en"; }
  }
  return m;
}

// Fetch first names for personalization
interface UserInfo { lang: Lang; name: string; }
async function getUserInfoMap(sb: ReturnType<typeof createClient>, ids: string[]): Promise<Record<string, UserInfo>> {
  if (ids.length === 0) return {};
  const m: Record<string, UserInfo> = {};
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await sb.from("profiles").select("user_id, language, full_name").in("user_id", ids.slice(i, i + 100));
    for (const r of (data || [])) {
      const l = (r as any).language;
      const fullName = (r as any).full_name || "";
      const firstName = fullName.split(" ")[0] || "";
      m[(r as any).user_id] = { lang: (l === "ar" || l === "ku") ? l : "en", name: firstName };
    }
  }
  return m;
}

async function getUserFirstName(sb: ReturnType<typeof createClient>, userId: string): Promise<string> {
  const { data } = await sb.from("profiles").select("full_name").eq("user_id", userId).single();
  const name = (data as any)?.full_name || "";
  return name.split(" ")[0] || "";
}

function groupByLang(ulangs: Record<string, Lang>): Record<Lang, string[]> {
  const g: Record<Lang, string[]> = { en: [], ar: [], ku: [] };
  for (const [uid, l] of Object.entries(ulangs)) g[l].push(uid);
  return g;
}

function groupByLangFromInfo(info: Record<string, UserInfo>): Record<Lang, string[]> {
  const g: Record<Lang, string[]> = { en: [], ar: [], ku: [] };
  for (const [uid, i] of Object.entries(info)) g[i.lang].push(uid);
  return g;
}

// ─── DAILY CAP ENFORCEMENT ──────────────────────────────────────────────
async function getUsersUnderCap(sb: ReturnType<typeof createClient>, userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const today = getBaghdadDate();
  const startOfDay = `${today}T00:00:00+03:00`;

  const { data: counts } = await sb
    .from("notifications")
    .select("user_id")
    .in("user_id", userIds)
    .gte("created_at", startOfDay)
    .not("type", "in", '("order","welcome","feedback")');

  const userCounts: Record<string, number> = {};
  for (const row of (counts || [])) {
    userCounts[row.user_id] = (userCounts[row.user_id] || 0) + 1;
  }

  const eligible = new Set<string>();
  for (const uid of userIds) {
    if ((userCounts[uid] || 0) < MAX_DAILY_NOTIFICATIONS) eligible.add(uid);
  }
  return eligible;
}

// ─── PUSH HELPERS ────────────────────────────────────────────────────────

async function sendPushViaOneSignal(p: NotificationPayload): Promise<{ sent: number }> {
  const key = Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (!key) { console.error("[Push] ONESIGNAL_REST_API_KEY not set!"); return { sent: 0 }; }

  const os: Record<string, unknown> = {
    app_id: ONESIGNAL_APP_ID,
    headings: p.headings || { en: p.title },
    contents: p.contents || { en: p.body },
    data: { link_url: p.link_url || "/home" },
  };
  if (p.image_url) { os.big_picture = p.image_url; os.ios_attachments = { image: p.image_url }; }
  if (p.icon) os.small_icon = p.icon;
  if (p.link_url) os.url = p.link_url;
  if (p.sound) os.ios_sound = p.sound;

  if (p.user_ids.length > 0) {
    os.include_aliases = { external_id: p.user_ids };
    os.target_channel = "push";
  } else {
    os.included_segments = ["Subscribed Users"];
  }

  const payload = JSON.stringify(os);
  console.log(`[Push] Sending to OneSignal: segment=${p.user_ids.length > 0 ? "targeted:" + p.user_ids.length : "Subscribed Users"}, title="${p.title}"`);

  try {
    const res = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${key}` },
      body: payload,
    });
    const result = await res.json();
    console.log(`[Push] OneSignal response: status=${res.status}, recipients=${result.recipients}, id=${result.id}, errors=${JSON.stringify(result.errors || null)}`);
    if (!res.ok) { console.error("[Push] OneSignal API error:", res.status, JSON.stringify(result)); return { sent: 0 }; }
    return { sent: result.recipients || 0 };
  } catch (e) { console.error("[Push] OneSignal fetch error:", e); return { sent: 0 }; }
}

async function sendLocalizedPush(tit: LocalizedText, bod: LocalizedText, ulangs: Record<string, Lang>, opts: { icon?: string; link_url?: string; image_url?: string }) {
  const groups = groupByLang(ulangs);
  for (const lang of ["en", "ar", "ku"] as Lang[]) {
    if (groups[lang].length === 0) continue;
    await sendPushViaOneSignal({ title: tl(tit, lang), body: tl(bod, lang), icon: opts.icon, link_url: opts.link_url, image_url: opts.image_url, user_ids: groups[lang] });
  }
}

async function getAllSubscribedUserIds(sb: ReturnType<typeof createClient>): Promise<string[]> {
  const { data } = await sb.from("push_subscriptions").select("user_id").eq("is_active", true);
  if (!data || data.length === 0) return [];
  return [...new Set(data.map(d => d.user_id))];
}

async function sendBroadcastPush(sb: ReturnType<typeof createClient>, tit: LocalizedText, bod: LocalizedText, opts: { icon?: string; link_url?: string; image_url?: string }) {
  // Get all subscribed user IDs and target via external_id instead of segments
  const userIds = await getAllSubscribedUserIds(sb);
  console.log(`[Push] Broadcast: found ${userIds.length} subscribed users`);
  if (userIds.length === 0) {
    // Fallback to segment-based broadcast
    await sendPushViaOneSignal({
      title: tit.en, body: bod.en,
      headings: { en: tit.en, ar: tit.ar, ku: tit.ku },
      contents: { en: bod.en, ar: bod.ar, ku: bod.ku },
      icon: opts.icon, link_url: opts.link_url, image_url: opts.image_url, user_ids: [],
    });
    return;
  }

  // Get user languages for localized sending
  const ulangs = await getUserLangsMap(sb, userIds);
  const groups = groupByLang(ulangs);
  for (const lang of ["en", "ar", "ku"] as Lang[]) {
    if (groups[lang].length === 0) continue;
    // Send in batches of 2000 (OneSignal limit)
    for (let i = 0; i < groups[lang].length; i += 2000) {
      const batch = groups[lang].slice(i, i + 2000);
      await sendPushViaOneSignal({
        title: tl(tit, lang), body: tl(bod, lang),
        icon: opts.icon, link_url: opts.link_url, image_url: opts.image_url,
        user_ids: batch,
      });
    }
  }
}

// Send personalized per-user pushes (each user gets their own name)
async function sendPersonalizedPush(userInfos: Record<string, UserInfo>, titleFn: (name: string, lang: Lang) => string, bodyFn: (name: string, lang: Lang) => string, opts: { icon?: string; link_url?: string; image_url?: string }) {
  // Group users with same lang and batch send (name is in the in-app notif, push uses a generic friendly version)
  const groups = groupByLangFromInfo(userInfos);
  for (const lang of ["en", "ar", "ku"] as Lang[]) {
    if (groups[lang].length === 0) continue;
    // For push, we can't personalize per-user via OneSignal segments easily, so use a warm generic
    const genericName = lang === "ar" ? "حبيبي" : lang === "ku" ? "خۆشەویست" : "gorgeous";
    await sendPushViaOneSignal({
      title: titleFn(genericName, lang),
      body: bodyFn(genericName, lang),
      icon: opts.icon, link_url: opts.link_url, image_url: opts.image_url,
      user_ids: groups[lang],
    });
  }
}

async function saveNotif(sb: ReturnType<typeof createClient>, userId: string | null, title: string, body: string, type: string, icon: string, linkUrl?: string, imageUrl?: string, metadata?: Record<string, unknown>) {
  await sb.from("notifications").insert({ user_id: userId, title, body, type, icon, link_url: linkUrl || null, image_url: imageUrl || null, metadata: metadata || null });
}

// ─── LOCALIZED STRINGS WITH NAME SUPPORT ─────────────────────────────────

const ORDER_STATUS_TEXTS: Record<string, { title: (n: string) => LocalizedText; body: (n: string) => LocalizedText; icon: string }> = {
  confirmed: {
    title: (n) => ({ en: `Order Confirmed, ${n}! ✅`, ar: `تأكد طلبك يا ${n}! ✅`, ku: `${n}، داواکاریەکەت پشتڕاست کرا! ✅` }),
    body: (n) => ({ en: `${n}, your order is confirmed! We're getting it ready 🎉`, ar: `${n}، طلبك مؤكد! نحضّره لك بكل حب 🎉`, ku: `${n}، داواکاریەکەت پشتڕاست کرا! بۆت ئامادەی دەکەین 🎉` }),
    icon: "📦",
  },
  preparing: {
    title: (n) => ({ en: `Packing your goodies, ${n}! 🎁`, ar: `نجهّز طلبك يا ${n}! 🎁`, ku: `${n}، بەرهەمەکانت ئامادە دەکەین! 🎁` }),
    body: (n) => ({ en: `Hang tight ${n}! Your products are being packed with love ✨`, ar: `استنى شوية ${n}! منتجاتك تنلف بكل حب ✨`, ku: `${n} کەمێک چاوەڕوان بە! بەرهەمەکانت بە خۆشەویستی دەپێچرێنەوە ✨` }),
    icon: "🎁",
  },
  shipped: {
    title: (n) => ({ en: `On the way, ${n}! 🚚`, ar: `في الطريق إليك يا ${n}! 🚚`, ku: `${n}، لە ڕێگایە! 🚚` }),
    body: (n) => ({ en: `${n}, your beauty essentials are heading your way! 💅`, ar: `${n}، منتجاتك الحلوة في طريقها إليك! 💅`, ku: `${n}، بەرهەمە جوانەکانت لە ڕێگان بۆ لات! 💅` }),
    icon: "🚚",
  },
  out_for_delivery: {
    title: (n) => ({ en: `Almost there, ${n}! 📍`, ar: `وصلنا تقريباً يا ${n}! 📍`, ku: `${n}، نزیک بووینەتەوە! 📍` }),
    body: (n) => ({ en: `${n}, your order is super close — keep an eye out! 👀`, ar: `${n}، طلبك قريب جداً — خلّي عينك عليه! 👀`, ku: `${n}، داواکاریەکەت زۆر نزیکە — سەیری بکە! 👀` }),
    icon: "📍",
  },
  delivered: {
    title: (n) => ({ en: `Delivered! Enjoy, ${n} 🎉`, ar: `وصل طلبك يا ${n}! 🎉`, ku: `${n}، گەیشت! خۆشت بێت 🎉` }),
    body: (n) => ({ en: `${n}, your order has arrived — time to unbox and glow! ✨`, ar: `${n}، طلبك وصل — وقت تفتحيه وتتألقي! ✨`, ku: `${n}، داواکاریەکەت گەیشت — کاتی کردنەوە و درەوشانەوەیە! ✨` }),
    icon: "🎉",
  },
  cancelled: {
    title: (n) => ({ en: `Order Cancelled, ${n} ❌`, ar: `تم إلغاء طلبك يا ${n} ❌`, ku: `${n}، داواکاری هەڵوەشێنرایەوە ❌` }),
    body: (n) => ({ en: `${n}, your order was cancelled. Need help? We're here for you!`, ar: `${n}، طلبك تم إلغاؤه. محتاج مساعدة؟ إحنا هنا!`, ku: `${n}، داواکاریەکەت هەڵوەشایەوە. یارمەتیت دەوێت؟ لێرەین!` }),
    icon: "❌",
  },
};

const ABANDONED_CART_TEMPLATES: { title: (n: string) => LocalizedText; body: (n: string) => LocalizedText }[] = [
  {
    title: (n) => ({ en: `${n}, you left something behind! 🛒`, ar: `${n}، نسيتي شي بالسلة! 🛒`, ku: `${n}، شتێکت لە سەبەتەکەت بیرچووە! 🛒` }),
    body: (n) => ({ en: `Your cart misses you ${n} 😢 Come back before your items run out!`, ar: `سلتك مشتاقتلك ${n} 😢 ارجعي قبل ما المنتجات تخلص!`, ku: `سەبەتەکەت بیری لێت دەچێتەوە ${n} 😢 بگەڕێرەوە پێش ئەوەی بەرهەمەکان تەواو بن!` }),
  },
  {
    title: (n) => ({ en: `Psst... ${n}! Your cart is lonely 💔`, ar: `هي ${n}! سلتك وحيدة 💔`, ku: `${n}! سەبەتەکەت تەنیایە 💔` }),
    body: (n) => ({ en: `${n}, those products won't wait forever! Grab them now 🏃‍♀️`, ar: `${n}، المنتجات ما راح تنطرك للأبد! اطلبيها هسة 🏃‍♀️`, ku: `${n}، بەرهەمەکان هەتا هەتایە چاوەڕێت ناکەن! ئێستا بیکڕە 🏃‍♀️` }),
  },
  {
    title: (n) => ({ en: `${n}, your cart is giving you the look 👀`, ar: `${n}، سلتك تطالعك 👀`, ku: `${n}، سەبەتەکەت سەیرت دەکات 👀` }),
    body: (n) => ({ en: `Don't ghost your cart, ${n}! Your picks are still waiting 💅`, ar: `لا تطنشي سلتك يا ${n}! اختياراتك لسه تنتظرك 💅`, ku: `سەبەتەکەت بەجێ مەهێڵە ${n}! هەڵبژاردەکانت هێشتا چاوەڕێن 💅` }),
  },
];

const WELCOME = {
  title: (n: string): LocalizedText => ({ en: `Welcome to ELARA, ${n}! 💜`, ar: `أهلاً بيك في ELARA يا ${n}! 💜`, ku: `بەخێربێیت بۆ ELARA، ${n}! 💜` }),
  body: (n: string): LocalizedText => ({ en: `${n}, your beauty journey starts here! Explore premium products curated just for you ✨`, ar: `${n}، رحلتك الجمالية تبدأ هنا! اكتشفي منتجات مميزة مختارة خصيصاً لك ✨`, ku: `${n}، گەشتی جوانیت لێرەوە دەست پێدەکات! بەرهەمە تایبەتەکان ببینە ✨` }),
};

const FEEDBACK = {
  title: (n: string): LocalizedText => ({ en: `${n}, how was your order? ⭐`, ar: `${n}، شلون كان طلبك؟ ⭐`, ku: `${n}، داواکاریەکەت چۆن بوو؟ ⭐` }),
  body: (n: string): LocalizedText => ({ en: `We'd love your feedback, ${n}! Rate your experience 🙏`, ar: `نحب نسمع رأيك يا ${n}! قيّمي تجربتك 🙏`, ku: `${n}، ئەزموونەکەت هەڵبسەنگێنە 🙏` }),
};

const FREE_DELIVERY = {
  title: (n: string): LocalizedText => ({ en: `${n}, SO close to FREE delivery! 🚚`, ar: `${n}، قريب جداً من التوصيل المجاني! 🚚`, ku: `${n}، زۆر نزیکی گەیاندنی بەخۆڕاییت! 🚚` }),
  bodyTemplate: (n: string): LocalizedText => ({ en: `${n}, add just {{amount}} IQD more for FREE delivery! 🎯`, ar: `${n}، ضيفي بس {{amount}} دينار وتوصيلك مجاني! 🎯`, ku: `${n}، تەنها {{amount}} دینار زیاد بکە و گەیاندنت بەخۆڕایی بێت! 🎯` }),
};

const DAILY_OFFERS = {
  title: { en: "Today's Deals Are 🔥", ar: "عروض اليوم ناااار 🔥", ku: "ئۆفەرەکانی ئەمڕۆ ئاگرن 🔥" } as LocalizedText,
  bodyMultiple: { en: "{{count}} exclusive offers just dropped — don't sleep on these! 💅", ar: "{{count}} عروض حصرية نزلت — لا تطوفك! 💅", ku: "{{count}} ئۆفەری تایبەت دابەزین — لەدەست مەدەن! 💅" } as LocalizedText,
  bodySingle: { en: "{{title}} — Save {{discount}} today only! Shop now 🏃‍♀️", ar: "{{title}} — وفّري {{discount}} اليوم بس! 🏃‍♀️", ku: "{{title}} — {{discount}} ئەمڕۆ داشکاندن! 🏃‍♀️" } as LocalizedText,
};

const REORDER = {
  title: (n: string): LocalizedText => ({ en: `${n}, time to restock? 🔄`, ar: `${n}، وقت تعيدي الطلب؟ 🔄`, ku: `${n}، کاتی نوێکردنەوەیە؟ 🔄` }),
  body: (n: string): LocalizedText => ({ en: `It's been a month, ${n}! Reorder your faves + FREE delivery on 40K+ IQD 💕`, ar: `صار شهر يا ${n}! اطلبي مفضلاتك + توصيل مجاني فوق 40 ألف 💕`, ku: `مانگێکە ${n}! بەرهەمە خۆشەویستەکانت دووبارە داوا بکە + گەیاندنی بەخۆڕایی 💕` }),
};

// ═══════════════════════════════════════════════════════════════════════
// ORDER STATUS (instant — no cap, no quiet hours)
// ═══════════════════════════════════════════════════════════════════════

async function handleOrderStatusChange(sb: ReturnType<typeof createClient>, orderId: string, newStatus: string) {
  const info = ORDER_STATUS_TEXTS[newStatus];
  if (!info) return { handled: false };

  const { data: order } = await sb.from("orders").select("user_id, id, total").eq("id", orderId).single();
  if (!order) return { handled: false };

  const [lang, firstName] = await Promise.all([getUserLang(sb, order.user_id), getUserFirstName(sb, order.user_id)]);
  const name = firstName || (lang === "ar" ? "عزيزي" : lang === "ku" ? "خۆشەویست" : "there");
  const short = orderId.slice(0, 8).toUpperCase();

  await saveNotif(sb, order.user_id, tl(info.title(name), lang), `${tl(info.body(name), lang)} (#${short})`, "order", info.icon, "/orders", undefined, { order_id: orderId, status: newStatus });
  await sendPushViaOneSignal({ title: tl(info.title(name), lang), body: `${tl(info.body(name), lang)} (#${short})`, icon: info.icon, link_url: "/orders", user_ids: [order.user_id] });

  if (newStatus === "delivered") {
    await sb.from("notifications").insert({
      user_id: order.user_id, title: tl(FEEDBACK.title(name), lang), body: `${tl(FEEDBACK.body(name), lang)} (#${short})`,
      type: "feedback", icon: "⭐", link_url: "/orders",
      metadata: { order_id: orderId, scheduled_feedback: true, deliver_after: new Date(Date.now() + 2 * 3600000).toISOString() },
      is_read: true,
    });
  }

  return { handled: true };
}

// ═══════════════════════════════════════════════════════════════════════
// WELCOME (instant — no cap)
// ═══════════════════════════════════════════════════════════════════════

async function handleWelcome(sb: ReturnType<typeof createClient>, userId: string) {
  const { data: ex } = await sb.from("notifications").select("id").eq("user_id", userId).eq("type", "welcome").limit(1);
  if (ex && ex.length > 0) return { sent: false };
  const [lang, firstName] = await Promise.all([getUserLang(sb, userId), getUserFirstName(sb, userId)]);
  const name = firstName || (lang === "ar" ? "عزيزي" : lang === "ku" ? "خۆشەویست" : "gorgeous");
  await saveNotif(sb, userId, tl(WELCOME.title(name), lang), tl(WELCOME.body(name), lang), "welcome", "💜", "/categories");
  await sendPushViaOneSignal({ title: tl(WELCOME.title(name), lang), body: tl(WELCOME.body(name), lang), icon: "💜", link_url: "/categories", user_ids: [userId] });
  return { sent: true };
}

// ═══════════════════════════════════════════════════════════════════════
// FEEDBACK REMINDERS (instant — no cap)
// ═══════════════════════════════════════════════════════════════════════

async function handleFeedbackReminders(sb: ReturnType<typeof createClient>) {
  const twoH = new Date(Date.now() - 2 * 3600000).toISOString();
  const threeD = new Date(Date.now() - 3 * 86400000).toISOString();

  const { data: orders } = await sb.from("orders").select("id, user_id").eq("status", "delivered").lt("updated_at", twoH).gte("updated_at", threeD);
  if (!orders || orders.length === 0) return { sent: 0 };

  const oids = orders.map(o => o.id);
  const { data: rated } = await sb.from("order_ratings").select("order_id").in("order_id", oids);
  const ratedSet = new Set((rated || []).map(r => r.order_id));

  const { data: fbSent } = await sb.from("notifications").select("metadata").eq("type", "feedback").filter("metadata->>feedback_sent", "eq", "true");
  const fbSet = new Set((fbSent || []).map(n => (n.metadata as any)?.order_id).filter(Boolean));

  const toSend = orders.filter(o => !ratedSet.has(o.id) && !fbSet.has(o.id));
  if (toSend.length === 0) return { sent: 0 };

  const uids = [...new Set(toSend.map(o => o.user_id))];
  const userInfos = await getUserInfoMap(sb, uids);

  for (const o of toSend) {
    const info = userInfos[o.user_id] || { lang: "en" as Lang, name: "" };
    const name = info.name || (info.lang === "ar" ? "عزيزي" : info.lang === "ku" ? "خۆشەویست" : "there");
    const short = o.id.slice(0, 8).toUpperCase();
    await saveNotif(sb, o.user_id, tl(FEEDBACK.title(name), info.lang), `${tl(FEEDBACK.body(name), info.lang)} (#${short})`, "feedback", "⭐", "/orders", undefined, { order_id: o.id, feedback_sent: "true" });
  }

  const ulangs: Record<string, Lang> = {};
  for (const [k, v] of Object.entries(userInfos)) ulangs[k] = v.lang;
  await sendLocalizedPush(
    { en: "How was your order? ⭐", ar: "شلون كان طلبك؟ ⭐", ku: "داواکاریەکەت چۆن بوو؟ ⭐" },
    { en: "We'd love your feedback! Rate your experience 🙏", ar: "نحب نسمع رأيك! قيّمي تجربتك 🙏", ku: "ئەزموونەکەت هەڵبسەنگێنە 🙏" },
    ulangs, { icon: "⭐", link_url: "/orders" }
  );
  return { sent: toSend.length };
}

// ═══════════════════════════════════════════════════════════════════════
// SCHEDULED NOTIFICATIONS (respect cap + quiet hours)
// ═══════════════════════════════════════════════════════════════════════

// ── OFFERS REMINDER (broadcast — no name needed)
async function handleOffersReminder(sb: ReturnType<typeof createClient>, slot: string) {
  const today = getBaghdadDate();
  const slotKey = `offers_${slot}_${today}`;

  const { data: existing } = await sb.from("notifications").select("id").eq("type", "daily_offers").filter("metadata->>slot_key", "eq", slotKey).limit(1);
  if (existing && existing.length > 0) return { sent: 0, reason: "already_sent" };

  const { data: offers } = await sb.from("offers").select("id, title, discount_type, discount_value, image_url, link_url").eq("is_active", true).order("sort_order", { ascending: true }).limit(3);
  if (!offers || offers.length === 0) return { sent: 0, reason: "no_offers" };

  const top = offers[0];
  const disc = top.discount_type === "percentage" ? `${top.discount_value}%` : `${top.discount_value.toLocaleString()} IQD`;

  let bodyLoc: LocalizedText;
  if (offers.length > 1) {
    bodyLoc = { en: tTemplate(DAILY_OFFERS.bodyMultiple, "en", { count: offers.length }), ar: tTemplate(DAILY_OFFERS.bodyMultiple, "ar", { count: offers.length }), ku: tTemplate(DAILY_OFFERS.bodyMultiple, "ku", { count: offers.length }) };
  } else {
    bodyLoc = { en: tTemplate(DAILY_OFFERS.bodySingle, "en", { title: top.title, discount: disc }), ar: tTemplate(DAILY_OFFERS.bodySingle, "ar", { title: top.title, discount: disc }), ku: tTemplate(DAILY_OFFERS.bodySingle, "ku", { title: top.title, discount: disc }) };
  }

  const link = top.link_url || "/collection/offers";
  await saveNotif(sb, null, tl(DAILY_OFFERS.title, "en"), bodyLoc.en, "daily_offers", "🎯", link, top.image_url, { date: today, slot_key: slotKey });
  await sendBroadcastPush(sb, DAILY_OFFERS.title, bodyLoc, { icon: "🎯", image_url: top.image_url, link_url: link });

  return { sent: 1, broadcast: true };
}

// ── FREE DELIVERY HINT (targeted, personalized with name)
async function handleFreeDelivery(sb: ReturnType<typeof createClient>) {
  const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();

  const { data: items } = await sb.from("cart_items").select("user_id, quantity, products(price)").gte("updated_at", new Date(Date.now() - 48 * 3600000).toISOString());
  if (!items || items.length === 0) return { sent: 0 };

  const totals: Record<string, number> = {};
  for (const i of items) { totals[i.user_id] = (totals[i.user_id] || 0) + ((i.products as any)?.price || 0) * i.quantity; }

  const near = Object.entries(totals).filter(([, t]) => t >= 25000 && t < 40000);
  if (near.length === 0) return { sent: 0 };

  const uids = near.map(([u]) => u);
  const { data: recent } = await sb.from("notifications").select("user_id").eq("type", "free_delivery_hint").gte("created_at", oneDayAgo).in("user_id", uids);
  const already = new Set((recent || []).map(n => n.user_id));
  const toNotify = near.filter(([u]) => !already.has(u));
  if (toNotify.length === 0) return { sent: 0 };

  const notifyIds = toNotify.map(([u]) => u);
  const eligible = await getUsersUnderCap(sb, notifyIds);
  const filtered = toNotify.filter(([u]) => eligible.has(u));
  if (filtered.length === 0) return { sent: 0 };

  const userInfos = await getUserInfoMap(sb, filtered.map(([u]) => u));

  for (const [uid, total] of filtered) {
    const info = userInfos[uid] || { lang: "en" as Lang, name: "" };
    const name = info.name || (info.lang === "ar" ? "حبيبي" : info.lang === "ku" ? "خۆشەویست" : "gorgeous");
    const rem = (40000 - total).toLocaleString();
    const bodyLoc = FREE_DELIVERY.bodyTemplate(name);
    await saveNotif(sb, uid, tl(FREE_DELIVERY.title(name), info.lang), tTemplate(bodyLoc, info.lang, { amount: rem }), "free_delivery_hint", "🚚", "/cart");
  }

  const ulangs: Record<string, Lang> = {};
  for (const [k, v] of Object.entries(userInfos)) ulangs[k] = v.lang;
  await sendLocalizedPush(
    { en: "SO close to FREE delivery! 🚚", ar: "قريب جداً من التوصيل المجاني! 🚚", ku: "زۆر نزیکی گەیاندنی بەخۆڕاییت! 🚚" },
    { en: "Add a little more for free delivery! 🎯", ar: "ضيفي شوية وتوصيلك مجاني! 🎯", ku: "کەمێک زیاد بکە و گەیاندنت بەخۆڕایی بێت! 🎯" },
    ulangs, { icon: "🚚", link_url: "/cart" }
  );

  return { sent: filtered.length };
}

// ── AI SEARCH RECOMMENDATIONS (targeted, cap-aware, name-personalized)
async function handleAIRecommendations(sb: ReturnType<typeof createClient>) {
  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) return { sent: 0 };

  const { data: carts } = await sb.from("cart_items").select("user_id, products(title, slug, brands(name))").gte("updated_at", new Date(Date.now() - 48 * 3600000).toISOString());
  if (!carts || carts.length === 0) return { sent: 0 };

  const userProds: Record<string, { titles: string[]; slugs: string[]; brands: string[] }> = {};
  for (const c of carts) {
    const u = c.user_id; const p = c.products as any;
    if (!userProds[u]) userProds[u] = { titles: [], slugs: [], brands: [] };
    if (p?.title) userProds[u].titles.push(p.title);
    if (p?.slug) userProds[u].slugs.push(p.slug);
    if (p?.brands?.name) userProds[u].brands.push(p.brands.name);
  }

  const twelveHAgo = new Date(Date.now() - 12 * 3600000).toISOString();
  const { data: recentAI } = await sb.from("notifications").select("user_id").eq("type", "ai_recommendation").gte("created_at", twelveHAgo);
  const recentSet = new Set((recentAI || []).map(n => n.user_id));

  const candidates = Object.keys(userProds).filter(u => !recentSet.has(u));
  if (candidates.length === 0) return { sent: 0 };

  const eligible = await getUsersUnderCap(sb, candidates);
  const toProcess = candidates.filter(u => eligible.has(u)).slice(0, 15);
  if (toProcess.length === 0) return { sent: 0 };

  const userInfos = await getUserInfoMap(sb, toProcess);

  const langInstr: Record<Lang, string> = {
    en: "Write in English. Call user by their first name. Be warm, witty, sometimes funny — like a best friend who's also a beauty expert.",
    ar: "Write in Iraqi Arabic (عراقي). Call user by their first name. Be warm, catchy, sometimes funny. Use يلا, هيا, يا [name].",
    ku: "Write in Kurdish Sorani. Call user by their first name. Be warm, friendly, catchy with natural Kurdish expressions.",
  };

  let sent = 0;
  for (const uid of toProcess) {
    const info = userInfos[uid] || { lang: "en" as Lang, name: "" };
    const name = info.name || (info.lang === "ar" ? "حبيبي" : info.lang === "ku" ? "خۆشەویست" : "gorgeous");
    const prods = userProds[uid];
    const titles = [...new Set(prods.titles)].slice(0, 3).join(", ");
    const brands = [...new Set(prods.brands)].slice(0, 3).join(", ");

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: `You're ELARA's notification writer. ${langInstr[info.lang]} The user's name is "${name}". Include their name naturally in title or body. Title max 40 chars, body max 100 chars. Make it memorable, catchy, sometimes cheeky or funny — something they'd screenshot and share.` },
            { role: "user", content: `User "${name}" is interested in: ${titles}. Brands: ${brands || "various"}. Write a personalized push notification in ${info.lang === "ar" ? "Iraqi Arabic" : info.lang === "ku" ? "Kurdish Sorani" : "English"}.` },
          ],
          tools: [{ type: "function", function: { name: "notif", description: "Create notification", parameters: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title", "body"], additionalProperties: false } } }],
          tool_choice: { type: "function", function: { name: "notif" } },
        }),
      });
      if (!res.ok) continue;
      const d = await res.json();
      const tc = d.choices?.[0]?.message?.tool_calls?.[0];
      let n = { title: `${name}, still thinking? ✨`, body: `Your favorites are waiting at ELARA, ${name}!` };
      if (tc?.function?.arguments) try { n = JSON.parse(tc.function.arguments); } catch {}

      await saveNotif(sb, uid, n.title, n.body, "ai_recommendation", "✨", `/product/${prods.slugs[0]}`);
      await sendPushViaOneSignal({ title: n.title, body: n.body, icon: "✨", link_url: `/product/${prods.slugs[0]}`, user_ids: [uid] });
      sent++;
      await new Promise(r => setTimeout(r, 500));
    } catch (e) { console.warn("AI rec error:", uid, e); }
  }
  return { sent };
}

// ── GOOD MORNING GREETING (broadcast — first daily notification at 9:30 AM)
async function handleGoodMorning(sb: ReturnType<typeof createClient>) {
  const today = getBaghdadDate();
  const slotKey = `good_morning_${today}`;

  const { data: ex } = await sb.from("notifications").select("id").eq("type", "good_morning").filter("metadata->>slot_key", "eq", slotKey).limit(1);
  if (ex && ex.length > 0) return { sent: 0, reason: "already_sent" };

  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) return { sent: 0, reason: "no_key" };

  const month = new Date().toLocaleString("en", { month: "long" });
  const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: `You're ELARA's best friend. Write a warm, uplifting good morning greeting + a quick beauty/health tip for ${dayName}. Be like that bestie who texts you every morning with good vibes. Consider ${month} weather in Iraq. Write in 3 languages (English, Iraqi Arabic عراقي, Kurdish Sorani). Title max 35 chars (include a morning emoji ☀️🌸🌞), body max 110 chars. Make it feel personal and warm.` },
          { role: "user", content: `Good morning greeting for ${dayName}, ${month}. Include a small beauty/wellness tip. Make it the kind of message that makes someone smile when they wake up.` },
        ],
        tools: [{ type: "function", function: { name: "morning", description: "Morning greeting in 3 languages", parameters: { type: "object", properties: { title_en: { type: "string" }, body_en: { type: "string" }, title_ar: { type: "string" }, body_ar: { type: "string" }, title_ku: { type: "string" }, body_ku: { type: "string" } }, required: ["title_en", "body_en", "title_ar", "body_ar", "title_ku", "body_ku"], additionalProperties: false } } }],
        tool_choice: { type: "function", function: { name: "morning" } },
      }),
    });
    if (!res.ok) return { sent: 0, reason: "ai_error" };

    const d = await res.json();
    const tc = d.choices?.[0]?.message?.tool_calls?.[0];
    let gm = { title_en: "Good Morning, gorgeous! ☀️", body_en: "Start your day with a splash of cold water — your skin will thank you! 🌸", title_ar: "صباح الخير يا حلوة! ☀️", body_ar: "ابدي يومك بغسل وجهك بماي بارد — بشرتك راح تشكرك! 🌸", title_ku: "بەیانیت باش، جوانەکەم! ☀️", body_ku: "ڕۆژەکەت بە ئاوی ساردەوە دەست پێ بکە — چەرمەکەت سوپاست دەکات! 🌸" };
    if (tc?.function?.arguments) try { gm = JSON.parse(tc.function.arguments); } catch {}

    const tit: LocalizedText = { en: gm.title_en, ar: gm.title_ar, ku: gm.title_ku };
    const bod: LocalizedText = { en: gm.body_en, ar: gm.body_ar, ku: gm.body_ku };

    await saveNotif(sb, null, tit.en, bod.en, "good_morning", "☀️", "/home", undefined, { date: today, slot_key: slotKey });
    await sendBroadcastPush(sb, tit, bod, { icon: "☀️", link_url: "/home" });
    return { sent: 1, broadcast: true };
  } catch (e) { console.warn("Good morning error:", e); return { sent: 0 }; }
}

// ── AI SKINCARE TIP (broadcast)
async function handleSkincareTip(sb: ReturnType<typeof createClient>, slot: string) {
  const today = getBaghdadDate();
  const slotKey = `skincare_${slot}_${today}`;

  const { data: ex } = await sb.from("notifications").select("id").eq("type", "skincare_tip").filter("metadata->>slot_key", "eq", slotKey).limit(1);
  if (ex && ex.length > 0) return { sent: 0, reason: "already_sent" };

  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) return { sent: 0, reason: "no_key" };

  const month = new Date().toLocaleString("en", { month: "long" });
  const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: `You're ELARA's skincare expert in Iraq. Write a push notification skincare tip in 3 languages. Consider ${month} weather in Iraq/Kurdistan. Be scientific but fun — like that one friend who's a dermatologist but also hilarious. Sometimes use humor, surprising facts, or playful tone. Title max 35 chars, body max 110 chars each.` },
          { role: "user", content: `Skincare tip for ${dayName}, ${month}. Slot: ${slot}. Make it catchy, memorable, and shareable!` },
        ],
        tools: [{ type: "function", function: { name: "tip", description: "Skincare tip in 3 languages", parameters: { type: "object", properties: { title_en: { type: "string" }, body_en: { type: "string" }, title_ar: { type: "string" }, body_ar: { type: "string" }, title_ku: { type: "string" }, body_ku: { type: "string" } }, required: ["title_en", "body_en", "title_ar", "body_ar", "title_ku", "body_ku"], additionalProperties: false } } }],
        tool_choice: { type: "function", function: { name: "tip" } },
      }),
    });
    if (!res.ok) return { sent: 0, reason: "ai_error" };

    const d = await res.json();
    const tc = d.choices?.[0]?.message?.tool_calls?.[0];
    let tip = { title_en: "Skincare Tip 🌿", body_en: "Hydrate and SPF daily!", title_ar: "نصيحة للبشرة 🌿", body_ar: "اشربي ماي واستخدمي واقي شمس!", title_ku: "ئامۆژگاری چەرم 🌿", body_ku: "ئاو بخۆرەوە و کرێمی خۆرپارێز بەکاربهێنە!" };
    if (tc?.function?.arguments) try { tip = JSON.parse(tc.function.arguments); } catch {}

    const tit: LocalizedText = { en: tip.title_en, ar: tip.title_ar, ku: tip.title_ku };
    const bod: LocalizedText = { en: tip.body_en, ar: tip.body_ar, ku: tip.body_ku };

    await saveNotif(sb, null, tit.en, bod.en, "skincare_tip", "🌿", "/categories", undefined, { date: today, slot_key: slotKey });
    await sendBroadcastPush(sb, tit, bod, { icon: "🌿", link_url: "/categories" });
    return { sent: 1, broadcast: true };
  } catch (e) { console.warn("Skincare tip error:", e); return { sent: 0 }; }
}

// ── DAILY DOSE FROM ELARA
async function handleDailyDose(sb: ReturnType<typeof createClient>, slot: string) {
  const today = getBaghdadDate();
  const slotKey = `daily_dose_${slot}_${today}`;

  const { data: ex } = await sb.from("notifications").select("id").eq("type", "daily_dose").filter("metadata->>slot_key", "eq", slotKey).limit(1);
  if (ex && ex.length > 0) return { sent: 0, reason: "already_sent" };

  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) return { sent: 0, reason: "no_key" };

  const month = new Date().toLocaleString("en", { month: "long" });

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: `You're ELARA's wellness expert. Write a "Daily Dose from ELARA" — a viral-worthy health/beauty tip. Make it TikTok-level catchy: surprising, funny, mind-blowing, or "wait WHAT?!" moments. Must be accurate. Write in 3 languages (English, Iraqi Arabic عراقي, Kurdish Sorani). Title max 35 chars, body max 110 chars. Be that friend who drops random beauty gems at brunch.` },
          { role: "user", content: `Daily dose for ${month}, slot: ${slot}. Make it the kind of tip people text their friends about!` },
        ],
        tools: [{ type: "function", function: { name: "dose", description: "Daily dose in 3 languages", parameters: { type: "object", properties: { title_en: { type: "string" }, body_en: { type: "string" }, title_ar: { type: "string" }, body_ar: { type: "string" }, title_ku: { type: "string" }, body_ku: { type: "string" } }, required: ["title_en", "body_en", "title_ar", "body_ar", "title_ku", "body_ku"], additionalProperties: false } } }],
        tool_choice: { type: "function", function: { name: "dose" } },
      }),
    });
    if (!res.ok) return { sent: 0 };

    const d = await res.json();
    const tc = d.choices?.[0]?.message?.tool_calls?.[0];
    let dose = { title_en: "Daily Dose 💊", body_en: "Your daily beauty wisdom!", title_ar: "جرعتك اليومية 💊", body_ar: "حكمة جمالك اليومية!", title_ku: "دۆزی ڕۆژانە 💊", body_ku: "زانیاریی جوانیت بۆ ئەمڕۆ!" };
    if (tc?.function?.arguments) try { dose = JSON.parse(tc.function.arguments); } catch {}

    const tit: LocalizedText = { en: dose.title_en, ar: dose.title_ar, ku: dose.title_ku };
    const bod: LocalizedText = { en: dose.body_en, ar: dose.body_ar, ku: dose.body_ku };

    await saveNotif(sb, null, tit.en, bod.en, "daily_dose", "💊", "/home", undefined, { date: today, slot_key: slotKey });
    await sendBroadcastPush(sb, tit, bod, { icon: "💊", link_url: "/home" });
    return { sent: 1, broadcast: true };
  } catch (e) { console.warn("Daily dose error:", e); return { sent: 0 }; }
}

// ── DID YOU KNOW?
async function handleDidYouKnow(sb: ReturnType<typeof createClient>) {
  const today = getBaghdadDate();
  const slotKey = `dyk_${today}`;

  const { data: ex } = await sb.from("notifications").select("id").eq("type", "did_you_know").filter("metadata->>slot_key", "eq", slotKey).limit(1);
  if (ex && ex.length > 0) return { sent: 0, reason: "already_sent" };

  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) return { sent: 0, reason: "no_key" };

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: `You're ELARA's science communicator. Write a "Did You Know?" about a fascinating beauty/skincare research finding. Must be scientifically accurate and mind-blowing. Make people go "NO WAY!" Write in 3 languages (English, Iraqi Arabic عراقي, Kurdish Sorani). Title should start with "Did you know?" or equivalent. Title max 35 chars, body max 120 chars. Be entertaining and educational.` },
          { role: "user", content: `Write today's "Did you know?" fact. Something most people don't know — the kind of fact you'd share at dinner.` },
        ],
        tools: [{ type: "function", function: { name: "dyk", description: "Did you know fact in 3 languages", parameters: { type: "object", properties: { title_en: { type: "string" }, body_en: { type: "string" }, title_ar: { type: "string" }, body_ar: { type: "string" }, title_ku: { type: "string" }, body_ku: { type: "string" } }, required: ["title_en", "body_en", "title_ar", "body_ar", "title_ku", "body_ku"], additionalProperties: false } } }],
        tool_choice: { type: "function", function: { name: "dyk" } },
      }),
    });
    if (!res.ok) return { sent: 0 };

    const d = await res.json();
    const tc = d.choices?.[0]?.message?.tool_calls?.[0];
    let dyk = { title_en: "Did You Know? 🧬", body_en: "Your skin renews every 28 days!", title_ar: "هل تعلمين؟ 🧬", body_ar: "بشرتك تتجدد كل 28 يوم!", title_ku: "ئایا دەزانیت؟ 🧬", body_ku: "چەرمەکەت هەموو 28 ڕۆژێک نوێ دەبێتەوە!" };
    if (tc?.function?.arguments) try { dyk = JSON.parse(tc.function.arguments); } catch {}

    const tit: LocalizedText = { en: dyk.title_en, ar: dyk.title_ar, ku: dyk.title_ku };
    const bod: LocalizedText = { en: dyk.body_en, ar: dyk.body_ar, ku: dyk.body_ku };

    await saveNotif(sb, null, tit.en, bod.en, "did_you_know", "🧬", "/home", undefined, { date: today, slot_key: slotKey });
    await sendBroadcastPush(sb, tit, bod, { icon: "🧬", link_url: "/home" });
    return { sent: 1, broadcast: true };
  } catch (e) { console.warn("DYK error:", e); return { sent: 0 }; }
}

// ── ABANDONED CART (targeted, cap-aware, name-personalized, rotating templates)
async function handleAbandonedCarts(sb: ReturnType<typeof createClient>) {
  const threeH = new Date(Date.now() - 3 * 3600000).toISOString();
  const oneD = new Date(Date.now() - 24 * 3600000).toISOString();

  const { data: carts } = await sb.from("cart_items").select("user_id").lt("updated_at", threeH).gte("updated_at", oneD);
  if (!carts || carts.length === 0) return { sent: 0 };

  const uids = [...new Set(carts.map(c => c.user_id))];
  const { data: recent } = await sb.from("notifications").select("user_id").eq("type", "abandoned_cart").gte("created_at", oneD).in("user_id", uids);
  const already = new Set((recent || []).map(n => n.user_id));
  let toNotify = uids.filter(u => !already.has(u));
  if (toNotify.length === 0) return { sent: 0 };

  const eligible = await getUsersUnderCap(sb, toNotify);
  toNotify = toNotify.filter(u => eligible.has(u));
  if (toNotify.length === 0) return { sent: 0 };

  const userInfos = await getUserInfoMap(sb, toNotify);
  const templateIdx = Math.floor(Date.now() / 86400000) % ABANDONED_CART_TEMPLATES.length;
  const template = ABANDONED_CART_TEMPLATES[templateIdx];

  for (const uid of toNotify) {
    const info = userInfos[uid] || { lang: "en" as Lang, name: "" };
    const name = info.name || (info.lang === "ar" ? "حبيبي" : info.lang === "ku" ? "خۆشەویست" : "gorgeous");
    await saveNotif(sb, uid, tl(template.title(name), info.lang), tl(template.body(name), info.lang), "abandoned_cart", "🛒", "/cart");
  }

  const ulangs: Record<string, Lang> = {};
  for (const [k, v] of Object.entries(userInfos)) ulangs[k] = v.lang;
  await sendLocalizedPush(
    template.title(""),
    template.body(""),
    ulangs, { icon: "🛒", link_url: "/cart" }
  );
  return { sent: toNotify.length };
}

// ── PRICE DROPS (targeted, cap-aware)
async function handlePriceDrops(sb: ReturnType<typeof createClient>) {
  const oneH = new Date(Date.now() - 3600000).toISOString();
  const { data: prods } = await sb.from("products").select("id, title, price, original_price, slug").not("original_price", "is", null).gte("updated_at", oneH);
  if (!prods || prods.length === 0) return { sent: 0 };

  let sent = 0;
  for (const p of prods) {
    if (!p.original_price || p.price >= p.original_price) continue;
    const disc = Math.round(((p.original_price - p.price) / p.original_price) * 100);
    if (disc < 10) continue;

    const { data: ex } = await sb.from("notifications").select("id").eq("type", "price_drop").filter("metadata->>product_id", "eq", p.id).gte("created_at", new Date(Date.now() - 24 * 3600000).toISOString()).limit(1);
    if (ex && ex.length > 0) continue;

    const { data: wu } = await sb.from("cart_items").select("user_id").eq("product_id", p.id);
    if (!wu || wu.length === 0) continue;

    const uids = [...new Set(wu.map(w => w.user_id))];
    const eligible = await getUsersUnderCap(sb, uids);
    const filtered = uids.filter(u => eligible.has(u));
    if (filtered.length === 0) continue;

    const userInfos = await getUserInfoMap(sb, filtered);

    for (const uid of filtered) {
      const info = userInfos[uid] || { lang: "en" as Lang, name: "" };
      const name = info.name || "";
      const namePrefix = name ? `${name}, ` : "";
      const tit: LocalizedText = { en: `${namePrefix}Price Drop! ${disc}% OFF 💰`, ar: `${namePrefix}انخفض السعر! ${disc}% خصم 💰`, ku: `${namePrefix}نرخ کەمبووەتەوە! ${disc}% 💰` };
      const bod: LocalizedText = { en: `${p.title} is now ${p.price.toLocaleString()} IQD — grab it! 🏃‍♀️`, ar: `${p.title} صار ${p.price.toLocaleString()} دينار — لا تفوتك! 🏃‍♀️`, ku: `${p.title} ئێستا ${p.price.toLocaleString()} دینارە — لەدەست مەدە! 🏃‍♀️` };
      await saveNotif(sb, uid, tl(tit, info.lang), tl(bod, info.lang), "price_drop", "💰", `/product/${p.slug}`, undefined, { product_id: p.id });
    }

    const ulangs: Record<string, Lang> = {};
    for (const [k, v] of Object.entries(userInfos)) ulangs[k] = v.lang;
    const tit: LocalizedText = { en: `Price Drop! ${disc}% OFF 💰`, ar: `انخفض السعر! ${disc}% خصم 💰`, ku: `نرخ کەمبووەتەوە! ${disc}% 💰` };
    const bod: LocalizedText = { en: `${p.title} is now ${p.price.toLocaleString()} IQD 🏃‍♀️`, ar: `${p.title} صار ${p.price.toLocaleString()} دينار 🏃‍♀️`, ku: `${p.title} ئێستا ${p.price.toLocaleString()} دینارە 🏃‍♀️` };
    await sendLocalizedPush(tit, bod, ulangs, { icon: "💰", link_url: `/product/${p.slug}` });
    sent += filtered.length;
  }
  return { sent };
}

// ── REORDER REMINDER (targeted, name-personalized)
async function handleReorder(sb: ReturnType<typeof createClient>) {
  const d30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const d25 = new Date(Date.now() - 25 * 86400000).toISOString();

  const { data: orders } = await sb.from("orders").select("user_id").eq("status", "delivered").lte("created_at", d25).gte("created_at", d30);
  if (!orders || orders.length === 0) return { sent: 0 };

  const uids = [...new Set(orders.map(o => o.user_id))];
  const { data: recent } = await sb.from("notifications").select("user_id").eq("type", "reorder_reminder").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).in("user_id", uids);
  const already = new Set((recent || []).map(n => n.user_id));
  let toNotify = uids.filter(u => !already.has(u));
  if (toNotify.length === 0) return { sent: 0 };

  const eligible = await getUsersUnderCap(sb, toNotify);
  toNotify = toNotify.filter(u => eligible.has(u));
  if (toNotify.length === 0) return { sent: 0 };

  const userInfos = await getUserInfoMap(sb, toNotify);
  for (const uid of toNotify) {
    const info = userInfos[uid] || { lang: "en" as Lang, name: "" };
    const name = info.name || (info.lang === "ar" ? "حبيبي" : info.lang === "ku" ? "خۆشەویست" : "gorgeous");
    await saveNotif(sb, uid, tl(REORDER.title(name), info.lang), tl(REORDER.body(name), info.lang), "reorder_reminder", "🔄", "/orders");
  }

  const ulangs: Record<string, Lang> = {};
  for (const [k, v] of Object.entries(userInfos)) ulangs[k] = v.lang;
  await sendLocalizedPush(
    { en: "Time to restock? 🔄", ar: "وقت تعيدي الطلب؟ 🔄", ku: "کاتی نوێکردنەوەیە؟ 🔄" },
    { en: "Reorder your faves + FREE delivery on 40K+ IQD 💕", ar: "اطلبي مفضلاتك + توصيل مجاني فوق 40 ألف 💕", ku: "بەرهەمە خۆشەویستەکانت دووبارە داوا بکە 💕" },
    ulangs, { icon: "🔄", link_url: "/orders" }
  );
  return { sent: toNotify.length };
}

// ── NEW OFFER BROADCAST (instant)
async function handleNewOffers(sb: ReturnType<typeof createClient>) {
  const thirtyMin = new Date(Date.now() - 30 * 60000).toISOString();
  const { data: offers } = await sb.from("offers").select("*").eq("is_active", true).gte("created_at", thirtyMin);
  if (!offers || offers.length === 0) return { sent: 0 };

  let total = 0;
  for (const o of offers) {
    const { data: ex } = await sb.from("notifications").select("id").eq("type", "offer").filter("metadata->>offer_id", "eq", o.id).limit(1);
    if (ex && ex.length > 0) continue;

    const disc = o.discount_type === "percentage" ? `${o.discount_value}%` : `${o.discount_value} IQD`;
    const tit: LocalizedText = { en: `${disc} OFF — ${o.title} 🔥`, ar: `خصم ${disc} — ${o.title} 🔥`, ku: `${disc} داشکاندن — ${o.title} 🔥` };
    const bod: LocalizedText = { en: `Don't miss this deal! ${disc} off 🛍️`, ar: `لا تفوتي هالعرض! ${disc} خصم 🛍️`, ku: `ئەم ئۆفەرە لەدەست مەدە! ${disc} داشکاندن 🛍️` };

    await saveNotif(sb, null, tit.en, bod.en, "offer", "🔥", o.link_url || "/collection/offers", o.image_url, { offer_id: o.id });
    await sendBroadcastPush(sb, tit, bod, { icon: "🔥", image_url: o.image_url, link_url: o.link_url || "/collection/offers" });
    total++;
  }
  return { sent: total };
}

// ── "ORDER NOW, RECEIVE IN 24 HOURS" CTA (broadcast — 4:00 PM)
async function handleOrderNowCta(sb: ReturnType<typeof createClient>) {
  const today = getBaghdadDate();
  const slotKey = `order_cta_${today}`;

  const { data: ex } = await sb.from("notifications").select("id").eq("type", "order_cta").filter("metadata->>slot_key", "eq", slotKey).limit(1);
  if (ex && ex.length > 0) return { sent: 0, reason: "already_sent" };

  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) return { sent: 0, reason: "no_key" };

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: `You're ELARA's marketing expert. Write a push notification encouraging users to order NOW with the promise of fast delivery (within 24 hours). Make it urgent, exciting, and irresistible. Use FOMO, limited time vibes, or "treat yourself" energy. Write in 3 languages (English, Iraqi Arabic عراقي, Kurdish Sorani). Title max 35 chars (include delivery emoji 🚚📦), body max 110 chars. Be catchy and action-oriented.` },
          { role: "user", content: `Write an "order now, receive within 24 hours" push notification. Make it feel like they're missing out if they don't order RIGHT NOW.` },
        ],
        tools: [{ type: "function", function: { name: "cta", description: "Order CTA in 3 languages", parameters: { type: "object", properties: { title_en: { type: "string" }, body_en: { type: "string" }, title_ar: { type: "string" }, body_ar: { type: "string" }, title_ku: { type: "string" }, body_ku: { type: "string" } }, required: ["title_en", "body_en", "title_ar", "body_ar", "title_ku", "body_ku"], additionalProperties: false } } }],
        tool_choice: { type: "function", function: { name: "cta" } },
      }),
    });
    if (!res.ok) return { sent: 0, reason: "ai_error" };

    const d = await res.json();
    const tc = d.choices?.[0]?.message?.tool_calls?.[0];
    let cta = { title_en: "Order Now, Get It Tomorrow! 🚚", body_en: "Place your order now and receive it within 24 hours! Free delivery on 40K+ IQD ✨", title_ar: "اطلبي هسة ويوصلك بكرة! 🚚", body_ar: "اطلبي هسة ويوصلك خلال 24 ساعة! توصيل مجاني فوق 40 ألف ✨", title_ku: "ئێستا داوا بکە، بەیانی دەگاتە! 🚚", body_ku: "ئێستا داوا بکە و لە 24 کاتژمێردا دەتگاتە! گەیاندنی بەخۆڕایی لەسەر 40 هەزار+ ✨" };
    if (tc?.function?.arguments) try { cta = JSON.parse(tc.function.arguments); } catch {}

    const tit: LocalizedText = { en: cta.title_en, ar: cta.title_ar, ku: cta.title_ku };
    const bod: LocalizedText = { en: cta.body_en, ar: cta.body_ar, ku: cta.body_ku };

    await saveNotif(sb, null, tit.en, bod.en, "order_cta", "🚚", "/home", undefined, { date: today, slot_key: slotKey });
    await sendBroadcastPush(sb, tit, bod, { icon: "🚚", link_url: "/home" });
    return { sent: 1, broadcast: true };
  } catch (e) { console.warn("Order CTA error:", e); return { sent: 0 }; }
}

// ── EVENING ATTRACTIVE TIP (broadcast — 8:00 PM)
async function handleEveningTip(sb: ReturnType<typeof createClient>) {
  const today = getBaghdadDate();
  const slotKey = `evening_tip_${today}`;

  const { data: ex } = await sb.from("notifications").select("id").eq("type", "evening_tip").filter("metadata->>slot_key", "eq", slotKey).limit(1);
  if (ex && ex.length > 0) return { sent: 0, reason: "already_sent" };

  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) return { sent: 0, reason: "no_key" };

  const month = new Date().toLocaleString("en", { month: "long" });

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: `You're ELARA's beauty bestie. Write an attractive evening beauty/wellness tip or fun beauty fact for ${month}. Make it the kind of message that makes someone smile before bed. Topics: night skincare routine tips, beauty sleep hacks, relaxing self-care ideas, interesting beauty facts, ingredient spotlights, or wellness tips. Be warm, engaging, sometimes surprising. Write in 3 languages (English, Iraqi Arabic عراقي, Kurdish Sorani). Title max 35 chars (include a night/beauty emoji 🌙✨💫💆‍♀️), body max 110 chars.` },
          { role: "user", content: `Write an attractive evening beauty tip or fun fact for tonight. Make it memorable and worth reading!` },
        ],
        tools: [{ type: "function", function: { name: "tip", description: "Evening tip in 3 languages", parameters: { type: "object", properties: { title_en: { type: "string" }, body_en: { type: "string" }, title_ar: { type: "string" }, body_ar: { type: "string" }, title_ku: { type: "string" }, body_ku: { type: "string" } }, required: ["title_en", "body_en", "title_ar", "body_ar", "title_ku", "body_ku"], additionalProperties: false } } }],
        tool_choice: { type: "function", function: { name: "tip" } },
      }),
    });
    if (!res.ok) return { sent: 0, reason: "ai_error" };

    const d = await res.json();
    const tc = d.choices?.[0]?.message?.tool_calls?.[0];
    let tip = { title_en: "Tonight's Beauty Secret 🌙", body_en: "Apply your night cream on slightly damp skin — it locks in 2x more moisture! Sweet dreams ✨", title_ar: "سر جمالك الليلة 🌙", body_ar: "حطي كريم الليل على بشرة رطبة شوية — يرطب ضعفين! أحلام سعيدة ✨", title_ku: "نهێنی جوانیت ئەمشەو 🌙", body_ku: "کرێمی شەوانەت لەسەر چەرمی کەمێک شێ دابنێ — دوو قات زیاتر شێ دەکات! خەونی خۆش ✨" };
    if (tc?.function?.arguments) try { tip = JSON.parse(tc.function.arguments); } catch {}

    const tit: LocalizedText = { en: tip.title_en, ar: tip.title_ar, ku: tip.title_ku };
    const bod: LocalizedText = { en: tip.body_en, ar: tip.body_ar, ku: tip.body_ku };

    await saveNotif(sb, null, tit.en, bod.en, "evening_tip", "🌙", "/home", undefined, { date: today, slot_key: slotKey });
    await sendBroadcastPush(tit, bod, { icon: "🌙", link_url: "/home" });
    return { sent: 1, broadcast: true };
  } catch (e) { console.warn("Evening tip error:", e); return { sent: 0 }; }
}

// ═══════════════════════════════════════════════════════════════════════
// SCHEDULED SLOTS
// ═══════════════════════════════════════════════════════════════════════

// ── SLOT 1: 9:30 AM Baghdad — Good morning + skincare tip
async function runSlotMorning(sb: ReturnType<typeof createClient>) {
  const [morning, skincare] = await Promise.all([
    handleGoodMorning(sb),
    handleSkincareTip(sb, "morning"),
  ]);
  return { good_morning: morning, skincare_tip: skincare };
}

// ── SLOT 2: 1:00 PM Baghdad — Offers + abandoned carts + free delivery
async function runSlotAfternoon(sb: ReturnType<typeof createClient>) {
  const [offers, freeDelivery, abandoned, dose] = await Promise.all([
    handleOffersReminder(sb, "afternoon"),
    handleFreeDelivery(sb),
    handleAbandonedCarts(sb),
    handleDailyDose(sb, "afternoon"),
  ]);
  return { offers_reminder: offers, free_delivery: freeDelivery, abandoned_carts: abandoned, daily_dose: dose };
}

// ── SLOT 3: 4:00 PM Baghdad — "Order now, receive in 24 hours" CTA
async function runSlotEvening1(sb: ReturnType<typeof createClient>) {
  const [orderCta, abandoned, freeDelivery] = await Promise.all([
    handleOrderNowCta(sb),
    handleAbandonedCarts(sb),
    handleFreeDelivery(sb),
  ]);
  return { order_now_cta: orderCta, abandoned_carts: abandoned, free_delivery: freeDelivery };
}

// ── SLOT 4: 8:00 PM Baghdad — Attractive beauty/wellness tip
async function runSlotEvening2(sb: ReturnType<typeof createClient>) {
  const [eveningTip, offers, feedback, reorder] = await Promise.all([
    handleEveningTip(sb),
    handleOffersReminder(sb, "evening"),
    handleFeedbackReminders(sb),
    handleReorder(sb),
  ]);
  return { evening_tip: eveningTip, offers_reminder: offers, feedback: feedback, reorder: reorder };
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      console.error("[auto-notifications] Failed to parse request body");
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { action, ...params } = body;
    console.log(`[auto-notifications] Action: ${action}, Baghdad hour: ${getBaghdadHour()}, date: ${getBaghdadDate()}`);
    let result: Record<string, unknown> = {};

    if (["slot_morning", "slot_afternoon", "slot_evening1", "slot_evening2"].includes(action as string) && isInQuietHours()) {
      console.log(`[auto-notifications] Skipping ${action} — quiet hours (Baghdad hour: ${getBaghdadHour()})`);
      return new Response(JSON.stringify({ ok: true, skipped: "quiet_hours", baghdad_hour: getBaghdadHour() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (action) {
      case "order_status_change": result = await handleOrderStatusChange(sb, params.order_id, params.new_status); break;
      case "welcome": result = await handleWelcome(sb, params.user_id); break;
      case "slot_morning": result = await runSlotMorning(sb); break;
      case "slot_afternoon": result = await runSlotAfternoon(sb); break;
      case "slot_evening1": result = await runSlotEvening1(sb); break;
      case "slot_evening2": result = await runSlotEvening2(sb); break;
      case "offers_reminder": result = await handleOffersReminder(sb, params.slot || "manual"); break;
      case "free_delivery": result = await handleFreeDelivery(sb); break;
      case "ai_recommendations": result = await handleAIRecommendations(sb); break;
      case "skincare_tip": result = await handleSkincareTip(sb, params.slot || "manual"); break;
      case "daily_dose": result = await handleDailyDose(sb, params.slot || "manual"); break;
      case "did_you_know": result = await handleDidYouKnow(sb); break;
      case "abandoned_carts": result = await handleAbandonedCarts(sb); break;
      case "price_drops": result = await handlePriceDrops(sb); break;
      case "feedback_reminders": result = await handleFeedbackReminders(sb); break;
      case "reorder_reminder": result = await handleReorder(sb); break;
      case "new_offers": result = await handleNewOffers(sb); break;
      case "run_continuous":
        const [aband, newOff, prices] = await Promise.all([
          handleAbandonedCarts(sb),
          handleNewOffers(sb),
          handlePriceDrops(sb),
        ]);
        result = { abandoned_carts: aband, new_offers: newOff, price_drops: prices };
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    console.log(`[auto-notifications] Completed action=${action}, result=${JSON.stringify(result)}`);
    return new Response(JSON.stringify({ ok: true, baghdad_hour: getBaghdadHour(), ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-notifications error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
