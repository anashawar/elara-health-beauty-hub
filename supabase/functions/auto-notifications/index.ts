import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ONESIGNAL_APP_ID = "13744f00-e92d-4e78-84ca-4dffe5a16cea";
const ONESIGNAL_API_URL = "https://api.onesignal.com/notifications";

type Lang = "en" | "ar" | "ku";

interface LocalizedText {
  en: string;
  ar: string;
  ku: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  image_url?: string;
  link_url?: string;
  user_ids: string[];
  sound?: string;
  // For multilingual push — send localized headings/contents
  headings?: Record<string, string>;
  contents?: Record<string, string>;
}

// ─── LOCALIZED NOTIFICATION STRINGS ──────────────────────────────────────

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

const ABANDONED_CART: { title: LocalizedText; body: LocalizedText } = {
  title: { en: "Psst... You forgot something! 🛒", ar: "هي... نسيتي شي بالسلة! 🛒", ku: "هەی... شتێکت لە سەبەتەکەت بیرچووە! 🛒" },
  body: { en: "Your cart misses you 😢 Come back before your items run out!", ar: "سلتك مشتاقتلك 😢 ارجعي قبل ما المنتجات تخلص!", ku: "سەبەتەکەت بیری لێت دەچێتەوە 😢 بگەڕێرەوە پێش ئەوەی بەرهەمەکان تەواو بن!" },
};

const WELCOME: { title: LocalizedText; body: LocalizedText } = {
  title: { en: "Welcome to ELARA! 💜", ar: "أهلاً بيك في ELARA! 💜", ku: "بەخێربێیت بۆ ELARA! 💜" },
  body: {
    en: "Your beauty journey starts here! Explore premium products curated just for you ✨",
    ar: "رحلتك الجمالية تبدأ هنا! اكتشفي منتجات مميزة مختارة خصيصاً لك ✨",
    ku: "گەشتی جوانیت لێرەوە دەست پێدەکات! بەرهەمە تایبەتەکان ببینە کە تایبەت بۆ تۆ هەڵبژێردراون ✨",
  },
};

const FEEDBACK: { title: LocalizedText; body: LocalizedText } = {
  title: { en: "How was your order? ⭐", ar: "شلون كان طلبك؟ ⭐", ku: "داواکاریەکەت چۆن بوو؟ ⭐" },
  body: {
    en: "We'd love to hear from you! Rate your experience — it takes just a second 🙏",
    ar: "نحب نسمع رأيك! قيّمي تجربتك — بس ثانية وحدة 🙏",
    ku: "دەمانەوێت بیستینت! ئەزموونەکەت هەڵبسەنگێنە — تەنها چرکەیەک دەخایەنێت 🙏",
  },
};

const FREE_DELIVERY: { title: LocalizedText; bodyTemplate: LocalizedText } = {
  title: { en: "SO close to FREE delivery! 🚚", ar: "قريب جداً من التوصيل المجاني! 🚚", ku: "زۆر نزیکی گەیاندنی بەخۆڕاییت! 🚚" },
  bodyTemplate: {
    en: "Add just {{amount}} IQD more and get FREE delivery! You're almost there 🎯",
    ar: "ضيفي بس {{amount}} دينار وتوصيلك مجاني! قربتي تحققيها 🎯",
    ku: "تەنها {{amount}} دینار زیاد بکە و گەیاندنت بەخۆڕایی بێت! نزیکیت 🎯",
  },
};

const DAILY_OFFERS: { title: LocalizedText; bodyMultiple: LocalizedText; bodySingle: LocalizedText } = {
  title: {
    en: "Today's Deals Are 🔥",
    ar: "عروض اليوم ناااار 🔥",
    ku: "ئۆفەرەکانی ئەمڕۆ ئاگرن 🔥",
  },
  bodyMultiple: {
    en: "{{count}} exclusive offers just dropped — don't sleep on these! 💅",
    ar: "{{count}} عروض حصرية نزلت — لا تطوفك! 💅",
    ku: "{{count}} ئۆفەری تایبەت دابەزین — لەدەست مەدەن! 💅",
  },
  bodySingle: {
    en: "{{title}} — Save {{discount}} today only! Shop now before it's gone 🏃‍♀️",
    ar: "{{title}} — وفّري {{discount}} اليوم بس! اشتري قبل ما يخلص 🏃‍♀️",
    ku: "{{title}} — {{discount}} ئەمڕۆ پاشەکەوت بخە! پێش ئەوەی تەواو بێت بیکڕە 🏃‍♀️",
  },
};

