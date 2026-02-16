import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// 8 main categories for efficient overview (no duplicates)
const OVERVIEW_CATEGORIES = [
  { id: 'educacion', name: 'Educación', tomtomIds: ['7372', '7377'] },
  { id: 'hoteles', name: 'Hoteles', tomtomIds: ['7314', '7316'] },
  { id: 'autos', name: 'Autos', tomtomIds: ['7311', '7312', '7313', '7309', '7310'] },
  { id: 'salud', name: 'Salud', tomtomIds: ['7321', '7326', '7336', '7337'] },
  { id: 'retail', name: 'Retail / Plazas', tomtomIds: ['7373', '9361', '7327', '7332'] },
  { id: 'alimentos', name: 'Alimentos y bebidas', tomtomIds: ['7315', '9376'] },
  { id: 'gobierno', name: 'Gobierno / Servicios públicos', tomtomIds: ['7367', '9151', '7324', '7322'] },
  { id: 'servicios', name: 'Servicios profesionales', tomtomIds: ['7328', '7397', '7329'] },
];

// Extended categories for expanded mode
const EXPANDED_CATEGORIES = [
  ...OVERVIEW_CATEGORIES,
  { id: 'entretenimiento', name: 'Entretenimiento', tomtomIds: ['7342', '7341', '9902', '7318'] },
  { id: 'deportes', name: 'Deportes y recreación', tomtomIds: ['7320', '7374', '7375', '7338'] },
  { id: 'turismo', name: 'Turismo', tomtomIds: ['7376', '7317', '9362'] },
  { id: 'transporte', name: 'Transporte', tomtomIds: ['7383', '7380', '9942', '7381'] },
];

interface POIResult {
  name: string;
  category: string;
  distance: number;
  lat?: number;
  lon?: number;
}

async function searchNearbyPOIs(lat: number, lon: number, categorySet: string, apiKey: string, radius: number, limit: number): Promise<any[]> {
  // Use TomTom Nearby Search with categorySet (comma-separated IDs in one call)
  const url = `https://api.tomtom.com/search/2/nearbySearch/.json?lat=${lat}&lon=${lon}&radius=${radius}&limit=${limit}&categorySet=${categorySet}&key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text();
      console.error(`TomTom Nearby Search error (categories: ${categorySet}): ${response.status}, body: ${body}`);
      return [];
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Error fetching nearby POIs (categories: ${categorySet}):`, error);
    return [];
  }
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, billboard_title, city, radius = 500, mode = 'overview' } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ success: false, error: 'Coordenadas requeridas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const TOMTOM_API_KEY = Deno.env.get('MADDI_TOMTOM_API_KEY') || Deno.env.get('TOMTOM_API_KEY');
    if (!TOMTOM_API_KEY) {
      console.error('TOMTOM_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'TomTom API key no configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isOverview = mode === 'overview';
    const searchRadius = isOverview ? 1000 : Math.min(2000, parseInt(radius) || 1000);
    const limitPerCategory = isOverview ? 20 : 50;
    const categoriesToUse = isOverview ? OVERVIEW_CATEGORIES : EXPANDED_CATEGORIES;

    console.log(`Analyzing POIs at ${latitude}, ${longitude}, mode=${mode}, radius=${searchRadius}m`);

    // One API call per category group (8 calls total, not 20+)
    const categoryResults: Record<string, { count: number; items: POIResult[] }> = {};
    const allTopPOIs: POIResult[] = [];

    // Run category groups sequentially in pairs to avoid rate limiting
    for (let i = 0; i < categoriesToUse.length; i += 2) {
      const batch = categoriesToUse.slice(i, i + 2);
      const batchResults = await Promise.all(
        batch.map(async (category) => {
          const categorySet = category.tomtomIds.join(',');
          const results = await searchNearbyPOIs(latitude, longitude, categorySet, TOMTOM_API_KEY, searchRadius, limitPerCategory);
          return { category, results };
        })
      );
      
      for (const { category, results } of batchResults) {
        const uniqueResults = results
          .filter((poi: any, index: number, self: any[]) => 
            index === self.findIndex(p => p.poi?.name === poi.poi?.name)
          )
          .sort((a: any, b: any) => (a.dist || 0) - (b.dist || 0))
          .slice(0, limitPerCategory);

        const items = uniqueResults.map((poi: any) => ({
          name: poi.poi?.name || 'Sin nombre',
          category: category.name,
          distance: Math.round(poi.dist || 0),
          lat: poi.position?.lat,
          lon: poi.position?.lon,
          address: poi.address?.freeformAddress,
        }));

        if (items.length > 0) {
          categoryResults[category.name] = { count: items.length, items };
          items.slice(0, 3).forEach((item: POIResult) => allTopPOIs.push(item));
        }
      }
      
      // Small delay between batches
      if (i + 2 < categoriesToUse.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    const top5POIs = allTopPOIs
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    const categories = Object.entries(categoryResults)
      .map(([name, data]) => ({
        name,
        count: data.count,
        items: data.items.slice(0, isOverview ? 5 : 10),
      }))
      .filter(cat => cat.count > 0)
      .sort((a, b) => b.count - a.count);

    const totalPOIs = categories.reduce((acc, cat) => acc + cat.count, 0);
    
    console.log(`Found ${totalPOIs} total POIs in ${categories.length} categories (mode=${mode})`);

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        radius: searchRadius,
        categories,
        top5: top5POIs,
        totalPOIs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-nearby-poi:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});