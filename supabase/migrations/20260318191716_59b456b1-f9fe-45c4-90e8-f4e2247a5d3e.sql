
ALTER TABLE public.prep_access_tokens
  ADD COLUMN excluded_brand_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN excluded_product_ids uuid[] NOT NULL DEFAULT '{}';