const REORDER: { title: LocalizedText; body: LocalizedText } = {
  title: { en: "Time to restock? 🔄", ar: "وقت تعيدي الطلب؟ 🔄", ku: "کاتی نوێکردنەوەیە؟ 🔄" },
  body: {
    en: "It's been a month! Reorder your favorites + FREE delivery on orders over 40K IQD 💕",
    ar: "صار شهر! اطلبي منتجاتك المفضلة + توصيل مجاني للطلبات فوق 40 ألف دينار 💕",
    ku: "مانگێکە! بەرهەمە خۆشەویستەکانت دووبارە داوا بکە + گەیاندنی بەخۆڕایی بۆ داواکاری سەرووی 40 هەزار دینار 💕",
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────

function t(localized: LocalizedText, lang: Lang): string {
  return localized[lang] || localized.en;
}

function tTemplate(localized: LocalizedText, lang: Lang, params: Record<string, string | number>): string {
  let text = localized[lang] || localized.en;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(`{{${k}}}`, String(v));
  }
  return text;
}

async function getUserLang(supabase: ReturnType<typeof createClient>, userId: string): Promise<Lang> {
  const { data } = await supabase
    .from("profiles")
    .select("language")
    .eq("user_id", userId)
    .single();
  const lang = (data as any)?.language;
  return (lang === "ar" || lang === "ku") ? lang : "en";
}

async function getUserLangsMap(supabase: ReturnType<typeof createClient>, userIds: string[]): Promise<Record<string, Lang>> {
  if (userIds.length === 0) return {};
  const map: Record<string, Lang> = {};
  // Batch in chunks of 100
  for (let i = 0; i < userIds.length; i += 100) {
    const chunk = userIds.slice(i, i + 100);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, language")
      .in("user_id", chunk);
    for (const row of (data || [])) {
      const lang = (row as any).language;
      map[(row as any).user_id] = (lang === "ar" || lang === "ku") ? lang : "en";
    }
  }
  return map;
}

// Group users by language for efficient push sending
function groupByLang(userLangs: Record<string, Lang>): Record<Lang, string[]> {
  const groups: Record<Lang, string[]> = { en: [], ar: [], ku: [] };
  for (const [uid, lang] of Object.entries(userLangs)) {
    groups[lang].push(uid);
  }
  return groups;
}

async function sendPushViaOneSignal(payload: NotificationPayload): Promise<{ sent: number }> {
  const restApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (!restApiKey) {
    console.error("ONESIGNAL_REST_API_KEY not set");
    return { sent: 0 };
  }

  const osPayload: Record<string, unknown> = {
    app_id: ONESIGNAL_APP_ID,
    headings: payload.headings || { en: payload.title },
    contents: payload.contents || { en: payload.body },
    data: { link_url: payload.link_url || "/home" },
  };

  if (payload.image_url) {
    osPayload.big_picture = payload.image_url;
    osPayload.ios_attachments = { image: payload.image_url };
  }
  if (payload.icon) osPayload.small_icon = payload.icon;
  if (payload.link_url) osPayload.url = payload.link_url;
  if (payload.sound) osPayload.ios_sound = payload.sound;

  if (payload.user_ids.length > 0) {
    osPayload.include_aliases = { external_id: payload.user_ids };
    osPayload.target_channel = "push";
  } else {
    osPayload.included_segments = ["Subscribed Users"];
  }

  try {
    const res = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${restApiKey}`,
      },
      body: JSON.stringify(osPayload),
    });
    const result = await res.json();
    if (!res.ok) {
      console.error("OneSignal error:", JSON.stringify(result));
      return { sent: 0 };
    }
    return { sent: result.recipients || 0 };
  } catch (e) {
    console.error("OneSignal fetch error:", e);
    return { sent: 0 };
  }
}

// Send localized push to groups of users by language
async function sendLocalizedPush(
  locTitle: LocalizedText,
  locBody: LocalizedText,
  userLangs: Record<string, Lang>,
  opts: { icon?: string; link_url?: string; image_url?: string },
) {
  const groups = groupByLang(userLangs);
  let totalSent = 0;

  for (const lang of ["en", "ar", "ku"] as Lang[]) {
    const ids = groups[lang];
    if (ids.length === 0) continue;

    const result = await sendPushViaOneSignal({
      title: t(locTitle, lang),
      body: t(locBody, lang),
      icon: opts.icon,
      link_url: opts.link_url,
      image_url: opts.image_url,
      user_ids: ids,
    });
    totalSent += result.sent;
  }

  return totalSent;
}

// Send broadcast push with all 3 languages in one call (OneSignal supports multi-lang headings)
async function sendBroadcastPush(
  locTitle: LocalizedText,
  locBody: LocalizedText,
  opts: { icon?: string; link_url?: string; image_url?: string },
) {
  return sendPushViaOneSignal({
    title: locTitle.en,
    body: locBody.en,
    headings: { en: locTitle.en, ar: locTitle.ar, ku: locTitle.ku },
    contents: { en: locBody.en, ar: locBody.ar, ku: locBody.ku },
    icon: opts.icon,
    link_url: opts.link_url,
    image_url: opts.image_url,
    user_ids: [], // all
  });
}

async function saveInAppNotification(
  supabase: ReturnType<typeof createClient>,
  userId: string | null,
  title: string,
  body: string,
  type: string,
  icon: string,
  linkUrl?: string,
  imageUrl?: string,
  metadata?: Record<string, unknown>,
) {
  await supabase.from("notifications").insert({
    user_id: userId,
    title,
    body,
    type,
    icon,
    link_url: linkUrl || null,
    image_url: imageUrl || null,
    metadata: metadata || null,
  });
}

// ─── ORDER STATUS NOTIFICATIONS ──────────────────────────────────────────
async function handleOrderStatusChange(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  newStatus: string,
) {
  const statusInfo = ORDER_STATUS_TEXTS[newStatus];
  if (!statusInfo) return { handled: false };

  const { data: order } = await supabase
    .from("orders")
    .select("user_id, id, total")
    .eq("id", orderId)
    .single();
  if (!order) return { handled: false };

  const lang = await getUserLang(supabase, order.user_id);
  const orderShort = orderId.slice(0, 8).toUpperCase();
  const linkUrl = "/orders";
  const title = t(statusInfo.title, lang);
  const body = `${t(statusInfo.body, lang)} (#${orderShort})`;

  await saveInAppNotification(supabase, order.user_id, title, body, "order", statusInfo.icon, linkUrl, undefined, { order_id: orderId, status: newStatus });

  await sendPushViaOneSignal({
    title, body, icon: statusInfo.icon, link_url: linkUrl, user_ids: [order.user_id],
  });

  if (newStatus === "delivered") {
    const fbTitle = t(FEEDBACK.title, lang);
    const fbBody = `${t(FEEDBACK.body, lang)} (#${orderShort})`;
    await supabase.from("notifications").insert({
      user_id: order.user_id, title: fbTitle, body: fbBody, type: "feedback", icon: "⭐",
      link_url: "/orders", metadata: { order_id: orderId, scheduled_feedback: true, deliver_after: new Date(Date.now() + 2 * 3600000).toISOString() },
      is_read: true,
    });
  }

  return { handled: true, userId: order.user_id };
}

// ─── ABANDONED CART ──────────────────────────────────────────────────────
async function handleAbandonedCarts(supabase: ReturnType<typeof createClient>) {
  const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();

  const { data: cartUsers } = await supabase
    .from("cart_items")
    .select("user_id, updated_at")
    .lt("updated_at", threeHoursAgo)
    .gte("updated_at", oneDayAgo);

  if (!cartUsers || cartUsers.length === 0) return { sent: 0 };

  const uniqueUsers = [...new Set(cartUsers.map((c) => c.user_id))];

  const { data: recentNotifs } = await supabase
    .from("notifications")
    .select("user_id")
    .eq("type", "abandoned_cart")
    .gte("created_at", oneDayAgo)
    .in("user_id", uniqueUsers);

  const alreadyNotified = new Set((recentNotifs || []).map((n) => n.user_id));
  const toNotify = uniqueUsers.filter((uid) => !alreadyNotified.has(uid));
  if (toNotify.length === 0) return { sent: 0 };

  const userLangs = await getUserLangsMap(supabase, toNotify);

  for (const userId of toNotify) {
    const lang = userLangs[userId] || "en";
    await saveInAppNotification(supabase, userId, t(ABANDONED_CART.title, lang), t(ABANDONED_CART.body, lang), "abandoned_cart", "🛒", "/cart");
  }

  await sendLocalizedPush(ABANDONED_CART.title, ABANDONED_CART.body, userLangs, { icon: "🛒", link_url: "/cart" });

  return { sent: toNotify.length };
}

// ─── OFFER BROADCAST ─────────────────────────────────────────────────────
async function handleNewOffers(supabase: ReturnType<typeof createClient>) {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60000).toISOString();

  const { data: newOffers } = await supabase
    .from("offers")
    .select("*")
    .eq("is_active", true)
    .gte("created_at", thirtyMinAgo);

  if (!newOffers || newOffers.length === 0) return { sent: 0 };

  let totalSent = 0;

  for (const offer of newOffers) {
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("type", "offer")
      .filter("metadata->>offer_id", "eq", offer.id)
      .limit(1);
    if (existing && existing.length > 0) continue;

    const discountText = offer.discount_type === "percentage"
      ? `${offer.discount_value}%`
      : `${offer.discount_value.toLocaleString()} IQD`;

    const titleLoc: LocalizedText = {
      en: `${discountText} OFF — ${offer.title} 🔥`,
      ar: `خصم ${discountText} — ${offer.title} 🔥`,
      ku: `${discountText} داشکاندن — ${offer.title} 🔥`,
    };
    const bodyLoc: LocalizedText = {
      en: `Don't miss this deal! ${discountText} off on selected products 🛍️`,
      ar: `لا تفوتي هالعرض! ${discountText} خصم على منتجات مختارة 🛍️`,
      ku: `ئەم ئۆفەرە لەدەست مەدە! ${discountText} داشکاندن لەسەر بەرهەمی هەڵبژێردراو 🛍️`,
    };
    const linkUrl = offer.link_url || "/collection/offers";

    // Broadcast in-app (null user_id)
    await saveInAppNotification(supabase, null, titleLoc.en, bodyLoc.en, "offer", "🔥", linkUrl, offer.image_url, { offer_id: offer.id });

    await sendBroadcastPush(titleLoc, bodyLoc, { icon: "🔥", image_url: offer.image_url, link_url: linkUrl });

    const { data: allUsers } = await supabase.from("profiles").select("user_id");
    totalSent += (allUsers || []).length;
  }

  return { sent: totalSent };
}

// ─── FEEDBACK REMINDERS ──────────────────────────────────────────────────
async function handleFeedbackReminders(supabase: ReturnType<typeof createClient>) {
  const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

  const { data: deliveredOrders } = await supabase
    .from("orders")
    .select("id, user_id, updated_at")
    .eq("status", "delivered")
    .lt("updated_at", twoHoursAgo)
    .gte("updated_at", threeDaysAgo);

  if (!deliveredOrders || deliveredOrders.length === 0) return { sent: 0 };

  const orderIds = deliveredOrders.map((o) => o.id);
  const { data: existingRatings } = await supabase.from("order_ratings").select("order_id").in("order_id", orderIds);
  const ratedOrderIds = new Set((existingRatings || []).map((r) => r.order_id));

  const { data: existingFN } = await supabase
    .from("notifications")
    .select("metadata")
    .eq("type", "feedback")
    .filter("metadata->>feedback_sent", "eq", "true");
  const feedbackSent = new Set((existingFN || []).map((n) => (n.metadata as any)?.order_id).filter(Boolean));

  const userIds = deliveredOrders.filter((o) => !ratedOrderIds.has(o.id) && !feedbackSent.has(o.id)).map((o) => o.user_id);
  if (userIds.length === 0) return { sent: 0 };

  const userLangs = await getUserLangsMap(supabase, [...new Set(userIds)]);

  let sent = 0;
  for (const order of deliveredOrders) {
    if (ratedOrderIds.has(order.id) || feedbackSent.has(order.id)) continue;
    const lang = userLangs[order.user_id] || "en";
    const orderShort = order.id.slice(0, 8).toUpperCase();

    await saveInAppNotification(
      supabase, order.user_id,
      t(FEEDBACK.title, lang),
      `${t(FEEDBACK.body, lang)} (#${orderShort})`,
      "feedback", "⭐", "/orders", undefined, { order_id: order.id, feedback_sent: "true" },
    );
    sent++;
  }

  await sendLocalizedPush(FEEDBACK.title, FEEDBACK.body, userLangs, { icon: "⭐", link_url: "/orders" });

  return { sent };
}

// ─── WELCOME ─────────────────────────────────────────────────────────────
async function handleWelcomeNotification(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: existing } = await supabase.from("notifications").select("id").eq("user_id", userId).eq("type", "welcome").limit(1);
  if (existing && existing.length > 0) return { sent: false };

  const lang = await getUserLang(supabase, userId);

  await saveInAppNotification(supabase, userId, t(WELCOME.title, lang), t(WELCOME.body, lang), "welcome", "💜", "/categories");
  await sendPushViaOneSignal({ title: t(WELCOME.title, lang), body: t(WELCOME.body, lang), icon: "💜", link_url: "/categories", user_ids: [userId] });

  return { sent: true };
}

// ─── PRICE DROPS ─────────────────────────────────────────────────────────
async function handlePriceDrops(supabase: ReturnType<typeof createClient>) {
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

  const { data: updatedProducts } = await supabase
    .from("products")
    .select("id, title, price, original_price, slug")
    .not("original_price", "is", null)
    .gte("updated_at", oneHourAgo);

  if (!updatedProducts || updatedProducts.length === 0) return { sent: 0 };

  let sent = 0;
  for (const product of updatedProducts) {
    if (!product.original_price || product.price >= product.original_price) continue;
    const discount = Math.round(((product.original_price - product.price) / product.original_price) * 100);
    if (discount < 10) continue;

    const { data: existing } = await supabase
      .from("notifications").select("id").eq("type", "price_drop")
      .filter("metadata->>product_id", "eq", product.id)
      .gte("created_at", new Date(Date.now() - 24 * 3600000).toISOString()).limit(1);
    if (existing && existing.length > 0) continue;

    const { data: wishlistUsers } = await supabase.from("cart_items").select("user_id").eq("product_id", product.id);
    if (!wishlistUsers || wishlistUsers.length === 0) continue;

    const userIds = [...new Set(wishlistUsers.map((w) => w.user_id))];
    const userLangs = await getUserLangsMap(supabase, userIds);

    const titleLoc: LocalizedText = {
      en: `Price Drop! ${discount}% OFF 💰`,
      ar: `انخفض السعر! ${discount}% خصم 💰`,
      ku: `نرخ کەمبووەتەوە! ${discount}% داشکاندن 💰`,
    };
    const bodyLoc: LocalizedText = {
      en: `${product.title} is now ${product.price.toLocaleString()} IQD — grab it! 🏃‍♀️`,
      ar: `${product.title} صار ${product.price.toLocaleString()} دينار — لا تفوتيه! 🏃‍♀️`,
      ku: `${product.title} ئێستا ${product.price.toLocaleString()} دینارە — بیکڕە! 🏃‍♀️`,
    };

    for (const uid of userIds) {
      const lang = userLangs[uid] || "en";
      await saveInAppNotification(supabase, uid, t(titleLoc, lang), t(bodyLoc, lang), "price_drop", "💰", `/product/${product.slug}`, undefined, { product_id: product.id });
    }

    await sendLocalizedPush(titleLoc, bodyLoc, userLangs, { icon: "💰", link_url: `/product/${product.slug}` });
    sent += userIds.length;
  }

  return { sent };
}

// ─── AI SEARCH-BASED RECOMMENDATIONS ────────────────────────────────────
async function handleSearchBasedRecommendations(supabase: ReturnType<typeof createClient>) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return { sent: 0 };

  const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 48 * 3600000).toISOString();

  const { data: cartUsers } = await supabase
    .from("cart_items")
    .select("user_id, product_id, products(title, slug, price, brand_id, brands(name))")
    .gte("updated_at", twoDaysAgo);

  if (!cartUsers || cartUsers.length === 0) return { sent: 0 };

  const userProducts: Record<string, { titles: string[]; slugs: string[]; brandNames: string[] }> = {};
  for (const item of cartUsers) {
    const uid = item.user_id;
    if (!userProducts[uid]) userProducts[uid] = { titles: [], slugs: [], brandNames: [] };
    const p = item.products as any;
    if (p?.title) userProducts[uid].titles.push(p.title);
    if (p?.slug) userProducts[uid].slugs.push(p.slug);
    if (p?.brands?.name) userProducts[uid].brandNames.push(p.brands.name);
  }

  const { data: recentNotifs } = await supabase
    .from("notifications").select("user_id").eq("type", "ai_recommendation").gte("created_at", oneDayAgo);
  const alreadyNotified = new Set((recentNotifs || []).map((n) => n.user_id));
  const usersToNotify = Object.entries(userProducts).filter(([uid]) => !alreadyNotified.has(uid));
  if (usersToNotify.length === 0) return { sent: 0 };

  const allUserIds = usersToNotify.map(([uid]) => uid);
  const userLangs = await getUserLangsMap(supabase, allUserIds);

  let sent = 0;

  const langInstructions: Record<Lang, string> = {
    en: "Write in English. Friendly, warm, slightly playful tone.",
    ar: "Write in Iraqi Arabic dialect (عراقي). Warm, friendly, sometimes funny. Use words like يا حلوة, هيا, يلا.",
    ku: "Write in Kurdish Sorani. Warm, friendly tone. Use natural Kurdish expressions.",
  };

  for (const [userId, products] of usersToNotify.slice(0, 20)) {
    const lang = userLangs[userId] || "en";
    const uniqueBrands = [...new Set(products.brandNames)].slice(0, 3).join(", ");
    const uniqueTitles = [...new Set(products.titles)].slice(0, 3).join(", ");
    const firstSlug = products.slugs[0];

    try {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are ELARA's notification writer for a beauty & skincare app in Iraq. ${langInstructions[lang]} Write a short push notification (title max 40 chars, body max 100 chars). Be professional but friendly — like a cool friend who knows beauty. Never use cringe phrases.`,
            },
            {
              role: "user",
              content: `User interested in: ${uniqueTitles}. Brands: ${uniqueBrands || "various"}. Write a personalized notification in ${lang === "ar" ? "Iraqi Arabic" : lang === "ku" ? "Kurdish Sorani" : "English"}.`,
            },
          ],
          tools: [{
            type: "function",
            function: {
              name: "create_notification",
              description: "Create a push notification",
              parameters: {
                type: "object",
                properties: { title: { type: "string" }, body: { type: "string" } },
                required: ["title", "body"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "create_notification" } },
        }),
      });

      if (!aiRes.ok) continue;

      const aiData = await aiRes.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      let notif = { title: t(ABANDONED_CART.title, lang), body: t(ABANDONED_CART.body, lang) };
      if (toolCall?.function?.arguments) {
        try { notif = JSON.parse(toolCall.function.arguments); } catch {}
      }

      await saveInAppNotification(supabase, userId, notif.title, notif.body, "ai_recommendation", "✨", `/product/${firstSlug}`);
      await sendPushViaOneSignal({ title: notif.title, body: notif.body, icon: "✨", link_url: `/product/${firstSlug}`, user_ids: [userId] });

      sent++;
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.warn("AI notification error:", userId, e);
    }
  }

  return { sent };
}

