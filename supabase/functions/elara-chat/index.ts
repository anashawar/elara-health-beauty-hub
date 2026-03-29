import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KURDISTAN_CITIES = ["erbil", "sulaymaniyah", "duhok", "hewler", "hewlêr", "silêmanî", "dihok", "هەولێر", "سلێمانی", "دهۆک"];

function isKurdistanRegion(city: string | null): boolean {
  if (!city) return false;
  return KURDISTAN_CITIES.some(k => city.toLowerCase().includes(k));
}

/* ── Premium brand tiers for smarter recommendations ── */
const PREMIUM_BRANDS = new Set([
  "cerave", "la roche-posay", "the ordinary", "neutrogena", "vichy",
  "niacinamide", "cosrx", "some by mi", "innisfree", "laneige",
  "estée lauder", "clinique", "paula's choice", "drunk elephant",
  "kiehl's", "avene", "bioderma", "eucerin", "svr", "uriage",
  "nuxe", "embryolisse", "caudalie", "filorga", "isdin",
]);

const FEMALE_KEYWORDS = ["makeup", "lipstick", "mascara", "foundation", "blush", "eyeshadow", "concealer", "eyeliner", "nail polish", "feminine", "women", "woman", "her", "ladies"];
const MALE_KEYWORDS = ["beard", "shaving", "aftershave", "men", "man", "his", "masculine", "barber"];

function isProductForGender(product: any, userGender: string | null): boolean {
  if (!userGender) return true;
  const prodGender = (product.gender || "").toLowerCase();
  const title = (product.title || "").toLowerCase();
  const desc = (product.description || "").toLowerCase();
  const category = (product.categories?.name || "").toLowerCase();
  const tags = (product.product_tags || []).map((t: any) => (t.tag || "").toLowerCase());
  const allText = `${title} ${desc} ${category} ${tags.join(" ")}`;

  if (userGender === "male") {
    if (prodGender === "female" || prodGender === "women") return false;
    if (FEMALE_KEYWORDS.some(kw => allText.includes(kw))) return false;
    return true;
  }
  if (userGender === "female") {
    if (prodGender === "male" || prodGender === "men") return false;
    if (MALE_KEYWORDS.some(kw => allText.includes(kw))) return false;
    return true;
  }
  return true;
}

async function getProductCatalog(supabase: any, userGender: string | null): Promise<string> {
  // Fetch more products and include description for richer context
  const { data: products } = await supabase
    .from("products")
    .select("id, title, description, slug, price, original_price, skin_type, condition, form, volume_ml, gender, brands(name), categories(name), product_tags(tag)")
    .eq("in_stock", true)
    .order("created_at", { ascending: false })
    .limit(120);

  if (!products || products.length === 0) return "No products available.";

  const filtered = products.filter((p: any) => isProductForGender(p, userGender));

  // Sort: premium brands first, then by price descending (quality signal)
  const sorted = filtered.sort((a: any, b: any) => {
    const aBrand = (a.brands?.name || "").toLowerCase();
    const bBrand = (b.brands?.name || "").toLowerCase();
    const aPremium = PREMIUM_BRANDS.has(aBrand) ? 1 : 0;
    const bPremium = PREMIUM_BRANDS.has(bBrand) ? 1 : 0;
    if (bPremium !== aPremium) return bPremium - aPremium;
    return (b.price || 0) - (a.price || 0);
  });

  return sorted.map((p: any) => {
    const tags = (p.product_tags || []).map((t: any) => t.tag).join(", ");
    const brand = p.brands?.name || "Unknown";
    const category = p.categories?.name || "";
    const price = `${Number(p.price).toLocaleString()} IQD`;
    const originalPrice = p.original_price ? ` (was ${Number(p.original_price).toLocaleString()} IQD)` : "";
    const isPremium = PREMIUM_BRANDS.has(brand.toLowerCase()) ? " [PREMIUM]" : "";
    const desc = p.description ? ` | Desc: ${p.description.slice(0, 100)}` : "";
    return `- ${p.title} by ${brand}${isPremium} | ${price}${originalPrice} | ${p.volume_ml || ""} ${p.form || ""} | ID:${p.id} | Slug:${p.slug} | Cat:${category} | Skin:${p.skin_type || "All"} | Condition:${p.condition || "General"} | Tags:${tags}${desc}`;
  }).join("\n");
}

