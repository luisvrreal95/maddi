-- Agregar columna para tracking de última actualización de tráfico
ALTER TABLE public.billboards ADD COLUMN IF NOT EXISTS last_traffic_update TIMESTAMPTZ;

-- Agregar índice para consultas eficientes de cache
CREATE INDEX IF NOT EXISTS idx_traffic_data_billboard_recorded ON public.traffic_data (billboard_id, recorded_at DESC);