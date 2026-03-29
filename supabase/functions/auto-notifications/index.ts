import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ONESIGNAL_APP_ID = "13744f00-e92d-4e78-84ca-4dffe5a16cea";
const ONESIGNAL_API_URL = "https://api.onesignal.com/notifications";
const MAX_DAILY_NOTIFICATIONS = 4;
// Baghdad = UTC+3
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
  return h < 9 || h >= 21; // before 9:30 AM or after 8:30 PM (approximate with full hours)
}

// ─── LOCALIZED STRINGS ───────────────────────────────────────────────────

const ORDER_STATUS_TEXTS: Record<string, { title: LocalizedText; body: LocalizedText; icon: string }> = {
  confirmed: {
    title: { en: "Order Confirmed ✅", ar: "تم تأكيد طلبك ✅", ku: "داواکاریەکەت پشتڕاست کرایەوە ✅" },
    body: { en: "Your order is confirmed! We're getting it ready for you 🎉", ar: "طلبك مؤكد! نحضّره لك بكل حب 🎉", ku: "داواکاریەکەت پشتڕاست کرا! بۆت ئامادەی دەکەین 🎉" },
    icon: "📦",
  },
  preparing: {
    title: { en: "Packing Your Goodies 🎁", ar: "نجهّز منتجاتك بعناية 🎁", ku: "بەرهەمەکانت بە وریایی ئامادە دەکەین 🎁" },
    body: { en: "Hang tight! Your products are being packed with care ✨", ar: "استنى شوية! منتجاتك تنلف بكل حب ✨", ku: "کەمێک چاوەڕوان بە! بەرهەمەکانت بە خۆشەویستی دەپێچرێنەوە ✨" },
    icon: "🎁",
  },
  shipped: {
    title: { en: "Your Order is on the Way! 🚚", ar: "طلبك في الطريق إليك! 🚚", ku: "داواکاریەکەت لە ڕێگایە! 🚚" },
    body: { en: "Exciting — your beauty essentials are heading your way!", ar: "يا سلام — منتجاتك الحلوة في طريقها إليك!", ku: "بەرهەمە جوانەکانت لە ڕێگان بۆ لات!" },
    icon: "🚚",
  },
  out_for_delivery: {
    title: { en: "Almost There! 📍", ar: "وصلنا تقريباً! 📍", ku: "نزیک بووینەتەوە! 📍" },
    body: { en: "Your order is super close — keep an eye out! 👀", ar: "طلبك قريب جداً — خلّي عينك عليه! 👀", ku: "داواکاریەکەت زۆر نزیکە — سەیری بکە! 👀" },
    icon: "📍",
  },
  delivered: {
    title: { en: "Delivered! Enjoy 🎉", ar: "وصل طلبك! استمتعي 🎉", ku: "گەیشت! خۆشت بێت 🎉" },
    body: { en: "Your order has arrived — time to unbox and glow! ✨", ar: "طلبك وصل — وقت تفتحيه وتتألقي! ✨", ku: "داواکاریەکەت گەیشت — کاتی کردنەوە و درەوشانەوەیە! ✨" },
    icon: "🎉",
  },
  cancelled: {
    title: { en: "Order Cancelled ❌", ar: "تم إلغاء الطلب ❌", ku: "داواکاری هەڵوەشێنرایەوە ❌" },
    body: { en: "Your order was cancelled. Need help? We're here for you!", ar: "طلبك تم إلغاؤه. محتاج مساعدة؟ إحنا هنا!", ku: "داواکاریەکەت هەڵوەشایەوە. یارمەتیت دەوێت؟ لێرەین!" },
    icon: "❌",
  },
};

const ABANDONED_CART = {
  title: { en: "Psst... You forgot something! 🛒", ar: "هي... نسيتي شي بالسلة! 🛒", ku: "هەی... شتێکت لە سەبەتەکەت بیرچووە! 🛒" } as LocalizedText,
  body: { en: "Your cart misses you 😢 Come back before your items run out!", ar: "سلتك مشتاقتلك 😢 ارجعي قبل ما المنتجات تخلص!", ku: "سەبەتەکەت بیری لێت دەچێتەوە 😢 بگەڕێرەوە پێش ئەوەی بەرهەمەکان تەواو بن!" } as LocalizedText,
};

