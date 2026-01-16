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

async function searchPOIs(lat: number, lon: number, categoryId: string, apiKey: string, radius: number, limit: number): Promise<any[]> {
  const url = `https://api.tomtom.com/search/2/categorySearch/${categoryId}.json?lat=${lat}&lon=${lon}&radius=${radius}&limit=${limit}&key=${apiKey}`;
  
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

    const TOMTOM_API_KEY = Deno.env.get('TOMTOM_API_KEY');
    if (!TOMTOM_API_KEY) {
      console.error('TOMTOM_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'TomTom API key no configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mode-based configuration
    const isOverview = mode === 'overview';
    const searchRadius = isOverview ? 500 : Math.min(1000, parseInt(radius) || 500);
    const limitPerCategory = isOverview ? 20 : 50;
    const categoriesToUse = isOverview ? OVERVIEW_CATEGORIES : EXPANDED_CATEGORIES;

    console.log(`Analyzing POIs for billboard at ${latitude}, ${longitude} with mode=${mode}, radius=${searchRadius}m`);

    // Fetch POIs for all categories in parallel
    const categoryResults: Record<string, { count: number; items: POIResult[] }> = {};
    const allTopPOIs: POIResult[] = [];

    await Promise.all(
      categoriesToUse.map(async (category) => {
        // Fetch all TomTom IDs for this category in parallel
        const allResults: any[] = [];
        await Promise.all(
          category.tomtomIds.map(async (tomtomId) => {
            const results = await searchPOIs(latitude, longitude, tomtomId, TOMTOM_API_KEY, searchRadius, limitPerCategory);
            allResults.push(...results);
          })
        );

        // Dedupe by name and sort by distance
        const uniqueResults = allResults
          .filter((poi, index, self) => 
            index === self.findIndex(p => p.poi?.name === poi.poi?.name)
          )
          .sort((a, b) => (a.dist || 0) - (b.dist || 0))
          .slice(0, limitPerCategory);

        const count = uniqueResults.length;
        const items = uniqueResults.map(poi => ({
          name: poi.poi?.name || 'Sin nombre',
          category: category.name,
          distance: Math.round(poi.dist || 0),
          lat: poi.position?.lat,
          lon: poi.position?.lon,
          address: poi.address?.freeformAddress,
        }));

        categoryResults[category.name] = { count, items };
        
        // Add top 3 from each category to global top
        items.slice(0, 3).forEach(item => allTopPOIs.push(item));
      })
    );

    // Get top 5 most relevant POIs (sorted by distance)
    const top5POIs = allTopPOIs
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    // Build categories array for response (sorted by count)
    const categories = Object.entries(categoryResults)
      .map(([name, data]) => ({
        name,
        count: data.count,
        items: data.items.slice(0, isOverview ? 5 : 10), // Limit items in response
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
        // No AI analysis - removed as requested
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
