ALTER TABLE public.offers ADD COLUMN banner_style text NOT NULL DEFAULT 'none';

-- Migrate existing data: show_as_banner = true → 'gallery'
UPDATE public.offers SET banner_style = 'gallery' WHERE show_as_banner = true;