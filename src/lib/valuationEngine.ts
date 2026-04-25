/**
 * Valuation Engine for Maddi Billboard Rental Estimation
 *
 * Hybrid model: max(traffic-based value, corridor floor)
 *
 *   impressions_monthly = traffic_daily * 30 * visibility_score
 *   value_traffic = (impressions_monthly / 1000) * cpm_base * format_mult * zone_mult
 *   value_final = max(value_traffic, zone_floor)
 *   range = [value_final * 0.75, value_final * 1.25]
 */

// ── Zone classification ──────────────────────────────────────────────

export type ZoneCategory = 'premium' | 'comercial_fuerte' | 'comercial' | 'media' | 'periferica';

export function getVisibilityScore(zone: ZoneCategory): number {
  const map: Record<ZoneCategory, number> = {
    premium: 0.45,
    comercial_fuerte: 0.40,
    comercial: 0.38,
    media: 0.30,
    periferica: 0.20,
  };
  return Math.max(map[zone] ?? 0.30, 0.20);
}

export function getCPMBase(zone: ZoneCategory): number {
  const map: Record<ZoneCategory, number> = {
    premium: 35,
    comercial_fuerte: 28,
    comercial: 22,
    media: 16,
    periferica: 12,
  };
  return Math.max(map[zone] ?? 16, 12);
}

export function getZoneMultiplier(zone: ZoneCategory): number {
  const map: Record<ZoneCategory, number> = {
    premium: 1.30,
    comercial_fuerte: 1.22,
    comercial: 1.15,
    media: 1.00,
    periferica: 0.85,
  };
  return map[zone] ?? 1.00;
}

