const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      apiKey: Deno.env.get("FIREBASE_API_KEY") || "",
      projectId: Deno.env.get("FIREBASE_PROJECT_ID") || "",
      messagingSenderId: Deno.env.get("FIREBASE_MESSAGING_SENDER_ID") || "",
      appId: Deno.env.get("FIREBASE_APP_ID") || "",
      vapidKey: Deno.env.get("FIREBASE_VAPID_KEY") || "",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
