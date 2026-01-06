-- Create table for INEGI demographic insights
CREATE TABLE public.inegi_demographics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billboard_id UUID NOT NULL REFERENCES public.billboards(id) ON DELETE CASCADE,
  
  -- Business data from DENUE
  nearby_businesses_count INTEGER DEFAULT 0,
  business_sectors JSONB DEFAULT '{}',
  dominant_sector TEXT,
  
  -- AI-generated insights
  audience_profile TEXT,
  socioeconomic_level TEXT CHECK (socioeconomic_level IN ('bajo', 'medio', 'medio-alto', 'alto')),
  commercial_environment TEXT,
  ai_summary TEXT,
  
  -- Raw data for reference
  raw_denue_data JSONB,
  
  -- Cache control
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(billboard_id)
);

-- Enable RLS
ALTER TABLE public.inegi_demographics ENABLE ROW LEVEL SECURITY;

-- Anyone can view demographics for available billboards
CREATE POLICY "Anyone can view demographics for available billboards"
ON public.inegi_demographics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM billboards
    WHERE billboards.id = inegi_demographics.billboard_id
    AND billboards.is_available = true
  )
);

-- Owners can view demographics for their billboards
CREATE POLICY "Owners can view their billboard demographics"
ON public.inegi_demographics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM billboards
    WHERE billboards.id = inegi_demographics.billboard_id
    AND billboards.owner_id = auth.uid()
  )
);

-- System can insert/update demographics
CREATE POLICY "System can manage demographics"
ON public.inegi_demographics
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_inegi_demographics_billboard_id ON public.inegi_demographics(billboard_id);
CREATE INDEX idx_inegi_demographics_last_updated ON public.inegi_demographics(last_updated);