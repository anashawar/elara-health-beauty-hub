-- Create the 8th category: Health & Wellness
INSERT INTO categories (name, name_ar, name_ku, slug, icon, color, sort_order)
VALUES ('Health & Wellness', 'الصحة والعافية', 'تەندروستی و تەندروستی', 'health-wellness', '💊', '#10b981', 5);

-- Create subcategories for the new category
INSERT INTO subcategories (name, name_ar, name_ku, slug, category_id, sort_order)
VALUES
  ('Vitamins & Supplements', 'فيتامينات ومكملات', 'ڤیتامین و تەواوکەر', 'vitamins-supplements', (SELECT id FROM categories WHERE slug = 'health-wellness'), 1),
  ('Protein & Nutrition', 'بروتين وتغذية', 'پڕۆتین و خۆراک', 'protein-nutrition', (SELECT id FROM categories WHERE slug = 'health-wellness'), 2),
  ('Wellness Essentials', 'أساسيات العافية', 'پێداویستییەکانی تەندروستی', 'wellness-essentials', (SELECT id FROM categories WHERE slug = 'health-wellness'), 3);