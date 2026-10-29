-- Liberación del pago al propietario solo con evidencia de instalación.
-- Nuevo modelo de cobro: el pago entra a Maddi (cargo en la plataforma) y se transfiere al
-- propietario cuando se valida la instalación (foto + confirmación del anunciante o 48 h sin disputa).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_model text NOT NULL DEFAULT 'destination',
  ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS evidence_paths text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS evidence_note text,
  ADD COLUMN IF NOT EXISTS evidence_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS advertiser_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS disputed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text;

COMMENT ON COLUMN public.bookings.payment_model IS 'destination (el pago ya fue directo al propietario) | separate (Maddi retiene y transfiere al validar)';
COMMENT ON COLUMN public.bookings.payout_status IS 'none | awaiting_evidence | in_review | disputed | released | refunded';

-- Los cobros ya capturados con el modelo anterior ya se pagaron al propietario
UPDATE public.bookings
   SET payout_status = 'released', payout_released_at = COALESCE(payout_released_at, now())
 WHERE payment_status = 'captured' AND payout_status = 'none';

-- Solo el servidor (service_role) puede cambiar campos de pago y de validación
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
      NEW.payment_model := 'destination';
      NEW.payout_status := 'none';
      NEW.evidence_paths := '{}';
      NEW.evidence_note := NULL;
      NEW.evidence_submitted_at := NULL;
      NEW.review_deadline := NULL;
      NEW.advertiser_confirmed_at := NULL;
      NEW.dispute_reason := NULL;
      NEW.disputed_at := NULL;
      NEW.payout_released_at := NULL;
      NEW.stripe_transfer_id := NULL;
    ELSE
      NEW.payment_status := OLD.payment_status;
      NEW.stripe_payment_intent_id := OLD.stripe_payment_intent_id;
      NEW.platform_fee := OLD.platform_fee;
      NEW.owner_payout := OLD.owner_payout;
      NEW.payment_expires_at := OLD.payment_expires_at;
      NEW.payment_model := OLD.payment_model;
      NEW.payout_status := OLD.payout_status;
      NEW.evidence_paths := OLD.evidence_paths;
      NEW.evidence_note := OLD.evidence_note;
      NEW.evidence_submitted_at := OLD.evidence_submitted_at;
      NEW.review_deadline := OLD.review_deadline;
      NEW.advertiser_confirmed_at := OLD.advertiser_confirmed_at;
      NEW.dispute_reason := OLD.dispute_reason;
      NEW.disputed_at := OLD.disputed_at;
      NEW.payout_released_at := OLD.payout_released_at;
      NEW.stripe_transfer_id := OLD.stripe_transfer_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- Bucket privado para las fotos de evidencia. Ruta: {owner_id}/{booking_id}/{archivo}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('campaign-evidence', 'campaign-evidence', false, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Owner uploads campaign evidence" ON storage.objects;
CREATE POLICY "Owner uploads campaign evidence" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'campaign-evidence'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND EXISTS (
    SELECT 1 FROM public.bookings b JOIN public.billboards bb ON bb.id = b.billboard_id
    WHERE b.id::text = (storage.foldername(name))[2] AND bb.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Parties read campaign evidence" ON storage.objects;
CREATE POLICY "Parties read campaign evidence" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'campaign-evidence'
  AND EXISTS (
    SELECT 1 FROM public.bookings b JOIN public.billboards bb ON bb.id = b.billboard_id
    WHERE b.id::text = (storage.foldername(name))[2]
      AND (b.business_id = auth.uid() OR bb.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()))
  )
);
