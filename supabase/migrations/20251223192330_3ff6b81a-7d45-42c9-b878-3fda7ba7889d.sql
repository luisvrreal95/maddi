-- Tabla para almacenar datos de tráfico por espectacular
CREATE TABLE public.traffic_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billboard_id UUID NOT NULL REFERENCES public.billboards(id) ON DELETE CASCADE,
  current_speed INTEGER,
  free_flow_speed INTEGER,
  confidence DECIMAL(3,2),
  estimated_daily_impressions INTEGER,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Agregar columna de preferencias de notificación a profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"push": true, "email": true}'::jsonb;

-- RLS para traffic_data
ALTER TABLE public.traffic_data ENABLE ROW LEVEL SECURITY;

-- Propietarios pueden ver datos de tráfico de sus espectaculares
CREATE POLICY "Owners can view traffic data" ON public.traffic_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.billboards 
      WHERE billboards.id = traffic_data.billboard_id 
      AND billboards.owner_id = auth.uid()
    )
  );

-- Negocios pueden ver datos de tráfico de sus reservas aprobadas
CREATE POLICY "Businesses can view traffic data for their bookings" ON public.traffic_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE bookings.billboard_id = traffic_data.billboard_id 
      AND bookings.business_id = auth.uid()
      AND bookings.status = 'approved'
    )
  );

-- Sistema puede insertar datos de tráfico
CREATE POLICY "System can insert traffic data" ON public.traffic_data
  FOR INSERT WITH CHECK (true);

-- Habilitar realtime para traffic_data
ALTER PUBLICATION supabase_realtime ADD TABLE public.traffic_data;