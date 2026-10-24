-- Pagos con Stripe Connect (cobro con retención al solicitar; captura al aprobar)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS platform_fee numeric,
  ADD COLUMN IF NOT EXISTS owner_payout numeric,
  ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz;

COMMENT ON COLUMN public.bookings.payment_status IS
  'none (pago por fuera) | requires_payment | authorized (retenido) | captured (cobrado) | canceled | failed | expired';

-- Solo el servidor (service_role) puede cambiar campos de pago
CREATE OR REPLACE FUNCTION public.protect_payment_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.payment_status := 'none';
      NEW.stripe_payment_intent_id := NULL;
      NEW.platform_fee := NULL;
      NEW.owner_payout := NULL;
      NEW.payment_expires_at := NULL;
    ELSE
      NEW.payment_status := OLD.payment_status;
      NEW.stripe_payment_intent_id := OLD.stripe_payment_intent_id;
      NEW.platform_fee := OLD.platform_fee;
      NEW.owner_payout := OLD.owner_payout;
      NEW.payment_expires_at := OLD.payment_expires_at;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_payment_columns ON public.bookings;
CREATE TRIGGER trg_protect_payment_columns
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.protect_payment_columns();

-- El usuario no debe poder editar sus propios campos de Stripe en profiles
CREATE OR REPLACE FUNCTION public.protect_stripe_profile_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(auth.role(), 'service_role') <> 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      NEW.stripe_account_id := NULL; NEW.stripe_charges_enabled := false; NEW.stripe_payouts_enabled := false;
    ELSE
      NEW.stripe_account_id := OLD.stripe_account_id;
      NEW.stripe_charges_enabled := OLD.stripe_charges_enabled;
      NEW.stripe_payouts_enabled := OLD.stripe_payouts_enabled;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_stripe_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_stripe_profile_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_stripe_profile_columns();
