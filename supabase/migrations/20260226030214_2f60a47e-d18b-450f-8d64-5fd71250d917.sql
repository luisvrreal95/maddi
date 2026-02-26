
-- Add is_digital column to billboards
ALTER TABLE public.billboards ADD COLUMN is_digital boolean NOT NULL DEFAULT false;

-- Update check_booking_overlap trigger to skip digital billboards
CREATE OR REPLACE FUNCTION public.check_booking_overlap()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  billboard_is_digital boolean;
BEGIN
  -- Skip overlap check for digital billboards
  SELECT is_digital INTO billboard_is_digital
  FROM public.billboards WHERE id = NEW.billboard_id;
  
  IF billboard_is_digital = true THEN
    RETURN NEW;
  END IF;

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
$function$;
