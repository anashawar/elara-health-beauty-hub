
-- Categories translations
UPDATE categories SET name_ar = 'العناية بالبشرة', name_ku = 'بایەخپێدانی پێست' WHERE slug = 'skincare';
UPDATE categories SET name_ar = 'العناية بالشعر', name_ku = 'بایەخپێدانی قژ' WHERE slug = 'haircare';
UPDATE categories SET name_ar = 'العناية بالجسم', name_ku = 'بایەخپێدانی جەستە' WHERE slug = 'bodycare';
UPDATE categories SET name_ar = 'المكياج', name_ku = 'مەیکئەپ' WHERE slug = 'makeup';
UPDATE categories SET name_ar = 'الصحة والعافية', name_ku = 'تەندروستی' WHERE slug = 'wellness';
UPDATE categories SET name_ar = 'العطور', name_ku = 'بۆن' WHERE slug = 'fragrance';
UPDATE categories SET name_ar = 'العناية الشخصية', name_ku = 'بایەخپێدانی کەسی' WHERE slug = 'personalcare';
UPDATE categories SET name_ar = 'الأم والطفل', name_ku = 'دایک و منداڵ' WHERE slug = 'motherbaby';

-- Skincare subcategories
UPDATE subcategories SET name_ar = 'غسول الوجه', name_ku = 'پاککەرەوە' WHERE slug = 'cleansers';
UPDATE subcategories SET name_ar = 'مرطبات', name_ku = 'شێداری' WHERE slug = 'moisturizers';
UPDATE subcategories SET name_ar = 'سيروم', name_ku = 'سیرۆم' WHERE slug = 'serums';
UPDATE subcategories SET name_ar = 'واقي شمس', name_ku = 'بەرگری خۆر' WHERE slug = 'sunscreen';
UPDATE subcategories SET name_ar = 'ماسكات', name_ku = 'ماسک' WHERE slug = 'masks';
UPDATE subcategories SET name_ar = 'تونر', name_ku = 'تۆنەر' WHERE slug = 'toners';

-- Hair Care subcategories
UPDATE subcategories SET name_ar = 'شامبو', name_ku = 'شامپۆ' WHERE slug = 'shampoo';
UPDATE subcategories SET name_ar = 'بلسم', name_ku = 'نەرمکەرەوە' WHERE slug = 'conditioner';
UPDATE subcategories SET name_ar = 'زيت الشعر', name_ku = 'رۆنی قژ' WHERE slug = 'hair-oil';
UPDATE subcategories SET name_ar = 'علاجات', name_ku = 'چارەسەر' WHERE slug = 'treatments';
UPDATE subcategories SET name_ar = 'تصفيف', name_ku = 'شێوەپێدان' WHERE slug = 'styling';

-- Body Care subcategories
UPDATE subcategories SET name_ar = 'غسول الجسم', name_ku = 'شوشتنی جەستە' WHERE slug = 'body-wash';
UPDATE subcategories SET name_ar = 'لوشن الجسم', name_ku = 'لۆشنی جەستە' WHERE slug = 'body-lotion';
UPDATE subcategories SET name_ar = 'مزيل العرق', name_ku = 'دیئۆدۆرانت' WHERE slug = 'deodorant';
UPDATE subcategories SET name_ar = 'كريم اليدين', name_ku = 'کریمی دەست' WHERE slug = 'hand-cream';

-- Makeup subcategories
UPDATE subcategories SET name_ar = 'الشفاه', name_ku = 'لێو' WHERE slug = 'lips';
UPDATE subcategories SET name_ar = 'العيون', name_ku = 'چاو' WHERE slug = 'eyes';
UPDATE subcategories SET name_ar = 'الوجه', name_ku = 'ڕوخسار' WHERE slug = 'face';
UPDATE subcategories SET name_ar = 'الأظافر', name_ku = 'نینۆک' WHERE slug = 'nails';

-- Mother & Baby subcategories
UPDATE subcategories SET name_ar = 'العناية بالطفل', name_ku = 'بایەخپێدانی منداڵ' WHERE slug = 'baby-care';
UPDATE subcategories SET name_ar = 'حفاضات', name_ku = 'پۆشاکی منداڵ' WHERE slug = 'diapers';
UPDATE subcategories SET name_ar = 'الأمومة', name_ku = 'دایکایەتی' WHERE slug = 'maternity';

-- Wellness subcategories (fix incorrect translations)
UPDATE subcategories SET name_ar = 'منظفات الأرضيات والأسطح', name_ku = 'پاککەرەوەی زەوی و ڕووبەر' WHERE slug = 'floor-surface-cleaners';
UPDATE subcategories SET name_ar = 'نظافة اليدين والجسم', name_ku = 'پاکیژی دەست و جەستە' WHERE slug = 'hand-body-hygiene';
UPDATE subcategories SET name_ar = 'أساسيات المنزل', name_ku = 'پێداویستییەکانی ماڵ' WHERE slug = 'home-essentials';

-- Personal Care subcategories (check if any exist)
-- Fragrance subcategories already have translations
