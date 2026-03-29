-- Create a function that calls the auto-notifications edge function on order status change
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url := 'https://mycpfwnfvtsgshdzggrm.supabase.co/functions/v1/auto-notifications',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'action', 'order_status_change',
        'order_id', NEW.id,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();

CREATE OR REPLACE FUNCTION public.notify_new_user_welcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://mycpfwnfvtsgshdzggrm.supabase.co/functions/v1/auto-notifications',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'action', 'welcome',
      'user_id', NEW.user_id
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_profile_welcome ON public.profiles;
CREATE TRIGGER on_new_profile_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_user_welcome();