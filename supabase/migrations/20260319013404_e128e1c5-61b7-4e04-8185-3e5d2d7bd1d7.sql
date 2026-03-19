
CREATE TABLE public.order_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  quality_rating integer CHECK (quality_rating BETWEEN 1 AND 5),
  delivery_time_rating integer CHECK (delivery_time_rating BETWEEN 1 AND 5),
  expectation_rating integer CHECK (expectation_rating BETWEEN 1 AND 5),
  service_rating integer CHECK (service_rating BETWEEN 1 AND 5),
  price_rating integer CHECK (price_rating BETWEEN 1 AND 5),
  overall_rating integer CHECK (overall_rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

ALTER TABLE public.order_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own ratings"
  ON public.order_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own ratings"
  ON public.order_ratings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ratings"
  ON public.order_ratings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
