import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TOMTOM_API_KEY = Deno.env.get('TOMTOM_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TOMTOM_API_KEY) {
      console.error('TOMTOM_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'TomTom API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Supabase not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { billboard_id, latitude, longitude } = await req.json();

    if (!billboard_id || !latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'billboard_id, latitude, and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching traffic data for billboard ${billboard_id} at ${latitude}, ${longitude}`);

    // Call TomTom Flow Segment Data API
    // Documentation: https://developer.tomtom.com/traffic-api/documentation/traffic-flow/flow-segment-data
    const tomtomUrl = `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative0/10/json?point=${latitude},${longitude}&key=${TOMTOM_API_KEY}`;

    const tomtomResponse = await fetch(tomtomUrl);
    
    if (!tomtomResponse.ok) {
      const errorText = await tomtomResponse.text();
      console.error('TomTom API error:', tomtomResponse.status, errorText);
      
      // If no road segment found, return default values
      if (tomtomResponse.status === 404) {
        return new Response(
          JSON.stringify({ 
            message: 'No road segment found at this location',
            current_speed: null,
            free_flow_speed: null,
            confidence: null,
            estimated_daily_impressions: null,
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
    console.log('TomTom response:', JSON.stringify(tomtomData));

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

    // Estimate daily impressions based on traffic data
    // Formula: Higher traffic (lower speeds due to congestion) = more impressions
    // Base estimate: vehicles per hour * hours of visibility * congestion factor
    
    // Congestion factor: ratio of free flow speed to current speed
    const congestionFactor = freeFlowSpeed > 0 ? freeFlowSpeed / Math.max(currentSpeed, 1) : 1;
    
    // Base vehicles per hour estimate (rough estimate based on road type)
    // This is a simplified model - in production you'd use more accurate data
    const baseVehiclesPerHour = freeFlowSpeed > 80 ? 2000 : freeFlowSpeed > 50 ? 1500 : 1000;
    
    // Hours of effective visibility per day (daylight + lit hours)
    const effectiveHours = 16;
    
    // Calculate estimated daily impressions
    // More congestion = slower speeds = more time to see the billboard = more impressions
    const estimatedDailyImpressions = Math.round(
      baseVehiclesPerHour * effectiveHours * Math.min(congestionFactor, 3) * confidence
    );

    console.log(`Estimated impressions: ${estimatedDailyImpressions} (congestion: ${congestionFactor.toFixed(2)}, confidence: ${confidence})`);

    // Store traffic data in database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: insertError } = await supabase
      .from('traffic_data')
      .insert({
        billboard_id,
        current_speed: Math.round(currentSpeed),
        free_flow_speed: Math.round(freeFlowSpeed),
        confidence,
        estimated_daily_impressions: estimatedDailyImpressions,
      });

    if (insertError) {
      console.error('Error inserting traffic data:', insertError);
      // Don't fail the request, just log the error
    }

    // Also update the billboard's daily_impressions if we have a valid estimate
    if (estimatedDailyImpressions > 0) {
      const { error: updateError } = await supabase
        .from('billboards')
        .update({ daily_impressions: estimatedDailyImpressions })
        .eq('id', billboard_id);

      if (updateError) {
        console.error('Error updating billboard impressions:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        current_speed: Math.round(currentSpeed),
        free_flow_speed: Math.round(freeFlowSpeed),
        confidence,
        estimated_daily_impressions: estimatedDailyImpressions,
        congestion_factor: congestionFactor.toFixed(2),
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
