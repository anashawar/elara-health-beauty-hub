
-- Loyalty points balance per user
CREATE TABLE public.loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  lifetime_earned integer NOT NULL DEFAULT 0,
  lifetime_redeemed integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'bronze',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Loyalty transaction history
CREATE TABLE public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'earn', -- earn, redeem, bonus, expired
  points integer NOT NULL,
  description text,
  reference_id uuid, -- order_id or reward_id
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Redeemable rewards
CREATE TABLE public.loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_ar text,
  title_ku text,
  description text,
  description_ar text,
  description_ku text,
  points_cost integer NOT NULL,
  reward_type text NOT NULL DEFAULT 'discount', -- discount, product, gift, shipping
  reward_value numeric DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  stock integer, -- null = unlimited
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Redeemed rewards tracking
CREATE TABLE public.loyalty_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_id uuid NOT NULL REFERENCES public.loyalty_rewards(id),
  points_spent integer NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, fulfilled, cancelled
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for loyalty_points
CREATE POLICY "Users can view their own points" ON public.loyalty_points FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all points" ON public.loyalty_points FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for loyalty_transactions
CREATE POLICY "Users can view their own transactions" ON public.loyalty_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all transactions" ON public.loyalty_transactions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for loyalty_rewards (public read, admin write)
CREATE POLICY "Rewards viewable by everyone" ON public.loyalty_rewards FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage rewards" ON public.loyalty_rewards FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for loyalty_redemptions
CREATE POLICY "Users can view their own redemptions" ON public.loyalty_redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own redemptions" ON public.loyalty_redemptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all redemptions" ON public.loyalty_redemptions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Function to award points (called from edge function or after order)
CREATE OR REPLACE FUNCTION public.award_loyalty_points(
  _user_id uuid,
  _points integer,
  _description text,
  _reference_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Upsert loyalty_points
  INSERT INTO public.loyalty_points (user_id, balance, lifetime_earned)
  VALUES (_user_id, _points, _points)
  ON CONFLICT (user_id) DO UPDATE
  SET balance = loyalty_points.balance + _points,
      lifetime_earned = loyalty_points.lifetime_earned + _points,
      updated_at = now();

  -- Update tier based on lifetime points
  UPDATE public.loyalty_points
  SET tier = CASE
    WHEN lifetime_earned >= 1000 THEN 'platinum'
    WHEN lifetime_earned >= 500 THEN 'gold'
    WHEN lifetime_earned >= 200 THEN 'silver'
    ELSE 'bronze'
  END
  WHERE user_id = _user_id;

  -- Record transaction
  INSERT INTO public.loyalty_transactions (user_id, type, points, description, reference_id)
  VALUES (_user_id, 'earn', _points, _description, _reference_id);
END;
$$;

-- Function to redeem points
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
  _user_id uuid,
  _points integer,
  _description text,
  _reference_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance integer;
BEGIN
  SELECT balance INTO current_balance FROM public.loyalty_points WHERE user_id = _user_id;
  IF current_balance IS NULL OR current_balance < _points THEN
    RETURN false;
  END IF;

  UPDATE public.loyalty_points
  SET balance = balance - _points,
      lifetime_redeemed = lifetime_redeemed + _points,
      updated_at = now()
  WHERE user_id = _user_id;

  INSERT INTO public.loyalty_transactions (user_id, type, points, description, reference_id)
  VALUES (_user_id, 'redeem', -_points, _description, _reference_id);

  RETURN true;
END;
$$;
