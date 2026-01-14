-- Add minimum campaign duration and minimum advance booking days to billboards table
ALTER TABLE public.billboards 
ADD COLUMN min_campaign_days INTEGER DEFAULT 30,
ADD COLUMN min_advance_booking_days INTEGER DEFAULT 7;

-- Add comments for clarity
COMMENT ON COLUMN public.billboards.min_campaign_days IS 'Minimum number of days for a campaign/booking';
COMMENT ON COLUMN public.billboards.min_advance_booking_days IS 'Minimum days in advance required to book this billboard';