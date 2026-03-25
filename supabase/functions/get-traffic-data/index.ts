import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache duration: 1 week in milliseconds
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Configurable constants (overridable via env vars)
// ---------------------------------------------------------------------------

/** Hours per day the billboard is "active" (visible). Default 16. */
function getActiveHoursPerDay(): number {
  const raw = Deno.env.get('ACTIVE_HOURS_PER_DAY');
  if (raw) {
    const parsed = Number(raw);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 24) return parsed;
  }
  return 16;
}

/** Global calibration multiplier applied to the final estimate. Default 1.0. */
function getCalibrationMultiplier(): number {
  const raw = Deno.env.get('CALIBRATION_MULTIPLIER');
  if (raw) {
    const parsed = Number(raw);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 1.0;
}

// ---------------------------------------------------------------------------
// Continuous traffic estimation model
// ---------------------------------------------------------------------------
/**
 * Continuous traffic estimation from TomTom Traffic Flow data.
 *
 * We use the ratio `currentSpeed / freeFlowSpeed` as a proxy for congestion.
 * A lower ratio means heavier traffic → more vehicles per unit of road →
 * higher visibility for a billboard.
 *
 * The model:
 *  1. `baseVPH` (vehicles per hour) is derived from `freeFlowSpeed` via a
 *     continuous piecewise-linear interpolation instead of discrete brackets.
 *  2. A `congestionMultiplier` converts the speed ratio into an impression
 *     boost: heavy congestion (ratio ~0.2) ≈ 1.6×, free-flow (ratio ~1.0) ≈ 1.0×.
 *  3. `confidence` from TomTom (0–1) scales the result.
 *  4. A global `CALIBRATION_MULTIPLIER` (env var) allows tuning without code changes.
 *
 * This is an *estimation*, NOT a real vehicle count. It approximates
 * potential daily impressions for advertising planning purposes.
 */
// ---------------------------------------------------------------------------
// Corridor-based impression floors
// ---------------------------------------------------------------------------
// Premium corridors in key cities should never report below certain thresholds
// regardless of what TomTom speed data says, because TomTom measures speed
// NOT vehicle count. A slow urban street with constant flow has high volume.

interface CorridorFloor {
  keywords: string[];
  minImpressions: number;
}

const CORRIDOR_FLOORS: Record<string, CorridorFloor[]> = {
  mexicali: [
    { keywords: ['justo sierra'], minImpressions: 18000 },
    { keywords: ['lazaro cardenas', 'lázaro cárdenas', 'lazaro cárdenas'], minImpressions: 22000 },
    { keywords: ['lopez mateos', 'lópez mateos'], minImpressions: 20000 },
    { keywords: ['cetys', 'calzada cetys'], minImpressions: 20000 },
    { keywords: ['benito juarez', 'benito juárez', 'centro civico', 'centro cívico'], minImpressions: 18000 },
    { keywords: ['independencia'], minImpressions: 18000 },
    { keywords: ['anahuac', 'anáhuac'], minImpressions: 16000 },
    { keywords: ['venustiano carranza', 'carranza'], minImpressions: 16000 },
    { keywords: ['rio nuevo', 'río nuevo'], minImpressions: 15000 },
    { keywords: ['cuauhtemoc', 'cuauhtémoc'], minImpressions: 14000 },
  ],
  tijuana: [
    { keywords: ['zona rio', 'zona río'], minImpressions: 25000 },
    { keywords: ['agua caliente'], minImpressions: 22000 },
    { keywords: ['via rapida', 'vía rápida'], minImpressions: 20000 },
    { keywords: ['otay'], minImpressions: 16000 },
  ],
};

function getCorridorFloor(address: string, city: string): number {
  const cityLower = city.toLowerCase();
  const addrLower = address.toLowerCase();
  const addrNorm = addrLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const [cityKey, corridors] of Object.entries(CORRIDOR_FLOORS)) {
    if (!cityLower.includes(cityKey)) continue;
    for (const corridor of corridors) {
      for (const kw of corridor.keywords) {
        const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (addrNorm.includes(kwNorm) || addrLower.includes(kw)) {
          return corridor.minImpressions;
        }
      }
    }
  }
  return 0;
}

