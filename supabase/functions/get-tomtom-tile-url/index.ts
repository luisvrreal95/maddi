import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { type, timeSet } = await req.json().catch(() => ({ type: 'live' }));

    // Use MADDI_TOMTOM_API_KEY secret
    const TOMTOM_API_KEY = Deno.env.get('MADDI_TOMTOM_API_KEY') || Deno.env.get('TOMTOM_API_KEY');
    
    if (!TOMTOM_API_KEY) {
      console.error('TomTom API key not configured');
      return new Response(
        JSON.stringify({ error: 'TomTom API key not configured', tileUrl: null }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let tileUrl: string;

    if (type === 'history' && timeSet) {
      // Historical traffic tile URL with timeSet parameter
      tileUrl = `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?tileSize=256&key=${TOMTOM_API_KEY}&timeSet=${timeSet}`;
    } else {
      // Live traffic tile URL
      tileUrl = `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?tileSize=256&key=${TOMTOM_API_KEY}`;
    }

    console.log(`Generated TomTom tile URL for type: ${type}`);

    return new Response(
      JSON.stringify({ tileUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-tomtom-tile-url:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage, tileUrl: null }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
