
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can read coupon users for validation" ON public.coupon_allowed_users;

-- Replace with authenticated-only policy scoped to user's own rows
CREATE POLICY "Users can read their own coupon allowances"
  ON public.coupon_allowed_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
