-- Stripe Connect payments
-- - stripe_accounts: cuenta Connect (Express) de cada propietario. Solo el service role escribe.
-- - platform_commissions: columnas para rastrear el cobro de Stripe por reserva.

-- ---------------------------------------------------------------------------
-- 1. Cuentas Connect de propietarios
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  details_submitted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;

-- El propietario solo puede leer su propio estado; las escrituras las hacen
-- las edge functions con service role (que ignora RLS).
DROP POLICY IF EXISTS "Users can view own stripe account" ON public.stripe_accounts;
CREATE POLICY "Users can view own stripe account"
ON public.stripe_accounts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view stripe accounts" ON public.stripe_accounts;
CREATE POLICY "Admins can view stripe accounts"
ON public.stripe_accounts FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));

DROP TRIGGER IF EXISTS update_stripe_accounts_updated_at ON public.stripe_accounts;
CREATE TRIGGER update_stripe_accounts_updated_at
BEFORE UPDATE ON public.stripe_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Un anunciante necesita saber si el propietario puede cobrar, sin ver su id de Stripe.
CREATE OR REPLACE FUNCTION public.owner_can_receive_payments(_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT charges_enabled AND payouts_enabled
     FROM public.stripe_accounts WHERE user_id = _owner_id),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.owner_can_receive_payments(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. platform_commissions: seguimiento del cobro
-- ---------------------------------------------------------------------------
ALTER TABLE public.platform_commissions
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_platform_commissions_session
  ON public.platform_commissions(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_platform_commissions_payment_intent
  ON public.platform_commissions(stripe_payment_intent_id);

-- Esta policy permitía a cualquier usuario insertar comisiones arbitrarias.
-- El trigger que las crea es SECURITY DEFINER, así que no la necesita.
DROP POLICY IF EXISTS "System can insert commissions" ON public.platform_commissions;

-- Anunciante y propietario pueden ver el estado de pago de sus reservas.
DROP POLICY IF EXISTS "Parties can view commission of their bookings" ON public.platform_commissions;
CREATE POLICY "Parties can view commission of their bookings"
ON public.platform_commissions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.bookings b
    JOIN public.billboards bb ON bb.id = b.billboard_id
    WHERE b.id = platform_commissions.booking_id
      AND (b.business_id = auth.uid() OR bb.owner_id = auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- 3. Integridad: una reserva aprobada no puede cambiar de monto ni de fechas
--    (el propietario tiene UPDATE sobre sus reservas y podría alterar el total
--    que luego se cobra). Admin y service role quedan exentos.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_approved_booking_terms()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'approved'
     AND (NEW.total_price IS DISTINCT FROM OLD.total_price
          OR NEW.start_date IS DISTINCT FROM OLD.start_date
          OR NEW.end_date IS DISTINCT FROM OLD.end_date
          OR NEW.business_id IS DISTINCT FROM OLD.business_id
          OR NEW.billboard_id IS DISTINCT FROM OLD.billboard_id)
     AND auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
  THEN
    RAISE EXCEPTION 'No se pueden modificar monto, fechas ni partes de una reserva aprobada';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_approved_booking_terms_trigger ON public.bookings;
CREATE TRIGGER protect_approved_booking_terms_trigger
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.protect_approved_booking_terms();
