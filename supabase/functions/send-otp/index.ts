import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const normalizeIraqPhone = (value: string) => {
  let normalized = value.replace(/\s+/g, "").replace(/[^\d+]/g, "");
  if (normalized.startsWith("00")) {
    normalized = `+${normalized.slice(2)}`;
  }
  normalized = normalized.replace(/^0+/, "");
  if (!normalized.startsWith("+")) {
    normalized = `+964${normalized}`;
  }
  return normalized;
};

const generateOtp = () => {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += digits[Math.floor(Math.random() * 10)];
  }
  return code;
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

    const ZAVU_API_KEY = Deno.env.get("ZAVU_API_KEY");
    if (!ZAVU_API_KEY) throw new Error("ZAVU_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const normalizedPhone = normalizeIraqPhone(phone);

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

    // Rate limit check
    const { data: canSend } = await supabase.rpc("check_otp_rate_limit", { _phone: normalizedPhone });
    if (canSend === false) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Demo phone — skip actual SMS, use static code
    const DEMO_PHONES: Record<string, string> = { "+9647510535548": "112233" };
    const isDemoPhone = DEMO_PHONES[normalizedPhone];

    const code = isDemoPhone || generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store OTP in database
    await supabase.from("otp_verifications").insert({
      phone: normalizedPhone,
      code,
      expires_at: expiresAt,
      verified: false,
    });

    // Send SMS via Zavu (skip for demo phones)
    if (!isDemoPhone) {
      const response = await fetch("https://api.zavu.dev/v1/messages", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ZAVU_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: normalizedPhone,
          text: `Your ELARA verification code is: ${code}. Valid for 10 minutes.`,
          channel: "sms",
        }),
      });

      const data = await response.json();
      console.log("Zavu response:", JSON.stringify(data));

      if (!response.ok) {
        console.error("Zavu error:", JSON.stringify(data));
        throw new Error(`SMS delivery failed: ${data.message || data.error || "Unknown error"}`);
      }
    } else {
      console.log(`Demo phone ${normalizedPhone} — using bypass code, SMS skipped`);
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
