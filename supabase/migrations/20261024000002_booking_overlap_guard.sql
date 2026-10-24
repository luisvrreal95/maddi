-- Candado contra reservas dobles: no se puede tener dos reservas APROBADAS que se
-- empalmen (fechas inclusivas) en la misma cara, salvo en pantallas digitales.
-- Se valida en la base de datos para cubrir aprobaciones simultáneas.
CREATE OR REPLACE FUNCTION public.prevent_overlapping_approved_bookings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digital boolean;
  v_conflict record;
BEGIN
  IF NEW.status IS DISTINCT FROM 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(is_digital, false) INTO v_digital FROM public.billboards WHERE id = NEW.billboard_id;
  IF v_digital THEN
    RETURN NEW;
  END IF;

  -- Serializa aprobaciones de la misma cara
  PERFORM pg_advisory_xact_lock(hashtext(NEW.billboard_id::text));

  SELECT id, start_date, end_date INTO v_conflict
  FROM public.bookings
  WHERE billboard_id = NEW.billboard_id
    AND status = 'approved'
    AND id <> NEW.id
    AND NEW.start_date <= end_date
    AND NEW.end_date >= start_date
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Las fechas se empalman con una reserva ya aprobada (% a %)', v_conflict.start_date, v_conflict.end_date
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_overlapping_approved_bookings ON public.bookings;
CREATE TRIGGER trg_prevent_overlapping_approved_bookings
  BEFORE INSERT OR UPDATE OF status, start_date, end_date, billboard_id ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_overlapping_approved_bookings();
