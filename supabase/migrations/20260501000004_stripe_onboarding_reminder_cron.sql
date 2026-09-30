-- Cron diario del recordatorio de conexión de cuenta de cobro (usa los secretos de Vault
-- project_url y cron_secret, igual que release-payouts).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    PERFORM cron.unschedule('stripe-onboarding-reminder')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'stripe-onboarding-reminder');

    PERFORM cron.schedule(
      'stripe-onboarding-reminder',
      '0 15 * * *',   -- 09:00 CDMX
      $job$
      SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
               || '/functions/v1/stripe-onboarding-reminder',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
        ),
        body := '{}'::jsonb
      );
      $job$
    );
  ELSE
    RAISE NOTICE 'pg_cron/pg_net no disponibles: programa stripe-onboarding-reminder manualmente';
  END IF;
END
$$;
