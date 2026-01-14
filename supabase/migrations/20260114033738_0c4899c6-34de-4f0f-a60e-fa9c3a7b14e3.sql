-- 1. Add RLS policy so conversation participants can view each other's profiles (only full_name is exposed via queries)
CREATE POLICY "Conversation participants can view each other's profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE (c.business_id = auth.uid() AND c.owner_id = profiles.user_id)
       OR (c.owner_id = auth.uid() AND c.business_id = profiles.user_id)
  )
);

-- 2. Add RLS policy so booking participants can view each other's profiles
CREATE POLICY "Booking participants can view each other's profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN billboards bb ON bb.id = b.billboard_id
    WHERE (b.business_id = auth.uid() AND bb.owner_id = profiles.user_id)
       OR (bb.owner_id = auth.uid() AND b.business_id = profiles.user_id)
  )
);

-- 3. Create function to prevent overlapping bookings with approved bookings
CREATE OR REPLACE FUNCTION public.check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check for non-rejected bookings
  IF NEW.status = 'rejected' THEN
    RETURN NEW;
  END IF;
  
  -- Check if there's any overlapping approved booking for the same billboard
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE billboard_id = NEW.billboard_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status = 'approved'
      AND (
        (NEW.start_date <= end_date AND NEW.end_date >= start_date)
      )
  ) THEN
    RAISE EXCEPTION 'Las fechas seleccionadas se solapan con una reserva aprobada existente';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Create trigger to enforce no-overlap rule on INSERT and UPDATE
DROP TRIGGER IF EXISTS check_booking_overlap_trigger ON public.bookings;
CREATE TRIGGER check_booking_overlap_trigger
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.check_booking_overlap();