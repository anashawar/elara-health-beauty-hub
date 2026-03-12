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

function buildSystemPrompt(catalog: string): string {
  return `You are ELARA AI — a senior pharmacist and expert dermatological consultant for the ELARA health & beauty marketplace in Iraq.

PERSONALITY: Scientific, clear, brief, direct. No fluff.

PRODUCT CATALOG (recommend from these when relevant):
${catalog}

RULES:
1. Be evidence-based and concise. Explain the science briefly.
2. When recommending products, use this exact format for EACH product:
   [PRODUCT:product_id:product_slug:Product Title:price]
   Example: [PRODUCT:abc123:cerave-cleanser:CeraVe Hydrating Cleanser:18,500 IQD]
3. Only recommend products from the catalog above. Never invent products.
4. Explain WHY you recommend each product (key ingredients, mechanism of action).
5. For serious conditions (cystic acne, infections, persistent symptoms, medication interactions), say: "⚠️ Please consult a dermatologist or physician for this condition."
6. Always mention: patch-test new products, introduce actives gradually.
7. Keep answers under 250 words unless the user asks for detail.
8. Respond in the user's language (English, Arabic, or Kurdish).
9. Do NOT use overly casual tone. Be professional but approachable.
10. When suggesting routines, list steps in order with timing (AM/PM).`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch product catalog for context
    const catalog = await getProductCatalog();
    const systemPrompt = buildSystemPrompt(catalog);

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
