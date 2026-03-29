import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ONESIGNAL_APP_ID = "13744f00-e92d-4e78-84ca-4dffe5a16cea";
const ONESIGNAL_API_URL = "https://api.onesignal.com/notifications";

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  image_url?: string;
  link_url?: string;
  user_ids: string[];
  sound?: string;
}

async function sendPushViaOneSignal(payload: NotificationPayload): Promise<{ sent: number }> {
  const restApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (!restApiKey) {
    console.error("ONESIGNAL_REST_API_KEY not set");
    return { sent: 0 };
  }

  const osPayload: Record<string, unknown> = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: payload.title },
    contents: { en: payload.body },
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

async function saveInAppNotification(
  supabase: ReturnType<typeof createClient>,
  userId: string,
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

// ─── ORDER STATUS NOTIFICATIONS ───────────────────────────────────────────
const ORDER_STATUS_MAP: Record<string, { title: string; body: string; icon: string }> = {
  confirmed: {
    title: "Order Confirmed ✅",
    body: "Your order has been confirmed and is being prepared.",
    icon: "📦",
  },
  preparing: {
    title: "Preparing Your Order 🎁",
    body: "We're carefully packing your products with love.",
    icon: "🎁",
  },
  shipped: {
    title: "Order Shipped 🚚",
    body: "Your order is on its way! Track your delivery.",
    icon: "🚚",
  },
  out_for_delivery: {
    title: "Out for Delivery 📍",
    body: "Your order is nearby and will be delivered soon!",
    icon: "📍",
  },
  delivered: {
    title: "Order Delivered 🎉",
    body: "Your order has been delivered. Enjoy your products!",
    icon: "🎉",
  },
  cancelled: {
    title: "Order Cancelled",
    body: "Your order has been cancelled. Contact support if you have questions.",
    icon: "❌",
  },
};

async function handleOrderStatusChange(
  supabase: ReturnType<typeof createClient>,
  orderId: string,
  newStatus: string,
) {
  const statusInfo = ORDER_STATUS_MAP[newStatus];
  if (!statusInfo) return { handled: false };

  const { data: order } = await supabase
    .from("orders")
    .select("user_id, id, total")
    .eq("id", orderId)
    .single();

  if (!order) return { handled: false };

  const linkUrl = `/orders`;
  const orderShort = orderId.slice(0, 8).toUpperCase();

  await saveInAppNotification(
    supabase,
    order.user_id,
    statusInfo.title,
    `${statusInfo.body} (Order #${orderShort})`,
    "order",
    statusInfo.icon,
    linkUrl,
    undefined,
    { order_id: orderId, status: newStatus },
  );

  await sendPushViaOneSignal({
    title: statusInfo.title,
    body: `${statusInfo.body} (Order #${orderShort})`,
    icon: statusInfo.icon,
    link_url: linkUrl,
    user_ids: [order.user_id],
  });

  // Schedule feedback request 2 hours after delivery
  if (newStatus === "delivered") {
    // We'll handle this via a separate scheduled check
    await supabase.from("notifications").insert({
      user_id: order.user_id,
      title: "How was your order? ⭐",
      body: `We'd love your feedback on order #${orderShort}. Rate your experience!`,
      type: "feedback",
      icon: "⭐",
      link_url: `/orders`,
      metadata: { order_id: orderId, scheduled_feedback: true, deliver_after: new Date(Date.now() + 2 * 3600000).toISOString() },
      is_read: true, // Hidden until scheduled time
    });
  }

  return { handled: true, userId: order.user_id };
}

// ─── ABANDONED CART NOTIFICATIONS ─────────────────────────────────────────
async function handleAbandonedCarts(supabase: ReturnType<typeof createClient>) {
  // Find users with cart items older than 3 hours who haven't been notified recently
  const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();

  const { data: cartUsers } = await supabase
    .from("cart_items")
    .select("user_id, updated_at")
    .lt("updated_at", threeHoursAgo)
    .gte("updated_at", oneDayAgo);

  if (!cartUsers || cartUsers.length === 0) return { sent: 0 };

  const uniqueUsers = [...new Set(cartUsers.map((c) => c.user_id))];

  // Check who already got an abandoned cart notification in the last 24h
  const { data: recentNotifs } = await supabase
    .from("notifications")
    .select("user_id")
    .eq("type", "abandoned_cart")
    .gte("created_at", oneDayAgo)
    .in("user_id", uniqueUsers);

  const alreadyNotified = new Set((recentNotifs || []).map((n) => n.user_id));
  const toNotify = uniqueUsers.filter((uid) => !alreadyNotified.has(uid));

  if (toNotify.length === 0) return { sent: 0 };

  // Send notifications
  for (const userId of toNotify) {
    await saveInAppNotification(
      supabase,
      userId,
      "You left something behind! 🛒",
      "Your cart is waiting for you. Complete your purchase before items sell out!",
      "abandoned_cart",
      "🛒",
      "/cart",
    );
  }

  await sendPushViaOneSignal({
    title: "You left something behind! 🛒",
    body: "Your cart is waiting. Complete your purchase before items sell out!",
    icon: "🛒",
    link_url: "/cart",
    user_ids: toNotify,
  });

  return { sent: toNotify.length };
}

// ─── OFFER & DISCOUNT NOTIFICATIONS ──────────────────────────────────────
async function handleNewOffers(supabase: ReturnType<typeof createClient>) {
  // Find active offers created in last 30 minutes that haven't been broadcast
  const thirtyMinAgo = new Date(Date.now() - 30 * 60000).toISOString();

  const { data: newOffers } = await supabase
    .from("offers")
    .select("*")
    .eq("is_active", true)
    .gte("created_at", thirtyMinAgo);

  if (!newOffers || newOffers.length === 0) return { sent: 0 };

  let totalSent = 0;

  for (const offer of newOffers) {
    // Check if we already sent a notification for this offer
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("type", "offer")
      .filter("metadata->>offer_id", "eq", offer.id)
      .limit(1);

    if (existing && existing.length > 0) continue;

    const discountText = offer.discount_type === "percentage"
      ? `${offer.discount_value}% OFF`
      : `${offer.discount_value} IQD OFF`;

    const title = `${discountText} — ${offer.title} 🔥`;
    const body = offer.description || `Don't miss this deal! ${discountText} on selected products.`;
    const linkUrl = offer.link_url || "/collection/offers";

    // Get all users for broadcast
    const { data: allUsers } = await supabase.from("profiles").select("user_id");
    const userIds = (allUsers || []).map((u) => u.user_id);

    // Save in-app notifications (batch)
    const notifBatch = userIds.map((uid) => ({
      user_id: uid,
      title,
      body,
      type: "offer",
      icon: "🔥",
      link_url: linkUrl,
      image_url: offer.image_url || null,
      metadata: { offer_id: offer.id },
    }));

    for (let i = 0; i < notifBatch.length; i += 100) {
      await supabase.from("notifications").insert(notifBatch.slice(i, i + 100));
    }

    // Push to all
    await sendPushViaOneSignal({
      title,
      body,
      icon: "🔥",
      image_url: offer.image_url || undefined,
      link_url: linkUrl,
      user_ids: userIds,
    });

    totalSent += userIds.length;
  }

  return { sent: totalSent };
}

// ─── FEEDBACK REMINDER (for delivered orders) ────────────────────────────
async function handleFeedbackReminders(supabase: ReturnType<typeof createClient>) {
  // Find delivered orders from 2+ hours ago that haven't been rated
  const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

  const { data: deliveredOrders } = await supabase
    .from("orders")
    .select("id, user_id, updated_at")
    .eq("status", "delivered")
    .lt("updated_at", twoHoursAgo)
    .gte("updated_at", threeDaysAgo);

  if (!deliveredOrders || deliveredOrders.length === 0) return { sent: 0 };

  // Check which orders already have ratings
  const orderIds = deliveredOrders.map((o) => o.id);
  const { data: existingRatings } = await supabase
    .from("order_ratings")
    .select("order_id")
    .in("order_id", orderIds);

  const ratedOrderIds = new Set((existingRatings || []).map((r) => r.order_id));

  // Check which orders already got feedback notifications
  const { data: existingFeedbackNotifs } = await supabase
    .from("notifications")
    .select("metadata")
    .eq("type", "feedback")
    .filter("metadata->>feedback_sent", "eq", "true");

  const feedbackSentOrderIds = new Set(
    (existingFeedbackNotifs || []).map((n) => (n.metadata as any)?.order_id).filter(Boolean)
  );

  let sent = 0;
  for (const order of deliveredOrders) {
    if (ratedOrderIds.has(order.id) || feedbackSentOrderIds.has(order.id)) continue;

    const orderShort = order.id.slice(0, 8).toUpperCase();

    await saveInAppNotification(
      supabase,
      order.user_id,
      "How was your order? ⭐",
      `We'd love your feedback on order #${orderShort}. Your opinion helps us improve!`,
      "feedback",
      "⭐",
      "/orders",
      undefined,
      { order_id: order.id, feedback_sent: "true" },
    );

    await sendPushViaOneSignal({
      title: "How was your order? ⭐",
      body: `Rate your experience with order #${orderShort}. It only takes a moment!`,
      icon: "⭐",
      link_url: "/orders",
      user_ids: [order.user_id],
    });

    sent++;
  }

  return { sent };
}

// ─── WELCOME NOTIFICATION ────────────────────────────────────────────────
async function handleWelcomeNotification(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  // Check if already sent
  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "welcome")
    .limit(1);

  if (existing && existing.length > 0) return { sent: false };

  await saveInAppNotification(
    supabase,
    userId,
    "Welcome to ELARA! 💜",
    "Discover premium beauty products curated just for you. Explore our collections and enjoy exclusive offers!",
    "welcome",
    "💜",
    "/categories",
  );

  await sendPushViaOneSignal({
    title: "Welcome to ELARA! 💜",
    body: "Discover premium beauty products curated just for you!",
    icon: "💜",
    link_url: "/categories",
    user_ids: [userId],
  });

  return { sent: true };
}

