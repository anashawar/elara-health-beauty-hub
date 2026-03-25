-- Performance indexes for frequently queried columns

-- Products: queried by brand, category, subcategory, slug, and flags
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products (brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON public.products (subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_in_stock ON public.products (in_stock) WHERE in_stock = true;
CREATE INDEX IF NOT EXISTS idx_products_is_pick ON public.products (is_pick) WHERE is_pick = true;
CREATE INDEX IF NOT EXISTS idx_products_is_new ON public.products (is_new) WHERE is_new = true;

-- Orders: queried by user and status
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

-- Order items: queried by order and product
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);

-- Cart items: queried by user
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items (user_id);

-- Wishlist: queried by user
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id ON public.wishlist_items (user_id);

-- Addresses: queried by user
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses (user_id);

-- Profiles: queried by user_id
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);

-- Reviews: queried by product
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews (product_id);

-- Notifications: queried by user and read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);

-- Support conversations: queried by user
CREATE INDEX IF NOT EXISTS idx_support_conversations_user_id ON public.support_conversations (user_id);

-- Brands: queried by slug
CREATE INDEX IF NOT EXISTS idx_brands_slug ON public.brands (slug);

-- Categories: queried by slug
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);

-- Loyalty points: queried by user
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user_id ON public.loyalty_points (user_id);

-- Product images: queried by product
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images (product_id);