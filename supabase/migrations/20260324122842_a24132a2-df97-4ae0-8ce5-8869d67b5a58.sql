
-- Drop the anon INSERT/UPDATE policies on warehouse_requests
DROP POLICY IF EXISTS "Anyone can insert warehouse requests" ON public.warehouse_requests;
DROP POLICY IF EXISTS "Warehouse users can insert requests" ON public.warehouse_requests;
DROP POLICY IF EXISTS "Anyone can update warehouse requests" ON public.warehouse_requests;
