import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch products that do NOT already have a "gift" tag
    // We process in batches of 50 to stay within AI context limits
    const { data: alreadyTagged } = await supabase
      .from("product_tags")
      .select("product_id")
      .eq("tag", "gift");

    const taggedIds = new Set((alreadyTagged || []).map((t: any) => t.product_id));

    // Get products not yet analyzed — prioritize likely gift products
    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, title, description, price, original_price, brand_id, category_id, brands(name), categories(name)")
      .eq("in_stock", true)
      .or("title.ilike.%set%,title.ilike.%gift%,title.ilike.%perfume%,title.ilike.%fragrance%,title.ilike.%cologne%,title.ilike.%palette%,title.ilike.%collection%,title.ilike.%bundle%,title.ilike.%kit%,title.ilike.%trio%,title.ilike.%duo%,title.ilike.%mist%,title.ilike.%eau de%")
      .order("created_at", { ascending: false })
      .limit(300);

    if (prodErr) throw prodErr;

    // Filter out already tagged
    const untagged = (products || []).filter((p: any) => !taggedIds.has(p.id));
    if (untagged.length === 0) {
      return new Response(JSON.stringify({ message: "No new products to analyze", tagged: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Batch into groups of 40
    const BATCH_SIZE = 40;
    let totalTagged = 0;

    for (let i = 0; i < untagged.length; i += BATCH_SIZE) {
      const batch = untagged.slice(i, i + BATCH_SIZE);
      
      const productList = batch.map((p: any, idx: number) => 
        `${idx + 1}. [ID:${p.id}] "${p.title}" — Brand: ${p.brands?.name || "Unknown"}, Category: ${p.categories?.name || "Unknown"}, Price: ${p.price} IQD${p.original_price ? ` (was ${p.original_price})` : ""}`
      ).join("\n");

      const prompt = `You are a gift recommendation expert for an online beauty & health store in Iraq (ELARA).

Analyze these products and identify which ones are suitable as GIFTS. 

ONLY select products that fall into these categories:
- Gift sets, bundles, or collections (multi-product packs)
- Perfumes, fragrances, colognes, body mists
- Luxury/premium skincare or body care SETS (NOT individual products like a single moisturizer or cleanser)
- Makeup palettes or makeup gift sets
- Candles, diffusers, home fragrance
- Body care gift sets (lotion + shower gel combos, etc.)

DO NOT select:
- Individual skincare products (single serums, single moisturizers, single cleansers, single sunscreens)
- Individual cosmetics (single lipstick, single mascara)
- Supplements or vitamins
- Hair care individual products (single shampoo, single conditioner)
- Medical/treatment products

Products list:
${productList}

Return ONLY a JSON array of product IDs that are gift-suitable. Example: ["id1", "id2", "id3"]
If none are suitable, return an empty array: []
Return ONLY the JSON array, nothing else.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI error:", aiResponse.status, errText);
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, try again later", tagged: totalTagged }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required" }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        continue; // Skip this batch on error
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "[]";
      
      // Parse the AI response — extract JSON array
      let giftIds: string[] = [];
      try {
        const match = content.match(/\[[\s\S]*?\]/);
        if (match) {
          giftIds = JSON.parse(match[0]);
        }
      } catch (e) {
        console.error("Failed to parse AI response:", content);
        continue;
      }

      // Validate IDs against our batch
      const validBatchIds = new Set(batch.map((p: any) => p.id));
      const validGiftIds = giftIds.filter((id: string) => validBatchIds.has(id));

      if (validGiftIds.length > 0) {
        const tags = validGiftIds.map((id: string) => ({ product_id: id, tag: "gift" }));
        const { error: insertErr } = await supabase.from("product_tags").insert(tags);
        if (insertErr) {
          console.error("Insert error:", insertErr);
        } else {
          totalTagged += validGiftIds.length;
        }
      }
    }

    return new Response(JSON.stringify({ 
      message: `Gift detection complete`, 
      analyzed: untagged.length,
      tagged: totalTagged 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("detect-gift-products error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
