
-- Add skin tone fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS skin_tone text,
  ADD COLUMN IF NOT EXISTS skin_tone_hex text,
  ADD COLUMN IF NOT EXISTS skin_undertone text;

-- Add shade field to products for makeup matching
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shade text;
