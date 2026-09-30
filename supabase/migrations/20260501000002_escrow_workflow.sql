-- Pago protegido (retención tipo Airbnb)
--  * El cobro entra a la cuenta de Maddi; se libera al propietario por etapas:
--      - 1er tramo: al confirmarse la instalación (o 48 h tras subir evidencia sin objeción),
--        nunca antes del inicio de la campaña.
--      - Tramos siguientes: al inicio de cada periodo de 30 días.
--  * Reservas aprobadas sin pago expiran a las 48 h.
--  * El anunciante puede reportar un problema: se congelan los pagos y un admin resuelve.

-- ---------------------------------------------------------------------------
-- 1. bookings: columnas del flujo
-- ---------------------------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS installation_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS installation_photos TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS installation_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS installation_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS installation_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS installation_confirmed_by TEXT,
  ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
  ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispute_resolution TEXT,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_installation_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_installation_status_check
  CHECK (installation_status IN ('pending', 'submitted', 'confirmed', 'disputed', 'overdue'));

UPDATE public.bookings SET approved_at = updated_at WHERE status = 'approved' AND approved_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. platform_commissions: datos para reembolsos / transferencias
-- ---------------------------------------------------------------------------
ALTER TABLE public.platform_commissions
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 3. booking_payouts: calendario de liberación al propietario
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL,
  kind TEXT NOT NULL DEFAULT 'installment' CHECK (kind IN ('installment', 'settlement')),
  period_start DATE,
  period_end DATE,
  gross_cents INTEGER NOT NULL CHECK (gross_cents >= 0),
  fee_cents INTEGER NOT NULL CHECK (fee_cents >= 0),
  net_cents INTEGER NOT NULL CHECK (net_cents >= 0),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'released', 'cancelled', 'failed')),
  release_at TIMESTAMPTZ,            -- NULL = esperando confirmación de instalación
  released_at TIMESTAMPTZ,
  stripe_transfer_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_booking_payouts_due
  ON public.booking_payouts (release_at) WHERE status = 'scheduled';

ALTER TABLE public.booking_payouts ENABLE ROW LEVEL SECURITY;

-- Solo lectura para el cliente; todas las escrituras las hace el service role.
DROP POLICY IF EXISTS "Parties can view payouts" ON public.booking_payouts;
CREATE POLICY "Parties can view payouts"
ON public.booking_payouts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.billboards bb ON bb.id = b.billboard_id
    WHERE b.id = booking_payouts.booking_id
      AND (bb.owner_id = auth.uid() OR b.business_id = auth.uid())
  )
  OR EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
);

DROP TRIGGER IF EXISTS update_booking_payouts_updated_at ON public.booking_payouts;
CREATE TRIGGER update_booking_payouts_updated_at
BEFORE UPDATE ON public.booking_payouts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 4. Guardia del flujo: el cliente no puede tocar columnas del flujo ni cancelar
--    una reserva aprobada "a mano" (debe pasar por cancel-booking / RPCs).
--    Exentos: service role (auth.uid() NULL), admins y las RPC de abajo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_booking_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  privileged BOOLEAN;
BEGIN
  privileged := auth.uid() IS NULL
    OR COALESCE(current_setting('app.booking_workflow', true), '') = 'on'
    OR EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid());

  IF NOT privileged THEN
    IF OLD.status = 'approved' AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Una reserva aprobada solo puede cancelarse desde la opción "Cancelar reserva"';
    END IF;
    NEW.approved_at := OLD.approved_at;
    NEW.payment_due_at := OLD.payment_due_at;
    NEW.installation_status := OLD.installation_status;
    NEW.installation_photos := OLD.installation_photos;
    NEW.installation_submitted_at := OLD.installation_submitted_at;
    NEW.installation_deadline := OLD.installation_deadline;
    NEW.installation_confirmed_at := OLD.installation_confirmed_at;
    NEW.installation_confirmed_by := OLD.installation_confirmed_by;
    NEW.dispute_reason := OLD.dispute_reason;
    NEW.disputed_at := OLD.disputed_at;
    NEW.dispute_resolution := OLD.dispute_resolution;
    NEW.cancel_reason := OLD.cancel_reason;
    NEW.cancelled_at := OLD.cancelled_at;
    NEW.cancelled_by := OLD.cancelled_by;
  END IF;

  -- Al aprobar arranca el plazo de 48 h para pagar.
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    NEW.approved_at := now();
    NEW.payment_due_at := now() + interval '48 hours';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_booking_workflow_trigger ON public.bookings;
CREATE TRIGGER guard_booking_workflow_trigger
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.guard_booking_workflow();

