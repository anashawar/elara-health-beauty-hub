
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(_user_id uuid, _points integer, _description text, _reference_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  current_balance integer;
  reward_stock integer;
BEGIN
  -- Check balance
  SELECT balance INTO current_balance FROM public.loyalty_points WHERE user_id = _user_id;
  IF current_balance IS NULL OR current_balance < _points THEN
    RETURN false;
  END IF;

  -- Check and decrement stock if reward referenced
  IF _reference_id IS NOT NULL THEN
    SELECT stock INTO reward_stock FROM public.loyalty_rewards WHERE id = _reference_id;
    IF reward_stock IS NOT NULL AND reward_stock <= 0 THEN
      RETURN false;
    END IF;
    IF reward_stock IS NOT NULL THEN
      UPDATE public.loyalty_rewards SET stock = stock - 1 WHERE id = _reference_id;
    END IF;
  END IF;

  -- Deduct points
  UPDATE public.loyalty_points
  SET balance = balance - _points,
      lifetime_redeemed = lifetime_redeemed + _points,
      updated_at = now()
  WHERE user_id = _user_id;

  -- Record transaction
  INSERT INTO public.loyalty_transactions (user_id, type, points, description, reference_id)
  VALUES (_user_id, 'redeem', -_points, _description, _reference_id);

  RETURN true;
END;
$$;
