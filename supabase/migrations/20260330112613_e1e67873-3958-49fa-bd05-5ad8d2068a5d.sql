
CREATE OR REPLACE FUNCTION public.notify_admin_new_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://mycpfwnfvtsgshdzggrm.supabase.co/functions/v1/notify-admin-order',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'order_id', NEW.id,
      'total', NEW.total,
      'user_id', NEW.user_id
    )
  );
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_new_order_notify_admin
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_order();
