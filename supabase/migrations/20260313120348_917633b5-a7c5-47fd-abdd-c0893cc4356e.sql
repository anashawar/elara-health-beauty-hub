
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS influencer_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS influencer_commission numeric DEFAULT 0;

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
