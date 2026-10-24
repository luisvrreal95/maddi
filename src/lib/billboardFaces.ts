/**
 * Caras de un espectacular. Cada cara es una fila de `billboards` (precio, fotos, impresiones,
 * calendario y reservas propios). Las filas de una misma estructura comparten `structure_id`.
 * Mientras no exista structure_id, se agrupan automáticamente las filas del mismo propietario
 * con las mismas coordenadas (~11 m).
 */
export interface FaceKeyInput {
  id: string;
  owner_id?: string | null;
  latitude: number | string;
  longitude: number | string;
  structure_id?: string | null;
}

export const structureKey = (b: FaceKeyInput): string =>
  b.structure_id ||
  `auto:${b.owner_id ?? ''}:${Number(b.latitude).toFixed(4)},${Number(b.longitude).toFixed(4)}`;

export const defaultFaceLabel = (index: number): string => `Cara ${String.fromCharCode(65 + index)}`;

/** "A" o "Cara A" -> "Cara A" */
export const normalizeFaceLabel = (label: string | null | undefined, index: number): string => {
  const l = (label || '').trim();
  if (!l) return defaultFaceLabel(index);
  return /^cara\b/i.test(l) ? l : `Cara ${l}`;
};
