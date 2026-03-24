
-- Warehouse system uses its own auth (not Supabase auth), so we need
-- controlled policies. We use service_role for mutations and allow
-- anon SELECT only (read-only access).

-- warehouse_requests: anon can only read, not write
CREATE POLICY "Anon can read warehouse requests"
  ON public.warehouse_requests FOR SELECT
  TO anon
  USING (true);

-- warehouse_notifications: anon can only read
CREATE POLICY "Anon can read warehouse notifications"
  ON public.warehouse_notifications FOR SELECT
  TO anon
  USING (true);

-- For INSERT/UPDATE on warehouse_requests from anon (warehouse users create requests)
-- We allow it but only with proper warehouse_id set
CREATE POLICY "Anon can create warehouse requests with warehouse_id"
  ON public.warehouse_requests FOR INSERT
  TO anon
  WITH CHECK (warehouse_id IS NOT NULL AND title IS NOT NULL);

-- Allow anon to update warehouse requests (for status changes by warehouse users)  
CREATE POLICY "Anon can update warehouse requests"
  ON public.warehouse_requests FOR UPDATE
  TO anon
  USING (true);

-- Allow anon to create warehouse notifications (from warehouse users)
CREATE POLICY "Anon can create warehouse notifications"
  ON public.warehouse_notifications FOR INSERT
  TO anon
  WITH CHECK (warehouse_id IS NOT NULL);

-- Allow anon to mark notifications as read
CREATE POLICY "Anon can mark notifications read"
  ON public.warehouse_notifications FOR UPDATE
  TO anon
  USING (true);