// ─── DAILY OFFERS REMINDER ───────────────────────────────────────────────
async function handleDailyOffersReminder(supabase: ReturnType<typeof createClient>) {
  const today = new Date().toISOString().slice(0, 10);

  const { data: todayReminder } = await supabase
    .from("notifications").select("id").eq("type", "daily_offers")
    .gte("created_at", `${today}T00:00:00Z`).is("user_id", null).limit(1);
  if (todayReminder && todayReminder.length > 0) return { sent: 0, reason: "already_sent_today" };

  const { data: activeOffers } = await supabase
    .from("offers")
    .select("id, title, discount_type, discount_value, image_url, link_url")
    .eq("is_active", true).order("sort_order", { ascending: true }).limit(3);

  if (!activeOffers || activeOffers.length === 0) return { sent: 0, reason: "no_active_offers" };

  const topOffer = activeOffers[0];
  const discountText = topOffer.discount_type === "percentage"
    ? `${topOffer.discount_value}%` : `${topOffer.discount_value.toLocaleString()} IQD`;

  const offerCount = activeOffers.length;

  let titleLoc = DAILY_OFFERS.title;
  let bodyLoc: LocalizedText;

  if (offerCount > 1) {
    bodyLoc = {
      en: tTemplate(DAILY_OFFERS.bodyMultiple, "en", { count: offerCount }),
      ar: tTemplate(DAILY_OFFERS.bodyMultiple, "ar", { count: offerCount }),
      ku: tTemplate(DAILY_OFFERS.bodyMultiple, "ku", { count: offerCount }),
    };
  } else {
    bodyLoc = {
      en: tTemplate(DAILY_OFFERS.bodySingle, "en", { title: topOffer.title, discount: discountText }),
      ar: tTemplate(DAILY_OFFERS.bodySingle, "ar", { title: topOffer.title, discount: discountText }),
      ku: tTemplate(DAILY_OFFERS.bodySingle, "ku", { title: topOffer.title, discount: discountText }),
    };
  }

  const linkUrl = topOffer.link_url || "/collection/offers";

  // Broadcast in-app
  await saveInAppNotification(supabase, null, titleLoc.en, bodyLoc.en, "daily_offers", "🎯", linkUrl, topOffer.image_url, { date: today, offer_ids: activeOffers.map((o) => o.id) });

  await sendBroadcastPush(titleLoc, bodyLoc, { icon: "🎯", image_url: topOffer.image_url, link_url: linkUrl });

  const { data: allUsers } = await supabase.from("profiles").select("user_id");
  return { sent: (allUsers || []).length };
}

