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

/** Direcciones hacia donde mira una cara. Se guarda `key` en billboards.facing. */
export interface FacingOption { key: string; short: string; label: string; bearing: number; opposite: string }
export const FACINGS: FacingOption[] = [
  { key: 'norte', short: 'N', label: 'norte', bearing: 0, opposite: 'sur' },
  { key: 'noreste', short: 'NE', label: 'noreste', bearing: 45, opposite: 'suroeste' },
  { key: 'oriente', short: 'E', label: 'oriente', bearing: 90, opposite: 'poniente' },
  { key: 'sureste', short: 'SE', label: 'sureste', bearing: 135, opposite: 'noroeste' },
  { key: 'sur', short: 'S', label: 'sur', bearing: 180, opposite: 'norte' },
  { key: 'suroeste', short: 'SO', label: 'suroeste', bearing: 225, opposite: 'noreste' },
  { key: 'poniente', short: 'O', label: 'poniente', bearing: 270, opposite: 'oriente' },
  { key: 'noroeste', short: 'NO', label: 'noroeste', bearing: 315, opposite: 'sureste' },
];

export const getFacing = (key?: string | null): FacingOption | undefined =>
  FACINGS.find((f) => f.key === (key || '').toLowerCase().trim());

/** "oriente" -> "Mira al oriente"; texto libre antiguo se muestra tal cual. */
export const facingText = (key?: string | null): string => {
  if (!key) return '';
  const f = getFacing(key);
  return f ? `Mira al ${f.label}` : key;
};