// ─── PRICE DROP NOTIFICATION ─────────────────────────────────────────────
async function handlePriceDrops(supabase: ReturnType<typeof createClient>) {
  // Find products whose price dropped in the last hour
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
    if (discount < 10) continue; // Only notify for 10%+ drops

    // Check if notification for this product price drop was already sent
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("type", "price_drop")
      .filter("metadata->>product_id", "eq", product.id)
      .gte("created_at", new Date(Date.now() - 24 * 3600000).toISOString())
      .limit(1);

    if (existing && existing.length > 0) continue;

    // Find users who have this product in their wishlist
    const { data: wishlistUsers } = await supabase
      .from("cart_items")
      .select("user_id")
      .eq("product_id", product.id);

    // If no wishlist data, skip broadcast for price drops
    if (!wishlistUsers || wishlistUsers.length === 0) continue;

    const userIds = [...new Set(wishlistUsers.map((w) => w.user_id))];

    for (const uid of userIds) {
      await saveInAppNotification(
        supabase,
        uid,
        `Price Drop! ${discount}% OFF 💰`,
        `${product.title} is now ${product.price.toLocaleString()} IQD — save ${discount}%!`,
        "price_drop",
        "💰",
        `/product/${product.slug}`,
        undefined,
        { product_id: product.id },
      );
    }

    await sendPushViaOneSignal({
      title: `Price Drop! ${discount}% OFF 💰`,
      body: `${product.title} is now ${product.price.toLocaleString()} IQD!`,
      icon: "💰",
      link_url: `/product/${product.slug}`,
      user_ids: userIds,
    });

    sent += userIds.length;
  }

  return { sent };
}

