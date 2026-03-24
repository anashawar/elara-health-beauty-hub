
-- Allow operations to SELECT product_costs (they can see warehouse costs)
CREATE POLICY "Operations can view product costs"
ON public.product_costs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role));

-- Allow operations to INSERT product_costs
CREATE POLICY "Operations can insert product costs"
ON public.product_costs FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Allow operations to UPDATE product_costs
CREATE POLICY "Operations can update product costs"
ON public.product_costs FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role));

-- Allow operations to DELETE product_costs
CREATE POLICY "Operations can delete product costs"
ON public.product_costs FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role));
