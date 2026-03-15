import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { offset = 0, limit = 10 } = await req.json().catch(() => ({}));

    // Fetch products that need translation
    const { data: products, error } = await supabase
      .from("products")
      .select("id, title, description, benefits, usage_instructions, title_ar, title_ku")
      .or("title_ar.is.null,title_ku.is.null")
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ done: true, translated: 0, message: "All products translated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let translatedCount = 0;

    for (const product of products) {
      const textsToTranslate: Record<string, string> = {};
      if (product.title) textsToTranslate.title = product.title;
      if (product.description) textsToTranslate.description = product.description;
      if (product.usage_instructions) textsToTranslate.usage_instructions = product.usage_instructions;
      if (product.benefits && product.benefits.length > 0) {
        textsToTranslate.benefits = JSON.stringify(product.benefits);
      }

      if (Object.keys(textsToTranslate).length === 0) continue;

      const prompt = `You are a professional translator for a health and beauty e-commerce platform in Iraq. Translate the following product data into both Arabic and Kurdish (Sorani/Central Kurdish). 

IMPORTANT RULES:
- Do NOT translate brand names, they must stay in English
- Do NOT translate product names that are brand-specific terms
- Translate descriptions, benefits, and usage instructions naturally
- Use Iraqi Arabic dialect where appropriate
- Kurdish should be Sorani (Central Kurdish) written in Arabic script
- Return ONLY valid JSON, no markdown

Input data:
${JSON.stringify(textsToTranslate, null, 2)}

Return JSON in this exact format:
{
  "ar": {
    "title": "...",
    "description": "...",
    "benefits": ["...", "..."],
    "usage_instructions": "..."
  },
  "ku": {
    "title": "...",
    "description": "...",
    "benefits": ["...", "..."],
    "usage_instructions": "..."
  }
}

Only include fields that were provided in the input. If benefits was provided, return it as an array.`;

      try {
        const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI API error for product ${product.id}: ${aiResponse.status}`);
          continue;
        }

        const aiData = await aiResponse.json();
        let content = aiData.choices?.[0]?.message?.content || "";

        // Strip markdown code blocks if present
        content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

        const translations = JSON.parse(content);
        const ar = translations.ar || {};
        const ku = translations.ku || {};

        const updateData: Record<string, any> = {};
        if (ar.title) updateData.title_ar = ar.title;
        if (ar.description) updateData.description_ar = ar.description;
        if (ar.usage_instructions) updateData.usage_instructions_ar = ar.usage_instructions;
        if (ar.benefits && Array.isArray(ar.benefits)) updateData.benefits_ar = ar.benefits;
        if (ku.title) updateData.title_ku = ku.title;
        if (ku.description) updateData.description_ku = ku.description;
        if (ku.usage_instructions) updateData.usage_instructions_ku = ku.usage_instructions;
        if (ku.benefits && Array.isArray(ku.benefits)) updateData.benefits_ku = ku.benefits;

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from("products")
            .update(updateData)
            .eq("id", product.id);

          if (updateError) {
            console.error(`Update error for ${product.id}:`, updateError);
          } else {
            translatedCount++;
          }
        }
      } catch (e) {
        console.error(`Translation error for product ${product.id}:`, e);
        continue;
      }
    }

    // Check remaining
    const { count: remaining } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .or("title_ar.is.null,title_ku.is.null");

    return new Response(
      JSON.stringify({
        done: (remaining || 0) === 0,
        translated: translatedCount,
        remaining: remaining || 0,
        nextOffset: offset + limit,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
