-- Caras de un mismo espectacular: cada cara sigue siendo una fila (su propio precio, fotos, impresiones,
-- calendario y reservas). Las filas que comparten structure_id son la misma estructura física.
ALTER TABLE public.billboards
  ADD COLUMN IF NOT EXISTS structure_id uuid,
  ADD COLUMN IF NOT EXISTS face_label text,
  ADD COLUMN IF NOT EXISTS facing text;

COMMENT ON COLUMN public.billboards.structure_id IS 'Misma estructura física = mismo structure_id (una fila por cara)';
COMMENT ON COLUMN public.billboards.face_label IS 'Etiqueta de la cara, p.ej. A o B';
COMMENT ON COLUMN public.billboards.facing IS 'Sentido que enfrenta la cara, p.ej. Poniente o Hacia el centro';

CREATE INDEX IF NOT EXISTS billboards_structure_id_idx ON public.billboards (structure_id) WHERE structure_id IS NOT NULL;