// ─── FREE DELIVERY HINT ─────────────────────────────────────────────────
async function handleFreeDeliveryReminder(supabase: ReturnType<typeof createClient>) {
  const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();

  const { data: cartItems } = await supabase
    .from("cart_items")
    .select("user_id, quantity, products(price)")
    .gte("updated_at", new Date(Date.now() - 48 * 3600000).toISOString());

  if (!cartItems || cartItems.length === 0) return { sent: 0 };

  const userTotals: Record<string, number> = {};
  for (const item of cartItems) {
    const price = (item.products as any)?.price || 0;
    userTotals[item.user_id] = (userTotals[item.user_id] || 0) + price * item.quantity;
  }

  const nearThreshold = Object.entries(userTotals).filter(([, total]) => total >= 25000 && total < 40000);
  if (nearThreshold.length === 0) return { sent: 0 };

  const userIds = nearThreshold.map(([uid]) => uid);
  const { data: recentNotifs } = await supabase
    .from("notifications").select("user_id").eq("type", "free_delivery_hint").gte("created_at", oneDayAgo).in("user_id", userIds);
  const alreadyNotified = new Set((recentNotifs || []).map((n) => n.user_id));
  const toNotify = nearThreshold.filter(([uid]) => !alreadyNotified.has(uid));
  if (toNotify.length === 0) return { sent: 0 };

  const notifyIds = toNotify.map(([uid]) => uid);
  const userLangs = await getUserLangsMap(supabase, notifyIds);

  let sent = 0;
  for (const [userId, total] of toNotify) {
    const lang = userLangs[userId] || "en";
    const remaining = (40000 - total).toLocaleString();

    await saveInAppNotification(
      supabase, userId,
      t(FREE_DELIVERY.title, lang),
      tTemplate(FREE_DELIVERY.bodyTemplate, lang, { amount: remaining }),
      "free_delivery_hint", "🚚", "/cart",
    );
    sent++;
  }

  await sendLocalizedPush(FREE_DELIVERY.title, {
    en: tTemplate(FREE_DELIVERY.bodyTemplate, "en", { amount: "a little" }),
    ar: tTemplate(FREE_DELIVERY.bodyTemplate, "ar", { amount: "شوية" }),
    ku: tTemplate(FREE_DELIVERY.bodyTemplate, "ku", { amount: "کەمێک" }),
  }, userLangs, { icon: "🚚", link_url: "/cart" });

  return { sent };
}

