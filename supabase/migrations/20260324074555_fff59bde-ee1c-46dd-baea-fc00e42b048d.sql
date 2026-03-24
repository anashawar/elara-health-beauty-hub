
-- Allow operations users to view all orders
CREATE POLICY "Operations can view all orders"
ON public.orders FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role));

-- Allow operations users to update orders
CREATE POLICY "Operations can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role));

-- Allow operations users to view all order items
CREATE POLICY "Operations can view all order items"
ON public.order_items FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role));

-- Allow operations users to view all profiles (for order customer info)
CREATE POLICY "Operations can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role));

-- Allow operations users to view all addresses (for order delivery info)
CREATE POLICY "Operations can view all addresses"
ON public.addresses FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role));
