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

// Predefined profiles by socioeconomic level
const PROFILES: Record<string, { audienceProfile: string; commercialEnvironment: string }> = {
  'alto': {
    audienceProfile: 'Profesionistas y ejecutivos de alto poder adquisitivo',
    commercialEnvironment: 'Zona corporativa y de servicios premium',
  },
  'medio-alto': {
    audienceProfile: 'Familias y profesionistas con buen poder adquisitivo',
    commercialEnvironment: 'Zona comercial desarrollada con servicios variados',
  },
  'medio': {
    audienceProfile: 'Público general con poder adquisitivo moderado',
    commercialEnvironment: 'Zona comercial activa con comercio diverso',
  },
  'bajo': {
    audienceProfile: 'Público popular con poder adquisitivo básico',
    commercialEnvironment: 'Zona de comercio local y servicios básicos',
  },
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
  Estrato?: string;
  Per_ocu?: string;
}

// Calculate socioeconomic level based on business types and sizes
function calculateSocioeconomicLevel(
  sectorCounts: Record<string, number>,
  denueData: DenueRecord[]
): 'bajo' | 'medio' | 'medio-alto' | 'alto' {
  let score = 0;
  
  // Servicios financieros y profesionales (+3 puntos cada 5 negocios)
  const financial = sectorCounts['Servicios financieros'] || 0;
  const professional = sectorCounts['Servicios profesionales'] || 0;
  const corporate = sectorCounts['Corporativos'] || 0;
  score += Math.floor((financial + professional + corporate) / 5) * 3;
  
  // Entretenimiento y alojamiento (+2 puntos cada 5)
  const entertainment = sectorCounts['Entretenimiento'] || 0;
  const hotels = sectorCounts['Alojamiento y alimentos'] || 0;
  score += Math.floor((entertainment + hotels) / 5) * 2;
  
  // Comercio al por menor (neutro, +1 cada 10)
  const retail = sectorCounts['Comercio al por menor'] || 0;
  score += Math.floor(retail / 10);
  
  // Servicios de salud y educativos (+1 cada 3)
  const health = sectorCounts['Servicios de salud'] || 0;
  const education = sectorCounts['Servicios educativos'] || 0;
  score += Math.floor((health + education) / 3);
  
  // Count large companies by employee stratum (per_ocu contains ranges like "0 a 5 personas")
  const largeCompanies = denueData.filter(b => {
    const perOcu = b.Per_ocu || '';
    // Check for larger employee counts
    return perOcu.includes('101') || 
           perOcu.includes('251') || 
           perOcu.includes('51 a') ||
           perOcu.includes('31 a');
  }).length;
  score += largeCompanies * 2;
  
  // Clasificación final
  if (score >= 15) return 'alto';
  if (score >= 8) return 'medio-alto';
  if (score >= 3) return 'medio';
  return 'bajo';
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

    // Calculate socioeconomic level using predefined rules
    const socioeconomicLevel = calculateSocioeconomicLevel(sectorCounts, denueData);
    
    // Get predefined profile texts
    const profile = PROFILES[socioeconomicLevel];
    const audienceProfile = profile.audienceProfile;
    const commercialEnvironment = profile.commercialEnvironment;
    
    // Generate summary based on data
    const densityText = denueData.length > 50 
      ? 'de alta densidad comercial' 
      : denueData.length > 20 
        ? 'con actividad comercial activa' 
        : 'con actividad comercial moderada';
    
    const summary = `Zona ${densityText} con ${denueData.length} negocios en 500m. Predomina el sector de ${dominantSector.toLowerCase()}.`;

    // Save to database
    const demographicsData = {
      billboard_id,
      nearby_businesses_count: denueData.length,
      business_sectors: sectorCounts,
      dominant_sector: dominantSector,
      audience_profile: audienceProfile,
      socioeconomic_level: socioeconomicLevel,
      commercial_environment: commercialEnvironment,
      ai_summary: summary,
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