export function estimateDailyImpressions(
  currentSpeed: number,
  freeFlowSpeed: number,
  confidence: number,
  corridorFloor: number = 0,
): {
  estimated_daily_traffic: number;
  road_type: string;
  peak_hours: string;
  confidence_level: string;
} {
  const activeHours = getActiveHoursPerDay();
  const calibration = getCalibrationMultiplier();

  // --- 1. Base vehicles per hour from freeFlowSpeed (continuous interpolation) ---
  const anchors: [number, number][] = [
    [0, 300],
    [30, 500],
    [50, 900],
    [70, 1600],
    [100, 2500],
    [130, 3200],
  ];

  const clampedFreeFlow = Math.max(0, freeFlowSpeed);
  let baseVPH: number;

  if (clampedFreeFlow >= anchors[anchors.length - 1][0]) {
    baseVPH = anchors[anchors.length - 1][1];
  } else {
    let lower = anchors[0];
    let upper = anchors[anchors.length - 1];
    for (let i = 0; i < anchors.length - 1; i++) {
      if (clampedFreeFlow >= anchors[i][0] && clampedFreeFlow < anchors[i + 1][0]) {
        lower = anchors[i];
        upper = anchors[i + 1];
        break;
      }
    }
    const t = (clampedFreeFlow - lower[0]) / (upper[0] - lower[0]);
    baseVPH = lower[1] + t * (upper[1] - lower[1]);
  }

  // --- 2. Congestion multiplier from speed ratio ---
  const safeFreeFlow = Math.max(freeFlowSpeed, 1);
  let ratio = currentSpeed / safeFreeFlow;
  ratio = Math.max(0.2, Math.min(1.2, ratio));
  const congestionMultiplier = 1.75 - 0.75 * ratio;

  // --- 3. Confidence scaling ---
  const effectiveConfidence = Math.max(confidence, 0.4);

  // --- 4. Final estimate with corridor floor ---
  let dailyImpressions = baseVPH * activeHours * congestionMultiplier * effectiveConfidence * calibration;
  dailyImpressions = Math.max(dailyImpressions, corridorFloor);
  dailyImpressions = Math.max(0, Math.round(dailyImpressions));

  // --- Road type label ---
  let road_type: string;
  let peak_hours: string;
  if (freeFlowSpeed > 100) {
    road_type = 'autopista';
    peak_hours = '7:00-9:00, 18:00-20:00';
  } else if (freeFlowSpeed > 70) {
    road_type = 'avenida_principal';
    peak_hours = '7:30-9:30, 17:30-19:30';
  } else if (freeFlowSpeed > 50) {
    road_type = 'calle_secundaria';
    peak_hours = '8:00-10:00, 17:00-19:00';
  } else if (freeFlowSpeed > 30) {
    road_type = 'calle_urbana';
    peak_hours = '12:00-14:00, 18:00-20:00';
  } else {
    road_type = 'zona_lenta';
    peak_hours = '10:00-14:00';
  }

  const confidence_level = confidence >= 0.8 ? 'Alta' : confidence >= 0.5 ? 'Media' : 'Baja';

  return { estimated_daily_traffic: dailyImpressions, road_type, peak_hours, confidence_level };
}

