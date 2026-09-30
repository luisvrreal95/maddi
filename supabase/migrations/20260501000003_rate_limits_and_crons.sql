-- Rate limiting para edge functions públicas + cron de las tareas internas.

-- ---------------------------------------------------------------------------
-- 1. Rate limiting (ventana fija). Solo el service role puede usarlo.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;  -- sin policies: nadie salvo service role

CREATE OR REPLACE FUNCTION public.check_rate_limit(_key TEXT, _limit INTEGER, _window_seconds INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  win TIMESTAMPTZ;
  c INTEGER;
BEGIN
  win := to_timestamp(floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds);

  INSERT INTO public.rate_limits AS r (key, window_start, count)
  VALUES (_key, win, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET count = r.count + 1
  RETURNING r.count INTO c;

  -- Limpieza oportunista (~1 % de las llamadas)
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '2 days';
  END IF;

  RETURN c <= _limit;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- ---------------------------------------------------------------------------
-- 1b. ¿Dos usuarios tienen relación real (conversación o reserva)? La usa
--     send-notification-email para impedir correos a usuarios sin vínculo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.users_related(_a UUID, _b UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _a = _b
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE (c.business_id = _a AND c.owner_id = _b) OR (c.business_id = _b AND c.owner_id = _a)
    )
    OR EXISTS (
      SELECT 1 FROM public.bookings bk
      JOIN public.billboards bb ON bb.id = bk.billboard_id
      WHERE (bk.business_id = _a AND bb.owner_id = _b) OR (bk.business_id = _b AND bb.owner_id = _a)
    );
$$;

REVOKE EXECUTE ON FUNCTION public.users_related(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.users_related(UUID, UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Cron diario de las funciones que ahora son solo internas.
--    Usa los mismos secretos de Vault que release-payouts (project_url, cron_secret).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  j RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    FOR j IN SELECT * FROM (VALUES
      ('campaign-lifecycle-notifications', '0 14 * * *'),   -- 08:00 CDMX
      ('owner-activation-reminder',        '0 16 * * *')    -- 10:00 CDMX
    ) AS t(fn, schedule) LOOP
      PERFORM cron.unschedule(j.fn) WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = j.fn);
      PERFORM cron.schedule(
        j.fn, j.schedule,
        format($job$
          SELECT net.http_post(
            url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
                   || '/functions/v1/%s',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
            ),
            body := '{}'::jsonb
          );
        $job$, j.fn)
      );
    END LOOP;
  ELSE
    RAISE NOTICE 'pg_cron/pg_net no disponibles: programa las funciones internas manualmente';
  END IF;
END
$$;
