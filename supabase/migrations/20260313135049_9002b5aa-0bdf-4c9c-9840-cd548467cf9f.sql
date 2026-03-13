
-- Separate table for confidential product costs (admin-only)
CREATE TABLE public.product_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view product costs"
  ON public.product_costs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert product costs"
  ON public.product_costs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update product costs"
  ON public.product_costs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete product costs"
  ON public.product_costs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add volume_unit column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS volume_unit text DEFAULT 'ml';
