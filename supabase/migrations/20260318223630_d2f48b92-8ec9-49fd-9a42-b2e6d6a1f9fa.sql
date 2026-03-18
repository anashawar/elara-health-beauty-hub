-- Update order status constraint and default
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status = ANY (ARRAY['processing','prepared','on_the_way','delivered','cancelled']));
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'processing';

-- Update any existing 'pending' or 'shipped' or 'in_progress' orders to 'processing'
UPDATE public.orders SET status = 'processing' WHERE status IN ('pending', 'shipped', 'in_progress');