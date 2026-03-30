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
    const { phone, mode } = await req.json();
    if (!phone) throw new Error("Phone number is required");

    // Validate phone format
    const phoneRegex = /^[\d\s+()-]{7,20}$/;
    if (!phoneRegex.test(phone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");
    if (!TWILIO_API_KEY) throw new Error("TWILIO_API_KEY is not configured");

    const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get("TWILIO_PHONE_NUMBER");
    if (!TWILIO_MESSAGING_SERVICE_SID) throw new Error("TWILIO_MESSAGING_SERVICE_SID is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalize phone: accept full international numbers or default to +964
    let normalizedPhone = phone.replace(/\s+/g, "").replace(/^00/, "+");

    // Demo account for Apple review — skip actual OTP sending but still allow bypass code in verify-otp
    // Note: SMS is still sent for demo phones so the owner can test real delivery
    if (!normalizedPhone.startsWith("+")) {
      // If no country code, strip leading 0 and assume Iraq
      normalizedPhone = "+964" + normalizedPhone.replace(/^0/, "");
    }

    // For sign-in mode, check if the phone number is registered
    if (mode === "signin") {
      const comparableDigits = normalizedPhone.replace(/\D/g, "").replace(/^0+/, "");
      const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const users = allUsers?.users ?? [];
      const found = users.some((u: any) => {
        const uPhone = (u.phone || u.user_metadata?.phone || "").replace(/\D/g, "").replace(/^0+/, "");
        return uPhone.length > 0 && uPhone === comparableDigits;
      });
      if (!found) {
        return new Response(
          JSON.stringify({ error: "No account found with this phone number. Please sign up first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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

    // Send SMS via Twilio Gateway
    const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: normalizedPhone,
        MessagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
        Body: `Your ELARA verification code is: ${code}\nValid for 5 minutes.`,
      }),
    });

    const data = await response.json();
    console.log("Twilio response:", JSON.stringify(data));
    if (!response.ok || data.error_code) {
      console.error("Twilio error:", JSON.stringify(data));
      throw new Error(`SMS sending failed: ${data.message || data.error_message || "Unknown error"}`);
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
