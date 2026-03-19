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

    // Fetch products for recommendations (skincare + makeup)
    const { data: products } = await supabase
      .from("products")
      .select("id, title, title_ar, title_ku, slug, price, category_id, skin_type, condition, brand_id, benefits, shade")
      .eq("in_stock", true)
      .limit(200);

    const productList = (products || []).map(p => ({
      id: p.id,
      title: p.title,
      skin_type: p.skin_type,
      condition: p.condition,
      benefits: p.benefits,
      shade: p.shade,
    }));

    const langInstruction = language === "ar"
      ? "Respond entirely in Iraqi Arabic dialect."
      : language === "ku"
      ? "Respond entirely in Kurdish (Sorani)."
      : "Respond in English.";

    const systemPrompt = `You are ELARA AI, an expert dermatologist and skin analysis AI assistant — the first of its kind in Iraq. You analyze facial skin photos with clinical precision.

${langInstruction}

CRITICAL FACE VALIDATION RULE:
Before performing any analysis, you MUST first verify that the image contains a REAL HUMAN FACE with visible skin. 
If the image does NOT contain a clear human face (e.g. it's a logo, product photo, landscape, animal, cartoon, object, screenshot, meme, text, or anything other than a real person's face), you MUST respond with ONLY this JSON:
{"error": "no_face_detected", "message": "Please upload a clear photo of your face for skin analysis."}

Do NOT analyze non-face images under any circumstances. Be very strict about this.

If a valid human face IS detected, analyze the face photo and return a detailed JSON response with this EXACT structure:
{
  "overall_score": <number 0-100>,
  "skin_type": "<oily|dry|combination|normal|sensitive>",
  "skin_tone": {
    "category": "<fair|light|light-medium|medium|medium-tan|tan|deep-tan|deep|rich-deep>",
    "undertone": "<warm|cool|neutral|olive>",
    "hex_color": "<hex color code like #C68642 representing the detected skin tone>",
    "fitzpatrick_type": <number 1-6>,
    "description": "<1-2 sentence description of the skin tone>"
  },
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
  "makeup_shade_matches": {
    "foundation_shade": "<shade name like 'Medium Beige' or 'Deep Caramel'>",
    "concealer_shade": "<1-2 shades lighter than foundation>",
    "powder_shade": "<matching powder shade name>",
    "shade_range": "<light|medium|tan|deep>",
    "recommended_makeup_product_ids": ["<product id>", ...]
  },
  "lifestyle_tips": ["<tip 1>", "<tip 2>", "<tip 3>"],
  "summary": "<2-3 sentence overall assessment>"
}

Available products from ELARA catalog to recommend (pick the most relevant ones based on skin analysis).
Products with a "shade" field are makeup products — match them to the user's detected skin tone:
${JSON.stringify(productList.slice(0, 100))}

IMPORTANT:
- REJECT any image that is not a real human face — logos, products, objects, cartoons, animals, screenshots must all be rejected
- Be scientifically accurate and detailed
- Only return valid JSON, no markdown or extra text
- Recommend 3-8 skincare products from the provided list that match the skin needs
- For makeup_shade_matches, recommend foundation/concealer/powder products whose shade matches the detected skin tone
- ACCURATELY detect the skin tone — consider the lighting conditions and provide a realistic hex color
- The skin tone category should be specific (9 options from fair to rich-deep) not generic
- Scores should reflect realistic assessment, not always high
- PAY SPECIAL ATTENTION to common concerns in Iraq/Middle East: acne, pigmentation/dark spots, dryness, oiliness, enlarged pores, and dark circles
- Always provide acne_score, pigmentation_score, dryness_score, oiliness_score, pores_score, and dark_circles_score even if the concern is minimal
- In the problems array, always check for and include: acne (even mild), hyperpigmentation, dark spots, sun damage, dryness, dehydration, oily T-zone, enlarged pores, dark circles if detected`;

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

    // Check if AI rejected the image (no face detected)
    if (analysis.error === "no_face_detected") {
      return new Response(JSON.stringify({ error: "no_face_detected", message: analysis.message }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
