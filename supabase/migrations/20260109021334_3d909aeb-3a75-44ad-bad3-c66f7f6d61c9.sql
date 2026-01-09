-- Tabla para usuarios administradores
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permissions JSONB DEFAULT '{"full_access": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver la tabla de admins
CREATE POLICY "Admins can view admin users"
ON public.admin_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
  )
);

-- Tabla para tracking de uso de APIs externas
CREATE TABLE public.api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name TEXT NOT NULL,
  endpoint_type TEXT NOT NULL,
  source_screen TEXT,
  user_id UUID,
  billboard_id UUID REFERENCES public.billboards(id) ON DELETE SET NULL,
  request_timestamp TIMESTAMPTZ DEFAULT now(),
  response_status INTEGER,
  latency_ms INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Sistema puede insertar logs (edge functions con service role)
CREATE POLICY "System can insert api logs"
ON public.api_usage_logs
FOR INSERT
WITH CHECK (true);

-- Solo admins pueden ver logs
CREATE POLICY "Admins can view api logs"
ON public.api_usage_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
  )
);

-- Indices para queries de analitica
CREATE INDEX idx_api_usage_timestamp ON public.api_usage_logs(request_timestamp DESC);
CREATE INDEX idx_api_usage_api_name ON public.api_usage_logs(api_name);
CREATE INDEX idx_api_usage_source ON public.api_usage_logs(source_screen);

-- Tabla para comisiones de la plataforma
CREATE TABLE public.platform_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  total_amount DECIMAL NOT NULL,
  commission_rate DECIMAL DEFAULT 0.15,
  commission_amount DECIMAL NOT NULL,
  owner_payout DECIMAL NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  payment_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(booking_id)
);

-- Enable RLS
ALTER TABLE public.platform_commissions ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver/gestionar comisiones
CREATE POLICY "Admins can manage commissions"
ON public.platform_commissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = auth.uid()
  )
);

-- Sistema puede insertar comisiones (trigger)
CREATE POLICY "System can insert commissions"
ON public.platform_commissions
FOR INSERT
WITH CHECK (true);

-- Trigger para crear comision automaticamente cuando booking es aprobado
CREATE OR REPLACE FUNCTION public.create_commission_on_booking_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    INSERT INTO public.platform_commissions (
      booking_id,
      total_amount,
      commission_rate,
      commission_amount,
      owner_payout
    ) VALUES (
      NEW.id,
      NEW.total_price,
      0.15,
      NEW.total_price * 0.15,
      NEW.total_price * 0.85
    )
    ON CONFLICT (booking_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_booking_approval_create_commission
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.create_commission_on_booking_approval();

-- Trigger para actualizar updated_at en comisiones
CREATE TRIGGER update_commissions_updated_at
BEFORE UPDATE ON public.platform_commissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();