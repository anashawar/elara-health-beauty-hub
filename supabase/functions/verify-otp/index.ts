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
    const { phone, code, full_name, email } = await req.json();
    if (!phone || !code) throw new Error("Phone and code are required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Normalize phone
    let normalizedPhone = phone.replace(/\s+/g, "").replace(/^0/, "");
    if (!normalizedPhone.startsWith("+")) {
      normalizedPhone = "+964" + normalizedPhone;
    }

    // Find valid OTP
    const { data: otpRecord } = await supabase
      .from("otp_verifications")
      .select("*")
      .eq("phone", normalizedPhone)
      .eq("code", code)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as verified
    await supabase.from("otp_verifications").update({ verified: true }).eq("id", otpRecord.id);

    // Use the real email if provided, otherwise fall back to phone-based email
    const userEmail = email?.trim() || `${normalizedPhone.replace("+", "")}@phone.elara.app`;
    const tempPassword = `phone_${normalizedPhone}_${Date.now()}`;

    // Try to find existing user by phone or email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userByPhone = existingUsers?.users?.find(
      (u: any) => u.phone === normalizedPhone
    );
    const userByEmail = existingUsers?.users?.find(
      (u: any) => u.email === userEmail
    );

    // Prevent same phone number on multiple accounts
    if (userByPhone && userByEmail && userByPhone.id !== userByEmail.id) {
      return new Response(
        JSON.stringify({ error: "This phone number is already linked to another account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingUser = userByPhone || userByEmail;

    let session;

    if (existingUser) {
      // Sign in existing user
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: existingUser.email!,
      });
      if (error) throw error;

      const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: data.properties.hashed_token,
        type: "magiclink",
      });
      if (sessionError) throw sessionError;
      session = sessionData.session;
    } else {
      // Create new user with real email
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userEmail,
        phone: normalizedPhone,
        email_confirm: true,
        phone_confirm: true,
        password: tempPassword,
        user_metadata: { full_name: full_name || "", phone: normalizedPhone },
      });
      if (createError) throw createError;

      // Create profile
      await supabase.from("profiles").insert({
        user_id: newUser.user.id,
        full_name: full_name || "",
        phone: normalizedPhone,
      });

      // Generate session for new user
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: userEmail,
      });
      if (error) throw error;

      const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: data.properties.hashed_token,
        type: "magiclink",
      });
      if (sessionError) throw sessionError;
      session = sessionData.session;
    }

    // Clean up old OTPs
    await supabase.from("otp_verifications").delete().eq("phone", normalizedPhone);

    return new Response(
      JSON.stringify({ success: true, session, isNewUser: !existingUser }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("verify-otp error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