const WELCOME = {
  title: { en: "Welcome to ELARA! 💜", ar: "أهلاً بيك في ELARA! 💜", ku: "بەخێربێیت بۆ ELARA! 💜" } as LocalizedText,
  body: { en: "Your beauty journey starts here! Explore premium products curated just for you ✨", ar: "رحلتك الجمالية تبدأ هنا! اكتشفي منتجات مميزة مختارة خصيصاً لك ✨", ku: "گەشتی جوانیت لێرەوە دەست پێدەکات! بەرهەمە تایبەتەکان ببینە کە تایبەت بۆ تۆ هەڵبژێردراون ✨" } as LocalizedText,
};

const FEEDBACK = {
  title: { en: "How was your order? ⭐", ar: "شلون كان طلبك؟ ⭐", ku: "داواکاریەکەت چۆن بوو؟ ⭐" } as LocalizedText,
  body: { en: "We'd love to hear from you! Rate your experience — it takes just a second 🙏", ar: "نحب نسمع رأيك! قيّمي تجربتك — بس ثانية وحدة 🙏", ku: "دەمانەوێت بیستینت! ئەزموونەکەت هەڵبسەنگێنە — تەنها چرکەیەک دەخایەنێت 🙏" } as LocalizedText,
};

const FREE_DELIVERY = {
  title: { en: "SO close to FREE delivery! 🚚", ar: "قريب جداً من التوصيل المجاني! 🚚", ku: "زۆر نزیکی گەیاندنی بەخۆڕاییت! 🚚" } as LocalizedText,
  bodyTemplate: { en: "Add just {{amount}} IQD more and get FREE delivery! You're almost there 🎯", ar: "ضيفي بس {{amount}} دينار وتوصيلك مجاني! قربتي تحققيها 🎯", ku: "تەنها {{amount}} دینار زیاد بکە و گەیاندنت بەخۆڕایی بێت! نزیکیت 🎯" } as LocalizedText,
};

const DAILY_OFFERS = {
  title: { en: "Today's Deals Are 🔥", ar: "عروض اليوم ناااار 🔥", ku: "ئۆفەرەکانی ئەمڕۆ ئاگرن 🔥" } as LocalizedText,
  bodyMultiple: { en: "{{count}} exclusive offers just dropped — don't sleep on these! 💅", ar: "{{count}} عروض حصرية نزلت — لا تطوفك! 💅", ku: "{{count}} ئۆفەری تایبەت دابەزین — لەدەست مەدەن! 💅" } as LocalizedText,
  bodySingle: { en: "{{title}} — Save {{discount}} today only! Shop now 🏃‍♀️", ar: "{{title}} — وفّري {{discount}} اليوم بس! اشتري هسة 🏃‍♀️", ku: "{{title}} — {{discount}} ئەمڕۆ پاشەکەوت بخە! ئێستا بیکڕە 🏃‍♀️" } as LocalizedText,
};

const REORDER = {
  title: { en: "Time to restock? 🔄", ar: "وقت تعيدي الطلب؟ 🔄", ku: "کاتی نوێکردنەوەیە؟ 🔄" } as LocalizedText,
  body: { en: "It's been a month! Reorder your favorites + FREE delivery on orders over 40K IQD 💕", ar: "صار شهر! اطلبي منتجاتك المفضلة + توصيل مجاني للطلبات فوق 40 ألف دينار 💕", ku: "مانگێکە! بەرهەمە خۆشەویستەکانت دووبارە داوا بکە + گەیاندنی بەخۆڕایی بۆ داواکاری سەرووی 40 هەزار دینار 💕" } as LocalizedText,
};

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

function groupByLang(ulangs: Record<string, Lang>): Record<Lang, string[]> {
  const g: Record<Lang, string[]> = { en: [], ar: [], ku: [] };
  for (const [uid, l] of Object.entries(ulangs)) g[l].push(uid);
  return g;
}

