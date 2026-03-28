-- Performance indexes for product queries
-- These dramatically speed up home page sections, category/brand/concern pages

-- Composite index for trending/new/pick filters (home page sections)
CREATE INDEX IF NOT EXISTS idx_products_is_trending ON public.products (is_trending) WHERE is_trending = true;
CREATE INDEX IF NOT EXISTS idx_products_is_new ON public.products (is_new) WHERE is_new = true;
CREATE INDEX IF NOT EXISTS idx_products_is_pick ON public.products (is_pick) WHERE is_pick = true;

-- Category + subcategory filtering (category pages)
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_category_sub ON public.products (category_id, subcategory_id);

-- Brand filtering (brand pages)
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products (brand_id);

-- In-stock filter (used in many queries)
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products (in_stock) WHERE in_stock = true;

-- Discounted products (original_price not null)
CREATE INDEX IF NOT EXISTS idx_products_has_discount ON public.products (original_price) WHERE original_price IS NOT NULL;

-- Condition column for concern-based queries
CREATE INDEX IF NOT EXISTS idx_products_condition ON public.products USING gin (to_tsvector('simple', coalesce(condition, '')));

-- Product images sort order for faster joins
CREATE INDEX IF NOT EXISTS idx_product_images_product_sort ON public.product_images (product_id, sort_order);

-- Product tags for gift/tag lookups
CREATE INDEX IF NOT EXISTS idx_product_tags_tag ON public.product_tags (tag);
CREATE INDEX IF NOT EXISTS idx_product_tags_product ON public.product_tags (product_id);

-- Push subscriptions for faster notification delivery
CREATE INDEX IF NOT EXISTS idx_push_subs_active ON public.push_subscriptions (is_active) WHERE is_active = true;

-- Orders by user for order history
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);

-- Banners active sort
CREATE INDEX IF NOT EXISTS idx_banners_active_sort ON public.banners (sort_order) WHERE is_active = true;