-- ---------------------------------------------------------------------------
-- 5. RPC del flujo de instalación
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_booking_paid(_booking_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_commissions
    WHERE booking_id = _booking_id AND payment_status = 'paid'
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_booking_paid(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_booking_paid(UUID) TO authenticated, service_role;

-- Propietario sube evidencia de instalación.
CREATE OR REPLACE FUNCTION public.submit_installation_proof(_booking_id UUID, _paths TEXT[])
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  b public.bookings;
  p TEXT;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.billboards WHERE id = b.billboard_id AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Reserva no encontrada';
  END IF;
  IF b.status <> 'approved' OR NOT public.is_booking_paid(b.id) THEN
    RAISE EXCEPTION 'La reserva debe estar aprobada y pagada';
  END IF;
  IF b.installation_status IN ('confirmed', 'disputed') THEN
    RAISE EXCEPTION 'La instalación ya fue confirmada o está en revisión';
  END IF;
  IF _paths IS NULL OR cardinality(_paths) = 0 OR cardinality(_paths) > 10 THEN
    RAISE EXCEPTION 'Sube entre 1 y 10 fotos';
  END IF;
  FOREACH p IN ARRAY _paths LOOP
    IF split_part(p, '/', 1) <> auth.uid()::text THEN
      RAISE EXCEPTION 'Ruta de archivo inválida';
    END IF;
  END LOOP;

  PERFORM set_config('app.booking_workflow', 'on', true);
  UPDATE public.bookings SET
    installation_photos = _paths,
    installation_status = 'submitted',
    installation_submitted_at = now(),
    installation_deadline = now() + interval '48 hours'
  WHERE id = b.id;
END;
$$;

-- Confirma instalación y programa el primer tramo de pago. Solo service role (la usa
-- el cron para la autoconfirmación) y la RPC del anunciante.
CREATE OR REPLACE FUNCTION public.confirm_installation_internal(_booking_id UUID, _by TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  b public.bookings;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reserva no encontrada'; END IF;

  PERFORM set_config('app.booking_workflow', 'on', true);
  UPDATE public.bookings SET
    installation_status = 'confirmed',
    installation_confirmed_at = now(),
    installation_confirmed_by = _by
  WHERE id = b.id;

  -- Libera el tramo 1 (o los que sigan esperando): nunca antes del inicio de la campaña.
  UPDATE public.booking_payouts
  SET release_at = GREATEST(now(), (b.start_date::text || 'T06:00:00Z')::timestamptz)
  WHERE booking_id = b.id AND status = 'scheduled' AND release_at IS NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.confirm_installation_internal(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_installation_internal(UUID, TEXT) TO service_role;

-- Anunciante confirma la instalación.
CREATE OR REPLACE FUNCTION public.confirm_installation(_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  b public.bookings;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND OR b.business_id <> auth.uid() THEN
    RAISE EXCEPTION 'Reserva no encontrada';
  END IF;
  IF b.status <> 'approved' OR b.installation_status <> 'submitted' THEN
    RAISE EXCEPTION 'No hay evidencia de instalación pendiente de confirmar';
  END IF;
  PERFORM public.confirm_installation_internal(b.id, 'advertiser');
END;
$$;

-- Anunciante reporta un problema: congela pagos hasta que un admin resuelva.
CREATE OR REPLACE FUNCTION public.report_installation_issue(_booking_id UUID, _reason TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  b public.bookings;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id = _booking_id;
  IF NOT FOUND OR b.business_id <> auth.uid() THEN
    RAISE EXCEPTION 'Reserva no encontrada';
  END IF;
  IF b.status <> 'approved' OR NOT public.is_booking_paid(b.id) THEN
    RAISE EXCEPTION 'Solo puedes reportar campañas pagadas';
  END IF;
  IF b.installation_status = 'disputed' THEN
    RAISE EXCEPTION 'Ya hay un reporte abierto para esta reserva';
  END IF;
  IF b.end_date < current_date THEN
    RAISE EXCEPTION 'La campaña ya terminó';
  END IF;
  IF _reason IS NULL OR length(btrim(_reason)) < 10 OR length(_reason) > 1000 THEN
    RAISE EXCEPTION 'Describe el problema (entre 10 y 1000 caracteres)';
  END IF;

  PERFORM set_config('app.booking_workflow', 'on', true);
  UPDATE public.bookings SET
    installation_status = 'disputed',
    dispute_reason = btrim(_reason),
    disputed_at = now(),
    dispute_resolution = NULL
  WHERE id = b.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_installation_proof(UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_installation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_installation_issue(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Bucket privado para evidencias de instalación
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('installation-proofs', 'installation-proofs', false, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Owners upload installation proofs" ON storage.objects;
CREATE POLICY "Owners upload installation proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'installation-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Quien sube o el anunciante de una reserva con esa evidencia (o un admin) pueden verla.
DROP POLICY IF EXISTS "Parties view installation proofs" ON storage.objects;
CREATE POLICY "Parties view installation proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'installation-proofs'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.business_id = auth.uid() AND name = ANY (b.installation_photos)
    )
    OR EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Owners delete own installation proofs" ON storage.objects;
CREATE POLICY "Owners delete own installation proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'installation-proofs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ---------------------------------------------------------------------------
-- 7. Cron: edge function release-payouts cada 15 min
--    Requiere (una sola vez, fuera de migraciones, por ser secretos):
--      select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--      select vault.create_secret('<mismo valor que CRON_SECRET de la función>', 'cron_secret');
--    Si pg_cron / pg_net no existen, esta sección se omite sin error.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    PERFORM cron.unschedule('release-payouts')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'release-payouts');

    PERFORM cron.schedule(
      'release-payouts',
      '*/15 * * * *',
      $job$
      SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
               || '/functions/v1/release-payouts',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
        ),
        body := '{}'::jsonb
      );
      $job$
    );
  ELSE
    RAISE NOTICE 'pg_cron/pg_net no disponibles: programa release-payouts manualmente';
  END IF;
END
$$;
