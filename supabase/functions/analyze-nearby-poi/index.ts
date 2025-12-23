import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Complete TomTom POI categories - 50+ categories for comprehensive analysis
const POI_CATEGORIES = [
  // Automotive
  { id: '7311', name: 'Gasolineras' },
  { id: '7312', name: 'Concesionarios' },
  { id: '7313', name: 'Talleres' },
  { id: '7314', name: 'Lavado de autos' },
  { id: '7309', name: 'Carga eléctrica' },
  { id: '7310', name: 'Renta de autos' },
  
  // Food & Drink
  { id: '7315', name: 'Restaurantes' },
  { id: '9376', name: 'Cafés y bares' },
  { id: '7332', name: 'Supermercados' },
  
  // Shopping
  { id: '7373', name: 'Centros comerciales' },
  { id: '9361', name: 'Tiendas' },
  { id: '7327', name: 'Tiendas departamentales' },
  
  // Financial
  { id: '7328', name: 'Bancos' },
  { id: '7397', name: 'Cajeros' },
  { id: '7329', name: 'Casas de cambio' },
  
  // Health
  { id: '7321', name: 'Hospitales' },
  { id: '7326', name: 'Farmacias' },
  { id: '7336', name: 'Dentistas' },
  { id: '7337', name: 'Doctores' },
  { id: '9663', name: 'Servicios médicos' },
  { id: '9374', name: 'Veterinarias' },
  
  // Lodging
  { id: '7314', name: 'Hoteles' },
  { id: '7316', name: 'Rentas vacacionales' },
  
  // Education
  { id: '7372', name: 'Escuelas' },
  { id: '7377', name: 'Universidades' },
  
  // Entertainment
  { id: '7342', name: 'Cines' },
  { id: '7341', name: 'Casinos' },
  { id: '9902', name: 'Parques de diversiones' },
  { id: '9379', name: 'Vida nocturna' },
  { id: '7318', name: 'Teatros' },
  
  // Sports & Recreation
  { id: '7320', name: 'Gimnasios' },
  { id: '7374', name: 'Centros deportivos' },
  { id: '7339', name: 'Golf' },
  { id: '7375', name: 'Estadios' },
  { id: '7338', name: 'Albercas' },
  { id: '7340', name: 'Tenis' },
  { id: '9927', name: 'Pista de hielo' },
  
  // Tourism
  { id: '7376', name: 'Atracciones turísticas' },
  { id: '7317', name: 'Museos' },
  { id: '9362', name: 'Parques' },
  { id: '9927', name: 'Zoológicos' },
  { id: '7316', name: 'Info turística' },
  
  // Transportation
  { id: '7383', name: 'Aeropuertos' },
  { id: '7380', name: 'Estaciones de tren' },
  { id: '9942', name: 'Paradas de transporte' },
  { id: '7381', name: 'Terminales' },
  
  // Services
  { id: '7324', name: 'Correos' },
  { id: '7367', name: 'Gobierno' },
  { id: '9151', name: 'Tribunales' },
  { id: '7322', name: 'Policía' },
  
  // Others
  { id: '7352', name: 'Iglesias' },
  { id: '7318', name: 'Camping' },
  { id: '7356', name: 'Bodegas' },
  { id: '7363', name: 'Centros comunitarios' },
  { id: '9913', name: 'Bibliotecas' },
  { id: '7365', name: 'Embajadas' },
];

async function searchPOIs(lat: number, lon: number, categoryId: string, apiKey: string) {
  const radius = 500; // 500 meters
  const limit = 100;
  
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

async function generateAIAnalysis(pois: any, billboardTitle: string, city: string) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.error('LOVABLE_API_KEY not configured');
    return 'Análisis no disponible - API key no configurada';
  }
  
  // Build POI summary
  const poiSummary = Object.entries(pois)
    .filter(([_, items]: [string, any]) => items.length > 0)
    .map(([category, items]: [string, any]) => `- ${category}: ${items.length}`)
    .join('\\n');
  
  const prompt = `Eres un experto en publicidad exterior (OOH - Out of Home Advertising) en México.

Analiza los comercios cercanos a un espectacular publicitario ubicado en ${city} llamado \\"${billboardTitle}\\" y proporciona un análisis estratégico.

Comercios encontrados en un radio de 500 metros:
${poiSummary}

Proporciona un análisis estructurado que incluya:

1. **👥 Perfil de Audiencia**: Describe qué tipo de personas frecuentan esta zona basándote en los comercios cercanos.

2. **🎯 Industrias Ideales para Anunciar**: Lista 5-7 industrias o tipos de productos/servicios que serían ideales para anunciar en esta ubicación, con una breve justificación.

3. **⏰ Horarios de Mayor Impacto**: Sugiere los mejores horarios para maximizar el impacto publicitario basándote en el tipo de comercios.

4. **💪 Ventajas Competitivas**: Explica por qué esta ubicación es valiosa para anunciantes.

5. **💡 Recomendaciones Específicas**: Proporciona 3-4 recomendaciones concretas para maximizar el valor de esta ubicación.

Mantén el análisis conciso pero valioso. Usa emojis para hacer el texto más visual y fácil de leer.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Eres un experto en publicidad exterior y análisis de ubicaciones comerciales en México. Responde siempre en español.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return 'Límite de solicitudes alcanzado. Por favor intenta más tarde.';
      }
      if (response.status === 402) {
        return 'Créditos de IA agotados. Contacta al administrador.';
      }
      
      return 'Error al generar análisis de IA';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No se pudo generar el análisis';
  } catch (error) {
    console.error('Error calling Lovable AI:', error);
    return 'Error al conectar con el servicio de IA';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude, billboard_title, city } = await req.json();

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

    console.log(`Analyzing POIs for billboard at ${latitude}, ${longitude}`);

    // Fetch POIs for all categories in parallel (batch of 10 to avoid rate limits)
    const allPOIs: Record<string, any[]> = {};
    const batchSize = 10;
    
    for (let i = 0; i < POI_CATEGORIES.length; i += batchSize) {
      const batch = POI_CATEGORIES.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(cat => searchPOIs(latitude, longitude, cat.id, TOMTOM_API_KEY))
      );
      
      batch.forEach((cat, idx) => {
        allPOIs[cat.name] = batchResults[idx];
      });
    }

    // Process results into categories
    const categories = POI_CATEGORIES.map(cat => {
      const items = (allPOIs[cat.name] || []).map((poi: any) => ({
        name: poi.poi?.name || 'Sin nombre',
        distance: Math.round(poi.dist || 0),
        address: poi.address?.freeformAddress
      }));
      
      return {
        name: cat.name,
        count: items.length,
        items: items.sort((a: any, b: any) => a.distance - b.distance)
      };
    }).filter(cat => cat.count > 0);

    const totalPOIs = categories.reduce((acc, cat) => acc + cat.count, 0);
    
    console.log(`Found ${totalPOIs} total POIs in ${categories.length} categories`);

    // Generate AI analysis
    const aiAnalysis = await generateAIAnalysis(allPOIs, billboard_title || 'Espectacular', city || 'la zona');

    return new Response(
      JSON.stringify({
        success: true,
        categories,
        totalPOIs,
        aiAnalysis
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
