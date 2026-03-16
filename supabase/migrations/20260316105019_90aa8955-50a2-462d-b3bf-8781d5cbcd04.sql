
-- Indexes for home page section queries (is_trending, is_pick, is_new, original_price)
CREATE INDEX IF NOT EXISTS idx_products_is_trending ON public.products (is_trending) WHERE is_trending = true;
CREATE INDEX IF NOT EXISTS idx_products_is_pick ON public.products (is_pick) WHERE is_pick = true;
CREATE INDEX IF NOT EXISTS idx_products_is_new ON public.products (is_new) WHERE is_new = true;
CREATE INDEX IF NOT EXISTS idx_products_original_price ON public.products (original_price) WHERE original_price IS NOT NULL;

-- Index for product_images lookup by product_id (speeds up joins)
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images (product_id);

-- Index for offers active filtering
CREATE INDEX IF NOT EXISTS idx_offers_active ON public.offers (is_active) WHERE is_active = true;

-- Index for brands featured filtering  
CREATE INDEX IF NOT EXISTS idx_brands_featured ON public.brands (featured) WHERE featured = true;