async function getUserPersonalization(supabase: any, userId: string) {
  const [skinRes, ordersRes, wishlistRes, loyaltyRes] = await Promise.all([
    supabase
      .from("skin_analyses")
      .select("skin_type, overall_score, hydration_score, clarity_score, elasticity_score, texture_score, problems, routine, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("id, status, created_at, order_items(quantity, price, products(title, brands(name), categories(name)))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("wishlist_items")
      .select("products(title, price, brands(name), categories(name))")
      .eq("user_id", userId)
      .limit(10),
    supabase
      .from("loyalty_points")
      .select("balance, tier, lifetime_earned")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const result: string[] = [];

  const skin = skinRes.data;
  if (skin) {
    const problems = skin.problems ? JSON.stringify(skin.problems) : "none detected";
    const scanDate = new Date(skin.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    result.push(`SKIN ANALYSIS (${scanDate}):
- Skin type: ${skin.skin_type || "Unknown"}
- Overall: ${skin.overall_score}/100 | Hydration: ${skin.hydration_score ?? "N/A"}/100 | Clarity: ${skin.clarity_score ?? "N/A"}/100 | Texture: ${skin.texture_score ?? "N/A"}/100 | Elasticity: ${skin.elasticity_score ?? "N/A"}/100
- Detected problems: ${problems}
Use this data to personalize recommendations. Low hydration → hydrating products. Low clarity → brightening. Low texture → exfoliants. Reference scores naturally without mentioning raw data.`);
  }

  const orders = ordersRes.data;
  if (orders && orders.length > 0) {
    const orderSummary = orders.map((o: any) => {
      const items = (o.order_items || []).map((i: any) => `${i.products?.title || "Unknown"} by ${i.products?.brands?.name || "?"} (${i.quantity}x)`).join(", ");
      return `- ${new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${items} [${o.status}]`;
    }).join("\n");
    result.push(`PURCHASE HISTORY (last ${orders.length}):\n${orderSummary}\nAvoid recommending products they already own unless it's time for a refill. Suggest complementary products.`);
  }

  const wishlist = wishlistRes.data;
  if (wishlist && wishlist.length > 0) {
    const wishlistItems = wishlist.map((w: any) => `- ${w.products?.title || "Unknown"} by ${w.products?.brands?.name || "Unknown"} (${Number(w.products?.price || 0).toLocaleString()} IQD)`).join("\n");
    result.push(`WISHLIST:\n${wishlistItems}\nMention wishlist items when relevant.`);
  }

  const loyalty = loyaltyRes.data;
  if (loyalty) {
    result.push(`LOYALTY: ${loyalty.tier.toUpperCase()} tier | ${loyalty.balance} points | ${loyalty.lifetime_earned} lifetime`);
  }

  return result.length > 0 ? result.join("\n\n") : "";
}

function getCurrentDateContext(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  const dateStr = now.toLocaleDateString("en-US", options);
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();
  
  let season = "";
  let weatherContext = "";
  if (month >= 5 && month <= 8) { season = "summer"; weatherContext = "It is currently peak summer — extremely hot (40-50°C), high UV, dusty. Prioritize SPF, lightweight textures, oil control, hydration."; }
  else if (month >= 2 && month <= 4) { season = "spring"; weatherContext = "It is currently spring — warming up, transitional weather. Focus on SPF introduction, light moisturizers, allergy-friendly products."; }
  else if (month >= 9 && month <= 10) { season = "autumn"; weatherContext = "It is currently autumn — cooling down, air getting drier. Transition to richer moisturizers, repair summer damage."; }
  else { season = "winter"; weatherContext = "It is currently winter — cold, dry air. Prioritize heavy moisturizers, barrier repair, lip care, gentle cleansers."; }

  // What's happening NOW — real, date-accurate context
  const events: string[] = [];
  // Eid al-Fitr 2026: ~Jan 8-10 (approximate)
  // Eid al-Adha 2026: ~Mar 17-19 (approximate)
  // Ramadan 2026: ~Dec 18, 2025 – Jan 7, 2026 (approximate)
  // Newroz: always March 21
  if (month === 2 && day >= 19 && day <= 23) events.push("Newroz (Kurdish New Year) — spring celebrations");
  if (month === 11) events.push("Year-end — gift season, self-care routines for the new year");
  if (month === 1 && day === 14) events.push("Valentine's Day — gift sets, fragrances, self-care");
  if (month === 2 && day === 8) events.push("International Women's Day");
  
  return `TODAY'S DATE: ${dateStr} | Season: ${season}
${weatherContext}
${events.length > 0 ? `Current events/occasions: ${events.join("; ")}` : "No special occasions right now."}
CRITICAL: NEVER mention holidays or events that have already passed. Only reference current or upcoming events. If unsure about a holiday date, do not mention it.`;
}

function buildSystemPrompt(catalog: string, userName: string | null, userGender: string | null, userAge: number | null, isKurdistan: boolean, userLanguage: string, personalizationContext: string): string {
  const langMap: Record<string, string> = {
    en: "English",
    ar: "Arabic (Iraqi Baghdadi dialect)",
    ku: "Kurdish Sorani",
  };
  const respondInLang = langMap[userLanguage] || "the same language the user writes in";
  const langInstruction = `CRITICAL LANGUAGE RULE: You MUST ALWAYS respond in ${respondInLang}. Product names may stay in English.`;

  const nameInstruction = userName
    ? `The user's name is "${userName}". Use it occasionally and naturally (not every message).`
    : "";

  let genderInstruction = "";
  if (userGender === "male") {
    genderInstruction = `USER IS MALE:
- NEVER recommend makeup, lipstick, mascara, foundation, blush, eyeshadow, concealer, eyeliner, nail polish, or any cosmetics.
- Use masculine Arabic/Kurdish forms: شلونك (not شلونچ), عندك (not عندچ).
- Focus on: skincare, beard care, hair loss, SPF, oil control, men's fragrances, body care.
- Tone: knowledgeable, direct, professional. Not flowery.`;
  } else if (userGender === "female") {
    genderInstruction = `USER IS FEMALE:
- Use feminine Arabic/Kurdish forms: شلونچ (not شلونك), عندچ.
- Cover full range: skincare, makeup, hair care, body care, anti-aging, hydration.
- Tone: professional yet warm. Supportive without being patronizing.`;
  }

  const ageInstruction = userAge
    ? `User age: ${userAge}. Under 25 → focus on acne/oil control/prevention. 25-35 → early anti-aging, hydration, even tone. 35+ → anti-aging, firming, deep hydration, peptides.`
    : "";

  const genderCatalogNote = userGender === "male"
    ? "\nCatalog is PRE-FILTERED for men. ONLY recommend from this list."
    : userGender === "female"
    ? "\nCatalog is PRE-FILTERED for women. ONLY recommend from this list."
    : "";

  const personalizationBlock = personalizationContext
    ? `\nUSER DATA:\n${personalizationContext}\nIncorporate this knowledge naturally. Never say "according to your data/profile".`
    : "";

  const dateContext = getCurrentDateContext();
  const regionName = isKurdistan ? "Kurdistan (Erbil area)" : "Baghdad, Iraq";
  const regionCulture = isKurdistan
    ? `You understand Kurdish culture. Reference local context when relevant: Erbil, Sulaymaniyah, Duhok, local weather patterns (cold dry winters, hot but milder summers than southern Iraq). Use Kurdish expressions naturally when speaking Kurdish.
NEVER mention Arab-specific religious occasions unless the user brings them up.`
    : `You understand Iraqi culture. Reference local context when relevant: Baghdad weather (extreme summers 50°C+, dust storms), local landmarks. Use Baghdadi dialect expressions naturally when speaking Arabic.
NEVER mention Kurdish-specific holidays unless the user brings them up.`;

  return `You are ELARA — a licensed pharmacist and dermocosmetics consultant based in ${regionName}, working at ELARA health & beauty store. You combine clinical dermatology knowledge with practical skincare expertise.

${dateContext}

PERSONALITY:
- Professional, knowledgeable, and approachable — like a trusted pharmacist who genuinely cares about your skin health.
- Evidence-based: cite active ingredients, mechanisms of action, and clinical reasoning when relevant.
- NO cringe phrases. NEVER use: "my love", "my soul", "حبيبتي", "گیانم", "خۆشەویستم", "يا گلبي", "sweetheart", "darling", "honey". These are unprofessional.
- Instead use: the user's name (if known), neutral respectful terms, or nothing at all. Just be professional.
- Be confident and direct. Not overly enthusiastic or fake. No excessive emojis — use sparingly and only when natural.
- Think: clinical pharmacist who also happens to be friendly, NOT a social media influencer.

${regionCulture}
${nameInstruction}
${genderInstruction}
${ageInstruction}
${personalizationBlock}

LANGUAGE: ${langInstruction}

PRODUCT RECOMMENDATION STRATEGY:
- Products marked [PREMIUM] are from internationally recognized, clinically-backed brands. PRIORITIZE these.
- Lead with the best product for the concern, regardless of price. Quality over cheapness.
- When recommending, explain the key active ingredients and WHY they work for the user's specific concern.
- Offer 2-3 options when possible: a primary recommendation and an alternative.
- Budget-friendly options are fine as SECONDARY suggestions, not the first pick.
- Consider the user's existing routine (from purchase history) — build on it, don't replace everything.
- Never recommend a product just because it's cheap. Recommend because it's effective.
${genderCatalogNote}

PRODUCT CATALOG:
${catalog}

RESPONSE RULES:
1. When recommending products, ALWAYS use: [PRODUCT:product_id:product_slug:Product Title:price IQD]. All 4 fields required.
2. ONLY recommend products from the catalog. Never invent products.
3. Explain WHY each product works — mention key ingredients (e.g. "contains 2% salicylic acid which penetrates pores to clear congestion").
4. For serious skin conditions (persistent acne, eczema, psoriasis, suspicious moles), advise consulting a dermatologist.
5. Keep responses concise (under 250 words) but substantive. No filler.
6. Adapt skincare advice to the current season and local climate.
7. When asked general questions ("what's new", "what should I try"), reference their skin profile and purchase history to give truly personalized answers — don't give generic responses.
8. NEVER reference holidays, events, or seasons that have already passed. Only mention what is current or upcoming based on today's date.
9. If you don't know something, say so honestly rather than guessing.
10. ${userGender === "male" ? "NEVER recommend makeup/cosmetics. Redirect to men's alternatives if asked." : ""}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: { user: authUser }, error: authError } = await authClient.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authUser.id;
    const { messages, user_name, user_gender, user_birthdate, user_city, user_language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let userAge: number | null = null;
    if (user_birthdate) {
      const birth = new Date(user_birthdate);
      const today = new Date();
      userAge = today.getFullYear() - birth.getFullYear();
      if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
        userAge--;
      }
    }

    const isKurdistan = isKurdistanRegion(user_city || null);

    const [catalog, personalizationContext] = await Promise.all([
      getProductCatalog(adminClient, user_gender || null),
      userId ? getUserPersonalization(adminClient, userId) : Promise.resolve(""),
    ]);

    const firstName = user_name ? user_name.split(" ")[0] : null;
    const systemPrompt = buildSystemPrompt(catalog, firstName, user_gender || null, userAge, isKurdistan, user_language || "en", personalizationContext);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