// ─── AI SKINCARE TIP ─────────────────────────────────────────────────────
async function handleSkincareRoutineReminder(supabase: ReturnType<typeof createClient>) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  if (![1, 3, 5].includes(dayOfWeek)) return { sent: 0, reason: "not_scheduled_day" };

  const todayStr = today.toISOString().slice(0, 10);
  const { data: todayNotif } = await supabase
    .from("notifications").select("id").eq("type", "skincare_tip")
    .gte("created_at", `${todayStr}T00:00:00Z`).is("user_id", null).limit(1);
  if (todayNotif && todayNotif.length > 0) return { sent: 0, reason: "already_sent" };

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return { sent: 0, reason: "no_api_key" };

  const month = today.toLocaleString("en", { month: "long" });
  const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][dayOfWeek];

  try {
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are ELARA's beauty expert writing skincare tips for an Iraqi audience. Write push notifications in 3 languages. Be professional but friendly and warm. Consider ${month} weather in Iraq (hot, dry). Never be cringe or use over-the-top phrases.`,
          },
          {
            role: "user",
            content: `Write today's skincare tip for ${dayName}, ${month}. Return in 3 languages.`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_tip",
            description: "Create skincare tip in 3 languages",
            parameters: {
              type: "object",
              properties: {
                title_en: { type: "string" }, body_en: { type: "string" },
                title_ar: { type: "string" }, body_ar: { type: "string" },
                title_ku: { type: "string" }, body_ku: { type: "string" },
              },
              required: ["title_en", "body_en", "title_ar", "body_ar", "title_ku", "body_ku"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_tip" } },
      }),
    });

    if (!aiRes.ok) return { sent: 0, reason: "ai_error" };

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let tip = {
      title_en: "Daily Skincare Tip 🌿", body_en: "Stay hydrated and wear SPF daily — your skin will thank you!",
      title_ar: "نصيحة يومية للبشرة 🌿", body_ar: "اشربي ماي واستخدمي واقي شمس كل يوم — بشرتك بتشكرك!",
      title_ku: "ئامۆژگاری ڕۆژانەی چەرم 🌿", body_ku: "ئاو بخۆرەوە و هەموو ڕۆژێک کرێمی خۆرپارێز بەکاربهێنە!",
    };

    if (toolCall?.function?.arguments) {
      try { tip = JSON.parse(toolCall.function.arguments); } catch {}
    }

    const titleLoc: LocalizedText = { en: tip.title_en, ar: tip.title_ar, ku: tip.title_ku };
    const bodyLoc: LocalizedText = { en: tip.body_en, ar: tip.body_ar, ku: tip.body_ku };

    await saveInAppNotification(supabase, null, titleLoc.en, bodyLoc.en, "skincare_tip", "🌿", "/categories", undefined, { date: todayStr });
    await sendBroadcastPush(titleLoc, bodyLoc, { icon: "🌿", link_url: "/categories" });

    return { sent: 1, broadcast: true };
  } catch (e) {
    console.warn("Skincare tip error:", e);
    return { sent: 0, reason: "error" };
  }
}

