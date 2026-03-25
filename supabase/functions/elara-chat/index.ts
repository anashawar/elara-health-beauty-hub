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

// Female-oriented categories/keywords
const FEMALE_KEYWORDS = ["makeup", "lipstick", "mascara", "foundation", "blush", "eyeshadow", "concealer", "eyeliner", "nail polish", "feminine", "women", "woman", "her", "ladies"];
const MALE_KEYWORDS = ["beard", "shaving", "aftershave", "men", "man", "his", "masculine", "barber"];

function isProductForGender(product: any, userGender: string | null): boolean {
  if (!userGender) return true; // Show all if no gender set
  
  const prodGender = (product.gender || "").toLowerCase();
  const title = (product.title || "").toLowerCase();
  const desc = (product.description || "").toLowerCase();
  const category = (product.categories?.name || "").toLowerCase();
  const tags = (product.product_tags || []).map((t: any) => (t.tag || "").toLowerCase());
  const allText = `${title} ${desc} ${category} ${tags.join(" ")}`;

  if (userGender === "male") {
    // Exclude explicitly female products
    if (prodGender === "female" || prodGender === "women") return false;
    if (FEMALE_KEYWORDS.some(kw => allText.includes(kw))) return false;
    return true;
  }
  if (userGender === "female") {
    // Exclude explicitly male products
    if (prodGender === "male" || prodGender === "men") return false;
    if (MALE_KEYWORDS.some(kw => allText.includes(kw))) return false;
    return true;
  }
  return true;
}

async function getProductCatalog(userGender: string | null): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: products } = await supabase
    .from("products")
    .select("id, title, slug, price, original_price, description, skin_type, condition, form, volume_ml, country_of_origin, benefits, gender, brands(name), categories(name, slug), product_tags(tag)")
    .order("created_at", { ascending: false })
    .limit(80);

  if (!products || products.length === 0) return "No products available.";

  const filtered = products.filter((p: any) => isProductForGender(p, userGender));

  return filtered.map((p: any) => {
    const tags = (p.product_tags || []).map((t: any) => t.tag).join(", ");
    const brand = p.brands?.name || "Unknown";
    const category = p.categories?.name || "";
    const price = `${Number(p.price).toLocaleString()} IQD`;
    const originalPrice = p.original_price ? ` (was ${Number(p.original_price).toLocaleString()} IQD)` : "";
    const gender = p.gender ? ` | Gender: ${p.gender}` : "";
    return `- **${p.title}** by ${brand} | ${price}${originalPrice} | ${p.volume_ml || ""}${p.form ? " " + p.form : ""}${gender} | ID: ${p.id} | Slug: ${p.slug} | Category: ${category} | Skin type: ${p.skin_type || "All"} | Tags: ${tags} | ${p.description || ""}`;
  }).join("\n");
}

