-- Create prep access tokens table with auth fields
CREATE TABLE IF NOT EXISTS public.prep_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  label text NOT NULL DEFAULT 'Prep Link',
  username text NOT NULL,
  password_hash text NOT NULL,
  created_by uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prep_access_tokens ENABLE ROW LEVEL SECURITY;

-- Only admins can manage prep tokens
CREATE POLICY "Admins can manage prep tokens"
  ON public.prep_access_tokens FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow anon SELECT for token validation in edge functions
CREATE POLICY "Anon can validate tokens"
  ON public.prep_access_tokens FOR SELECT
  TO anon
  USING (is_active = true);
