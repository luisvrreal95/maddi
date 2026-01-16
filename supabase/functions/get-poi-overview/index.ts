import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 8 main categories for the overview (fixed 500m radius)
const OVERVIEW_CATEGORIES = [
  { id: '7372', name: 'Educación', tomtomIds: ['7372', '7377'] }, // Escuelas, Universidades
  { id: '7314', name: 'Hoteles', tomtomIds: ['7314', '7316'] }, // Hoteles, Rentas vacacionales
  { id: '7311', name: 'Autos', tomtomIds: ['7311', '7312', '7313', '7314', '7309', '7310'] }, // Gasolineras, Concesionarios, Talleres, etc
  { id: '7321', name: 'Salud', tomtomIds: ['7321', '7326', '7336', '7337', '9663', '9374'] }, // Hospitales, Farmacias, etc
  { id: '7373', name: 'Retail / Plazas', tomtomIds: ['7373', '9361', '7327', '7332'] }, // Centros comerciales, Tiendas, Super
  { id: '7315', name: 'Alimentos y bebidas', tomtomIds: ['7315', '9376'] }, // Restaurantes, Cafés
  { id: '7367', name: 'Gobierno / Servicios públicos', tomtomIds: ['7367', '9151', '7324', '7322'] }, // Gobierno, Tribunales, Correos, Policía
  { id: '7328', name: 'Servicios profesionales', tomtomIds: ['7328', '7397', '7329'] }, // Bancos, Cajeros, Casas de cambio
];

interface POIResult {
  name: string;
  category: string;
  distance: number;
}

async function searchPOIs(lat: number, lon: number, categoryId: string, apiKey: string, radius: number = 500): Promise<any[]> {
  const url = `https://api.tomtom.com/search/2/categorySearch/${categoryId}.json?lat=${lat}&lon=${lon}&radius=${radius}&limit=20&key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`TomTom API error for category ${categoryId}: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Error fetching POIs for category ${categoryId}:`, error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { billboard_id, latitude, longitude, force_refresh = false } = await req.json();

    if (!billboard_id || !latitude || !longitude) {
      return new Response(
        JSON.stringify({ success: false, error: 'billboard_id, latitude, and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check cache first (unless force_refresh)
    if (!force_refresh) {
      const { data: cached } = await supabase
        .from('poi_overview_cache')
        .select('*')
        .eq('billboard_id', billboard_id)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (cached) {
        console.log(`Returning cached POI data for billboard ${billboard_id}`);
        return new Response(
          JSON.stringify({ success: true, cached: true, ...cached.data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // No cache or expired, fetch fresh data
    const TOMTOM_API_KEY = Deno.env.get('TOMTOM_API_KEY');
    if (!TOMTOM_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'TomTom API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching fresh POI data for billboard ${billboard_id} at ${latitude}, ${longitude}`);

    // Fixed 500m radius for overview
    const FIXED_RADIUS = 500;
    
    // Fetch all categories in parallel
    const categoryResults: Record<string, { count: number; topItems: POIResult[] }> = {};
    const allTopPOIs: POIResult[] = [];

    await Promise.all(
      OVERVIEW_CATEGORIES.map(async (category) => {
        // Fetch all TomTom IDs for this category
        const allResults: any[] = [];
        await Promise.all(
          category.tomtomIds.map(async (tomtomId) => {
            const results = await searchPOIs(latitude, longitude, tomtomId, TOMTOM_API_KEY, FIXED_RADIUS);
            allResults.push(...results);
          })
        );

        // Dedupe by name and sort by distance
        const uniqueResults = allResults
          .filter((poi, index, self) => 
            index === self.findIndex(p => p.poi?.name === poi.poi?.name)
          )
          .sort((a, b) => (a.dist || 0) - (b.dist || 0))
          .slice(0, 20);

        const count = uniqueResults.length;
        const topItems = uniqueResults.slice(0, 3).map(poi => ({
          name: poi.poi?.name || 'Sin nombre',
          category: category.name,
          distance: Math.round(poi.dist || 0),
        }));

        categoryResults[category.name] = { count, topItems };
        
        // Add to global top POIs
        topItems.forEach(item => allTopPOIs.push(item));
      })
    );

    // Get top 5 most relevant POIs (sorted by distance)
    const top5POIs = allTopPOIs
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    // Build response
    const result = {
      categories: categoryResults,
      top5: top5POIs,
      totalPOIs: Object.values(categoryResults).reduce((acc, cat) => acc + cat.count, 0),
      radius: FIXED_RADIUS,
      computed_at: new Date().toISOString(),
    };

    // Save to cache
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    const { error: upsertError } = await supabase
      .from('poi_overview_cache')
      .upsert({
        billboard_id,
        lat: latitude,
        lng: longitude,
        radius: FIXED_RADIUS,
        data: result,
        computed_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'billboard_id'
      });

    if (upsertError) {
      console.error('Error saving to cache:', upsertError);
    }

    console.log(`Saved POI overview to cache for billboard ${billboard_id}`);

    return new Response(
      JSON.stringify({ success: true, cached: false, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-poi-overview:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