// ---------------------------------------------------------------------------
// Location-based fallback estimation (unchanged logic, used when TomTom fails)
// ---------------------------------------------------------------------------
function estimateTrafficFromLocation(city: string, hasNearbyPOIs: boolean = false): {
  estimated_daily_traffic: number;
  road_type: string;
  peak_hours: string;
  confidence_level: string;
  source: string;
} {
  const cityEstimates: Record<string, number> = {
    'mexicali': 18000, 'tijuana': 25000, 'ensenada': 12000,
    'cdmx': 35000, 'guadalajara': 28000, 'monterrey': 26000,
    'puebla': 22000, 'cancun': 20000, 'leon': 18000,
    'merida': 16000, 'default': 15000,
  };

  const cityLower = city?.toLowerCase() || '';
  let baseEstimate = cityEstimates['default'];
  for (const [cityKey, estimate] of Object.entries(cityEstimates)) {
    if (cityLower.includes(cityKey)) { baseEstimate = estimate; break; }
  }

  if (hasNearbyPOIs) baseEstimate = Math.round(baseEstimate * 1.3);

  // Small random variance ±20%
  const variance = 0.8 + Math.random() * 0.4;
  const estimatedTraffic = Math.round(baseEstimate * variance);

  return {
    estimated_daily_traffic: estimatedTraffic,
    road_type: 'avenida_principal',
    peak_hours: '7:30-9:30, 17:30-19:30',
    confidence_level: 'Media',
    source: 'location_estimate',
  };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Supabase not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { billboard_id, latitude, longitude, force_refresh = false, city = '' } = await req.json();

    if (!billboard_id || !latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'billboard_id, latitude, and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Traffic] Request for billboard ${billboard_id} at ${latitude}, ${longitude}`);

    // Get billboard info
    const { data: billboard, error: billboardError } = await supabase
      .from('billboards')
      .select('last_traffic_update, daily_impressions, city, address, title, points_of_interest')
      .eq('id', billboard_id)
      .single();

    if (billboardError) console.error('[Traffic] Error fetching billboard:', billboardError);

    const billboardCity = city || billboard?.city || '';
    const billboardAddress = `${billboard?.title || ''} ${billboard?.address || ''}`;
    const hasNearbyPOIs = billboard?.points_of_interest?.length > 0;
    const corridorFloor = getCorridorFloor(billboardAddress, billboardCity);
    if (corridorFloor > 0) {
      console.log(`[Traffic] Corridor floor detected: ${corridorFloor} for "${billboardAddress}" in ${billboardCity}`);
    }

    // Check cache
    const lastUpdate = billboard?.last_traffic_update ? new Date(billboard.last_traffic_update) : null;
    const now = new Date();
    const cacheValid = lastUpdate && (now.getTime() - lastUpdate.getTime() < CACHE_DURATION_MS);

    if (cacheValid && !force_refresh) {
      const { data: cachedData, error: cacheError } = await supabase
        .from('traffic_data')
        .select('*')
        .eq('billboard_id', billboard_id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (!cacheError && cachedData) {
        console.log(`[Traffic] Returning cached data for ${billboard_id}`);
        return new Response(
          JSON.stringify({
            source: 'cache',
            trafficData: {
              estimated_daily_impressions: cachedData.estimated_daily_impressions,
              current_speed: cachedData.current_speed,
              free_flow_speed: cachedData.free_flow_speed,
              confidence: cachedData.confidence,
              recorded_at: cachedData.recorded_at,
            },
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // --- Attempt TomTom API ---
    let trafficResult: {
      estimated_daily_traffic: number;
      road_type: string;
      peak_hours: string;
      confidence_level: string;
      confidence: number;
      current_speed?: number;
      free_flow_speed?: number;
      source: string;
    };

    const MADDI_TOMTOM_API_KEY = Deno.env.get('MADDI_TOMTOM_API_KEY');
    const TOMTOM_API_KEY = Deno.env.get('TOMTOM_API_KEY');
    const effectiveKey = MADDI_TOMTOM_API_KEY || TOMTOM_API_KEY;

    let tomtomSuccess = false;

    if (effectiveKey) {
      const keySource = MADDI_TOMTOM_API_KEY ? 'MADDI_TOMTOM_API_KEY' : 'TOMTOM_API_KEY';
      console.log(`[Traffic] Trying TomTom (key: ${keySource}, prefix: ${effectiveKey.substring(0, 8)}...)`);

      const endpoints = [
        `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json?point=${latitude},${longitude}&key=${effectiveKey}`,
        `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${latitude},${longitude}&key=${effectiveKey}`,
      ];

      for (const url of endpoints) {
        try {
          const resp = await fetch(url);
          if (!resp.ok) {
            const body = await resp.text();
            console.error(`[Traffic] TomTom ${resp.status}: ${body.substring(0, 200)}`);
            continue;
          }
          const data = await resp.json();
          const fsd = data.flowSegmentData;
          if (!fsd) { console.error('[Traffic] No flowSegmentData in response'); continue; }

          const currentSpeed = fsd.currentSpeed || 0;
          const freeFlowSpeed = fsd.freeFlowSpeed || 0;
          const confidence = fsd.confidence || 0.5;

          console.log(`[Traffic] TomTom OK: cur=${currentSpeed}, ff=${freeFlowSpeed}, conf=${confidence}`);

          // Check for incomplete data: both speeds zero or very low confidence
          if (currentSpeed === 0 && freeFlowSpeed === 0) {
            console.warn('[Traffic] TomTom returned 0/0 speeds, treating as incomplete');
            continue;
          }

          const calc = estimateDailyImpressions(currentSpeed, freeFlowSpeed, confidence);

          console.log(`[Traffic] Calculated: ${calc.estimated_daily_traffic} (ratio=${(currentSpeed / Math.max(freeFlowSpeed, 1)).toFixed(3)}, road=${calc.road_type})`);

          trafficResult = {
            ...calc,
            confidence,
            current_speed: Math.round(currentSpeed),
            free_flow_speed: Math.round(freeFlowSpeed),
            source: 'tomtom',
          };
          tomtomSuccess = true;
          break;
        } catch (e) {
          console.error('[Traffic] TomTom exception:', e);
        }
      }
    } else {
      console.log('[Traffic] No TomTom API key configured');
    }

    // Fallback: try last known DB value, then location estimate
    if (!tomtomSuccess) {
      console.warn('[Traffic] TomTom unavailable, checking last known value in DB');

      const { data: lastKnown } = await supabase
        .from('traffic_data')
        .select('estimated_daily_impressions, current_speed, free_flow_speed, confidence, recorded_at')
        .eq('billboard_id', billboard_id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (lastKnown && lastKnown.estimated_daily_impressions) {
        console.log(`[Traffic] Using last known DB value: ${lastKnown.estimated_daily_impressions}`);
        trafficResult = {
          estimated_daily_traffic: lastKnown.estimated_daily_impressions,
          road_type: 'avenida_principal',
          peak_hours: '7:30-9:30, 17:30-19:30',
          confidence_level: 'Media',
          confidence: lastKnown.confidence ?? 0.5,
          current_speed: lastKnown.current_speed ?? undefined,
          free_flow_speed: lastKnown.free_flow_speed ?? undefined,
          source: 'cache',
        };
      } else {
        console.log('[Traffic] No prior data, using location-based fallback');
        const locationEstimate = estimateTrafficFromLocation(billboardCity, hasNearbyPOIs);
        trafficResult = { ...locationEstimate, confidence: 0.6 };
      }
    }

    // Store traffic data
    const { error: insertError } = await supabase
      .from('traffic_data')
      .insert({
        billboard_id,
        current_speed: trafficResult!.current_speed || 50,
        free_flow_speed: trafficResult!.free_flow_speed || 60,
        confidence: trafficResult!.confidence,
        estimated_daily_impressions: trafficResult!.estimated_daily_traffic,
      });

    if (insertError) console.error('[Traffic] Insert error:', insertError);

    // Update billboard
    const { error: updateError } = await supabase
      .from('billboards')
      .update({
        daily_impressions: trafficResult!.estimated_daily_traffic,
        last_traffic_update: new Date().toISOString(),
      })
      .eq('id', billboard_id);

    if (updateError) console.error('[Traffic] Billboard update error:', updateError);

    console.log(`[Traffic] Final: ${trafficResult!.estimated_daily_traffic} (source: ${trafficResult!.source})`);

    const responseTimestamp = new Date().toISOString();

    // Log API usage (fire-and-forget)
    const startTime = Date.now();
    supabase.from('api_usage_logs').insert({
      api_name: 'tomtom',
      endpoint_type: 'traffic_flow',
      billboard_id,
      source_screen: 'billboard_detail',
      response_status: trafficResult!.source === 'tomtom' ? 200 : 204,
      latency_ms: Date.now() - startTime,
      metadata: { source: trafficResult!.source, city: billboardCity },
    }).then(() => {});

    return new Response(
      JSON.stringify({
        source: trafficResult!.source,
        trafficData: {
          estimated_daily_impressions: trafficResult!.estimated_daily_traffic,
          current_speed: trafficResult!.current_speed || null,
          free_flow_speed: trafficResult!.free_flow_speed || null,
          confidence: trafficResult!.confidence,
          recorded_at: responseTimestamp,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Traffic] Unhandled error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
