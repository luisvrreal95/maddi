/**
 * Valuation Engine for Maddi Billboard Rental Estimation
 *
 * Uses a CPM-based model:
 *   impressions_monthly = traffic_daily * 30 * visibility_score
 *   value_base = (impressions_monthly / 1000) * cpm_base
 *   value_estimated = value_base * format_multiplier * zone_multiplier
 *   range = [value_estimated * 0.85, value_estimated * 1.15]
 */

// ── Zone classification ──────────────────────────────────────────────

export type ZoneCategory = 'premium' | 'comercial' | 'media' | 'periferica';

export function getVisibilityScore(zone: ZoneCategory): number {
  const map: Record<ZoneCategory, number> = {
    premium: 0.45,
    comercial: 0.38,
    media: 0.30,
    periferica: 0.20,
  };
  return Math.max(map[zone] ?? 0.30, 0.20);
}

export function getCPMBase(zone: ZoneCategory): number {
  const map: Record<ZoneCategory, number> = {
    premium: 60,
    comercial: 40,
    media: 25,
    periferica: 25,
  };
  return map[zone] ?? 25;
}

export function getZoneMultiplier(zone: ZoneCategory): number {
  const map: Record<ZoneCategory, number> = {
    premium: 1.30,
    comercial: 1.15,
    media: 1.00,
    periferica: 0.85,
  };
  return map[zone] ?? 1.00;
}

// ── Format / structure multiplier ────────────────────────────────────

export type StructureType =
  | 'panoramico_estandar'
  | 'unipolar_grande'
  | 'valla_publicitaria'
  | 'pantalla_digital'
  | 'muro_azotea';

export const STRUCTURE_OPTIONS: { value: StructureType; label: string }[] = [
  { value: 'panoramico_estandar', label: 'Espectacular panorámico estándar' },
  { value: 'unipolar_grande', label: 'Unipolar grande' },
  { value: 'valla_publicitaria', label: 'Valla publicitaria' },
  { value: 'pantalla_digital', label: 'Pantalla digital' },
  { value: 'muro_azotea', label: 'Muro / azotea' },
];

export function getFormatMultiplier(structure: StructureType): number {
  const map: Record<StructureType, number> = {
    valla_publicitaria: 0.90,
    panoramico_estandar: 1.00,
    unipolar_grande: 1.20,
    pantalla_digital: 1.60,
    muro_azotea: 1.00,
  };
  return map[structure] ?? 1.00;
}

// ── Traffic fallback by city ─────────────────────────────────────────

export function estimateTrafficByCity(city: string): number {
  const estimates: Record<string, number> = {
    mexicali: 18000,
    tijuana: 25000,
    ensenada: 12000,
    cdmx: 35000,
    guadalajara: 28000,
    monterrey: 26000,
    puebla: 22000,
    cancun: 20000,
    leon: 18000,
    merida: 16000,
  };
  const key = city.toLowerCase();
  for (const [k, v] of Object.entries(estimates)) {
    if (key.includes(k)) return v;
  }
  return 15000;
}

// ── Zone classification heuristic (MVP) ──────────────────────────────

const PREMIUM_KEYWORDS = [
  'zona dorada', 'zona río', 'polanco', 'santa fe', 'reforma',
  'garza sada', 'valle oriente', 'zona hotelera', 'interlomas',
];

const COMERCIAL_KEYWORDS = [
  'centro', 'plaza', 'boulevard', 'blvd', 'avenida principal',
  'calzada', 'periferico', 'periférico', 'circuito', 'eje vial',
  'autopista', 'carretera', 'industrial',
];

export function classifyZone(zone: string, city: string): ZoneCategory {
  const text = `${zone} ${city}`.toLowerCase();

  if (PREMIUM_KEYWORDS.some(k => text.includes(k))) return 'premium';
  if (COMERCIAL_KEYWORDS.some(k => text.includes(k))) return 'comercial';

  // Cities that are generally higher-traffic default to 'media'
  const bigCities = ['cdmx', 'guadalajara', 'monterrey', 'tijuana', 'cancun'];
  if (bigCities.some(c => text.includes(c))) return 'media';

  return 'media'; // safe default for MVP
}

// ── Main estimation function ─────────────────────────────────────────

export interface ValuationInput {
  trafficDaily: number;
  structureType: StructureType;
  zoneCategory: ZoneCategory;
}

export interface ValuationResult {
  trafficDaily: number;
  impressionsMonthly: number;
  cpmBase: number;
  visibilityScore: number;
  formatMultiplier: number;
  zoneMultiplier: number;
  estimatedValue: number;
  valueLow: number;
  valueHigh: number;
}

export function estimateSpectacularValue(input: ValuationInput): ValuationResult {
  const visibilityScore = getVisibilityScore(input.zoneCategory);
  const cpmBase = getCPMBase(input.zoneCategory);
  const formatMultiplier = getFormatMultiplier(input.structureType);
  const zoneMultiplier = getZoneMultiplier(input.zoneCategory);

  const impressionsMonthly = Math.round(input.trafficDaily * 30 * visibilityScore);
  const valueBase = (impressionsMonthly / 1000) * cpmBase;
  const estimatedValue = Math.round(valueBase * formatMultiplier * zoneMultiplier);

  // Use wider range to make estimates more realistic
  const valueLow = Math.round(estimatedValue * 0.85 / 500) * 500;
  const valueHigh = Math.round(estimatedValue * 1.15 / 500) * 500;

  return {
    trafficDaily: input.trafficDaily,
    impressionsMonthly,
    cpmBase,
    visibilityScore,
    formatMultiplier,
    zoneMultiplier,
    estimatedValue,
    valueLow: Math.max(valueLow, 3000), // floor at $3,000
    valueHigh: Math.max(valueHigh, 5000),
  };
}
