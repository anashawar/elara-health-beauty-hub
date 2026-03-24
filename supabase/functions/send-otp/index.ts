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
    const { phone } = await req.json();
    if (!phone) throw new Error("Phone number is required");

    // Validate phone format
    const phoneRegex = /^[\d\s+()-]{7,20}$/;
    if (!phoneRegex.test(phone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ULTRAMSG_INSTANCE_ID = Deno.env.get("ULTRAMSG_INSTANCE_ID");
    if (!ULTRAMSG_INSTANCE_ID) throw new Error("ULTRAMSG_INSTANCE_ID is not configured");
    const ULTRAMSG_TOKEN = Deno.env.get("ULTRAMSG_TOKEN");
    if (!ULTRAMSG_TOKEN) throw new Error("ULTRAMSG_TOKEN is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalize phone: ensure +964 prefix
    let normalizedPhone = phone.replace(/\s+/g, "").replace(/^0/, "");
    if (!normalizedPhone.startsWith("+")) {
      normalizedPhone = "+964" + normalizedPhone;
    }

    // Rate limit: max 5 OTPs per phone per hour
    const { data: rateOk } = await supabase.rpc("check_otp_rate_limit", { _phone: normalizedPhone });
    if (rateOk === false) {
      return new Response(
        JSON.stringify({ error: "Too many OTP requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete old unverified OTPs for this phone
    await supabase.from("otp_verifications").delete().eq("phone", normalizedPhone).eq("verified", false);

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Store OTP
    const { error: insertError } = await supabase.from("otp_verifications").insert({
      phone: normalizedPhone,
      code,
      expires_at: expiresAt,
    });
    if (insertError) throw insertError;

    // Send WhatsApp message via UltraMsg
    const response = await fetch(
      `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: ULTRAMSG_TOKEN,
          to: normalizedPhone,
          body: `Your ELARA verification code is: *${code}*\nValid for 5 minutes.`,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok || data.error) {
      console.error("UltraMsg error:", JSON.stringify(data));
      throw new Error(`WhatsApp sending failed: ${data.error || data.message || "Unknown error"}`);
    }

    return new Response(
      JSON.stringify({ success: true, phone: normalizedPhone }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-otp error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
