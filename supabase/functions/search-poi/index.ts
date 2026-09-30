import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsFor, gate } from "../_shared/http.ts";


serve(async (req) => {
  const corsHeaders = corsFor(req);
  
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const denied = await gate(req, { name: 'search-poi', ip: [600, 3600] });
  if (denied) return denied;

  try {
    const body = await req.json();
    const query = typeof body.query === 'string' ? body.query.slice(0, 100) : '';
    const { lat, lon } = body;
    const limit = Math.min(Math.max(parseInt(body.limit) || 8, 1), 10);
    const countrySet = /^[A-Z]{2}(,[A-Z]{2})*$/.test(body.countrySet) ? body.countrySet : 'MX';

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