// ─── DAILY CAP ENFORCEMENT ──────────────────────────────────────────────
async function getUsersUnderCap(sb: ReturnType<typeof createClient>, userIds: string[]): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const today = getBaghdadDate();
  const startOfDay = `${today}T00:00:00+03:00`;

  // Count today's notifications per user
  const { data: counts } = await sb
    .from("notifications")
    .select("user_id")
    .in("user_id", userIds)
    .gte("created_at", startOfDay)
    .not("type", "in", '("order","welcome","feedback")'); // Order/welcome/feedback don't count toward cap

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
  if (!key) return { sent: 0 };

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

  try {
    const res = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Key ${key}` },
      body: JSON.stringify(os),
    });
    const result = await res.json();
    if (!res.ok) { console.error("OneSignal error:", JSON.stringify(result)); return { sent: 0 }; }
    return { sent: result.recipients || 0 };
  } catch (e) { console.error("OneSignal fetch error:", e); return { sent: 0 }; }
}

async function sendLocalizedPush(tit: LocalizedText, bod: LocalizedText, ulangs: Record<string, Lang>, opts: { icon?: string; link_url?: string; image_url?: string }) {
  const groups = groupByLang(ulangs);
  for (const lang of ["en", "ar", "ku"] as Lang[]) {
    if (groups[lang].length === 0) continue;
    await sendPushViaOneSignal({ title: tl(tit, lang), body: tl(bod, lang), icon: opts.icon, link_url: opts.link_url, image_url: opts.image_url, user_ids: groups[lang] });
  }
}

async function sendBroadcastPush(tit: LocalizedText, bod: LocalizedText, opts: { icon?: string; link_url?: string; image_url?: string }) {
  await sendPushViaOneSignal({
    title: tit.en, body: bod.en,
    headings: { en: tit.en, ar: tit.ar, ku: tit.ku },
    contents: { en: bod.en, ar: bod.ar, ku: bod.ku },
    icon: opts.icon, link_url: opts.link_url, image_url: opts.image_url, user_ids: [],
  });
}

async function saveNotif(sb: ReturnType<typeof createClient>, userId: string | null, title: string, body: string, type: string, icon: string, linkUrl?: string, imageUrl?: string, metadata?: Record<string, unknown>) {
  await sb.from("notifications").insert({ user_id: userId, title, body, type, icon, link_url: linkUrl || null, image_url: imageUrl || null, metadata: metadata || null });
}

// ═══════════════════════════════════════════════════════════════════════
// ORDER STATUS (instant — no cap, no quiet hours)
// ═══════════════════════════════════════════════════════════════════════

async function handleOrderStatusChange(sb: ReturnType<typeof createClient>, orderId: string, newStatus: string) {
  const info = ORDER_STATUS_TEXTS[newStatus];
  if (!info) return { handled: false };

  const { data: order } = await sb.from("orders").select("user_id, id, total").eq("id", orderId).single();
  if (!order) return { handled: false };

  const lang = await getUserLang(sb, order.user_id);
  const short = orderId.slice(0, 8).toUpperCase();

  await saveNotif(sb, order.user_id, tl(info.title, lang), `${tl(info.body, lang)} (#${short})`, "order", info.icon, "/orders", undefined, { order_id: orderId, status: newStatus });
  await sendPushViaOneSignal({ title: tl(info.title, lang), body: `${tl(info.body, lang)} (#${short})`, icon: info.icon, link_url: "/orders", user_ids: [order.user_id] });

  if (newStatus === "delivered") {
    await sb.from("notifications").insert({
      user_id: order.user_id, title: tl(FEEDBACK.title, lang), body: `${tl(FEEDBACK.body, lang)} (#${short})`,
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
  const lang = await getUserLang(sb, userId);
  await saveNotif(sb, userId, tl(WELCOME.title, lang), tl(WELCOME.body, lang), "welcome", "💜", "/categories");
  await sendPushViaOneSignal({ title: tl(WELCOME.title, lang), body: tl(WELCOME.body, lang), icon: "💜", link_url: "/categories", user_ids: [userId] });
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
  const ulangs = await getUserLangsMap(sb, uids);

  for (const o of toSend) {
    const lang = ulangs[o.user_id] || "en";
    const short = o.id.slice(0, 8).toUpperCase();
    await saveNotif(sb, o.user_id, tl(FEEDBACK.title, lang), `${tl(FEEDBACK.body, lang)} (#${short})`, "feedback", "⭐", "/orders", undefined, { order_id: o.id, feedback_sent: "true" });
  }
  await sendLocalizedPush(FEEDBACK.title, FEEDBACK.body, ulangs, { icon: "⭐", link_url: "/orders" });
  return { sent: toSend.length };
}

// ═══════════════════════════════════════════════════════════════════════
// SCHEDULED NOTIFICATIONS (respect cap + quiet hours)
// ═══════════════════════════════════════════════════════════════════════

// ── OFFERS REMINDER (2 PM & 9 PM Baghdad = slot "afternoon" & "evening2")
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
  await sendBroadcastPush(DAILY_OFFERS.title, bodyLoc, { icon: "🎯", image_url: top.image_url, link_url: link });

  return { sent: 1, broadcast: true };
}

// ── FREE DELIVERY HINT (once per day, targeted)
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

  const ulangs = await getUserLangsMap(sb, filtered.map(([u]) => u));

  for (const [uid, total] of filtered) {
    const lang = ulangs[uid] || "en";
    const rem = (40000 - total).toLocaleString();
    await saveNotif(sb, uid, tl(FREE_DELIVERY.title, lang), tTemplate(FREE_DELIVERY.bodyTemplate, lang, { amount: rem }), "free_delivery_hint", "🚚", "/cart");
  }

  await sendLocalizedPush(FREE_DELIVERY.title, { en: "You're SO close to free delivery — add a little more! 🎯", ar: "قريب جداً من التوصيل المجاني — ضيفي شوية! 🎯", ku: "زۆر نزیکی گەیاندنی بەخۆڕاییت — کەمێک زیاد بکە! 🎯" }, ulangs, { icon: "🚚", link_url: "/cart" });

  return { sent: filtered.length };
}

// ── AI SEARCH RECOMMENDATIONS (targeted, cap-aware)
async function handleAIRecommendations(sb: ReturnType<typeof createClient>) {
  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) return { sent: 0 };

  const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
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

  // Check recent AI notifications (12h gap between AI recs)
  const twelveHAgo = new Date(Date.now() - 12 * 3600000).toISOString();
  const { data: recentAI } = await sb.from("notifications").select("user_id").eq("type", "ai_recommendation").gte("created_at", twelveHAgo);
  const recentSet = new Set((recentAI || []).map(n => n.user_id));

  const candidates = Object.keys(userProds).filter(u => !recentSet.has(u));
  if (candidates.length === 0) return { sent: 0 };

  const eligible = await getUsersUnderCap(sb, candidates);
  const toProcess = candidates.filter(u => eligible.has(u)).slice(0, 15);
  if (toProcess.length === 0) return { sent: 0 };

  const ulangs = await getUserLangsMap(sb, toProcess);

  const langInstr: Record<Lang, string> = {
    en: "Write in English. Friendly, warm, slightly playful.",
    ar: "Write in Iraqi Arabic (عراقي). Warm, funny sometimes. Use يا حلوة, يلا, هيا.",
    ku: "Write in Kurdish Sorani. Warm and friendly with natural expressions.",
  };

  let sent = 0;
  for (const uid of toProcess) {
    const lang = ulangs[uid] || "en";
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
            { role: "system", content: `You're ELARA's notification writer for a beauty app in Iraq. ${langInstr[lang]} Title max 40 chars, body max 100 chars. Be professional but warm — like a cool friend who knows beauty.` },
            { role: "user", content: `User interested in: ${titles}. Brands: ${brands || "various"}. Write in ${lang === "ar" ? "Iraqi Arabic" : lang === "ku" ? "Kurdish Sorani" : "English"}.` },
          ],
          tools: [{ type: "function", function: { name: "notif", description: "Create notification", parameters: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title", "body"], additionalProperties: false } } }],
          tool_choice: { type: "function", function: { name: "notif" } },
        }),
      });
      if (!res.ok) continue;
      const d = await res.json();
      const tc = d.choices?.[0]?.message?.tool_calls?.[0];
      let n = { title: "Still thinking? ✨", body: "Your favorites are waiting at ELARA!" };
      if (tc?.function?.arguments) try { n = JSON.parse(tc.function.arguments); } catch {}

      await saveNotif(sb, uid, n.title, n.body, "ai_recommendation", "✨", `/product/${prods.slugs[0]}`);
      await sendPushViaOneSignal({ title: n.title, body: n.body, icon: "✨", link_url: `/product/${prods.slugs[0]}`, user_ids: [uid] });
      sent++;
      await new Promise(r => setTimeout(r, 500));
    } catch (e) { console.warn("AI rec error:", uid, e); }
  }
  return { sent };
}

