import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CACHE_DAYS = 30;

/** City-based fallback traffic estimates */
function fallbackTraffic(city: string): number {
  const estimates: Record<string, number> = {
    mexicali: 18000, tijuana: 25000, ensenada: 12000,
    cdmx: 35000, guadalajara: 28000, monterrey: 26000,
    puebla: 22000, cancun: 20000, leon: 18000,
    merida: 16000,
  };
  const key = city?.toLowerCase() || '';
  for (const [k, v] of Object.entries(estimates)) {
    if (key.includes(k)) return v;
  }
  return 15000;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { latitude, longitude, city = '' } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Check cache — find nearest point within ~500m (≈0.005 degrees)
    const RADIUS = 0.005;
    const { data: cached } = await supabase
      .from('road_traffic_data')
      .select('*')
      .gte('lat', latitude - RADIUS)
      .lte('lat', latitude + RADIUS)
      .gte('lng', longitude - RADIUS)
      .lte('lng', longitude + RADIUS)
      .order('last_updated', { ascending: false })
      .limit(1)
      .single();

    if (cached) {
      const age = Date.now() - new Date(cached.last_updated).getTime();
      if (age < CACHE_DAYS * 24 * 60 * 60 * 1000) {
        console.log(`[TrafficEstimate] Cache hit: ${cached.traffic_daily_estimate}`);
        return new Response(
          JSON.stringify({ traffic_daily: cached.traffic_daily_estimate, source: 'cache' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Try TomTom API
    const apiKey = Deno.env.get('MADDI_TOMTOM_API_KEY') || Deno.env.get('TOMTOM_API_KEY');
    let trafficDaily: number | null = null;
    let source = 'fallback';

    if (apiKey) {
      try {
        const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json?point=${latitude},${longitude}&key=${apiKey}`;
        const resp = await fetch(url);
        if (resp.ok) {
          const data = await resp.json();
          const fsd = data.flowSegmentData;
          if (fsd && (fsd.currentSpeed > 0 || fsd.freeFlowSpeed > 0)) {
            const currentSpeed = fsd.currentSpeed || 0;
            const freeFlowSpeed = fsd.freeFlowSpeed || 1;
            // Same estimation model as get-traffic-data
            const anchors: [number, number][] = [[0,300],[30,500],[50,900],[70,1600],[100,2500],[130,3200]];
            const clamped = Math.max(0, freeFlowSpeed);
            let baseVPH: number;
            if (clamped >= 130) { baseVPH = 3200; }
            else {
              let lower = anchors[0], upper = anchors[anchors.length-1];
              for (let i = 0; i < anchors.length-1; i++) {
                if (clamped >= anchors[i][0] && clamped < anchors[i+1][0]) {
                  lower = anchors[i]; upper = anchors[i+1]; break;
                }
              }
              const t = (clamped - lower[0]) / (upper[0] - lower[0]);
              baseVPH = lower[1] + t * (upper[1] - lower[1]);
            }
            const ratio = Math.max(0.2, Math.min(1.2, currentSpeed / freeFlowSpeed));
            const congestion = 1.75 - 0.75 * ratio;
            const confidence = Math.max(fsd.confidence || 0.5, 0.4);
            trafficDaily = Math.round(baseVPH * 16 * congestion * confidence);
            source = 'tomtom';
            console.log(`[TrafficEstimate] TomTom: ${trafficDaily}`);
          }
        }
      } catch (e) {
        console.error('[TrafficEstimate] TomTom error:', e);
      }
    }

    // 3. Fallback
    if (!trafficDaily) {
      trafficDaily = fallbackTraffic(city);
      source = 'fallback';
      console.log(`[TrafficEstimate] Fallback: ${trafficDaily}`);
    }

    // 4. Upsert cache
    if (cached) {
      await supabase.from('road_traffic_data').update({
        traffic_daily_estimate: trafficDaily,
        source,
        last_updated: new Date().toISOString(),
      }).eq('id', cached.id);
    } else {
      await supabase.from('road_traffic_data').insert({
        lat: latitude,
        lng: longitude,
        traffic_daily_estimate: trafficDaily,
        source,
      });
    }

    return new Response(
      JSON.stringify({ traffic_daily: trafficDaily, source }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[TrafficEstimate] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
