import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SCIAN sector categories mapping
const SECTOR_CATEGORIES: Record<string, string> = {
  '43': 'Comercio al por mayor',
  '46': 'Comercio al por menor',
  '72': 'Alojamiento y alimentos',
  '52': 'Servicios financieros',
  '62': 'Servicios de salud',
  '61': 'Servicios educativos',
  '71': 'Entretenimiento',
  '81': 'Otros servicios',
  '31': 'Manufactura',
  '32': 'Manufactura',
  '33': 'Manufactura',
  '48': 'Transporte',
  '49': 'Transporte',
  '51': 'Información y medios',
  '53': 'Servicios inmobiliarios',
  '54': 'Servicios profesionales',
  '55': 'Corporativos',
  '56': 'Servicios de apoyo',
};

interface DenueRecord {
  Nombre: string;
  Clase_actividad: string;
  Codigo_act: string;
  Tipo_vialidad: string;
  Calle: string;
  Num_exterior: string;
  Colonia: string;
  CP: string;
  Ubicacion: string;
  Telefono: string;
  Correo_e: string;
  Sitio_internet: string;
  Tipo: string;
  Longitud: string;
  Latitud: string;
  CentroComercial: string;
  TipoCentroComercial: string;
  NumLocal: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { billboard_id, latitude, longitude, force_refresh = false } = await req.json();

    if (!billboard_id || !latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'billboard_id, latitude, and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if we have cached data (less than 7 days old)
    if (!force_refresh) {
      const { data: cached } = await supabase
        .from('inegi_demographics')
        .select('*')
        .eq('billboard_id', billboard_id)
        .single();

      if (cached) {
        const lastUpdated = new Date(cached.last_updated);
        const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate < 7) {
          console.log('Returning cached INEGI data');
          return new Response(
            JSON.stringify({ 
              data: cached, 
              source: 'cache',
              cached_at: cached.last_updated 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Fetch data from DENUE API
    const inegiToken = Deno.env.get('INEGI_DENUE_TOKEN');
    if (!inegiToken) {
      return new Response(
        JSON.stringify({ error: 'INEGI_DENUE_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching DENUE data for coordinates: ${latitude}, ${longitude}`);
    
    const denueUrl = `https://www.inegi.org.mx/app/api/denue/v1/consulta/Buscar/todos/${latitude},${longitude}/500/${inegiToken}`;
    const denueResponse = await fetch(denueUrl);
    
    if (!denueResponse.ok) {
      console.error('DENUE API error:', denueResponse.status, await denueResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch DENUE data', status: denueResponse.status }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const denueData: DenueRecord[] = await denueResponse.json();
    console.log(`Found ${denueData.length} businesses from DENUE`);

    // Process and categorize businesses
    const sectorCounts: Record<string, number> = {};
    const businessTypes: Record<string, string[]> = {};

    for (const business of denueData) {
      const code = business.Codigo_act?.substring(0, 2) || '';
      const sectorName = SECTOR_CATEGORIES[code] || 'Otros';
      
      sectorCounts[sectorName] = (sectorCounts[sectorName] || 0) + 1;
      
      if (!businessTypes[sectorName]) {
        businessTypes[sectorName] = [];
      }
      if (businessTypes[sectorName].length < 5) {
        businessTypes[sectorName].push(business.Nombre);
      }
    }

    // Find dominant sector
    let dominantSector = 'Sin datos';
    let maxCount = 0;
    for (const [sector, count] of Object.entries(sectorCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantSector = sector;
      }
    }

    // Generate AI insights using Lovable AI
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    let aiSummary = '';
    let audienceProfile = '';
    let socioeconomicLevel: 'bajo' | 'medio' | 'medio-alto' | 'alto' = 'medio';
    let commercialEnvironment = '';

    if (lovableApiKey && denueData.length > 0) {
      try {
        const prompt = `Analiza los siguientes datos de negocios cercanos a un espectacular publicitario en México y genera insights en español:

Total de negocios en 500m: ${denueData.length}
Distribución por sector:
${Object.entries(sectorCounts).map(([s, c]) => `- ${s}: ${c} negocios`).join('\n')}

Sector dominante: ${dominantSector}

Genera una respuesta JSON con exactamente estos campos:
{
  "audienceProfile": "Descripción breve del perfil de audiencia predominante (máximo 100 caracteres)",
  "socioeconomicLevel": "bajo" | "medio" | "medio-alto" | "alto",
  "commercialEnvironment": "Descripción del entorno comercial (máximo 100 caracteres)",
  "summary": "Resumen ejecutivo de 2-3 oraciones sobre el potencial publicitario de la zona"
}

Basa tu análisis en:
- Cantidad y tipo de negocios (más servicios financieros/profesionales = nivel más alto)
- Densidad comercial (más negocios = más tráfico potencial)
- Mix de sectores (diversidad indica zona comercial activa)`;

        const aiResponse = await fetch('https://api.lovable.dev/api/llm/chat', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          
          // Parse JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            audienceProfile = parsed.audienceProfile || '';
            socioeconomicLevel = parsed.socioeconomicLevel || 'medio';
            commercialEnvironment = parsed.commercialEnvironment || '';
            aiSummary = parsed.summary || '';
          }
        }
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
      }
    }

    // Fallback insights if AI fails
    if (!audienceProfile) {
      const hasServices = (sectorCounts['Servicios financieros'] || 0) + 
                         (sectorCounts['Servicios profesionales'] || 0);
      const hasRetail = sectorCounts['Comercio al por menor'] || 0;
      const hasFood = sectorCounts['Alojamiento y alimentos'] || 0;

      if (hasServices > 5) {
        audienceProfile = 'Profesionistas y ejecutivos';
        socioeconomicLevel = 'medio-alto';
      } else if (hasRetail > 10) {
        audienceProfile = 'Consumidores y familias';
        socioeconomicLevel = 'medio';
      } else if (hasFood > 5) {
        audienceProfile = 'Público general con alta movilidad';
        socioeconomicLevel = 'medio';
      } else {
        audienceProfile = 'Público general';
        socioeconomicLevel = 'medio';
      }

      commercialEnvironment = denueData.length > 50 
        ? 'Zona comercial de alta densidad' 
        : denueData.length > 20 
          ? 'Zona comercial activa' 
          : 'Zona con actividad comercial moderada';

      aiSummary = `Zona con ${denueData.length} negocios cercanos. Predomina el sector de ${dominantSector.toLowerCase()}. ${commercialEnvironment.toLowerCase()}.`;
    }

    // Save to database
    const demographicsData = {
      billboard_id,
      nearby_businesses_count: denueData.length,
      business_sectors: sectorCounts,
      dominant_sector: dominantSector,
      audience_profile: audienceProfile,
      socioeconomic_level: socioeconomicLevel,
      commercial_environment: commercialEnvironment,
      ai_summary: aiSummary,
      raw_denue_data: denueData.slice(0, 50), // Store first 50 for reference
      last_updated: new Date().toISOString(),
    };

    const { data: saved, error: saveError } = await supabase
      .from('inegi_demographics')
      .upsert(demographicsData, { onConflict: 'billboard_id' })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving demographics:', saveError);
    }

    return new Response(
      JSON.stringify({ 
        data: saved || demographicsData, 
        source: 'fresh',
        businesses_found: denueData.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-inegi-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
