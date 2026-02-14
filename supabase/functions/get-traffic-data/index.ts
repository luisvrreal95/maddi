import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache duration: 1 week in milliseconds
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Location-based estimation when TomTom fails
function estimateTrafficFromLocation(city: string, hasNearbyPOIs: boolean = false): {
  estimated_daily_traffic: number;
  road_type: string;
  peak_hours: string;
  confidence_level: string;
  source: string;
} {
  // Base estimates by city size/importance in Mexico
  const cityEstimates: Record<string, number> = {
    'mexicali': 18000,
    'tijuana': 25000,
    'ensenada': 12000,
    'cdmx': 35000,
    'guadalajara': 28000,
    'monterrey': 26000,
    'puebla': 22000,
    'cancun': 20000,
    'leon': 18000,
    'merida': 16000,
    'default': 15000,
  };

  const cityLower = city?.toLowerCase() || '';
  let baseEstimate = cityEstimates['default'];
  
  for (const [cityKey, estimate] of Object.entries(cityEstimates)) {
    if (cityLower.includes(cityKey)) {
      baseEstimate = estimate;
      break;
    }
  }

  // Boost if has nearby POIs
  if (hasNearbyPOIs) {
    baseEstimate = Math.round(baseEstimate * 1.3);
  }

  // Add some variance (±20%)
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
    const { billboard_id, latitude, longitude, force_refresh = false, city = '' } = await req.json();

    if (!billboard_id || !latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'billboard_id, latitude, and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Traffic data request for billboard ${billboard_id} at ${latitude}, ${longitude}`);

    // Get billboard info including POIs
    const { data: billboard, error: billboardError } = await supabase
      .from('billboards')
      .select('last_traffic_update, daily_impressions, city, points_of_interest')
      .eq('id', billboard_id)
      .single();

    if (billboardError) {
      console.error('Error fetching billboard:', billboardError);
    }

    const billboardCity = city || billboard?.city || '';
    const hasNearbyPOIs = billboard?.points_of_interest?.length > 0;

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

    // Try TomTom API first, then fallback to location-based estimate
    let trafficData: {
      estimated_daily_traffic: number;
      road_type: string;
      peak_hours: string;
      confidence_level: string;
      confidence: number;
      current_speed?: number;
      free_flow_speed?: number;
      source: string;
    };

    if (TOMTOM_API_KEY) {
      console.log(`Attempting TomTom API for billboard ${billboard_id}`);
      
      try {
        const tomtomUrl = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json?point=${latitude},${longitude}&key=${TOMTOM_API_KEY}`;
        const tomtomResponse = await fetch(tomtomUrl);
        
        if (tomtomResponse.ok) {
          const tomtomData = await tomtomResponse.json();
          const flowSegmentData = tomtomData.flowSegmentData;

          if (flowSegmentData) {
            const currentSpeed = flowSegmentData.currentSpeed || 0;
            const freeFlowSpeed = flowSegmentData.freeFlowSpeed || 0;
            const confidence = flowSegmentData.confidence || 0.5;

            // Calculate based on road type
            let baseVehiclesPerHour: number;
            let roadType: string;
            let peakHours: string;
            
            if (freeFlowSpeed > 100) {
              baseVehiclesPerHour = 3000;
              roadType = 'autopista';
              peakHours = '7:00-9:00, 18:00-20:00';
            } else if (freeFlowSpeed > 70) {
              baseVehiclesPerHour = 2000;
              roadType = 'avenida_principal';
              peakHours = '7:30-9:30, 17:30-19:30';
            } else if (freeFlowSpeed > 50) {
              baseVehiclesPerHour = 1200;
              roadType = 'calle_secundaria';
              peakHours = '8:00-10:00, 17:00-19:00';
            } else if (freeFlowSpeed > 30) {
              baseVehiclesPerHour = 800;
              roadType = 'calle_urbana';
              peakHours = '12:00-14:00, 18:00-20:00';
            } else {
              baseVehiclesPerHour = 500;
              roadType = 'zona_lenta';
              peakHours = '10:00-14:00';
            }

            const congestionRatio = freeFlowSpeed > 0 ? currentSpeed / freeFlowSpeed : 1;
            const congestionFactor = congestionRatio < 0.5 ? 1.5 : congestionRatio < 0.8 ? 1.2 : 1.0;
            const effectiveHours = 16;

            const estimatedDailyTraffic = Math.round(
              baseVehiclesPerHour * effectiveHours * congestionFactor * Math.max(confidence, 0.5)
            );

            trafficData = {
              estimated_daily_traffic: estimatedDailyTraffic,
              road_type: roadType,
              peak_hours: peakHours,
              confidence_level: confidence >= 0.8 ? 'Alta' : confidence >= 0.5 ? 'Media' : 'Baja',
              confidence,
              current_speed: Math.round(currentSpeed),
              free_flow_speed: Math.round(freeFlowSpeed),
              source: 'tomtom',
            };

            console.log(`TomTom success: ${estimatedDailyTraffic} daily traffic`);
          } else {
            throw new Error('No flow segment data');
          }
        } else {
          const errorText = await tomtomResponse.text();
          console.error(`TomTom API error: ${tomtomResponse.status}`, errorText);
          throw new Error(`TomTom API returned ${tomtomResponse.status}`);
        }
      } catch (tomtomError) {
        console.log('TomTom failed, using location-based estimate:', tomtomError);
        const locationEstimate = estimateTrafficFromLocation(billboardCity, hasNearbyPOIs);
        trafficData = {
          ...locationEstimate,
          confidence: 0.6,
        };
      }
    } else {
      console.log('No TomTom API key, using fallback');
      const locationEstimate = estimateTrafficFromLocation(billboardCity, hasNearbyPOIs);
      trafficData = {
        ...locationEstimate,
        confidence: 0.6,
      };
    }

    // Store traffic data in database
    const { error: insertError } = await supabase
      .from('traffic_data')
      .insert({
        billboard_id,
        current_speed: trafficData.current_speed || 50,
        free_flow_speed: trafficData.free_flow_speed || 60,
        confidence: trafficData.confidence,
        estimated_daily_impressions: trafficData.estimated_daily_traffic,
      });

    if (insertError) {
      console.error('Error inserting traffic data:', insertError);
    }

    // Update billboard with new estimate and cache timestamp
    const { error: updateError } = await supabase
      .from('billboards')
      .update({ 
        daily_impressions: trafficData.estimated_daily_traffic,
        last_traffic_update: new Date().toISOString(),
      })
      .eq('id', billboard_id);

    if (updateError) {
      console.error('Error updating billboard:', updateError);
    }

    console.log(`Final traffic estimate for ${billboard_id}: ${trafficData.estimated_daily_traffic} (source: ${trafficData.source})`);

    const responseTimestamp = new Date().toISOString();

    return new Response(
      JSON.stringify({
        source: trafficData.source,
        trafficData: {
          estimated_daily_impressions: trafficData.estimated_daily_traffic,
          current_speed: trafficData.current_speed || null,
          free_flow_speed: trafficData.free_flow_speed || null,
          confidence: trafficData.confidence,
          recorded_at: responseTimestamp,
        },
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
