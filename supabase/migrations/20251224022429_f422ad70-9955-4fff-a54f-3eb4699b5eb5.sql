-- Add points_of_interest column to billboards table
ALTER TABLE public.billboards 
ADD COLUMN points_of_interest text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.billboards.points_of_interest IS 'Array of nearby POI categories detected via TomTom API';