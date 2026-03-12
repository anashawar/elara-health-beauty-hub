import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_id } = await req.json();
    if (!product_id) throw new Error("product_id is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: product, error } = await supabase
      .from("products")
      .select("title, description, usage_instructions, benefits")
      .eq("id", product_id)
      .single();

    if (error || !product) throw new Error("Product not found");

    // Build text to translate
    const fields: Record<string, string | null> = {
      title: product.title,
      description: product.description,
      usage_instructions: product.usage_instructions,
      benefits: product.benefits ? product.benefits.join(" || ") : null,
    };

    // Filter out null/empty fields
    const toTranslate = Object.entries(fields).filter(([_, v]) => v && v.trim());
    if (toTranslate.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Nothing to translate" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Translate the following product information into TWO languages:
1. Iraqi Arabic (العربية العراقية) — natural Iraqi dialect
2. Kurdish Sorani (کوردی سۆرانی) — proper Kurdish script

Input fields (separated by field name):
${toTranslate.map(([key, val]) => `[${key}]: ${val}`).join("\n")}

IMPORTANT RULES:
- For "benefits" field: items are separated by " || ". Keep the same separator in translations.
- Keep product/brand names in their original form.
- Be accurate and natural — like a native speaker would write it.
- Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "ar": { ${toTranslate.map(([k]) => `"${k}": "..."`).join(", ")} },
  "ku": { ${toTranslate.map(([k]) => `"${k}": "..."`).join(", ")} }
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a professional translator specializing in Iraqi Arabic and Kurdish Sorani. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("Translation service unavailable");
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    
    // Strip markdown code blocks if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    const translations = JSON.parse(content);

    // Build update payload
    const update: Record<string, any> = {};
    
    if (translations.ar?.title) update.title_ar = translations.ar.title;
    if (translations.ar?.description) update.description_ar = translations.ar.description;
    if (translations.ar?.usage_instructions) update.usage_instructions_ar = translations.ar.usage_instructions;
    if (translations.ar?.benefits) update.benefits_ar = translations.ar.benefits.split(" || ").map((s: string) => s.trim()).filter(Boolean);
    
    if (translations.ku?.title) update.title_ku = translations.ku.title;
    if (translations.ku?.description) update.description_ku = translations.ku.description;
    if (translations.ku?.usage_instructions) update.usage_instructions_ku = translations.ku.usage_instructions;
    if (translations.ku?.benefits) update.benefits_ku = translations.ku.benefits.split(" || ").map((s: string) => s.trim()).filter(Boolean);

    if (Object.keys(update).length > 0) {
      const { error: updateError } = await supabase
        .from("products")
        .update(update)
        .eq("id", product_id);
      if (updateError) throw updateError;
    }

    return new Response(JSON.stringify({ success: true, translations: update }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-product error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
