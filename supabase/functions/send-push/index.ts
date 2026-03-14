import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");
    if (!fcmServerKey) {
      return new Response(JSON.stringify({ error: "FCM_SERVER_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send to each FCM token using legacy API
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
            notification: {
              title,
              body,
              icon: icon || "/pwa-icon-192.png",
              image: image_url || undefined,
              click_action: link_url || "/home",
            },
            data: {
              title,
              body,
              link_url: link_url || "/home",
            },
          }),
        });

        const result = await res.text();
        
        if (res.ok) {
          const parsed = JSON.parse(result);
          if (parsed.success === 1) {
            sent++;
          } else {
            failed++;
            failedTokens.push(sub.endpoint);
          }
        } else {
          failed++;
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