// ── AI SKINCARE TIP
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
          { role: "system", content: `You're ELARA's skincare expert in Iraq. Write a quick, useful skincare tip as a push notification in 3 languages. Consider ${month} weather in Iraq. Be scientific but accessible. Friendly and warm, sometimes witty. Title max 35 chars, body max 110 chars each.` },
          { role: "user", content: `Skincare tip for ${dayName}, ${month}. Slot: ${slot}. Make it unique and practical.` },
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
    await sendBroadcastPush(tit, bod, { icon: "🌿", link_url: "/categories" });
    return { sent: 1, broadcast: true };
  } catch (e) { console.warn("Skincare tip error:", e); return { sent: 0 }; }
}

// ── DAILY DOSE FROM ELARA (health/skin viral tips)
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
          { role: "system", content: `You're ELARA's wellness expert. Write a "Daily Dose from ELARA" — a viral-worthy health/beauty tip. Can be funny, surprising, or mind-blowing. Think TikTok-worthy facts. Must be accurate. Write in 3 languages (English, Iraqi Arabic, Kurdish Sorani). Title max 35 chars, body max 110 chars. Be warm, sometimes humorous.` },
          { role: "user", content: `Daily dose for ${month}, slot: ${slot}. Make it shareable and interesting!` },
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
    await sendBroadcastPush(tit, bod, { icon: "💊", link_url: "/home" });
    return { sent: 1, broadcast: true };
  } catch (e) { console.warn("Daily dose error:", e); return { sent: 0 }; }
}

