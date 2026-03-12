-- Add Arabic and Kurdish translation columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS title_ar text,
  ADD COLUMN IF NOT EXISTS title_ku text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS description_ku text,
  ADD COLUMN IF NOT EXISTS usage_instructions_ar text,
  ADD COLUMN IF NOT EXISTS usage_instructions_ku text,
  ADD COLUMN IF NOT EXISTS benefits_ar text[],
  ADD COLUMN IF NOT EXISTS benefits_ku text[];

-- Add Arabic and Kurdish translation columns to categories
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS name_ku text;

-- Add Arabic and Kurdish translation columns to brands
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS name_ku text;

-- Add Arabic and Kurdish translation columns to banners
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS title_ar text,
  ADD COLUMN IF NOT EXISTS title_ku text,
  ADD COLUMN IF NOT EXISTS subtitle_ar text,
  ADD COLUMN IF NOT EXISTS subtitle_ku text;