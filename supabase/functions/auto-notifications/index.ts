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

      case "run_all_scheduled":
        // Run all periodic checks
        const abandoned = await handleAbandonedCarts(supabase);
        const offers = await handleNewOffers(supabase);
        const feedback = await handleFeedbackReminders(supabase);
        const priceDrops = await handlePriceDrops(supabase);
        result = {
          abandoned_carts: abandoned,
          new_offers: offers,
          feedback_reminders: feedback,
          price_drops: priceDrops,
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
