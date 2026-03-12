import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone, full_name } = await req.json();
    if (!phone) throw new Error("Phone number is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalize phone: ensure +964 prefix
    let normalizedPhone = phone.replace(/\s+/g, "").replace(/^0/, "");
    if (!normalizedPhone.startsWith("+")) {
      normalizedPhone = "+964" + normalizedPhone;
    }

    // Delete old unverified OTPs for this phone
    await supabase.from("otp_verifications").delete().eq("phone", normalizedPhone).eq("verified", false);

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

    // Store OTP
    const { error: insertError } = await supabase.from("otp_verifications").insert({
      phone: normalizedPhone,
      code,
      expires_at: expiresAt,
    });
    if (insertError) throw insertError;

    // Store full_name temporarily if provided (for signup)
    // We'll pass it through to verify-otp

    // Send SMS via Twilio gateway
    // Get Twilio phone number from env or use a default
    const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER") || "+15005550006"; // Twilio test number fallback
    
    const smsResponse = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: normalizedPhone,
        From: fromNumber,
        Body: `Your ELARA verification code is: ${code}. Valid for 5 minutes.`,
      }),
    });

    const smsData = await smsResponse.json();
    if (!smsResponse.ok) {
      console.error("Twilio error:", JSON.stringify(smsData));
      throw new Error(`SMS sending failed: ${smsData.message || smsData.error_message || "Unknown error"}`);
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
