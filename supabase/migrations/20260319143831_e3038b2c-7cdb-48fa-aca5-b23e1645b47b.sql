
-- 1. Coupon allowed users (restrict coupons to specific users)
CREATE TABLE public.coupon_allowed_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(coupon_id, user_id)
);
ALTER TABLE public.coupon_allowed_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coupon users" ON public.coupon_allowed_users
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow anon/public to read for coupon validation at checkout
CREATE POLICY "Anyone can read coupon users for validation" ON public.coupon_allowed_users
FOR SELECT TO public
USING (true);

-- 2. Warehouses table
CREATE TABLE public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text,
  contact_email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage warehouses" ON public.warehouses
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Warehouses viewable by everyone" ON public.warehouses
FOR SELECT TO public
USING (is_active = true);

-- 3. Warehouse users (separate auth for warehouse staff)
CREATE TABLE public.warehouse_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text,
  email text,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.warehouse_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage warehouse users" ON public.warehouse_users
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon can read warehouse users for login" ON public.warehouse_users
FOR SELECT TO anon
USING (is_active = true);

-- 4. Brand-warehouse junction
CREATE TABLE public.brand_warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, warehouse_id)
);
ALTER TABLE public.brand_warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage brand warehouses" ON public.brand_warehouses
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Brand warehouses viewable by everyone" ON public.brand_warehouses
FOR SELECT TO public
USING (true);

-- 5. Warehouse requests (missing brands, missing products, price notes)
CREATE TABLE public.warehouse_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE SET NULL,
  type text NOT NULL, -- 'missing_brand', 'missing_product', 'price_note'
  title text NOT NULL,
  description text,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, in_progress, resolved
  priority text NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  created_by_username text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.warehouse_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage warehouse requests" ON public.warehouse_requests
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon can read warehouse requests" ON public.warehouse_requests
FOR SELECT TO anon
USING (true);

CREATE POLICY "Anon can insert warehouse requests" ON public.warehouse_requests
FOR INSERT TO anon
WITH CHECK (true);

CREATE POLICY "Anon can update warehouse requests" ON public.warehouse_requests
FOR UPDATE TO anon
USING (true);

-- 6. Warehouse notifications
CREATE TABLE public.warehouse_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'request', -- request, update, system
  reference_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.warehouse_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage warehouse notifications" ON public.warehouse_notifications
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon can read warehouse notifications" ON public.warehouse_notifications
FOR SELECT TO anon
USING (true);

CREATE POLICY "Anon can update warehouse notifications" ON public.warehouse_notifications
FOR UPDATE TO anon
USING (true);

CREATE POLICY "Anon can insert warehouse notifications" ON public.warehouse_notifications
FOR INSERT TO anon
WITH CHECK (true);
