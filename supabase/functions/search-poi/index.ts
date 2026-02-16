import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://maddi.lovable.app',
  'https://id-preview--1e558385-54d9-4439-8b22-6503a152ac9e.lovable.app',
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(o => origin.startsWith(o.replace('https://', '').replace('http://', '')) || o === origin) 
    ? origin 
    : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, lat, lon, limit = 8, countrySet = 'MX' } = await req.json();

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ success: true, results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const TOMTOM_API_KEY = Deno.env.get('MADDI_TOMTOM_API_KEY') || Deno.env.get('TOMTOM_API_KEY');
    if (!TOMTOM_API_KEY) {
      console.error('TOMTOM_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'TomTom API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use TomTom Fuzzy Search for POI + address autocomplete
    const encodedQuery = encodeURIComponent(query);
    let url = `https://api.tomtom.com/search/2/search/${encodedQuery}.json?key=${TOMTOM_API_KEY}&limit=${limit}&countrySet=${countrySet}&language=es-ES&typeahead=true`;
    
    // Add proximity bias if coordinates provided - validate they are numbers
    if (lat != null && lon != null && !isNaN(Number(lat)) && !isNaN(Number(lon))) {
      url += `&lat=${Number(lat)}&lon=${Number(lon)}&radius=50000`;
    }

    console.log(`Searching POIs for: "${query}" (encoded: "${encodedQuery}") near ${lat || 'N/A'}, ${lon || 'N/A'}`);
    console.log(`TomTom API Key prefix: ${TOMTOM_API_KEY.substring(0, 6)}..., length: ${TOMTOM_API_KEY.length}`);

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`TomTom Search API error: ${response.status}, body: ${errorBody}`);
      console.error(`Request URL (without key): ${url.replace(TOMTOM_API_KEY, '***')}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Error en búsqueda' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Map results to a clean format
    const results = (data.results || []).map((result: any) => {
      const isPOI = result.type === 'POI';
      const address = result.address || {};
      
      return {
        id: result.id,
        name: isPOI ? result.poi?.name : (address.freeformAddress || result.address?.municipality),
        type: result.type, // POI, Street, Geography, Address, Cross Street
        category: isPOI ? (result.poi?.categories?.[0] || 'Lugar') : result.type,
        address: address.freeformAddress || '',
        municipality: address.municipality || address.localName || '',
        countrySubdivision: address.countrySubdivision || '',
        lat: result.position?.lat,
        lon: result.position?.lon,
        distance: result.dist ? Math.round(result.dist) : null,
        // For display
        displayName: isPOI 
          ? result.poi?.name 
          : (address.streetName || address.freeformAddress || address.municipality),
        displayContext: [
          address.municipality,
          address.countrySubdivision
        ].filter(Boolean).join(', '),
      };
    });

    console.log(`Found ${results.length} results for "${query}"`);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-poi:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Error interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