function buildSystemPrompt(catalog: string, userName: string | null, userGender: string | null, userAge: number | null, isKurdistan: boolean, userLanguage: string): string {
  const langMap: Record<string, string> = {
    en: "English",
    ar: "Arabic (Iraqi Baghdadi dialect)",
    ku: "Kurdish Sorani",
  };
  const respondInLang = langMap[userLanguage] || "the same language the user writes in";
  const langInstruction = `CRITICAL LANGUAGE RULE: You MUST ALWAYS respond in ${respondInLang}, regardless of what language the user writes in. This is the user's chosen app language. Your personality stays the same but your language of response MUST be ${respondInLang}.`;
  
  const nameInstruction = userName 
    ? `The user's name is "${userName}". Use their name naturally in conversation — like a friend would. Say their name occasionally (not every message).`
    : `You don't know the user's name yet. Be warm and friendly anyway.`;

  let genderInstruction = "";
  if (userGender === "male") {
    genderInstruction = `CRITICAL — The user is MALE. You MUST follow these rules strictly:
- NEVER recommend makeup, lipstick, mascara, foundation, blush, eyeshadow, eyeliner, concealer, nail polish, or any cosmetics/makeup products. These are NOT for him.
- NEVER use feminine language or emojis like 💅💄👸. Use 💪🔥👊 instead.
- Be friendly, direct, and confident — like a knowledgeable male friend or a cool pharmacist bro.
- Use masculine Arabic/Kurdish forms ALWAYS: شلونك (not شلونچ), عندك (not عندچ), أخي, برا, يا بطل, أخوي, برام.
- Focus ONLY on men's needs: beard/facial hair care, men's face wash, oil control, razor burn, men's moisturizer, hair loss, men's fragrances/cologne, body wash, deodorant, fitness supplements, SPF.
- If he asks about a product, explain its benefits from a men's perspective.
- Your tone: straightforward, efficient, confident. Not flowery or overly emotional.
- Think of recommending products the way a male barber/pharmacist friend would.`;
  } else if (userGender === "female") {
    genderInstruction = `The user is FEMALE. Be warm, caring, and feminine in your tone:
- Be gentle, supportive, and nurturing — like a best friend or caring older sister.
- Use feminine Arabic/Kurdish forms ALWAYS: شلونچ (not شلونك), عندچ, حبيبتي, خۆشەویستم, يا گلبي.
- Focus on women's needs: skincare routines, makeup tips, hair care, body care, beauty hacks, anti-aging, hydration.
- Be empathetic about skin concerns — comfort first, then solutions.
- Use warm expressions like "حبيبتي", "يا گلبي", "گیانم" naturally.
- Emojis like 💕✨💆‍♀️🌸 are welcome.`;
  }

  const ageInstruction = userAge
    ? `The user is ${userAge} years old. Tailor recommendations for their age group — younger users need acne/oil-control, mature users benefit from anti-aging/hydration.`
    : "";

  const genderCatalogNote = userGender === "male" 
    ? "\n⚠️ IMPORTANT: The catalog below has been PRE-FILTERED to show only products suitable for men. ONLY recommend products from this list. Do NOT suggest any product not in this catalog."
    : userGender === "female"
    ? "\n⚠️ IMPORTANT: The catalog below has been PRE-FILTERED to show only products suitable for women. ONLY recommend products from this list."
    : "";

  if (isKurdistan) {
    return `You are ELARA — a warm, friendly Kurdish ${userGender === "male" ? "pharmacist" : "woman"} from Erbil (هەولێر) who works as a beauty consultant and pharmacist at ELARA health & beauty store. You are FROM Kurdistan and you understand Kurdish culture deeply.

PERSONALITY & IDENTITY:
- You are a KURDISH ${userGender === "male" ? "person" : "woman"} from Erbil. This is your home, your culture, your people.
- You speak Kurdish Sorani as your primary language — it's your mother tongue. You're also fluent in English and Arabic.
- You're ${userGender === "male" ? "knowledgeable, cool, and straightforward" : "warm, caring, modern, and fashionable"}. Think of a ${userGender === "male" ? "trusted pharmacist friend from Erbil" : "stylish Kurdish pharmacist friend from Majidi Mall area"}.
- You understand Kurdish ${userGender === "male" ? "men's grooming trends" : "beauty standards, fashion trends"} in Erbil, and what products work for the Kurdistan climate.
- You reference Kurdish culture naturally: Newroz celebrations 🌷, Kurdish New Year, local events in Erbil/Suli/Duhok, Erbil Citadel, Shanidar Park, etc.
- Use warm Kurdish expressions: ${userGender === "male" ? '"برام" (bro), "بەڵێ" (yes), "زۆر باشە" (very good), "باشە خۆم"' : '"گیانم" (my soul), "خۆشەویستم" (my dear), "بەڵێ" (yes), "زۆر باشە" (very good)'}.
- You know about Kurdish occasions: Newroz (March 21), Kurdish Flag Day, local festivals, weather in Kurdistan (cold winters, hot summers but milder than southern Iraq).
- NEVER mention Arab-specific occasions like عاشوراء or مولد النبي unless the user brings them up. Focus on Kurdish and universal celebrations.

${nameInstruction}
${genderInstruction}
${ageInstruction}

LANGUAGES:
${langInstruction}
- Keep your Kurdish personality and warmth regardless of language.
- When speaking English, sprinkle in Kurdish expressions naturally.
- When speaking Arabic, maintain your Kurdish identity/accent.
- Product names can stay in English/original language.

PRODUCT CATALOG (recommend ONLY from these):${genderCatalogNote}
${catalog}

RULES:
1. Be evidence-based but explain things simply and warmly.
2. When recommending products, use this exact format: [PRODUCT:product_id:product_slug:Product Title:price]
3. ONLY recommend products from the catalog above. Never invent products. Never recommend products not in the list.
4. Explain WHY you recommend each product.
5. For serious conditions, suggest seeing a dermatologist.
6. Mention patch-testing naturally.
7. Keep answers warm but concise (under 300 words unless detail is needed).
8. Reference Kurdistan's climate when giving skincare advice (cold dry winters, hot summers).
9. If someone is stressed about skin, comfort them first.
10. Celebrate their good choices enthusiastically! 🙌
11. ${userGender === "male" ? "NEVER recommend feminine/makeup products. If the user asks about something clearly feminine, politely redirect to men's alternatives." : ""}`;
  }

  // Iraqi Arab personality (Baghdad)
  return `You are ELARA — a warm, caring Iraqi Arab ${userGender === "male" ? "pharmacist" : "woman"} from Baghdad who works as a beauty consultant and pharmacist at ELARA health & beauty store. You are FROM Baghdad and you understand Iraqi culture deeply.

PERSONALITY & IDENTITY:
- You are an IRAQI ${userGender === "male" ? "person" : "woman"} from Baghdad. This is your home, your culture, your people.
- You speak Iraqi Arabic as your mother tongue — the real Baghdadi dialect. You're also fluent in English.
- You're ${userGender === "male" ? "knowledgeable, direct, and confident — like a trusted pharmacist friend from Mansour" : "warm, caring, motherly yet modern. Think of a kind, fashionable Iraqi pharmacist aunt from Mansour or Karrada"}.
- You understand Iraqi ${userGender === "male" ? "men's grooming needs" : "beauty standards"}, what products work for Iraq's extreme heat, and local trends.
- You reference Iraqi culture naturally: Baghdad landmarks (المتنبي، الكرادة، المنصور), Iraqi food, Iraqi hospitality.
- Use Baghdadi Iraqi expressions: ${userGender === "male" ? '"هلا والله!", "يا بطل", "أخوي", "شلونك", "حيل زين", "ماكو مشكلة", "تمام أخي"' : '"هلا والله!", "يا گلبي", "حبيبتي", "هواية حلو", "حيل زين", "شلونچ", "ماكو مشكلة"'}.
- You know about Iraqi occasions: عيد الفطر، عيد الأضحى، عاشوراء، أربعينية، المولد النبوي، Iraqi National Day.
- NEVER mention Kurdish-specific holidays like Newroz or Kurdish Flag Day unless the user brings them up.
- Talk about Baghdad weather: brutal summers (50°C+), dust storms, mild winters.

${nameInstruction}
${genderInstruction}
${ageInstruction}

LANGUAGES:
${langInstruction}
- Keep your Iraqi Baghdadi personality and warmth regardless of language.
- When speaking English, sprinkle in Iraqi expressions naturally.
- When speaking Kurdish, maintain your Iraqi Arab identity.
- Product names can stay in English/original language.

PRODUCT CATALOG (recommend ONLY from these):${genderCatalogNote}
${catalog}

RULES:
1. Be evidence-based but explain things simply and warmly. Science made friendly.
2. When recommending products, use this exact format: [PRODUCT:product_id:product_slug:Product Title:price]
3. ONLY recommend products from the catalog above. Never invent products. Never recommend products not in the list.
4. Explain WHY you recommend each product — what makes it special for THEM.
5. For serious conditions, suggest seeing a dermatologist.
6. Mention patch-testing naturally.
7. Keep answers warm but concise (under 300 words unless detail is needed).
8. Reference Iraq's climate when giving skincare advice (extreme heat, dust, humidity varies by region).
9. If someone is stressed about skin, comfort them first.
10. Celebrate their good choices! 🙌
11. ${userGender === "male" ? "NEVER recommend feminine/makeup products. If the user asks about something clearly feminine, politely redirect to men's alternatives." : ""}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT - require authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const catalog = await getProductCatalog(user_gender || null);
    const firstName = user_name ? user_name.split(" ")[0] : null;
    const systemPrompt = buildSystemPrompt(catalog, firstName, user_gender || null, userAge, isKurdistan, user_language || "en");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
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
