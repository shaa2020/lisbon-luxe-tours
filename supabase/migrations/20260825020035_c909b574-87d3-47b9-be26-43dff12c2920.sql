SELECT cron.unschedule('booking-emails-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'booking-emails-daily');

SELECT cron.schedule(
  'booking-emails-daily',
  '0 9 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--3d285bca-d152-4b64-a8eb-198a16edfec3.lovable.app/api/public/cron/booking-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
    ),
    body := '{}'::jsonb
  );
  $cron$
);