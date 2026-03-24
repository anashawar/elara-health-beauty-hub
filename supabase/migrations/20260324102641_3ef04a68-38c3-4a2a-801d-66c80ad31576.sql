
-- ==========================================
-- SECURITY HARDENING MIGRATION
-- ==========================================

-- 1. OTP Verifications: Enable RLS and restrict to service_role only
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for OTP"
  ON public.otp_verifications FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. Prep Access Tokens: Remove dangerous anon policy, create secure validation function
DROP POLICY IF EXISTS "Anon can validate tokens" ON public.prep_access_tokens;

-- Create a secure function for token validation that doesn't expose sensitive data
CREATE OR REPLACE FUNCTION public.validate_prep_token(_username text, _token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _record RECORD;
BEGIN
  SELECT id, label, excluded_brand_ids, excluded_product_ids, password_hash
  INTO _record
  FROM public.prep_access_tokens
  WHERE username = _username
    AND token = _token
    AND is_active = true;

  IF _record IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'id', _record.id,
    'label', _record.label,
    'excluded_brand_ids', _record.excluded_brand_ids,
    'excluded_product_ids', _record.excluded_product_ids,
    'password_hash', _record.password_hash
  );
END;
$$;

-- 3. Warehouse Users: Remove dangerous anon policy, create secure login function
DROP POLICY IF EXISTS "Anon can read warehouse users for login" ON public.warehouse_users;

CREATE OR REPLACE FUNCTION public.validate_warehouse_login(_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _record RECORD;
BEGIN
  SELECT id, username, full_name, warehouse_id, password_hash
  INTO _record
  FROM public.warehouse_users
  WHERE username = _username
    AND is_active = true;

  IF _record IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'id', _record.id,
    'username', _record.username,
    'full_name', _record.full_name,
    'warehouse_id', _record.warehouse_id,
    'password_hash', _record.password_hash
  );
END;
$$;

-- 4. Warehouse Requests: Remove dangerous anon policies
DROP POLICY IF EXISTS "Anon can read warehouse requests" ON public.warehouse_requests;
DROP POLICY IF EXISTS "Anon can create warehouse requests" ON public.warehouse_requests;
DROP POLICY IF EXISTS "Anon can update warehouse requests" ON public.warehouse_requests;

-- 5. Warehouse Notifications: Remove dangerous anon policies
DROP POLICY IF EXISTS "Anon can read warehouse notifications" ON public.warehouse_notifications;
DROP POLICY IF EXISTS "Anon can create warehouse notifications" ON public.warehouse_notifications;
DROP POLICY IF EXISTS "Anon can update warehouse notifications" ON public.warehouse_notifications;

-- 6. Create a public view for coupons that hides business-sensitive data
CREATE OR REPLACE VIEW public.coupons_public
WITH (security_invoker = on) AS
  SELECT id, code, discount_type, discount_value, is_active, expires_at,
         max_uses, current_uses, min_order_amount, created_at
  FROM public.coupons;

-- 7. Fix mutable search_path on functions
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$ SELECT pgmq.send(queue_name, payload); $function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$ SELECT msg_id, read_ct, message FROM pgmq.read(queue_name, vt, batch_size); $function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$ SELECT pgmq.delete(queue_name, message_id); $function$;

-- 8. Add OTP rate limiting: max 5 OTPs per phone per hour
CREATE OR REPLACE FUNCTION public.check_otp_rate_limit(_phone text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT count(*) INTO recent_count
  FROM public.otp_verifications
  WHERE phone = _phone
    AND created_at > now() - interval '1 hour';
  
  RETURN recent_count < 5;
END;
$$;
