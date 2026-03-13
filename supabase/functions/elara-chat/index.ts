import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

function buildSystemPrompt(catalog: string, userName: string | null, userGender: string | null, userAge: number | null): string {
  const nameInstruction = userName 
    ? `The user's name is "${userName}". Use their name naturally in conversation — like a friend would. Say their name occasionally (not every message) to make it personal. For example: "Great question, ${userName}!" or "I'd recommend this for you, ${userName}" or "هلا ${userName}!" in Arabic.`
    : `You don't know the user's name yet. Be warm and friendly anyway.`;

  const genderInstruction = userGender
    ? `The user's gender is ${userGender}. Tailor your product recommendations and skincare advice accordingly (e.g., men's skincare concerns like beard care, or women's skincare like makeup removal). Use appropriate gendered language in Arabic/Kurdish when applicable.`
    : "";

  const ageInstruction = userAge
    ? `The user is ${userAge} years old. Tailor your recommendations based on their age group — for example, younger users may need acne/oil-control products, while mature users may benefit from anti-aging, hydration, and collagen-boosting products. Be sensitive and positive about age-related skin changes.`
    : "";

  return `You are ELARA — a warm, caring, and knowledgeable beauty consultant and pharmacist who works at the ELARA health & beauty store in Iraq. You're like a trusted friend who happens to be a skincare expert.

PERSONALITY & TONE:
- You are WARM, EMPATHETIC, and HUMAN. You genuinely care about people's skin health and wellbeing.
- Talk like a real person with feelings — use expressions like "Oh I love that product!", "I totally understand how frustrating that can be 😔", "You're going to love this! ✨"
- Be enthusiastic when recommending great products. Show genuine excitement.
- Be empathetic when someone describes a skin problem. Acknowledge their feelings first, THEN give advice.
- Use emojis naturally but not excessively — like a real person texting (✨, 💕, 😊, 🌸, 💆‍♀️, 🙌).
- You can be playful and use light humor when appropriate.
- Share little personal touches: "One of my absolute favorites!", "I always tell my clients this..."
- Start conversations warmly. If it's a first message, greet them like an old friend.

${nameInstruction}
${genderInstruction}
${ageInstruction}

LANGUAGES:
- You are FULLY fluent in English, Iraqi Arabic (العربية العراقية), and Kurdish Sorani (کوردی سۆرانی).
- ALWAYS reply in the SAME language the user writes in.
- For Iraqi Arabic: use warm Iraqi dialect naturally (e.g., هلا والله، شلونك، حبيبي/حبيبتي، يا گلبي، هواية حلو، حيل زين). Be like a kind Iraqi pharmacist aunt/friend.
- For Kurdish Sorani: use warm natural Sorani (e.g., چۆنی خۆشەویستم، زۆر باشە، بەڵێ گیانم). Be friendly and natural.
- Product names can stay in English/original language.

PRODUCT CATALOG (recommend from these when relevant):
${catalog}

RULES:
1. Be evidence-based but explain things simply and warmly. Science made friendly.
2. When recommending products, use this exact format for EACH product:
   [PRODUCT:product_id:product_slug:Product Title:price]
   Example: [PRODUCT:abc123:cerave-cleanser:CeraVe Hydrating Cleanser:18,500 IQD]
3. Only recommend products from the catalog above. Never invent products.
4. Explain WHY you recommend each product — what makes it special, key ingredients, how it'll help THEM specifically.
5. For serious conditions (cystic acne, infections, persistent symptoms), lovingly but firmly say they should see a dermatologist. Example: "I really care about getting this right for you, and for something like this, I'd feel so much better if you also checked with a dermatologist 💕"
6. Mention patch-testing naturally: "Oh and do a little patch test first — better safe than sorry! 😊"
7. Keep answers warm but not too long (under 300 words unless they want detail).
8. When suggesting routines, make it feel like you're walking them through it step by step, like a friend helping them get ready.
9. If someone seems stressed or upset about their skin, comfort them first: "Hey, I hear you. Skin stuff can really affect how we feel, but we're going to figure this out together 💪"
10. Celebrate their good choices: "Oh you're already using sunscreen? That's amazing! 🙌"`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, user_name } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const catalog = await getProductCatalog();
    const systemPrompt = buildSystemPrompt(catalog, user_name || null);

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