// ─── AI PERSONALIZED SEARCH-BASED RECOMMENDATIONS ────────────────────────
async function handleSearchBasedRecommendations(supabase: ReturnType<typeof createClient>) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("LOVABLE_API_KEY not set, skipping AI notifications");
    return { sent: 0 };
  }

  // Get users who searched in the last 24h but didn't order
  const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 48 * 3600000).toISOString();

  // Get users with cart items (proxy for interest/search)
  const { data: cartUsers } = await supabase
    .from("cart_items")
    .select("user_id, product_id, products(title, slug, price, brand_id, brands(name))")
    .gte("updated_at", twoDaysAgo);

  if (!cartUsers || cartUsers.length === 0) return { sent: 0 };

  // Group by user
  const userProducts: Record<string, { titles: string[]; slugs: string[]; brandNames: string[] }> = {};
  for (const item of cartUsers) {
    const uid = item.user_id;
    if (!userProducts[uid]) userProducts[uid] = { titles: [], slugs: [], brandNames: [] };
    const p = item.products as any;
    if (p?.title) userProducts[uid].titles.push(p.title);
    if (p?.slug) userProducts[uid].slugs.push(p.slug);
    if (p?.brands?.name) userProducts[uid].brandNames.push(p.brands.name);
  }

  // Check who already received a search-based notification today
  const { data: recentNotifs } = await supabase
    .from("notifications")
    .select("user_id")
    .eq("type", "ai_recommendation")
    .gte("created_at", oneDayAgo);

  const alreadyNotified = new Set((recentNotifs || []).map((n) => n.user_id));
  const usersToNotify = Object.entries(userProducts).filter(([uid]) => !alreadyNotified.has(uid));

  if (usersToNotify.length === 0) return { sent: 0 };

  let sent = 0;

  // Process up to 20 users per run to stay within rate limits
  for (const [userId, products] of usersToNotify.slice(0, 20)) {
    const uniqueBrands = [...new Set(products.brandNames)].slice(0, 3).join(", ");
    const uniqueTitles = [...new Set(products.titles)].slice(0, 3).join(", ");
    const firstSlug = products.slugs[0];

    try {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are ELARA's notification writer. Write a short, warm push notification (title max 40 chars, body max 100 chars) to remind a user about products they're interested in. Be professional, not pushy. Use beauty/skincare context. Return JSON: {"title":"...","body":"..."}`,
            },
            {
              role: "user",
              content: `User is interested in: ${uniqueTitles}. Brands: ${uniqueBrands || "various"}. Write a personalized push notification.`,
            },
          ],
          tools: [{
            type: "function",
            function: {
              name: "create_notification",
              description: "Create a push notification",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Notification title, max 40 chars" },
                  body: { type: "string", description: "Notification body, max 100 chars" },
                },
                required: ["title", "body"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "create_notification" } },
        }),
      });

      if (!aiRes.ok) {
        console.warn("AI gateway error:", aiRes.status);
        continue;
      }

      const aiData = await aiRes.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      let notif = { title: "Still thinking about it? ✨", body: "Your favorite products are waiting for you at ELARA!" };
      
      if (toolCall?.function?.arguments) {
        try { notif = JSON.parse(toolCall.function.arguments); } catch {}
      }

      await saveInAppNotification(
        supabase, userId, notif.title, notif.body,
        "ai_recommendation", "✨", `/product/${firstSlug}`,
      );

      await sendPushViaOneSignal({
        title: notif.title, body: notif.body, icon: "✨",
        link_url: `/product/${firstSlug}`, user_ids: [userId],
      });

      sent++;
      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.warn("AI notification error for user:", userId, e);
    }
  }

  return { sent };
}

// ─── DAILY OFFERS REMINDER ───────────────────────────────────────────────
async function handleDailyOffersReminder(supabase: ReturnType<typeof createClient>) {
  const today = new Date().toISOString().slice(0, 10);

  // Check if we already sent today's offers reminder
  const { data: todayReminder } = await supabase
    .from("notifications")
    .select("id")
    .eq("type", "daily_offers")
    .gte("created_at", `${today}T00:00:00Z`)
    .is("user_id", null)
    .limit(1);

  if (todayReminder && todayReminder.length > 0) return { sent: 0, reason: "already_sent_today" };

  // Get active offers
  const { data: activeOffers } = await supabase
    .from("offers")
    .select("id, title, discount_type, discount_value, image_url, link_url")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(3);

  if (!activeOffers || activeOffers.length === 0) return { sent: 0, reason: "no_active_offers" };

  const topOffer = activeOffers[0];
  const discountText = topOffer.discount_type === "percentage"
    ? `${topOffer.discount_value}%`
    : `${topOffer.discount_value.toLocaleString()} IQD`;

  const offerCount = activeOffers.length;
  const title = `Today's Deals — Up to ${discountText} OFF! 🎯`;
  const body = offerCount > 1
    ? `${offerCount} exclusive offers are live now. Don't miss out — shop before they expire!`
    : `${topOffer.title} — Save ${discountText} today. Limited time only!`;

  // Get all users
  const { data: allUsers } = await supabase.from("profiles").select("user_id");
  const userIds = (allUsers || []).map((u) => u.user_id);

  if (userIds.length === 0) return { sent: 0 };

  // Save broadcast in-app notification (null user_id = broadcast)
  await supabase.from("notifications").insert({
    user_id: null,
    title,
    body,
    type: "daily_offers",
    icon: "🎯",
    link_url: topOffer.link_url || "/collection/offers",
    image_url: topOffer.image_url || null,
    metadata: { date: today, offer_ids: activeOffers.map((o) => o.id) },
  });

  // Push to all
  await sendPushViaOneSignal({
    title,
    body,
    icon: "🎯",
    image_url: topOffer.image_url || undefined,
    link_url: topOffer.link_url || "/collection/offers",
    user_ids: [], // empty = all subscribed users
  });

  return { sent: userIds.length };
}

// ─── FREE DELIVERY REMINDER ─────────────────────────────────────────────
async function handleFreeDeliveryReminder(supabase: ReturnType<typeof createClient>) {
  const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();

  // Find users with cart total between 25,000 and 39,999 IQD (close to free delivery threshold)
  const { data: cartItems } = await supabase
    .from("cart_items")
    .select("user_id, quantity, products(price)")
    .gte("updated_at", new Date(Date.now() - 48 * 3600000).toISOString());

  if (!cartItems || cartItems.length === 0) return { sent: 0 };

  // Calculate cart totals per user
  const userTotals: Record<string, number> = {};
  for (const item of cartItems) {
    const price = (item.products as any)?.price || 0;
    userTotals[item.user_id] = (userTotals[item.user_id] || 0) + price * item.quantity;
  }

  // Users close to 40,000 threshold (between 25,000 and 39,999)
  const nearThreshold = Object.entries(userTotals)
    .filter(([, total]) => total >= 25000 && total < 40000);

  if (nearThreshold.length === 0) return { sent: 0 };

  // Check who already got this reminder recently
  const userIds = nearThreshold.map(([uid]) => uid);
  const { data: recentNotifs } = await supabase
    .from("notifications")
    .select("user_id")
    .eq("type", "free_delivery_hint")
    .gte("created_at", oneDayAgo)
    .in("user_id", userIds);

  const alreadyNotified = new Set((recentNotifs || []).map((n) => n.user_id));
  const toNotify = nearThreshold.filter(([uid]) => !alreadyNotified.has(uid));

  if (toNotify.length === 0) return { sent: 0 };

  let sent = 0;
  for (const [userId, total] of toNotify) {
    const remaining = 40000 - total;
    const remainingFormatted = remaining.toLocaleString();

    await saveInAppNotification(
      supabase, userId,
      "Almost there — Free Delivery! 🚚",
      `Add just ${remainingFormatted} IQD more to your cart and enjoy FREE delivery! Orders over 40,000 IQD ship free.`,
      "free_delivery_hint", "🚚", "/cart",
    );

    sent++;
  }

  // Push to all qualifying users
  await sendPushViaOneSignal({
    title: "You're so close to FREE delivery! 🚚",
    body: "Add a little more to your cart and get free shipping on orders over 40,000 IQD!",
    icon: "🚚",
    link_url: "/cart",
    user_ids: toNotify.map(([uid]) => uid),
  });

  return { sent };
}

// ─── SKINCARE ROUTINE REMINDER ───────────────────────────────────────────
async function handleSkincareRoutineReminder(supabase: ReturnType<typeof createClient>) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...

  // Only send on Mon, Wed, Fri
  if (![1, 3, 5].includes(dayOfWeek)) return { sent: 0, reason: "not_scheduled_day" };

  const todayStr = today.toISOString().slice(0, 10);

  // Check if already sent today
  const { data: todayNotif } = await supabase
    .from("notifications")
    .select("id")
    .eq("type", "skincare_tip")
    .gte("created_at", `${todayStr}T00:00:00Z`)
    .is("user_id", null)
    .limit(1);

  if (todayNotif && todayNotif.length > 0) return { sent: 0, reason: "already_sent" };

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return { sent: 0, reason: "no_api_key" };

  // Get current month for seasonal relevance
  const month = today.toLocaleString("en", { month: "long" });

  try {
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are ELARA's beauty expert. Write a short, useful skincare tip as a push notification. Be scientific but accessible. Consider the season (${month}, Middle East climate — hot and dry). Return a notification with title (max 40 chars) and body (max 120 chars). Keep it professional and helpful.`,
          },
          {
            role: "user",
            content: `Write today's skincare tip notification for ${month}. Day of week: ${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][dayOfWeek]}.`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_tip",
            description: "Create a skincare tip notification",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                body: { type: "string" },
              },
              required: ["title", "body"],
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
    let tip = { title: "Daily Skincare Tip 🌿", body: "Stay hydrated and always apply SPF before heading out — your skin will thank you!" };

    if (toolCall?.function?.arguments) {
      try { tip = JSON.parse(toolCall.function.arguments); } catch {}
    }

    // Broadcast notification
    await supabase.from("notifications").insert({
      user_id: null,
      title: tip.title,
      body: tip.body,
      type: "skincare_tip",
      icon: "🌿",
      link_url: "/categories",
      metadata: { date: todayStr },
    });

    await sendPushViaOneSignal({
      title: tip.title,
      body: tip.body,
      icon: "🌿",
      link_url: "/categories",
      user_ids: [], // all users
    });

    return { sent: 1, broadcast: true };
  } catch (e) {
    console.warn("Skincare tip error:", e);
    return { sent: 0, reason: "error" };
  }
}

