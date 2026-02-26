CREATE OR REPLACE FUNCTION public.sync_is_digital_on_type_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.billboard_type = 'pantalla_digital' THEN
    NEW.is_digital := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_is_digital_on_billboard_type
BEFORE INSERT OR UPDATE OF billboard_type ON public.billboards
FOR EACH ROW
EXECUTE FUNCTION public.sync_is_digital_on_type_change();