import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ONESIGNAL_APP_ID = "13744f00-e92d-4e78-84ca-4dffe5a16cea";
const ONESIGNAL_API_URL = "https://api.onesignal.com/notifications";

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

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
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

    const restApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
    if (!restApiKey) {
      return new Response(JSON.stringify({ error: "ONESIGNAL_REST_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build OneSignal notification payload
    const payload: Record<string, unknown> = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: body },
      data: { link_url: link_url || "/home" },
    };

    // Add optional fields
    if (image_url) {
      payload.big_picture = image_url; // Android
      payload.ios_attachments = { image: image_url }; // iOS
    }
    if (icon) {
      payload.small_icon = icon;
    }
    if (link_url) {
      payload.url = link_url;
    }

    // Target specific users or all
    if (user_ids && user_ids.length > 0) {
      // Use external_user_id targeting (set via OneSignal.login())
      payload.include_aliases = { external_id: user_ids };
      payload.target_channel = "push";
    } else {
      // Send to all subscribed users
      payload.included_segments = ["Subscribed Users"];
    }

    // Send via OneSignal REST API
    const res = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${restApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("OneSignal API error:", res.status, JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: "OneSignal API error", details: result }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        sent: result.recipients || 0,
        id: result.id,
        total: result.recipients || 0,
      }),
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