// ── DID YOU KNOW? (beauty research facts)
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
          { role: "system", content: `You're ELARA's science communicator. Write a "Did You Know?" notification about a fascinating, recent beauty/skincare research finding. Must be scientifically accurate and cite a real concept. Make it mind-blowing and attractive. Write in 3 languages (English, Iraqi Arabic, Kurdish Sorani). Title should start with "Did you know?" or equivalent. Title max 35 chars, body max 120 chars.` },
          { role: "user", content: `Write today's "Did you know?" fact. Make it something most people don't know about skincare/beauty science.` },
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
    await sendBroadcastPush(tit, bod, { icon: "🧬", link_url: "/home" });
    return { sent: 1, broadcast: true };
  } catch (e) { console.warn("DYK error:", e); return { sent: 0 }; }
}

// ── ABANDONED CART (targeted, cap-aware)
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

  const ulangs = await getUserLangsMap(sb, toNotify);
  for (const uid of toNotify) {
    const lang = ulangs[uid] || "en";
    await saveNotif(sb, uid, tl(ABANDONED_CART.title, lang), tl(ABANDONED_CART.body, lang), "abandoned_cart", "🛒", "/cart");
  }
  await sendLocalizedPush(ABANDONED_CART.title, ABANDONED_CART.body, ulangs, { icon: "🛒", link_url: "/cart" });
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

    const ulangs = await getUserLangsMap(sb, filtered);
    const tit: LocalizedText = { en: `Price Drop! ${disc}% OFF 💰`, ar: `انخفض السعر! ${disc}% خصم 💰`, ku: `نرخ کەمبووەتەوە! ${disc}% داشکاندن 💰` };
    const bod: LocalizedText = { en: `${p.title} is now ${p.price.toLocaleString()} IQD 🏃‍♀️`, ar: `${p.title} صار ${p.price.toLocaleString()} دينار 🏃‍♀️`, ku: `${p.title} ئێستا ${p.price.toLocaleString()} دینارە 🏃‍♀️` };

    for (const uid of filtered) {
      const lang = ulangs[uid] || "en";
      await saveNotif(sb, uid, tl(tit, lang), tl(bod, lang), "price_drop", "💰", `/product/${p.slug}`, undefined, { product_id: p.id });
    }
    await sendLocalizedPush(tit, bod, ulangs, { icon: "💰", link_url: `/product/${p.slug}` });
    sent += filtered.length;
  }
  return { sent };
}

