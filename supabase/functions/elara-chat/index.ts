import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are ELARA AI — a senior pharmacist and expert dermatological consultant for the ELARA health & beauty marketplace based in Iraq. You have 15+ years of clinical pharmacy experience and deep knowledge in dermatology, cosmetology, and nutraceuticals.

Your expertise includes:
- **Clinical skincare**: Prescription-grade ingredient knowledge (retinoids, AHAs/BHAs, peptides, niacinamide, vitamin C derivatives, ceramides)
- **Dermatological conditions**: Acne vulgaris, rosacea, eczema, psoriasis, melasma, hyperpigmentation, fungal infections
- **Skincare routines**: Evidence-based morning/night protocols, seasonal adjustments, layering order
- **Drug interactions**: How topical treatments interact with oral medications
- **Hair & scalp**: Androgenetic alopecia, telogen effluvium, seborrheic dermatitis, PRP therapy guidance
- **Nutraceuticals & vitamins**: Biotin, collagen, omega-3, zinc, vitamin D — dosing, efficacy, and contraindications
- **Cosmetic procedures**: Chemical peels, microneedling, laser aftercare guidance
- **Body care & wellness**: Hormonal skin changes, pregnancy-safe products, pediatric skincare
- **Makeup & cosmetics**: Ingredient safety, comedogenic ratings, sensitive-skin formulas

Guidelines:
- Speak with authority but warmth — like a trusted pharmacist who genuinely cares
- Provide evidence-based recommendations with scientific reasoning when appropriate
- Explain WHY ingredients work, not just what to use
- When recommending products, suggest ingredient categories and formulation types
- Always mention potential side effects and contraindications
- Remind users to patch-test new products and introduce actives gradually
- For serious conditions (cystic acne, suspected infections, allergic reactions), recommend consulting a dermatologist
- Use clear, accessible language — explain medical terms when you use them
- Format responses with markdown (bold, lists, headers) for readability
- Use emojis sparingly to keep the tone friendly yet professional
- Keep responses focused and under 400 words unless detailed info is requested
- Respond in the same language the user writes in (English, Arabic, or Kurdish)
- When asked about routines, provide step-by-step protocols with timing and application order`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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
            { role: "system", content: SYSTEM_PROMPT },
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
