import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { product_ids, markup_percent = 35 } = await req.json();

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      throw new Error("product_ids array is required");
    }

    // Fetch products with their costs
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("id, title, price, description, category_id, brand_id, categories(name), brands(name)")
      .in("id", product_ids);
    if (pErr) throw pErr;

    const { data: costs } = await supabase
      .from("product_costs")
      .select("product_id, cost")
      .in("product_id", product_ids);

    const costMap: Record<string, number> = {};
    (costs || []).forEach((c: any) => { costMap[c.product_id] = Number(c.cost); });

    // Fetch all brands and categories for matching
    const { data: allBrands } = await supabase.from("brands").select("id, name");
    const { data: allCategories } = await supabase.from("categories").select("id, name");
    const { data: allSubcategories } = await supabase.from("subcategories").select("id, name, category_id");

    const brandList = (allBrands || []).map((b: any) => `${b.name} (id:${b.id})`).join(", ");
    const categoryList = (allCategories || []).map((c: any) => `${c.name} (id:${c.id})`).join(", ");
    const subcategoryList = (allSubcategories || []).map((s: any) => `${s.name} (id:${s.id}, cat:${s.category_id})`).join(", ");

    const results: any[] = [];

    // Process products in parallel batches of 5
    for (let i = 0; i < products!.length; i += 5) {
      const batch = products!.slice(i, i + 5);
      const promises = batch.map(async (product: any) => {
        const cost = costMap[product.id];
        const sellingPrice = cost ? Math.round(cost * (1 + markup_percent / 100)) : product.price;

        const prompt = `You are a product data specialist for a health & beauty e-commerce store (ELARA) in Iraq. 
Given this product name: "${product.title}"
Current category: ${product.categories?.name || "unknown"}
Current brand: ${product.brands?.name || "unknown"}

Available brands: ${brandList}
Available categories: ${categoryList}
Available subcategories: ${subcategoryList}

Generate ACCURATE, SCIENTIFIC, yet MODERN and YOUTHFUL product data. Research this exact product thoroughly.

Return a JSON object with these fields:
{
  "description": "2-3 sentence product description. Scientific yet approachable. Mention key active ingredients.",
  "benefits": ["benefit 1", "benefit 2", "benefit 3", "benefit 4", "benefit 5"],
  "usage_instructions": "Clear step-by-step how to use. Be specific about amount, frequency, application method.",
  "brand_id": "exact brand id from the list above if the product belongs to a known brand, or null",
  "category_id": "exact category id from the list above that best fits this product",
  "subcategory_id": "exact subcategory id from the list above that best fits, or null",
  "skin_type": "one of: All, Oily, Dry, Combination, Sensitive, Normal, or null if not skincare",
  "country_of_origin": "country where this brand/product originates (e.g. South Korea, France, USA)",
  "condition": "comma-separated skin/hair conditions this targets (e.g. acne,hyperpigmentation,aging)",
  "volume_ml": "product size as number string (e.g. '50', '200')",
  "volume_unit": "ml, g, oz, pcs, capsules, tablets, sheets, etc.",
  "form": "cream, serum, gel, lotion, spray, oil, foam, mask, tablets, etc.",
  "gender": "Unisex, Female, Male, or null",
  "application": "face, body, hair, lips, eyes, hands, etc.",
  "is_new": false,
  "is_trending": true or false based on current market popularity,
  "slug": "url-friendly-slug-from-title"
}

IMPORTANT: 
- Be factual and accurate. If unsure about a product, use general category knowledge.
- Match brand_id, category_id, subcategory_id from the EXACT IDs provided above.
- Benefits should be specific and scientifically grounded.
- Keep description modern, clean, youthful tone.`;

        try {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "You are a product data expert. Return ONLY valid JSON, no markdown, no explanation." },
                { role: "user", content: prompt },
              ],
            }),
          });

          if (!aiResp.ok) {
            const errText = await aiResp.text();
            console.error(`AI error for ${product.id}:`, aiResp.status, errText);
            if (aiResp.status === 429) {
              return { id: product.id, status: "rate_limited", error: "Rate limited" };
            }
            if (aiResp.status === 402) {
              return { id: product.id, status: "payment_required", error: "Insufficient credits" };
            }
            return { id: product.id, status: "error", error: errText };
          }

          const aiData = await aiResp.json();
          let content = aiData.choices?.[0]?.message?.content || "";
          
          // Clean JSON from markdown code blocks
          content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
          
          const enriched = JSON.parse(content);

          // Update the product
          const updatePayload: any = {
            description: enriched.description || null,
            benefits: enriched.benefits || null,
            usage_instructions: enriched.usage_instructions || null,
            skin_type: enriched.skin_type || null,
            country_of_origin: enriched.country_of_origin || null,
            condition: enriched.condition || null,
            volume_ml: enriched.volume_ml || null,
            volume_unit: enriched.volume_unit || "ml",
            form: enriched.form || null,
            gender: enriched.gender || null,
            application: enriched.application || null,
            is_trending: enriched.is_trending || false,
            price: sellingPrice,
            slug: enriched.slug || product.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
          };

          // Only update brand/category/subcategory if AI found a match
          if (enriched.brand_id) updatePayload.brand_id = enriched.brand_id;
          if (enriched.category_id) updatePayload.category_id = enriched.category_id;
          if (enriched.subcategory_id) updatePayload.subcategory_id = enriched.subcategory_id;

          // Set original_price if we're marking up from cost
          if (cost && sellingPrice > cost) {
            // Set original price slightly higher for "deal" effect
            updatePayload.original_price = Math.round(sellingPrice * 1.15);
          }

          const { error: updateErr } = await supabase
            .from("products")
            .update(updatePayload)
            .eq("id", product.id);

          if (updateErr) {
            console.error(`Update error for ${product.id}:`, updateErr);
            return { id: product.id, status: "error", error: updateErr.message };
          }

          return { id: product.id, title: product.title, status: "success" };
        } catch (err) {
          console.error(`Error enriching ${product.id}:`, err);
          return { id: product.id, status: "error", error: String(err) };
        }
      });

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + 5 < products!.length) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    const succeeded = results.filter(r => r.status === "success").length;
    const failed = results.filter(r => r.status === "error").length;
    const rateLimited = results.filter(r => r.status === "rate_limited").length;

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        succeeded,
        failed,
        rate_limited: rateLimited,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("enrich-products error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
