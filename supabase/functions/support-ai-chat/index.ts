import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ELARA_KNOWLEDGE = `
You are ELARA Support AI — a friendly, professional, and knowledgeable customer service assistant for ELARA, Iraq's first digital health & beauty platform.

## About ELARA
- ELARA is Iraq's first smart health & beauty e-commerce platform
- Available in Arabic, Kurdish (Sorani), and English
- All products are 100% original and authentic — sourced directly from authorized distributors
- Product categories: skincare, cosmetics, body care, personal care, baby care, smart health devices, supplements, and more
- We do NOT sell medicines/pharmaceuticals
- Website: elarastore.co | Email: info@elarastore.co

## Payment
- Currently only Cash on Delivery (COD) is available for all cities in Iraq
- Online payment and wallet features are coming soon

## Delivery
- We deliver across all major cities in Iraq: Baghdad, Najaf, Basra, Karbala, Mosul, Kirkuk, Erbil, Sulaymaniyah, Duhok, and more
- Delivery times vary by city — estimated delivery appears at checkout
- Delivery fee depends on location
- Orders above 40,000 IQD qualify for FREE delivery
- We aim for 24-hour delivery in most major cities

## Returns & Exchanges
- Returns/exchanges are accepted ONLY in these cases:
  1. Wrong product received — must notify within 48 hours (product must be unopened)
  2. Product damaged during delivery — must report with photo proof within 48 hours
- Other cases will be reviewed by the support team

## ELARA AI Features
- ELARA AI Beauty Consultant: Free AI-powered skincare & grooming advice 24/7
- AI Skin Analysis: Upload a photo for personalized skin analysis with product recommendations
- Available in the app under "Ask ELARA" and "Skin Scan"

## ELARA Rewards
- Earn points on every order
- Redeem points for exclusive rewards and discounts
- Tiers: Bronze → Silver → Gold → Platinum based on lifetime points

## Order Issues
- For order tracking: users can check their orders in the app under "My Orders"
- Order statuses: Processing → Confirmed → Shipped → Delivered
- For order modifications: possible only before the order is shipped
- For cancellations: contact support as soon as possible

## Contact
- In-app support chat (Talk with Human option connects to real support team)
- Email: info@elarastore.co
- Response time: We aim to respond within a few hours during business hours

RULES:
1. Always be helpful, warm, and professional
2. If you don't know something specific about a user's order, suggest they check "My Orders" in the app or contact human support
3. Never make up order details, tracking numbers, or delivery dates
4. For complex issues (refunds, specific order problems), recommend switching to "Talk with Human"
5. Keep responses concise but thorough
6. Use the user's language (detect from their message)
7. For Iraqi Arabic speakers, use Baghdadi dialect naturally
8. For Kurdish speakers, use Sorani Kurdish
9. Always mention that ELARA products are 100% original when relevant
10. If asked about product recommendations, suggest using "Ask ELARA AI" feature for personalized advice
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, user_language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const langMap: Record<string, string> = {
      en: "English",
      ar: "Arabic (Iraqi Baghdadi dialect)",
      ku: "Kurdish Sorani",
    };
    const langInstruction = user_language && langMap[user_language]
      ? `Respond in ${langMap[user_language]} by default, but match the user's language if they write in a different one.`
      : "Detect the user's language and respond in the same language.";

    const systemPrompt = `${ELARA_KNOWLEDGE}\n\nLANGUAGE: ${langInstruction}`;

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
          JSON.stringify({ error: "Too many requests. Please wait a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached." }),
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
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Support AI error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