// ─── REORDER REMINDER ────────────────────────────────────────────────────
async function handleReorderReminder(supabase: ReturnType<typeof createClient>) {
  // Remind users who ordered 25-35 days ago (typical reorder window for skincare)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const twentyFiveDaysAgo = new Date(Date.now() - 25 * 86400000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();

  const { data: oldOrders } = await supabase
    .from("orders")
    .select("user_id, id, order_items(products(title, slug))")
    .eq("status", "delivered")
    .lte("created_at", twentyFiveDaysAgo)
    .gte("created_at", thirtyDaysAgo);

  if (!oldOrders || oldOrders.length === 0) return { sent: 0 };

  const uniqueUsers = [...new Set(oldOrders.map((o) => o.user_id))];

  // Check recent reorder notifications
  const { data: recentNotifs } = await supabase
    .from("notifications")
    .select("user_id")
    .eq("type", "reorder_reminder")
    .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
    .in("user_id", uniqueUsers);

  const alreadyNotified = new Set((recentNotifs || []).map((n) => n.user_id));
  const toNotify = uniqueUsers.filter((uid) => !alreadyNotified.has(uid));

  if (toNotify.length === 0) return { sent: 0 };

  let sent = 0;
  for (const userId of toNotify) {
    const userOrder = oldOrders.find((o) => o.user_id === userId);
    const firstProduct = (userOrder?.order_items as any)?.[0]?.products;
    const productName = firstProduct?.title?.slice(0, 30) || "your favorites";

    await saveInAppNotification(
      supabase, userId,
      "Time to restock? 🔄",
      `It's been about a month since you ordered ${productName}. Running low? Reorder with free delivery on 40K+ IQD!`,
      "reorder_reminder", "🔄", "/orders",
    );

    sent++;
  }

  if (toNotify.length > 0) {
    await sendPushViaOneSignal({
      title: "Time to restock? 🔄",
      body: "It's been a month — reorder your favorites with free delivery on orders over 40,000 IQD!",
      icon: "🔄",
      link_url: "/orders",
      user_ids: toNotify,
    });
  }

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
        const abandoned = await handleAbandonedCarts(supabase);
        const offers = await handleNewOffers(supabase);
        const feedback = await handleFeedbackReminders(supabase);
        const priceDrops = await handlePriceDrops(supabase);
        const freeDelivery = await handleFreeDeliveryReminder(supabase);
        const searchRecs = await handleSearchBasedRecommendations(supabase);
        const reorder = await handleReorderReminder(supabase);
        result = {
          abandoned_carts: abandoned,
          new_offers: offers,
          feedback_reminders: feedback,
          price_drops: priceDrops,
          free_delivery_hint: freeDelivery,
          search_recommendations: searchRecs,
          reorder_reminder: reorder,
        };
        break;

      case "run_daily":
        // Daily jobs (run once per day via separate cron)
        const dailyOffers = await handleDailyOffersReminder(supabase);
        const skincareTip = await handleSkincareRoutineReminder(supabase);
        const dailyReorder = await handleReorderReminder(supabase);
        result = {
          daily_offers: dailyOffers,
          skincare_tip: skincareTip,
          reorder_reminder: dailyReorder,
        };
        break;

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-notifications error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});