import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, total, user_id } = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get admin and operations users' phone numbers
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "operations"]);

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin/ops users found");
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userIds = adminRoles.map((r) => r.user_id);

    // Get phone numbers from profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("phone, full_name")
      .in("user_id", userIds)
      .not("phone", "is", null);

    if (!profiles || profiles.length === 0) {
      console.log("No admin/ops users with phone numbers found");
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get customer name
    const { data: customerProfile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", user_id)
      .single();

    const customerName = customerProfile?.full_name || "Unknown";
    const customerPhone = customerProfile?.phone || "";

    // Format price in IQD
    const formattedTotal = Number(total).toLocaleString("en-US");

    const message =
      `🛒 *New Order!*\n\n` +
      `Order: #${order_id.slice(0, 8)}\n` +
      `Customer: ${customerName}\n` +
      `Phone: ${customerPhone}\n` +
      `Total: ${formattedTotal} IQD\n\n` +
      `Check the admin panel for details.`;

    // Send via UltraMsg WhatsApp API
    const instanceId = Deno.env.get("ULTRAMSG_INSTANCE_ID");
    const token = Deno.env.get("ULTRAMSG_TOKEN");

    if (!instanceId || !token) {
      console.error("UltraMsg credentials not configured");
      return new Response(
        JSON.stringify({ error: "WhatsApp not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let sentCount = 0;

    for (const profile of profiles) {
      let phone = profile.phone!.replace(/\s+/g, "");
      if (!phone.startsWith("+")) phone = `+${phone}`;

      try {
        const res = await fetch(
          `https://api.ultramsg.com/${instanceId}/messages/chat`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              to: phone,
              body: message,
            }),
          }
        );

        if (res.ok) {
          sentCount++;
          console.log(`WhatsApp sent to ${profile.full_name}`);
        } else {
          const err = await res.text();
          console.error(`Failed to send to ${phone}: ${err}`);
        }
      } catch (e) {
        console.error(`Error sending to ${phone}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, total: profiles.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("notify-admin-order error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
