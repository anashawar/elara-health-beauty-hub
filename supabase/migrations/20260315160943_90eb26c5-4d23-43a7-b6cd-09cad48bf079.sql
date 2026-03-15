-- Assign vitamins/supplements products
UPDATE products SET category_id = '31fc5b5b-4160-4fbc-af7b-6c871a7f03cb', subcategory_id = 'de2165cd-9a87-40dc-8e7d-3a577df6cabf'
WHERE id IN (
  '49a7b7a6-e5dc-4095-81ee-0c863ef7d659', -- Holland & Barrett Turmeric
  'c6163eb9-10a7-496d-9a21-7469abe695f7', -- Holland & Barrett Collagen Powder
  '1ea73e99-b666-40be-a05f-f9080d0faae8', -- Holland & Barrett Leanberine
  '338e8071-a9b7-4601-bbb6-ba2e0f2241da', -- Holland & Barrett Magnesium
  '696beb1e-c534-494b-8f34-132c665cc65a', -- Lucovitaal
  '50b95c11-6489-4201-8ac6-1829644b2a76', -- One A Day Men's Multivitamin
  '3af60d5a-0ec9-41e0-a223-a667da8af5a6', -- Carlyle Tongkat Ali
  '115f1286-5b7e-4a02-b3ab-c7770d5ea675', -- Holland & Barrett Matcha
  'adb45537-144e-4f94-be58-95c02a77e2f8'  -- Holland & Barrett 5-HTP
);

-- Assign protein/nutrition products
UPDATE products SET category_id = '31fc5b5b-4160-4fbc-af7b-6c871a7f03cb', subcategory_id = 'b0656c2e-f83b-4979-8692-a1a6232fd28b'
WHERE id IN (
  '3a6d60c8-7a5a-4a20-a87a-a4b340a75e7e', -- Snickers Protein Bar
  'cdc1a5aa-63c4-4c0c-b385-baa3986fe697'  -- Snickers Protein Bar 20g
);

-- Assign remaining uncategorized to their best-fit existing categories
-- Baby products → Mother & Baby
UPDATE products SET category_id = '9b72fc2b-2740-4e95-82f7-5bedc6b60f81', subcategory_id = '9251fd5c-fc64-48e7-a999-83aba6e5550b'
WHERE id IN (
  '0d928cb8-1023-4caa-8ee3-ec72b3dab624', -- suavinex limpiador nasal
  'b0ae830c-ebb3-47cf-a13f-74010b28465e'  -- SUAVINEX ASPIRADOR NASAL
);

-- Body lotion → Body Care
UPDATE products SET category_id = '75bed7a9-51e3-4936-8bbb-53700b287c98', subcategory_id = '1aa5147d-da47-4fa4-86d6-3069db52d5dc'
WHERE id = '5da1ba92-f00a-440c-b8e4-8e910e0360c8'; -- Bath & Body body lotion

-- Hair products → Hair Care
UPDATE products SET category_id = '55a6135f-7121-4466-a018-430586df2e9e', subcategory_id = '03c7b477-e859-4cf8-b38b-e1d0c03f22c6'
WHERE id = '0b62f8d0-6f5a-40b7-a7d5-7b5002f1bf72'; -- Gisou hair perfume

UPDATE products SET category_id = '55a6135f-7121-4466-a018-430586df2e9e', subcategory_id = '3fb03b95-49dd-43e8-9fc9-bd4bf7afd91b'
WHERE id = '0df789c5-c6b0-4189-9ef1-2c47ad39bbf8'; -- Gisou hair mask

-- Lip product → Makeup
UPDATE products SET category_id = '8089938b-b3ae-4957-935f-fbe47f8a2a2a', subcategory_id = '10846c1e-ca57-4906-9f81-6bf0f48a71c2'
WHERE id = 'd2ef9de7-87ee-484e-8b17-84ae32840c6b'; -- Gisou lip oil trio

-- Skincare products → Skincare
UPDATE products SET category_id = '7259310d-b94c-4905-8791-cf95e1b03c8b', subcategory_id = 'd7c6a54b-3647-4be7-906f-d6e582024c9c'
WHERE id = 'bcf28b89-25a3-4d91-a631-6e69e86f4989'; -- La Roche-Posay Serum

UPDATE products SET category_id = '7259310d-b94c-4905-8791-cf95e1b03c8b', subcategory_id = '33bbdc71-59ce-49f8-b303-dba0b18ebff6'
WHERE id IN (
  'bc96a332-18a3-42e6-bfbb-0155035bbecf', -- Uriage cold cream
  '2fc8f560-a989-4be3-80e6-f1b3740adb08'  -- Bio-oil
);

-- Dettol cleaners → Personal Care / Wellness Essentials (household hygiene fits here)
UPDATE products SET category_id = '31fc5b5b-4160-4fbc-af7b-6c871a7f03cb', subcategory_id = '450ced5f-32f1-4c6f-860e-77c1f4e04d77'
WHERE id IN (
  '3ed0bb17-9720-4af0-83f1-7d5a88b36beb', -- Dettol Floor Cleaner Jasmine
  '4bb81823-c195-4308-8b8a-41cf81611715', -- Dettol Floor Cleaner Aqua
  '5d2fe4dd-ef5c-4578-8fd9-31e922bdfc76'  -- Dettol Floor Cleaner Rose
);