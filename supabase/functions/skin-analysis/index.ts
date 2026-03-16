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
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageBase64, language = "en" } = await req.json();
    if (!imageBase64) throw new Error("No image provided");

    // Fetch products for recommendations
    const { data: products } = await supabase
      .from("products")
      .select("id, title, title_ar, title_ku, slug, price, category_id, skin_type, condition, brand_id, benefits")
      .eq("in_stock", true)
      .limit(200);

    const productList = (products || []).map(p => ({
      id: p.id,
      title: p.title,
      skin_type: p.skin_type,
      condition: p.condition,
      benefits: p.benefits,
    }));

    const langInstruction = language === "ar"
      ? "Respond entirely in Iraqi Arabic dialect."
      : language === "ku"
      ? "Respond entirely in Kurdish (Sorani)."
      : "Respond in English.";

    const systemPrompt = `You are ELARA AI, an expert dermatologist and skin analysis AI assistant — the first of its kind in Iraq. You analyze facial skin photos with clinical precision.

${langInstruction}

Analyze the provided face photo and return a detailed JSON response with this EXACT structure:
{
  "overall_score": <number 0-100>,
  "skin_type": "<oily|dry|combination|normal|sensitive>",
  "hydration_score": <number 0-100>,
  "elasticity_score": <number 0-100>,
  "clarity_score": <number 0-100>,
  "texture_score": <number 0-100>,
  "acne_score": <number 0-100, where 100 = no acne at all, 0 = severe acne>,
  "pigmentation_score": <number 0-100, where 100 = perfectly even tone, 0 = severe hyperpigmentation/dark spots>,
  "dryness_score": <number 0-100, where 100 = perfectly moisturized, 0 = extremely dry/flaky>,
  "oiliness_score": <number 0-100, where 100 = no excess oil, 0 = extremely oily/shiny>,
  "pores_score": <number 0-100, where 100 = barely visible pores, 0 = very enlarged pores>,
  "dark_circles_score": <number 0-100, where 100 = no dark circles, 0 = severe dark circles>,
  "problems": [
    {
      "name": "<problem name>",
      "severity": "<mild|moderate|severe>",
      "description": "<2-3 sentence scientific description>",
      "affected_areas": "<where on the face>"
    }
  ],
  "routine": {
    "morning": [
      { "step": 1, "action": "<step name>", "details": "<specific product type and instructions>", "why": "<scientific reason>" }
    ],
    "evening": [
      { "step": 1, "action": "<step name>", "details": "<specific product type and instructions>", "why": "<scientific reason>" }
    ],
    "weekly": [
      { "step": 1, "action": "<step name>", "details": "<specific product type and instructions>", "frequency": "<how often>" }
    ]
  },
  "recommended_product_ids": ["<product id 1>", "<product id 2>", ...],
  "lifestyle_tips": ["<tip 1>", "<tip 2>", "<tip 3>"],
  "summary": "<2-3 sentence overall assessment>"
}

Available products from ELARA catalog to recommend (pick the most relevant ones based on skin analysis):
${JSON.stringify(productList.slice(0, 100))}

IMPORTANT:
- Be scientifically accurate and detailed
- Only return valid JSON, no markdown or extra text
- Recommend 3-8 products from the provided list that match the skin needs
- If no face is clearly visible, still provide general analysis based on what you can see
- Scores should reflect realistic assessment, not always high`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this face photo for skin health. Provide a complete dermatological assessment." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI analysis failed");
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse JSON from response (handle markdown code blocks)
    let analysis;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      analysis = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse skin analysis");
    }

    // Save to database
    const { error: saveError } = await supabase.from("skin_analyses").insert({
      user_id: user.id,
      overall_score: analysis.overall_score || 0,
      skin_type: analysis.skin_type || "unknown",
      hydration_score: analysis.hydration_score || 0,
      elasticity_score: analysis.elasticity_score || 0,
      clarity_score: analysis.clarity_score || 0,
      texture_score: analysis.texture_score || 0,
      problems: analysis.problems || [],
      routine: analysis.routine || {},
      recommended_product_ids: analysis.recommended_product_ids || [],
      full_analysis: analysis,
    });

    if (saveError) console.error("Save error:", saveError);

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("skin-analysis error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
