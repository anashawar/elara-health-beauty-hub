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
    const { phone, mode } = await req.json();
    if (!phone) throw new Error("Phone number is required");

    const phoneRegex = /^[\d\s+()-]{7,20}$/;
    if (!phoneRegex.test(phone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_VERIFY_SERVICE_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID");

    if (!TWILIO_ACCOUNT_SID) throw new Error("TWILIO_ACCOUNT_SID is not configured");
    if (!TWILIO_AUTH_TOKEN) throw new Error("TWILIO_AUTH_TOKEN is not configured");
    if (!TWILIO_VERIFY_SERVICE_SID) throw new Error("TWILIO_VERIFY_SERVICE_SID is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalize phone: accept full international numbers or default to +964
    let normalizedPhone = phone.replace(/\s+/g, "").replace(/^00/, "+");
    if (!normalizedPhone.startsWith("+")) {
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

    // Demo account — skip Twilio Verify, just return success (bypass code handled in verify-otp)
    const DEMO_PHONES = ["+9647510535548"];
    if (DEMO_PHONES.includes(normalizedPhone)) {
      console.log(`Demo phone ${normalizedPhone} — skipping Verify API, bypass code active`);
      return new Response(
        JSON.stringify({ success: true, phone: normalizedPhone }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send verification via Twilio Verify API
    const basicAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: normalizedPhone,
          Channel: "sms",
        }),
      }
    );

    const data = await response.json();
    console.log("Twilio Verify response:", JSON.stringify(data));

    if (!response.ok) {
      console.error("Twilio Verify error:", JSON.stringify(data));
      throw new Error(`Verification failed: ${data.message || "Unknown error"}`);
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
