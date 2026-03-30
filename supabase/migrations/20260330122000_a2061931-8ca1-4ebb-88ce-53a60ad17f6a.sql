-- Create order edit logs table
CREATE TABLE public.order_edit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  edited_by text NOT NULL,
  action text NOT NULL,
  details text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_edit_logs ENABLE ROW LEVEL SECURITY;

-- Admins and ops can manage edit logs
CREATE POLICY "Admins can manage order edit logs" ON public.order_edit_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Operations can manage order edit logs" ON public.order_edit_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'operations'))
  WITH CHECK (public.has_role(auth.uid(), 'operations'));

-- Users can view edit logs for their own orders
CREATE POLICY "Users can view edit logs for own orders" ON public.order_edit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders WHERE orders.id = order_edit_logs.order_id AND orders.user_id = auth.uid()
  ));