// ── REORDER REMINDER
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

  const ulangs = await getUserLangsMap(sb, toNotify);
  for (const uid of toNotify) {
    const lang = ulangs[uid] || "en";
    await saveNotif(sb, uid, tl(REORDER.title, lang), tl(REORDER.body, lang), "reorder_reminder", "🔄", "/orders");
  }
  await sendLocalizedPush(REORDER.title, REORDER.body, ulangs, { icon: "🔄", link_url: "/orders" });
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
    await sendBroadcastPush(tit, bod, { icon: "🔥", image_url: o.image_url, link_url: o.link_url || "/collection/offers" });
    total++;
  }
  return { sent: total };
}

// ═══════════════════════════════════════════════════════════════════════
// SCHEDULED SLOTS
// ═══════════════════════════════════════════════════════════════════════

/*
  SLOT SCHEDULE (Baghdad Time):
  ┌─────────────┬───────────────────────────────────────────────┐
  │ 10:00 AM    │ Skincare Tip + Daily Dose                     │
  │ 2:00 PM     │ Offers Reminder + Free Delivery (targeted)    │
  │ 5:00 PM     │ AI Recommendation + Did You Know?             │
  │ 8:00 PM     │ Offers Reminder + Skincare Tip                │
  ├─────────────┼───────────────────────────────────────────────┤
  │ Continuous   │ Abandoned carts, price drops, new offers      │
  │ Once/day     │ Reorder reminder, feedback                    │
  └─────────────┴───────────────────────────────────────────────┘
  Max 4 targeted per user/day. Broadcasts don't count individually.
*/

async function runSlotMorning(sb: ReturnType<typeof createClient>) {
  const [skincare, dose] = await Promise.all([
    handleSkincareTip(sb, "morning"),
    handleDailyDose(sb, "morning"),
  ]);
  return { skincare_tip: skincare, daily_dose: dose };
}

async function runSlotAfternoon(sb: ReturnType<typeof createClient>) {
  const [offers, freeDelivery, abandoned] = await Promise.all([
    handleOffersReminder(sb, "afternoon"),
    handleFreeDelivery(sb),
    handleAbandonedCarts(sb),
  ]);
  return { offers_reminder: offers, free_delivery: freeDelivery, abandoned_carts: abandoned };
}

async function runSlotEvening1(sb: ReturnType<typeof createClient>) {
  const [aiRec, dyk, dose] = await Promise.all([
    handleAIRecommendations(sb),
    handleDidYouKnow(sb),
    handleDailyDose(sb, "evening"),
  ]);
  return { ai_recommendations: aiRec, did_you_know: dyk, daily_dose: dose };
}

async function runSlotEvening2(sb: ReturnType<typeof createClient>) {
  const [offers, skincare, feedback, reorder] = await Promise.all([
    handleOffersReminder(sb, "evening"),
    handleSkincareTip(sb, "evening"),
    handleFeedbackReminders(sb),
    handleReorder(sb),
  ]);
  return { offers_reminder: offers, skincare_tip: skincare, feedback: feedback, reorder: reorder };
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { action, ...params } = await req.json();
    let result: Record<string, unknown> = {};

    // Quiet hours check for scheduled actions
    if (["slot_morning", "slot_afternoon", "slot_evening1", "slot_evening2"].includes(action) && isInQuietHours()) {
      return new Response(JSON.stringify({ ok: true, skipped: "quiet_hours", baghdad_hour: getBaghdadHour() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    switch (action) {
      // Instant (no quiet hours)
      case "order_status_change": result = await handleOrderStatusChange(sb, params.order_id, params.new_status); break;
      case "welcome": result = await handleWelcome(sb, params.user_id); break;

      // Scheduled slots
      case "slot_morning": result = await runSlotMorning(sb); break;
      case "slot_afternoon": result = await runSlotAfternoon(sb); break;
      case "slot_evening1": result = await runSlotEvening1(sb); break;
      case "slot_evening2": result = await runSlotEvening2(sb); break;

      // Individual actions (for manual testing)
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

      // Continuous checks (every 30 min)
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
