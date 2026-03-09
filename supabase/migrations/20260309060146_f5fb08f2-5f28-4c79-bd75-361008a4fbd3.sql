
-- Add new valuation columns to spectacular_valuation_leads
ALTER TABLE public.spectacular_valuation_leads
  ADD COLUMN IF NOT EXISTS zone_category text,
  ADD COLUMN IF NOT EXISTS traffic_daily integer,
  ADD COLUMN IF NOT EXISTS impressions_monthly integer,
  ADD COLUMN IF NOT EXISTS cpm_base numeric,
  ADD COLUMN IF NOT EXISTS visibility_score numeric,
  ADD COLUMN IF NOT EXISTS format_multiplier numeric,
  ADD COLUMN IF NOT EXISTS zone_multiplier numeric,
  ADD COLUMN IF NOT EXISTS estimated_value numeric;

-- Create road_traffic_data cache table
CREATE TABLE IF NOT EXISTS public.road_traffic_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  traffic_daily_estimate integer NOT NULL,
  source text NOT NULL DEFAULT 'tomtom',
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.road_traffic_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert road traffic data"
  ON public.road_traffic_data FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read road traffic data"
  ON public.road_traffic_data FOR SELECT
  USING (true);

CREATE POLICY "System can update road traffic data"
  ON public.road_traffic_data FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create spatial index for proximity lookups
CREATE INDEX IF NOT EXISTS idx_road_traffic_data_location ON public.road_traffic_data (lat, lng);
