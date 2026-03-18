
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS image_url_ar TEXT,
  ADD COLUMN IF NOT EXISTS image_url_ku TEXT;

ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS image_url_ar TEXT,
  ADD COLUMN IF NOT EXISTS image_url_ku TEXT;
