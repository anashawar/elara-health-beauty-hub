
-- Skin analysis history table
CREATE TABLE public.skin_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  image_url text,
  overall_score integer NOT NULL DEFAULT 0,
  skin_type text,
  hydration_score integer DEFAULT 0,
  elasticity_score integer DEFAULT 0,
  clarity_score integer DEFAULT 0,
  texture_score integer DEFAULT 0,
  problems jsonb DEFAULT '[]'::jsonb,
  routine jsonb DEFAULT '[]'::jsonb,
  recommended_product_ids uuid[] DEFAULT '{}',
  full_analysis jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.skin_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analyses"
  ON public.skin_analyses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analyses"
  ON public.skin_analyses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all analyses"
  ON public.skin_analyses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_skin_analyses_user_id ON public.skin_analyses(user_id);
