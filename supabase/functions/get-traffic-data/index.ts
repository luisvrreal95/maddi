import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache duration: 1 week in milliseconds
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TOMTOM_API_KEY = Deno.env.get('TOMTOM_API_KEY');
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
    const { billboard_id, latitude, longitude, force_refresh = false } = await req.json();

    if (!billboard_id || !latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'billboard_id, latitude, and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Traffic data request for billboard ${billboard_id} at ${latitude}, ${longitude}`);

    // Check cache: get latest traffic data and billboard's last update
    const { data: billboard, error: billboardError } = await supabase
      .from('billboards')
      .select('last_traffic_update, daily_impressions')
      .eq('id', billboard_id)
      .single();

    if (billboardError) {
      console.error('Error fetching billboard:', billboardError);
    }

    // Check if we have recent cached data (less than 1 week old)
    const lastUpdate = billboard?.last_traffic_update ? new Date(billboard.last_traffic_update) : null;
    const now = new Date();
    const cacheValid = lastUpdate && (now.getTime() - lastUpdate.getTime() < CACHE_DURATION_MS);

    if (cacheValid && !force_refresh) {
      // Return cached data from traffic_data table
      const { data: cachedData, error: cacheError } = await supabase
        .from('traffic_data')
        .select('*')
        .eq('billboard_id', billboard_id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (!cacheError && cachedData) {
        console.log(`Returning cached traffic data for billboard ${billboard_id}`);
        return new Response(
          JSON.stringify({
            source: 'cache',
            cached_at: cachedData.recorded_at,
            next_update: new Date(lastUpdate.getTime() + CACHE_DURATION_MS).toISOString(),
            current_speed: cachedData.current_speed,
            free_flow_speed: cachedData.free_flow_speed,
            confidence: cachedData.confidence,
            estimated_daily_traffic: cachedData.estimated_daily_impressions,
            traffic_range: {
              min: Math.round(cachedData.estimated_daily_impressions * 0.85),
              max: Math.round(cachedData.estimated_daily_impressions * 1.15),
            },
            label: 'Tráfico vehicular estimado – Fuente: TomTom',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Need to fetch fresh data from TomTom
    if (!TOMTOM_API_KEY) {
      console.error('TOMTOM_API_KEY not configured');
      // Return existing data if available, or error
      if (billboard?.daily_impressions) {
        return new Response(
          JSON.stringify({
            source: 'fallback',
            estimated_daily_traffic: billboard.daily_impressions,
            traffic_range: {
              min: Math.round(billboard.daily_impressions * 0.85),
              max: Math.round(billboard.daily_impressions * 1.15),
            },
            label: 'Tráfico vehicular estimado',
            warning: 'TomTom API key not configured - using existing estimate',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'TomTom API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching fresh traffic data from TomTom for billboard ${billboard_id}`);

    // Call TomTom Flow Segment Data API
    const tomtomUrl = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json?point=${latitude},${longitude}&key=${TOMTOM_API_KEY}`;

    const tomtomResponse = await fetch(tomtomUrl);
    
    if (!tomtomResponse.ok) {
      const errorText = await tomtomResponse.text();
      console.error('TomTom API error:', tomtomResponse.status, errorText);
      
      // If no road segment found, return default estimate
      if (tomtomResponse.status === 404) {
        const defaultEstimate = 5000; // Default estimate for areas without road data
        return new Response(
          JSON.stringify({ 
            source: 'default',
            message: 'No road segment found at this location - using default estimate',
            estimated_daily_traffic: defaultEstimate,
            traffic_range: {
              min: Math.round(defaultEstimate * 0.7),
              max: Math.round(defaultEstimate * 1.3),
            },
            label: 'Tráfico vehicular estimado (zona sin datos de carretera)',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to fetch traffic data from TomTom' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tomtomData = await tomtomResponse.json();
    console.log('TomTom response received');

    const flowSegmentData = tomtomData.flowSegmentData;

    if (!flowSegmentData) {
      return new Response(
        JSON.stringify({ error: 'No flow segment data available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentSpeed = flowSegmentData.currentSpeed || 0; // km/h
    const freeFlowSpeed = flowSegmentData.freeFlowSpeed || 0; // km/h
    const confidence = flowSegmentData.confidence || 0; // 0-1

    // Calculate estimated daily traffic based on road characteristics
    // Using TomTom's speed data to infer road type and traffic volume
    
    // Road type estimation based on free flow speed
    let baseVehiclesPerHour: number;
    let roadType: string;
    let peakHours: string;
    
    if (freeFlowSpeed > 100) {
      // Highway/Autopista
      baseVehiclesPerHour = 3000;
      roadType = 'autopista';
      peakHours = '7:00-9:00, 18:00-20:00';
    } else if (freeFlowSpeed > 70) {
      // Main arterial road / Avenida principal
      baseVehiclesPerHour = 2000;
      roadType = 'avenida_principal';
      peakHours = '7:30-9:30, 17:30-19:30';
    } else if (freeFlowSpeed > 50) {
      // Secondary road / Calle secundaria
      baseVehiclesPerHour = 1200;
      roadType = 'calle_secundaria';
      peakHours = '8:00-10:00, 17:00-19:00';
    } else if (freeFlowSpeed > 30) {
      // Urban street / Calle urbana
      baseVehiclesPerHour = 800;
      roadType = 'calle_urbana';
      peakHours = '12:00-14:00, 18:00-20:00';
    } else {
      // Slow traffic zone / Zona de tráfico lento
      baseVehiclesPerHour = 500;
      roadType = 'zona_lenta';
      peakHours = '10:00-14:00';
    }

    // Congestion factor: higher congestion = more vehicles passing (but slower)
    const congestionRatio = freeFlowSpeed > 0 ? currentSpeed / freeFlowSpeed : 1;
    const congestionFactor = congestionRatio < 0.5 ? 1.5 : congestionRatio < 0.8 ? 1.2 : 1.0;

    // Hours of effective visibility per day (accounting for daylight and artificial lighting)
    const effectiveHours = 16;

    // Calculate average daily traffic estimate
    const estimatedDailyTraffic = Math.round(
      baseVehiclesPerHour * effectiveHours * congestionFactor * Math.max(confidence, 0.5)
    );

    // Calculate traffic range (±15% for uncertainty)
    const trafficRange = {
      min: Math.round(estimatedDailyTraffic * 0.85),
      max: Math.round(estimatedDailyTraffic * 1.15),
    };

    // Determine confidence level label
    let confidenceLevel: string;
    if (confidence >= 0.8) {
      confidenceLevel = 'Alta';
    } else if (confidence >= 0.5) {
      confidenceLevel = 'Media';
    } else {
      confidenceLevel = 'Baja';
    }

    console.log(`Estimated traffic: ${estimatedDailyTraffic} (range: ${trafficRange.min}-${trafficRange.max}), road type: ${roadType}, peak hours: ${peakHours}, confidence: ${confidenceLevel}`);

    // Store traffic data in database
    const { error: insertError } = await supabase
      .from('traffic_data')
      .insert({
        billboard_id,
        current_speed: Math.round(currentSpeed),
        free_flow_speed: Math.round(freeFlowSpeed),
        confidence,
        estimated_daily_impressions: estimatedDailyTraffic,
      });

    if (insertError) {
      console.error('Error inserting traffic data:', insertError);
    }

    // Update billboard with new estimate and cache timestamp
    const { error: updateError } = await supabase
      .from('billboards')
      .update({ 
        daily_impressions: estimatedDailyTraffic,
        last_traffic_update: new Date().toISOString(),
      })
      .eq('id', billboard_id);

    if (updateError) {
      console.error('Error updating billboard:', updateError);
    }

    return new Response(
      JSON.stringify({
        source: 'tomtom',
        fetched_at: new Date().toISOString(),
        next_update: new Date(Date.now() + CACHE_DURATION_MS).toISOString(),
        current_speed: Math.round(currentSpeed),
        free_flow_speed: Math.round(freeFlowSpeed),
        confidence,
        confidence_level: confidenceLevel,
        road_type: roadType,
        peak_hours: peakHours,
        estimated_daily_traffic: estimatedDailyTraffic,
        traffic_range: trafficRange,
        label: 'Tráfico vehicular estimado – Fuente: TomTom',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-traffic-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
