
-- 1. Create verify_prep_password function for bcrypt comparison
CREATE OR REPLACE FUNCTION public.verify_prep_password(_plain_password text, _stored_hash text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT crypt(_plain_password, _stored_hash) = _stored_hash;
$$;

-- 2. Drop permissive public SELECT on coupons (use coupons_public view instead)
DROP POLICY IF EXISTS "Coupons are viewable by everyone" ON public.coupons;

-- 3. Grant public read access via the coupons_public view
CREATE POLICY "Public can read coupons_public view"
ON public.coupons FOR SELECT TO anon, authenticated
USING (false);

-- Note: The coupons_public view already exists and excludes sensitive columns.
-- Client code should query from coupons_public instead.

-- 4. Drop all overly permissive anon policies on warehouse_notifications
DROP POLICY IF EXISTS "Anon can insert warehouse notifications" ON public.warehouse_notifications;
DROP POLICY IF EXISTS "Anon can create warehouse notifications" ON public.warehouse_notifications;
DROP POLICY IF EXISTS "Anon can mark notifications read" ON public.warehouse_notifications;
DROP POLICY IF EXISTS "Anon can read warehouse notifications" ON public.warehouse_notifications;

-- 5. Drop all overly permissive anon policies on warehouse_requests
DROP POLICY IF EXISTS "Anon can insert warehouse requests" ON public.warehouse_requests;
DROP POLICY IF EXISTS "Anon can create warehouse requests with warehouse_id" ON public.warehouse_requests;
DROP POLICY IF EXISTS "Anon can read warehouse requests" ON public.warehouse_requests;
DROP POLICY IF EXISTS "Anon can update warehouse requests" ON public.warehouse_requests;

-- 6. Add proper admin/operations policies for warehouse_notifications (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage warehouse notifications' AND tablename = 'warehouse_notifications') THEN
    EXECUTE 'CREATE POLICY "Admins can manage warehouse notifications" ON public.warehouse_notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Operations can manage warehouse notifications' AND tablename = 'warehouse_notifications') THEN
    EXECUTE 'CREATE POLICY "Operations can manage warehouse notifications" ON public.warehouse_notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''operations''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''operations''::app_role))';
  END IF;
END $$;

-- 7. Add proper admin/operations policies for warehouse_requests (if not exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage warehouse requests' AND tablename = 'warehouse_requests') THEN
    EXECUTE 'CREATE POLICY "Admins can manage warehouse requests" ON public.warehouse_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Operations can manage warehouse requests' AND tablename = 'warehouse_requests') THEN
    EXECUTE 'CREATE POLICY "Operations can manage warehouse requests" ON public.warehouse_requests FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''operations''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''operations''::app_role))';
  END IF;
END $$;
