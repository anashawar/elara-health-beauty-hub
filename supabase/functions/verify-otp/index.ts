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

const comparablePhone = (value?: string | null) =>
  (value ?? "").replace(/\D/g, "").replace(/^0+/, "");

const isSamePhone = (a?: string | null, b?: string | null) => {
  const left = comparablePhone(a);
  const right = comparablePhone(b);
  return left.length > 0 && left === right;
};

const listAllAuthUsers = async (supabase: ReturnType<typeof createClient>) => {
  const users: any[] = [];
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const batch = data?.users ?? [];
    users.push(...batch);

    if (batch.length < perPage) break;
    page += 1;
  }

  return users;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { phone, code, full_name, email } = await req.json();
    if (!phone || !code) throw new Error("Phone and code are required");
    if (!email?.trim()) throw new Error("Email is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const normalizedPhone = normalizeIraqPhone(phone);
    const userEmail = email.trim().toLowerCase();
    const tempPassword = `phone_${normalizedPhone}_${Date.now()}`;

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

    const existingUsers = await listAllAuthUsers(supabase);
    const userByPhone = existingUsers.find((u: any) => isSamePhone(u.phone, normalizedPhone));
    const userByEmail = existingUsers.find((u: any) => u.email?.toLowerCase() === userEmail);

    // Strict one-phone-per-account rule
    if (userByPhone && userByPhone.email?.toLowerCase() !== userEmail) {
      return new Response(
        JSON.stringify({ error: "This phone number is already linked to another account" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Strict one-email-per-account rule
    if (userByEmail && !isSamePhone(userByEmail.phone, normalizedPhone)) {
      return new Response(
        JSON.stringify({ error: "This email is already linked to another phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const existingUser = userByPhone ?? userByEmail;

    let session;

    if (existingUser) {
      if (!existingUser.email) {
        throw new Error("Existing account is missing email. Please contact support.");
      }

      // Sign in existing user
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: existingUser.email,
      });
      if (error) throw error;

      const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
        token_hash: data.properties.hashed_token,
        type: "magiclink",
      });
      if (sessionError) throw sessionError;
      session = sessionData.session;
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userEmail,
        phone: normalizedPhone,
        email_confirm: true,
        phone_confirm: true,
        password: tempPassword,
        user_metadata: { full_name: full_name || "", phone: normalizedPhone },
      });

      if (createError) {
        if (createError.code === "phone_exists") {
          return new Response(
            JSON.stringify({ error: "This phone number is already linked to another account" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (createError.code === "email_exists") {
          return new Response(
            JSON.stringify({ error: "This email is already in use" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        throw createError;
      }

      // Create/update profile
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          user_id: newUser.user.id,
          full_name: full_name || "",
          phone: normalizedPhone,
        },
        { onConflict: "user_id" }
      );
      if (profileError) throw profileError;

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

    // Mark OTP as verified only after successful auth flow
    await supabase.from("otp_verifications").update({ verified: true }).eq("id", otpRecord.id);

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