export function getZoneFloor(zone: ZoneCategory): number {
  const map: Record<ZoneCategory, number> = {
    premium: 20000,
    comercial_fuerte: 18000,
    comercial: 14000,
    media: 10000,
    periferica: 7000,
  };
  return map[zone] ?? 10000;
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

// ── Corridor detection ───────────────────────────────────────────────

interface CorridorEntry {
  keywords: string[];
  category: ZoneCategory;
}

const MEXICALI_CORRIDORS: CorridorEntry[] = [
  { keywords: ['lazaro cardenas', 'lázaro cárdenas', 'lazaro cárdenas'], category: 'premium' },
  { keywords: ['justo sierra'], category: 'premium' },
  { keywords: ['cetys', 'calzada cetys'], category: 'premium' },
  { keywords: ['lopez mateos', 'lópez mateos'], category: 'premium' },
  { keywords: ['benito juarez', 'benito juárez', 'centro civico', 'centro cívico'], category: 'premium' },
  { keywords: ['independencia'], category: 'premium' },
  { keywords: ['anahuac', 'anáhuac'], category: 'comercial_fuerte' },
  { keywords: ['venustiano carranza', 'carranza'], category: 'comercial_fuerte' },
  { keywords: ['rio nuevo', 'río nuevo'], category: 'comercial_fuerte' },
  { keywords: ['cuauhtemoc', 'cuauhtémoc'], category: 'comercial' },
  { keywords: ['carretera san luis'], category: 'comercial' },
];

const TIJUANA_CORRIDORS: CorridorEntry[] = [
  { keywords: ['zona rio', 'zona río'], category: 'premium' },
  { keywords: ['agua caliente'], category: 'premium' },
  { keywords: ['via rapida', 'vía rápida'], category: 'comercial_fuerte' },
  { keywords: ['otay'], category: 'comercial' },
  { keywords: ['revolucion', 'revolución', 'avenida revolucion'], category: 'premium' },
  { keywords: ['playas de tijuana', 'playas'], category: 'comercial_fuerte' },
  { keywords: ['paseo de los heroes', 'paseo de los héroes'], category: 'premium' },
  { keywords: ['boulevard sanchez taboada', 'sanchez taboada'], category: 'comercial_fuerte' },
  { keywords: ['garita', 'san ysidro'], category: 'comercial_fuerte' },
];

const CITY_CORRIDORS: Record<string, CorridorEntry[]> = {
  mexicali: MEXICALI_CORRIDORS,
  tijuana: TIJUANA_CORRIDORS,
};

export function detectCorridor(zone: string, city: string): ZoneCategory | null {
  const cityKey = city.toLowerCase();
  const text = zone.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const textOriginal = zone.toLowerCase();

  // Find corridors for this city
  let corridors: CorridorEntry[] = [];
  for (const [key, entries] of Object.entries(CITY_CORRIDORS)) {
    if (cityKey.includes(key)) {
      corridors = entries;
      break;
    }
  }

  for (const corridor of corridors) {
    for (const kw of corridor.keywords) {
      const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (text.includes(kwNorm) || textOriginal.includes(kw)) {
        return corridor.category;
      }
    }
  }

  return null;
}

// ── Zone classification heuristic ────────────────────────────────────

const PREMIUM_KEYWORDS = [
  'zona río', 'zona hotelera',
  'plaza cachanilla', 'garita', 'calexico', 'otay', 'playas',
  'revolucion', 'revolución', 'paseo de los heroes', 'paseo de los héroes',
];

const COMERCIAL_KEYWORDS = [
  'centro', 'plaza', 'boulevard', 'blvd', 'avenida principal',
  'calzada', 'periferico', 'periférico', 'circuito', 'eje vial',
  'autopista', 'carretera', 'industrial',
];

export function classifyZone(zone: string, city: string, trafficDaily?: number): ZoneCategory {
  // 1. Corridor detection takes highest priority
  const corridor = detectCorridor(zone, city);
  if (corridor) return corridor;

  // 2. Traffic-based classification
  if (trafficDaily) {
    if (trafficDaily > 40000) return 'premium';
    if (trafficDaily >= 25000) return 'comercial';
    if (trafficDaily >= 12000) return 'media';
    return 'periferica';
  }

  // 3. Keyword heuristic
  const text = `${zone} ${city}`.toLowerCase();

  if (PREMIUM_KEYWORDS.some(k => text.includes(k))) return 'premium';
  if (COMERCIAL_KEYWORDS.some(k => text.includes(k))) return 'comercial';

  const bigCities = ['cdmx', 'guadalajara', 'monterrey', 'tijuana', 'cancun'];
  if (bigCities.some(c => text.includes(c))) return 'media';

  return 'media';
}

// ── Main estimation function ─────────────────────────────────────────

export interface ValuationInput {
  trafficDaily: number;
  structureType: StructureType;
  zoneCategory: ZoneCategory;
  rentedStatus?: string;
}

export interface ValuationResult {
  trafficDaily: number;
  impressionsMonthly: number;
  cpmBase: number;
  visibilityScore: number;
  formatMultiplier: number;
  zoneMultiplier: number;
  valueByTraffic: number;
  zoneFloor: number;
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
  const valueByTraffic = Math.round(valueBase * formatMultiplier * zoneMultiplier);

  const zoneFloor = getZoneFloor(input.zoneCategory);
  let estimatedValue = Math.max(valueByTraffic, zoneFloor);

  // Apply format multiplier to floor if floor was used
  if (estimatedValue === zoneFloor && formatMultiplier > 1.0) {
    estimatedValue = Math.round(zoneFloor * formatMultiplier);
  }

  // Apply rental history factor
  if (input.rentedStatus === 'Sí') {
    estimatedValue = Math.round(estimatedValue * 1.08);
  } else if (input.rentedStatus === 'A veces') {
    estimatedValue = Math.round(estimatedValue * 1.03);
  } else if (input.rentedStatus === 'No') {
    estimatedValue = Math.round(estimatedValue * 0.97);
  }

  const valueLow = Math.round(estimatedValue * 0.75 / 500) * 500;
  const valueHigh = Math.round(estimatedValue * 1.25 / 500) * 500;

  return {
    trafficDaily: input.trafficDaily,
    impressionsMonthly,
    cpmBase,
    visibilityScore,
    formatMultiplier,
    zoneMultiplier,
    valueByTraffic,
    zoneFloor,
    estimatedValue,
    valueLow: Math.max(valueLow, 6500),
    valueHigh: Math.max(valueHigh, 7500),
  };
}
