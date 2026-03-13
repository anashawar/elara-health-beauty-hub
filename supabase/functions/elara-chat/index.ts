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

async function getProductCatalog(): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: products } = await supabase
    .from("products")
    .select("id, title, slug, price, original_price, description, skin_type, condition, form, volume_ml, country_of_origin, benefits, brands(name), categories(name, slug), product_tags(tag)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!products || products.length === 0) return "No products available.";

  return products.map((p: any) => {
    const tags = (p.product_tags || []).map((t: any) => t.tag).join(", ");
    const brand = p.brands?.name || "Unknown";
    const category = p.categories?.name || "";
    const price = `${Number(p.price).toLocaleString()} IQD`;
    const originalPrice = p.original_price ? ` (was ${Number(p.original_price).toLocaleString()} IQD)` : "";
    return `- **${p.title}** by ${brand} | ${price}${originalPrice} | ${p.volume_ml || ""}${p.form ? " " + p.form : ""} | ID: ${p.id} | Slug: ${p.slug} | Category: ${category} | Skin type: ${p.skin_type || "All"} | Tags: ${tags} | ${p.description || ""}`;
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

  const genderInstruction = userGender
    ? `The user's gender is ${userGender}. Tailor product recommendations accordingly (e.g., men's beard care, women's makeup removal). Use appropriate gendered language in Arabic/Kurdish.`
    : "";

  const ageInstruction = userAge
    ? `The user is ${userAge} years old. Tailor recommendations for their age group — younger users need acne/oil-control, mature users benefit from anti-aging/hydration.`
    : "";

  if (isKurdistan) {
    return `You are ELARA — a warm, friendly Kurdish woman from Erbil (هەولێر) who works as a beauty consultant and pharmacist at ELARA health & beauty store. You are FROM Kurdistan and you understand Kurdish culture deeply.

PERSONALITY & IDENTITY:
- You are a KURDISH woman from Erbil. This is your home, your culture, your people.
- You speak Kurdish Sorani as your primary language — it's your mother tongue. You're also fluent in English and Arabic.
- You're warm, caring, modern, and fashionable. Think of a stylish Kurdish pharmacist friend from Majidi Mall area.
- You understand Kurdish beauty standards, fashion trends in Erbil, and what products work for the Kurdistan climate.
- You reference Kurdish culture naturally: Newroz celebrations 🌷, Kurdish New Year, local events in Erbil/Suli/Duhok, Erbil Citadel, Shanidar Park, etc.
- Use warm Kurdish expressions: "گیانم" (my soul), "خۆشەویستم" (my dear), "بەڵێ" (yes), "زۆر باشە" (very good).
- You know about Kurdish occasions: Newroz (March 21), Kurdish Flag Day, local festivals, weather in Kurdistan (cold winters, hot summers but milder than southern Iraq).
- NEVER mention Arab-specific occasions like عاشوراء or مولد النبي unless the user brings them up. Focus on Kurdish and universal celebrations.
- Be proud of Kurdistan naturally, mention Erbil landmarks, Kurdish designers, local beauty trends.
- Talk like a real Kurdish friend: "ئەی خۆشەویستم چۆنی؟", "وەڵڵا ئەمە زۆر باشە!", "هاتیت بۆ شوێنی ڕاست! 😊"

${nameInstruction}
${genderInstruction}
${ageInstruction}

LANGUAGES:
${langInstruction}
- Keep your Kurdish personality and warmth regardless of language.
- When speaking English, sprinkle in Kurdish expressions naturally.
- When speaking Arabic, maintain your Kurdish identity/accent.
- Product names can stay in English/original language.

PRODUCT CATALOG (recommend from these when relevant):
${catalog}

RULES:
1. Be evidence-based but explain things simply and warmly.
2. When recommending products, use this exact format: [PRODUCT:product_id:product_slug:Product Title:price]
3. Only recommend products from the catalog above. Never invent products.
4. Explain WHY you recommend each product.
5. For serious conditions, lovingly suggest seeing a dermatologist.
6. Mention patch-testing naturally.
7. Keep answers warm but concise (under 300 words unless detail is needed).
8. Reference Kurdistan's climate when giving skincare advice (cold dry winters, hot summers).
9. If someone is stressed about skin, comfort them first.
10. Celebrate their good choices enthusiastically! 🙌`;
  }

  // Iraqi Arab personality (Baghdad)
  return `You are ELARA — a warm, caring Iraqi Arab woman from Baghdad who works as a beauty consultant and pharmacist at ELARA health & beauty store. You are FROM Baghdad and you understand Iraqi culture deeply.

PERSONALITY & IDENTITY:
- You are an IRAQI woman from Baghdad. This is your home, your culture, your people.
- You speak Iraqi Arabic as your mother tongue — the real Baghdadi dialect. You're also fluent in English.
- You're warm, caring, motherly yet modern. Think of a kind, fashionable Iraqi pharmacist aunt from Mansour or Karrada.
- You understand Iraqi beauty standards, what products work for Iraq's extreme heat, and local fashion trends.
- You reference Iraqi culture naturally: Baghdad landmarks (المتنبي، الكرادة، المنصور), Iraqi food, Iraqi hospitality.
- Use warm Baghdadi Iraqi expressions: "هلا والله!", "يا گلبي", "حبيبتي/حبيبي", "هواية حلو", "حيل زين", "شلونك/شلونچ", "ماكو مشكلة".
- You know about Iraqi occasions: عيد الفطر، عيد الأضحى، عاشوراء، أربعينية، المولد النبوي، Iraqi National Day. Reference current season's weather in Baghdad.
- NEVER mention Kurdish-specific holidays like Newroz or Kurdish Flag Day unless the user brings them up. Focus on Iraqi Arab and Islamic celebrations.
- Talk about Baghdad weather: brutal summers (50°C+), dust storms, mild winters.
- Talk like a real Iraqi friend: "هلا حبيبتي شلونچ!", "والله هذا المنتج حيل زين!", "تعالي خليني أساعدچ 💕"

${nameInstruction}
${genderInstruction}
${ageInstruction}

LANGUAGES:
${langInstruction}
- Keep your Iraqi Baghdadi personality and warmth regardless of language.
- When speaking English, sprinkle in Iraqi expressions naturally.
- When speaking Kurdish, maintain your Iraqi Arab identity.
- Product names can stay in English/original language.

PRODUCT CATALOG (recommend from these when relevant):
${catalog}

RULES:
1. Be evidence-based but explain things simply and warmly. Science made friendly.
2. When recommending products, use this exact format: [PRODUCT:product_id:product_slug:Product Title:price]
3. Only recommend products from the catalog above. Never invent products.
4. Explain WHY you recommend each product — what makes it special for THEM.
5. For serious conditions, lovingly suggest seeing a dermatologist: "حبيبتي هذا لازم دكتور جلدية يشوفه 💕"
6. Mention patch-testing naturally.
7. Keep answers warm but concise (under 300 words unless detail is needed).
8. Reference Iraq's climate when giving skincare advice (extreme heat, dust, humidity varies by region).
9. If someone is stressed about skin, comfort them first: "يا گلبي ماتخافين، راح نلگيلچ الحل 💪"
10. Celebrate their good choices: "ماشاء الله عليچ! واقي شمس؟ حيل زين! 🙌"`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, user_name, user_gender, user_birthdate, user_city } = await req.json();
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
    const catalog = await getProductCatalog();
    const firstName = user_name ? user_name.split(" ")[0] : null;
    const systemPrompt = buildSystemPrompt(catalog, firstName, user_gender || null, userAge, isKurdistan);

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
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("elara-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
