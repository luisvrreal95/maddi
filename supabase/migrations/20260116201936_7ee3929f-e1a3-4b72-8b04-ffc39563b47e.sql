-- Create POI overview cache table
CREATE TABLE public.poi_overview_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  billboard_id uuid NOT NULL UNIQUE REFERENCES public.billboards(id) ON DELETE CASCADE,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  radius integer NOT NULL DEFAULT 500,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_poi_cache_billboard ON public.poi_overview_cache(billboard_id);
CREATE INDEX idx_poi_cache_expires ON public.poi_overview_cache(expires_at);

-- Enable RLS
ALTER TABLE public.poi_overview_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can view cached POI data for available billboards
CREATE POLICY "Anyone can view POI cache for available billboards" 
ON public.poi_overview_cache 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM billboards 
  WHERE billboards.id = poi_overview_cache.billboard_id 
  AND billboards.is_available = true
));

-- Owners can view their own billboard POI cache
CREATE POLICY "Owners can view their POI cache" 
ON public.poi_overview_cache 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM billboards 
  WHERE billboards.id = poi_overview_cache.billboard_id 
  AND billboards.owner_id = auth.uid()
));

-- System can manage POI cache (from edge functions using service role)
CREATE POLICY "System can manage POI cache" 
ON public.poi_overview_cache 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_poi_cache_updated_at
BEFORE UPDATE ON public.poi_overview_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();