// ─── REORDER REMINDER ────────────────────────────────────────────────────
async function handleReorderReminder(supabase: ReturnType<typeof createClient>) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const twentyFiveDaysAgo = new Date(Date.now() - 25 * 86400000).toISOString();

  const { data: oldOrders } = await supabase
    .from("orders")
    .select("user_id, id, order_items(products(title, slug))")
    .eq("status", "delivered")
    .lte("created_at", twentyFiveDaysAgo)
    .gte("created_at", thirtyDaysAgo);

  if (!oldOrders || oldOrders.length === 0) return { sent: 0 };

  const uniqueUsers = [...new Set(oldOrders.map((o) => o.user_id))];

  const { data: recentNotifs } = await supabase
    .from("notifications").select("user_id").eq("type", "reorder_reminder")
    .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()).in("user_id", uniqueUsers);
  const alreadyNotified = new Set((recentNotifs || []).map((n) => n.user_id));
  const toNotify = uniqueUsers.filter((uid) => !alreadyNotified.has(uid));
  if (toNotify.length === 0) return { sent: 0 };

  const userLangs = await getUserLangsMap(supabase, toNotify);

  let sent = 0;
  for (const userId of toNotify) {
    const lang = userLangs[userId] || "en";
    await saveInAppNotification(supabase, userId, t(REORDER.title, lang), t(REORDER.body, lang), "reorder_reminder", "🔄", "/orders");
    sent++;
  }

  await sendLocalizedPush(REORDER.title, REORDER.body, userLangs, { icon: "🔄", link_url: "/orders" });

  return { sent };
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action, ...params } = await req.json();
    let result: Record<string, unknown> = {};

    switch (action) {
      case "order_status_change":
        result = await handleOrderStatusChange(supabase, params.order_id, params.new_status);
        break;
      case "abandoned_carts":
        result = await handleAbandonedCarts(supabase);
        break;
      case "new_offers":
        result = await handleNewOffers(supabase);
        break;
      case "feedback_reminders":
        result = await handleFeedbackReminders(supabase);
        break;
      case "welcome":
        result = await handleWelcomeNotification(supabase, params.user_id);
        break;
      case "price_drops":
        result = await handlePriceDrops(supabase);
        break;
      case "search_recommendations":
        result = await handleSearchBasedRecommendations(supabase);
        break;
      case "daily_offers":
        result = await handleDailyOffersReminder(supabase);
        break;
      case "free_delivery_hint":
        result = await handleFreeDeliveryReminder(supabase);
        break;
      case "skincare_tip":
        result = await handleSkincareRoutineReminder(supabase);
        break;
      case "reorder_reminder":
        result = await handleReorderReminder(supabase);
        break;
      case "run_all_scheduled":
        const [abandoned, offers, feedback, priceDrops, freeDelivery, searchRecs, reorder] = await Promise.all([
          handleAbandonedCarts(supabase),
          handleNewOffers(supabase),
          handleFeedbackReminders(supabase),
          handlePriceDrops(supabase),
          handleFreeDeliveryReminder(supabase),
          handleSearchBasedRecommendations(supabase),
          handleReorderReminder(supabase),
        ]);
        result = { abandoned_carts: abandoned, new_offers: offers, feedback_reminders: feedback, price_drops: priceDrops, free_delivery_hint: freeDelivery, search_recommendations: searchRecs, reorder_reminder: reorder };
        break;
      case "run_daily":
        const [dailyOffers, skincareTip, dailyReorder] = await Promise.all([
          handleDailyOffersReminder(supabase),
          handleSkincareRoutineReminder(supabase),
          handleReorderReminder(supabase),
        ]);
        result = { daily_offers: dailyOffers, skincare_tip: skincareTip, reorder_reminder: dailyReorder };
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-notifications error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
