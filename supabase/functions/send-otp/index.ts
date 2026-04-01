import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateOTP(): string {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

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

    const INFOBIP_API_KEY = Deno.env.get("INFOBIP_API_KEY");
    const INFOBIP_BASE_URL = Deno.env.get("INFOBIP_BASE_URL");
    const INFOBIP_WHATSAPP_SENDER = Deno.env.get("INFOBIP_WHATSAPP_SENDER");

    if (!INFOBIP_API_KEY) throw new Error("INFOBIP_API_KEY is not configured");
    if (!INFOBIP_BASE_URL) throw new Error("INFOBIP_BASE_URL is not configured");
    if (!INFOBIP_WHATSAPP_SENDER) throw new Error("INFOBIP_WHATSAPP_SENDER is not configured");

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

    // Generate a 6-digit OTP
    const otpCode = generateOTP();

    // Demo phones — bypass code also works in verify-otp
    const DEMO_PHONES = ["+9647510535548"];
    const isDemoPhone = DEMO_PHONES.includes(normalizedPhone);
    if (isDemoPhone) {
      console.log(`Demo phone ${normalizedPhone} — bypass code active, also sending real OTP`);
    }

    // Strip the + for Infobip WhatsApp API (expects digits only)
    const toNumber = normalizedPhone.replace(/^\+/, "");

    // Send OTP via Infobip WhatsApp Authentication Template
    const whatsappPayload = {
      messages: [
        {
          from: INFOBIP_WHATSAPP_SENDER,
          to: toNumber,
          content: {
            templateName: "authentication",
            templateData: {
              body: {
                placeholders: [otpCode],
              },
              buttons: [
                {
                  type: "URL",
                  parameter: otpCode,
                },
              ],
            },
            language: "en_GB",
          },
        },
      ],
    };

    const sendRes = await fetch(`https://${INFOBIP_BASE_URL}/whatsapp/1/message/template`, {
      method: "POST",
      headers: {
        "Authorization": `App ${INFOBIP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(whatsappPayload),
    });

    const sendData = await sendRes.json();
    console.log("Infobip WhatsApp send response:", JSON.stringify(sendData));

    if (!sendRes.ok) {
      const errText = sendData?.messages?.[0]?.status?.description ||
        sendData?.requestError?.serviceException?.text ||
        JSON.stringify(sendData);
      throw new Error(`Infobip WhatsApp error: ${errText}`);
    }

    // Store OTP in database for verification
    await supabase.from("otp_verifications").insert({
      phone: normalizedPhone,
      code: otpCode,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      verified: false,
    });

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
