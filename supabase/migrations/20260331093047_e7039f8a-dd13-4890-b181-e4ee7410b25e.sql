
-- Drop old slot jobs that never ran
SELECT cron.unschedule('notif-morning');
SELECT cron.unschedule('notif-afternoon');
SELECT cron.unschedule('notif-evening1');
SELECT cron.unschedule('notif-evening2');

-- Recreate them properly
-- 9:30 AM Baghdad = 6:30 UTC
SELECT cron.schedule(
  'notif-slot-morning',
  '30 6 * * *',
  $$SELECT net.http_post(url:='https://mycpfwnfvtsgshdzggrm.supabase.co/functions/v1/auto-notifications', headers:='{"Content-Type":"application/json"}'::jsonb, body:='{"action":"slot_morning"}'::jsonb)$$
);

-- 1:00 PM Baghdad = 10:00 UTC
SELECT cron.schedule(
  'notif-slot-afternoon',
  '0 10 * * *',
  $$SELECT net.http_post(url:='https://mycpfwnfvtsgshdzggrm.supabase.co/functions/v1/auto-notifications', headers:='{"Content-Type":"application/json"}'::jsonb, body:='{"action":"slot_afternoon"}'::jsonb)$$
);

-- 5:00 PM Baghdad = 14:00 UTC  
SELECT cron.schedule(
  'notif-slot-evening1',
  '0 14 * * *',
  $$SELECT net.http_post(url:='https://mycpfwnfvtsgshdzggrm.supabase.co/functions/v1/auto-notifications', headers:='{"Content-Type":"application/json"}'::jsonb, body:='{"action":"slot_evening1"}'::jsonb)$$
);

-- 8:00 PM Baghdad = 17:00 UTC
SELECT cron.schedule(
  'notif-slot-evening2',
  '0 17 * * *',
  $$SELECT net.http_post(url:='https://mycpfwnfvtsgshdzggrm.supabase.co/functions/v1/auto-notifications', headers:='{"Content-Type":"application/json"}'::jsonb, body:='{"action":"slot_evening2"}'::jsonb)$$
);
