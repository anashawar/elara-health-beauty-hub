-- Migrate any remaining 'pending' orders to 'processing'
UPDATE public.orders SET status = 'processing' WHERE status = 'pending';