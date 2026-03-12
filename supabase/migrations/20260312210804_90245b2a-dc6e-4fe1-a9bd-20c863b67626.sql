
-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  name_ku TEXT,
  slug TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, slug)
);

-- Enable RLS
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- Everyone can view subcategories
CREATE POLICY "Subcategories are viewable by everyone"
  ON public.subcategories FOR SELECT
  TO public
  USING (true);

-- Admins can manage subcategories
CREATE POLICY "Admins can insert subcategories"
  ON public.subcategories FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update subcategories"
  ON public.subcategories FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete subcategories"
  ON public.subcategories FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add subcategory_id to products
ALTER TABLE public.products
  ADD COLUMN subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL;

-- Seed subcategories from the hardcoded data
INSERT INTO public.subcategories (category_id, name, slug, icon, sort_order)
SELECT c.id, sub.name, sub.slug, sub.icon, sub.sort_order
FROM public.categories c
CROSS JOIN LATERAL (
  VALUES
    ('skincare', 'Cleansers', 'cleansers', '🧼', 1),
    ('skincare', 'Moisturizers', 'moisturizers', '💧', 2),
    ('skincare', 'Serums', 'serums', '✨', 3),
    ('skincare', 'Sunscreen', 'sunscreen', '☀️', 4),
    ('skincare', 'Masks', 'masks', '🎭', 5),
    ('skincare', 'Toners', 'toners', '🌸', 6),
    ('haircare', 'Shampoo', 'shampoo', '🧴', 1),
    ('haircare', 'Conditioner', 'conditioner', '💆', 2),
    ('haircare', 'Hair Oil', 'hair-oil', '🫧', 3),
    ('haircare', 'Treatments', 'treatments', '💇', 4),
    ('haircare', 'Styling', 'styling', '💫', 5),
    ('bodycare', 'Body Wash', 'body-wash', '🚿', 1),
    ('bodycare', 'Body Lotion', 'body-lotion', '🧴', 2),
    ('bodycare', 'Deodorant', 'deodorant', '🌿', 3),
    ('bodycare', 'Hand Cream', 'hand-cream', '🤲', 4),
    ('makeup', 'Lips', 'lips', '💋', 1),
    ('makeup', 'Eyes', 'eyes', '👁️', 2),
    ('makeup', 'Face', 'face', '✨', 3),
    ('makeup', 'Nails', 'nails', '💅', 4),
    ('vitamins', 'Multivitamins', 'multivitamins', '💊', 1),
    ('vitamins', 'Vitamin D', 'vitamin-d', '☀️', 2),
    ('vitamins', 'Omega-3', 'omega-3', '🐟', 3),
    ('vitamins', 'Iron', 'iron', '💪', 4),
    ('personalcare', 'Oral Care', 'oral-care', '🪥', 1),
    ('personalcare', 'Feminine Care', 'feminine-care', '🌷', 2),
    ('personalcare', 'Shaving', 'shaving', '🪒', 3),
    ('otc', 'Pain Relief', 'pain-relief', '💊', 1),
    ('otc', 'Cold & Flu', 'cold-flu', '🤧', 2),
    ('otc', 'Digestive', 'digestive', '🫄', 3),
    ('otc', 'First Aid', 'first-aid', '🩹', 4),
    ('wellness', 'Supplements', 'supplements', '🌿', 1),
    ('wellness', 'Probiotics', 'probiotics', '🦠', 2),
    ('wellness', 'Protein', 'protein', '💪', 3),
    ('motherbaby', 'Baby Care', 'baby-care', '👶', 1),
    ('motherbaby', 'Diapers', 'diapers', '🧷', 2),
    ('motherbaby', 'Maternity', 'maternity', '🤰', 3),
    ('devices', 'Skin Devices', 'skin-devices', '🔬', 1),
    ('devices', 'Hair Tools', 'hair-tools', '💇', 2),
    ('devices', 'Oral Devices', 'oral-devices', '🪥', 3)
) AS sub(cat_slug, name, slug, icon, sort_order)
WHERE c.slug = sub.cat_slug;
