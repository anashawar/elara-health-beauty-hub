
-- Operations can manage banners
CREATE POLICY "Operations can manage banners" ON public.banners FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage categories
CREATE POLICY "Operations can manage categories" ON public.categories FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage brands
CREATE POLICY "Operations can manage brands" ON public.brands FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage products
CREATE POLICY "Operations can manage products" ON public.products FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage product images
CREATE POLICY "Operations can manage product images" ON public.product_images FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage product tags
CREATE POLICY "Operations can manage product tags" ON public.product_tags FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage coupons
CREATE POLICY "Operations can manage coupons" ON public.coupons FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage coupon allowed users
CREATE POLICY "Operations can manage coupon allowed users" ON public.coupon_allowed_users FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage offers
CREATE POLICY "Operations can manage offers" ON public.offers FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage notification campaigns
CREATE POLICY "Operations can manage campaigns" ON public.notification_campaigns FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage notifications
CREATE POLICY "Operations can manage notifications" ON public.notifications FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can delete orders
CREATE POLICY "Operations can delete orders" ON public.orders FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role));

-- Operations can delete order items
CREATE POLICY "Operations can delete order items" ON public.order_items FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can view all order ratings
CREATE POLICY "Operations can view all ratings" ON public.order_ratings FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage reviews
CREATE POLICY "Operations can manage reviews" ON public.reviews FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage subcategories
CREATE POLICY "Operations can manage subcategories" ON public.subcategories FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage support conversations
CREATE POLICY "Operations can manage support conversations" ON public.support_conversations FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage support messages
CREATE POLICY "Operations can manage support messages" ON public.support_messages FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage warehouses (view only, not team)
CREATE POLICY "Operations can view warehouses" ON public.warehouses FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage brand_warehouses
CREATE POLICY "Operations can manage brand warehouses" ON public.brand_warehouses FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage warehouse notifications
CREATE POLICY "Operations can manage warehouse notifications" ON public.warehouse_notifications FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage warehouse requests
CREATE POLICY "Operations can manage warehouse requests" ON public.warehouse_requests FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage prep access tokens
CREATE POLICY "Operations can manage prep tokens" ON public.prep_access_tokens FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage loyalty
CREATE POLICY "Operations can manage loyalty points" ON public.loyalty_points FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

CREATE POLICY "Operations can manage loyalty transactions" ON public.loyalty_transactions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

CREATE POLICY "Operations can manage loyalty redemptions" ON public.loyalty_redemptions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role))
WITH CHECK (has_role(auth.uid(), 'operations'::app_role));

-- Operations can manage skin analyses
CREATE POLICY "Operations can view skin analyses" ON public.skin_analyses FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'operations'::app_role));
