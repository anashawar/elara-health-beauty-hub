import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Cache 2FA app/message IDs across warm invocations
let cachedAppId: string | null = null;
let cachedMsgId: string | null = null;

async function infobipFetch(baseUrl: string, apiKey: string, path: string, options: RequestInit = {}) {
  const url = `https://${baseUrl}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `App ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`Infobip API error [${res.status}] ${path}:`, JSON.stringify(data));
    throw new Error(`Infobip API error: ${data?.requestError?.serviceException?.text || JSON.stringify(data)}`);
  }
  return data;
}

async function getOrCreate2FAApp(baseUrl: string, apiKey: string): Promise<{ appId: string; msgId: string }> {
  if (cachedAppId && cachedMsgId) return { appId: cachedAppId, msgId: cachedMsgId };

  // List existing applications
  const apps = await infobipFetch(baseUrl, apiKey, "/2fa/2/applications");
  let appId: string;

  const existing = Array.isArray(apps) ? apps.find((a: any) => a.name === "ELARA_OTP") : null;
  if (existing) {
    appId = existing.applicationId;
  } else {
    const newApp = await infobipFetch(baseUrl, apiKey, "/2fa/2/applications", {
      method: "POST",
      body: JSON.stringify({
        name: "ELARA_OTP",
        enabled: true,
        configuration: {
          pinAttempts: 5,
          allowMultiplePinVerifications: true,
          pinTimeToLive: "10m",
          verifyPinLimit: "1/3s",
          sendPinPerApplicationLimit: "10000/1d",
          sendPinPerPhoneNumberLimit: "5/1h",
        },
      }),
    });
    appId = newApp.applicationId;
    console.log("Created Infobip 2FA application:", appId);
  }

  // List existing message templates
  const msgs = await infobipFetch(baseUrl, apiKey, `/2fa/2/applications/${appId}/messages`);
  let msgId: string;

  const existingMsg = Array.isArray(msgs) ? msgs.find((m: any) => m.pinType === "NUMERIC" && m.pinLength === 6) : null;
  if (existingMsg) {
    msgId = existingMsg.messageId;
  } else {
    const newMsg = await infobipFetch(baseUrl, apiKey, `/2fa/2/applications/${appId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        pinType: "NUMERIC",
        pinLength: 6,
        pinPlaceholder: "{{pin}}",
        messageText: "Your ELARA verification code is {{pin}}. Do not share it with anyone.",
        senderId: "ELARA",
        language: "en",
        repeatDTMF: "1#",
        speechRate: 1,
      }),
    });
    msgId = newMsg.messageId;
    console.log("Created Infobip 2FA message template:", msgId);
  }

  cachedAppId = appId;
  cachedMsgId = msgId;
  return { appId, msgId };
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

    if (!INFOBIP_API_KEY) throw new Error("INFOBIP_API_KEY is not configured");
    if (!INFOBIP_BASE_URL) throw new Error("INFOBIP_BASE_URL is not configured");

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

    // Demo phones — bypass code also works in verify-otp, but still send real OTP
    const DEMO_PHONES = ["+9647510535548"];
    const isDemoPhone = DEMO_PHONES.includes(normalizedPhone);
    if (isDemoPhone) {
      console.log(`Demo phone ${normalizedPhone} — will send real OTP + bypass code active`);
    }

    // Get or create 2FA application and message template
    const { appId, msgId } = await getOrCreate2FAApp(INFOBIP_BASE_URL, INFOBIP_API_KEY);

    // Send PIN via Infobip 2FA API
    const sendResult = await infobipFetch(INFOBIP_BASE_URL, INFOBIP_API_KEY, "/2fa/2/pin", {
      method: "POST",
      body: JSON.stringify({
        applicationId: appId,
        messageId: msgId,
        to: normalizedPhone,
      }),
    });

    console.log("Infobip send PIN response:", JSON.stringify(sendResult));
    const pinId = sendResult.pinId;

    // Store pinId in otp_verifications so verify-otp can look it up
    await supabase.from("otp_verifications").insert({
      phone: normalizedPhone,
      code: pinId, // Store pinId as 'code' for lookup
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
