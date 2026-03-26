import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Get an OAuth2 access token for FCM v1 API using a service account.
 */
async function getAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT secret not configured");
  }

  const sa = JSON.parse(serviceAccountJson);

  // Create JWT
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const unsignedToken = `${enc(header)}.${enc(payload)}`;

  // Import the private key and sign
  const pemContents = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsignedToken}.${sig}`;

  // Exchange JWT for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error("Failed to get access token: " + JSON.stringify(tokenData));
  }

  return tokenData.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title, body, icon, image_url, link_url, user_ids } = await req.json();

    if (!title || !body) {
      return new Response(JSON.stringify({ error: "title and body required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get FCM tokens for target users
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let query = serviceClient
      .from("push_subscriptions")
      .select("endpoint, user_id")
      .eq("is_active", true);

    if (user_ids && user_ids.length > 0) {
      query = query.in("user_id", user_ids);
    }

    const { data: subs, error: subsErr } = await query;
    if (subsErr) throw subsErr;

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No push subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use FCM v1 API with service account
    const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID");
    if (!firebaseProjectId) {
      return new Response(JSON.stringify({ error: "FIREBASE_PROJECT_ID not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken: string;
    try {
      accessToken = await getAccessToken();
    } catch (e) {
      // Fallback: try legacy API if service account not configured
      const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");
      if (!fcmServerKey) {
        return new Response(
          JSON.stringify({ error: "FIREBASE_SERVICE_ACCOUNT or FCM_SERVER_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.warn("Falling back to legacy FCM API:", e.message);
      // Legacy fallback (may not work anymore)
      return await sendLegacy(subs, fcmServerKey, title, body, icon, image_url, link_url, serviceClient, corsHeaders);
    }

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${firebaseProjectId}/messages:send`;

    let sent = 0;
    let failed = 0;
    const failedTokens: string[] = [];

    for (const sub of subs) {
      try {
        const message: Record<string, unknown> = {
          token: sub.endpoint,
          notification: {
            title,
            body,
            ...(image_url ? { image: image_url } : {}),
          },
          data: {
            title,
            body,
            link_url: link_url || "/home",
          },
          // iOS-specific: ensure notification appears
          apns: {
            payload: {
              aps: {
                alert: { title, body },
                sound: "default",
                badge: 1,
              },
            },
          },
          // Android-specific
          android: {
            notification: {
              icon: icon || "ic_notification",
              sound: "default",
              click_action: link_url || "/home",
              ...(image_url ? { image: image_url } : {}),
            },
          },
        };

        const res = await fetch(fcmUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ message }),
        });

        if (res.ok) {
          sent++;
        } else {
          const errBody = await res.text();
          console.error("FCM v1 error:", res.status, errBody);
          failed++;
          // If token is invalid/unregistered, mark for deactivation
          if (errBody.includes("UNREGISTERED") || errBody.includes("INVALID_ARGUMENT")) {
            failedTokens.push(sub.endpoint);
          }
        }
      } catch (e) {
        failed++;
        console.error("FCM send error:", e);
      }
    }

    // Deactivate failed tokens
    if (failedTokens.length > 0) {
      await serviceClient
        .from("push_subscriptions")
        .update({ is_active: false })
        .in("endpoint", failedTokens);
    }

    return new Response(
      JSON.stringify({ sent, failed, total: subs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("send-push error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/** Legacy FCM fallback (deprecated, may not work) */
async function sendLegacy(
  subs: { endpoint: string; user_id: string }[],
  fcmServerKey: string,
  title: string,
  body: string,
  icon: string | undefined,
  image_url: string | undefined,
  link_url: string | undefined,
  serviceClient: ReturnType<typeof createClient>,
  corsHeaders: Record<string, string>
) {
  let sent = 0;
  let failed = 0;
  const failedTokens: string[] = [];

  for (const sub of subs) {
    try {
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${fcmServerKey}`,
        },
        body: JSON.stringify({
          to: sub.endpoint,
          notification: { title, body, icon: icon || "/pwa-icon-192.png", image: image_url || undefined, click_action: link_url || "/home" },
          data: { title, body, link_url: link_url || "/home" },
        }),
      });
      const result = await res.text();
      if (res.ok) {
        const parsed = JSON.parse(result);
        if (parsed.success === 1) sent++;
        else { failed++; failedTokens.push(sub.endpoint); }
      } else failed++;
    } catch { failed++; }
  }

  if (failedTokens.length > 0) {
    await serviceClient.from("push_subscriptions").update({ is_active: false }).in("endpoint", failedTokens);
  }

  return new Response(JSON.stringify({ sent, failed, total: subs.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
