ALTER TABLE public.brands ADD COLUMN restricted_cities text[] DEFAULT NULL;

COMMENT ON COLUMN public.brands.restricted_cities IS 'When NULL, brand is available everywhere. When set, only users in these cities can see/order the brand products.';