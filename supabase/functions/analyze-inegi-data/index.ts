import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// KNOWN BRANDS - Marcas reconocidas para detección
// ============================================================
const KNOWN_BRANDS = [
  // Conveniencia
  'OXXO', '7-ELEVEN', 'EXTRA', 'CIRCLE K', 'KIOSKO',
  // Comida rápida
  'STARBUCKS', 'MCDONALDS', "MCDONALD'S", 'BURGER KING', 'CARLS JR', "CARL'S JR", 
  'DOMINOS', "DOMINO'S", 'LITTLE CAESARS', 'SUBWAY', 'KFC', 'WENDYS', "WENDY'S",
  'PIZZA HUT', 'CHILIS', "CHILI'S", 'APPLEBEES', "APPLEBEE'S", 'VIPS', 'TOKS',
  'ITALIANNIS', "ITALIANNI'S", 'OLIVE GARDEN', 'JOHNNY ROCKETS', 'WINGS',
  'PUNTA DEL CIELO', 'CIELITO QUERIDO', 'COFFEE FACTORY', 'ANDATTI',
  // Supermercados
  'WALMART', 'SORIANA', 'CHEDRAUI', 'HEB', 'H-E-B', 'COSTCO', 'SAMS CLUB', "SAM'S CLUB",
  'LA COMER', 'CITY MARKET', 'FRESKO', 'SUPERAMA', 'BODEGA AURRERA', 'MEGA',
  // Bancos
  'BBVA', 'BANORTE', 'SANTANDER', 'HSBC', 'CITIBANAMEX', 'BANAMEX', 'AZTECA', 
  'SCOTIABANK', 'INBURSA', 'BANCOPPEL', 'BANREGIO',
  // Gasolineras
  'PEMEX', 'MOBIL', 'SHELL', 'TOTAL', 'BP', 'G500', 'REDCO', 'ORSAN',
  // Entretenimiento y retail
  'CINEPOLIS', 'CINEMEX', 'CINEMARK', 'LIVERPOOL', 'PALACIO DE HIERRO', 
  'SEARS', 'SUBURBIA', 'COPPEL', 'ELEKTRA', 'FAMSA',
  // Farmacias
  'FARMACIAS GUADALAJARA', 'BENAVIDES', 'DEL AHORRO', 'SIMILARES', 'SAN PABLO',
  'FARMACIA YZA', 'FARMAPRONTO',
  // Telecomunicaciones
  'TELCEL', 'MOVISTAR', 'AT&T', 'IZZI', 'TOTALPLAY', 'TELMEX',
  // Hogar
  'HOME DEPOT', 'LOWES', 'IKEA', 'OFFICE DEPOT', 'OFFICE MAX',
];

// ============================================================
// CATEGORÍAS FINALES (10 máximo) - Nunca mostrar "Otros"
// ============================================================
const FINAL_CATEGORIES = [
  'Alimentos y Bebidas',
  'Comercio Minorista',
  'Servicios Financieros',
  'Servicios Personales',
  'Salud',
  'Educación',
  'Servicios Profesionales',
  'Entretenimiento',
  'Automotriz y Transporte',
  'Industria y Manufactura',
] as const;

type FinalCategory = typeof FINAL_CATEGORIES[number];

// ============================================================
// MAPEO DETERMINÍSTICO: SCIAN (2 dígitos) → Categoría Final
// Prioridad #1: Siempre usar primero el código SCIAN
// ============================================================
const SCIAN_2_TO_CATEGORY: Record<string, FinalCategory> = {
  // Alimentos y Bebidas (SCIAN 72)
  '72': 'Alimentos y Bebidas',
  
  // Comercio (SCIAN 43-46)
  '43': 'Comercio Minorista',
  '44': 'Comercio Minorista',
  '45': 'Comercio Minorista',
  '46': 'Comercio Minorista',
  
  // Servicios Financieros (SCIAN 52)
  '52': 'Servicios Financieros',
  
  // Servicios Personales (SCIAN 81)
  '81': 'Servicios Personales',
  
  // Salud (SCIAN 62)
  '62': 'Salud',
  
  // Educación (SCIAN 61)
  '61': 'Educación',
  
  // Servicios Profesionales / Corporativos (SCIAN 54, 55, 56)
  '54': 'Servicios Profesionales',
  '55': 'Servicios Profesionales',
  '56': 'Servicios Profesionales',
  
  // Entretenimiento y Recreación (SCIAN 71)
  '71': 'Entretenimiento',
  
  // Automotriz y Transporte (SCIAN 48-49)
  '48': 'Automotriz y Transporte',
  '49': 'Automotriz y Transporte',
  
  // Industria / Manufactura (SCIAN 31-33)
  '31': 'Industria y Manufactura',
  '32': 'Industria y Manufactura',
  '33': 'Industria y Manufactura',
  
  // Información y telecomunicaciones → Servicios Profesionales
  '51': 'Servicios Profesionales',
  
  // Inmobiliarios y alquiler → Servicios Profesionales
  '53': 'Servicios Profesionales',
  
  // Agricultura, minería, etc. → Industria
  '11': 'Industria y Manufactura',
  '21': 'Industria y Manufactura',
  '22': 'Industria y Manufactura',
  '23': 'Industria y Manufactura',
  
  // Gobierno → Servicios Profesionales
  '93': 'Servicios Profesionales',
};

// ============================================================
// FALLBACK POR TEXTO: Palabras clave → Categoría Final
// Prioridad #2: Solo si no hay match por SCIAN
// ============================================================
interface TextPattern {
  keywords: string[];
  category: FinalCategory;
}

const TEXT_PATTERNS: TextPattern[] = [
  // Alimentos y Bebidas
  { keywords: ['restaurante', 'comida', 'taquería', 'pizzería', 'mariscos', 'tortas', 'tacos', 'antojitos', 'cocina', 'buffet', 'sushi', 'comedor', 'lonchería', 'fonda', 'panadería', 'pastelería', 'cafetería', 'café', 'nevería', 'heladería', 'bar', 'cantina', 'cervecería', 'bebidas', 'hotel', 'hospedaje', 'motel', 'posada', 'alojamiento'], category: 'Alimentos y Bebidas' },
  
  // Comercio Minorista
  { keywords: ['tienda', 'abarrotes', 'minisuper', 'miscelánea', 'conveniencia', 'supermercado', 'autoservicio', 'farmacia', 'botica', 'medicamento', 'ropa', 'vestir', 'calzado', 'zapatería', 'boutique', 'moda', 'ferretería', 'material', 'construcción', 'papelería', 'librería', 'joyería', 'relojería', 'mueblería', 'electrónica', 'celulares', 'juguetería', 'deportes', 'mascotas', 'floristería', 'dulcería', 'carnicería', 'tortillería', 'pollería', 'cremería', 'verdulería', 'frutería', 'mercado', 'bazar'], category: 'Comercio Minorista' },
  
  // Servicios Financieros
  { keywords: ['banco', 'financier', 'cajero', 'crédito', 'préstamo', 'seguro', 'asegurador', 'casa de cambio', 'afore', 'inversión'], category: 'Servicios Financieros' },
  
  // Salud
  { keywords: ['hospital', 'clínica', 'sanatorio', 'consultorio', 'médico', 'dental', 'dentista', 'doctor', 'óptica', 'lentes', 'optometría', 'laboratorio', 'análisis clínicos', 'fisioterapia', 'rehabilitación', 'psicólogo', 'nutriólogo', 'veterinari'], category: 'Salud' },
  
  // Educación
  { keywords: ['escuela', 'colegio', 'universidad', 'instituto', 'educativ', 'academia', 'guardería', 'estancia infantil', 'kinder', 'preescolar', 'primaria', 'secundaria', 'preparatoria', 'capacitación', 'cursos', 'idiomas', 'inglés'], category: 'Educación' },
  
  // Entretenimiento
  { keywords: ['cine', 'película', 'teatro', 'gimnasio', 'deportivo', 'fitness', 'gym', 'spa', 'masaje', 'club', 'boliche', 'billar', 'videojuegos', 'karaoke', 'discoteca', 'antro', 'salón de eventos', 'parque', 'recreativo'], category: 'Entretenimiento' },
  
  // Servicios Personales
  { keywords: ['belleza', 'estética', 'salón', 'peluquería', 'barbería', 'uñas', 'manicure', 'lavandería', 'tintorería', 'sastrería', 'costura', 'fotografía', 'funeraria', 'cerrajería', 'plomería', 'electricista', 'carpintería', 'tapicería', 'reparación', 'mantenimiento'], category: 'Servicios Personales' },
  
  // Automotriz y Transporte
  { keywords: ['taller', 'mecánico', 'automotriz', 'automóvil', 'auto', 'refaccion', 'autopartes', 'lavado', 'autolavado', 'car wash', 'estacionamiento', 'parking', 'llanta', 'gasolinera', 'gasolina', 'combustible', 'agencia', 'vehículo', 'moto', 'transporte', 'mudanza', 'paquetería', 'mensajería'], category: 'Automotriz y Transporte' },
  
  // Servicios Profesionales
  { keywords: ['abogado', 'legal', 'notaría', 'jurídic', 'contabl', 'contador', 'fiscal', 'arquitect', 'diseño', 'ingeniería', 'consultoría', 'asesoría', 'publicidad', 'marketing', 'imprenta', 'oficina', 'coworking', 'inmobiliaria', 'tecnología', 'software', 'sistemas', 'internet', 'telefonía', 'comunicación'], category: 'Servicios Profesionales' },
  
  // Industria y Manufactura
  { keywords: ['fábrica', 'manufactura', 'industrial', 'bodega', 'almacén', 'distribuidora', 'mayorista', 'procesadora', 'empacadora', 'ensambladora', 'maquiladora', 'taller industrial', 'herrería', 'soldadura', 'tornería'], category: 'Industria y Manufactura' },
];

// ============================================================
// INTERFACES
// ============================================================
interface DenueRecord {
  Nombre: string;
  Clase_actividad: string;
  Codigo_act: string;
  Tipo_vialidad?: string;
  Calle?: string;
  Num_exterior?: string;
  Colonia?: string;
  CP?: string;
  Ubicacion?: string;
  Telefono?: string;
  Correo_e?: string;
  Sitio_internet?: string;
  Tipo?: string;
  Longitud?: string;
  Latitud?: string;
  CentroComercial?: string;
  TipoCentroComercial?: string;
  NumLocal?: string;
  Estrato?: string;
  Per_ocu?: string;
}

interface CategoryDistribution {
  label: FinalCategory;
  percentage: number;
  count: number;
}

interface ProcessedData {
  distribution: CategoryDistribution[];
  totalBusinesses: number;
  knownBrands: string[];
  interpretation: string;
  zoneType: 'mixed' | 'specialized' | 'limited';
}

// ============================================================
// FUNCIÓN PRINCIPAL: Clasificar negocio por SCIAN → Texto → Fallback
// ============================================================
function classifyBusiness(codigoAct: string, claseActividad: string, nombreAct: string): FinalCategory {
  // PASO 1: Intentar por código SCIAN (2 dígitos) - PRIORIDAD MÁXIMA
  if (codigoAct && codigoAct.length >= 2) {
    const code2 = codigoAct.substring(0, 2);
    const categoryBySCIAN = SCIAN_2_TO_CATEGORY[code2];
    if (categoryBySCIAN) {
      return categoryBySCIAN;
    }
  }
  
  // PASO 2: Buscar por clase_actividad (texto descriptivo del SCIAN)
  const claseText = (claseActividad || '').toLowerCase();
  for (const pattern of TEXT_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (claseText.includes(keyword)) {
        return pattern.category;
      }
    }
  }
  
  // PASO 3: Buscar por nombre del negocio como último recurso
  const nombreText = (nombreAct || '').toLowerCase();
  for (const pattern of TEXT_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (nombreText.includes(keyword)) {
        return pattern.category;
      }
    }
  }
  
  // PASO 4: FALLBACK - Asignar a categoría genérica basada en patrones comunes
  // NUNCA devolver "Otros"
  
  // Si tiene algo que suena a comercio
  if (claseText.includes('comercio') || claseText.includes('venta') || nombreText.includes('comercio')) {
    return 'Comercio Minorista';
  }
  
  // Si tiene algo que suena a servicio
  if (claseText.includes('servicio') || nombreText.includes('servicio')) {
    return 'Servicios Personales';
  }
  
  // Fallback final: Comercio Minorista (categoría más común en zonas urbanas)
  return 'Comercio Minorista';
}

// ============================================================
// Extraer marcas conocidas
// ============================================================
function extractKnownBrands(denueData: DenueRecord[]): string[] {
  const foundBrands = new Set<string>();
  
  for (const business of denueData) {
    const name = (business.Nombre || '').toUpperCase();
    
    for (const brand of KNOWN_BRANDS) {
      const brandUpper = brand.toUpperCase().replace(/[']/g, '');
      if (name.includes(brandUpper)) {
        // Normalizar nombre de marca para display
        foundBrands.add(brand.replace(/[']/g, ''));
        break;
      }
    }
  }
  
  return Array.from(foundBrands).slice(0, 15);
}

// ============================================================
// Procesar y agrupar negocios por categoría
// ============================================================
function processBusinessData(denueData: DenueRecord[]): ProcessedData {
  const categoryCounts: Record<FinalCategory, number> = {} as Record<FinalCategory, number>;
  
  // Inicializar todas las categorías en 0
  for (const cat of FINAL_CATEGORIES) {
    categoryCounts[cat] = 0;
  }
  
  // Clasificar cada negocio
  for (const business of denueData) {
    const category = classifyBusiness(
      business.Codigo_act || '',
      business.Clase_actividad || '',
      business.Nombre || ''
    );
    categoryCounts[category]++;
  }
  
  const totalBusinesses = denueData.length;
  
  // Crear distribución ordenada por porcentaje
  const distribution: CategoryDistribution[] = Object.entries(categoryCounts)
    .filter(([_, count]) => count > 0)
    .map(([label, count]) => ({
      label: label as FinalCategory,
      count,
      percentage: totalBusinesses > 0 ? Math.round((count / totalBusinesses) * 100) : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);
  
  // Extraer marcas conocidas
  const knownBrands = extractKnownBrands(denueData);
  
  // Determinar tipo de zona e interpretación
  const { interpretation, zoneType } = generateInterpretation(distribution, totalBusinesses, knownBrands);
  
  return {
    distribution,
    totalBusinesses,
    knownBrands,
    interpretation,
    zoneType,
  };
}

// ============================================================
// Generar texto interpretativo para el usuario
// ============================================================
function generateInterpretation(
  distribution: CategoryDistribution[],
  totalBusinesses: number,
  knownBrands: string[]
): { interpretation: string; zoneType: 'mixed' | 'specialized' | 'limited' } {
  
  // Caso: Pocos negocios
  if (totalBusinesses < 20) {
    const topCategory = distribution[0]?.label || 'servicios locales';
    return {
      interpretation: `Zona con actividad comercial limitada (${totalBusinesses} negocios), principalmente ${topCategory.toLowerCase()}.`,
      zoneType: 'limited',
    };
  }
  
  // Caso: Zona especializada (top category > 35%)
  const top = distribution[0];
  if (top && top.percentage >= 35) {
    let zoneDesc = '';
    switch (top.label) {
      case 'Alimentos y Bebidas':
        zoneDesc = 'Zona gastronómica ideal para marcas de consumo y delivery.';
        break;
      case 'Comercio Minorista':
        zoneDesc = 'Zona comercial activa, excelente para retail y promociones.';
        break;
      case 'Servicios Financieros':
        zoneDesc = 'Zona financiera con público profesional y alto poder adquisitivo.';
        break;
      case 'Salud':
        zoneDesc = 'Zona médica con alto flujo de pacientes y familiares.';
        break;
      case 'Educación':
        zoneDesc = 'Zona educativa con público joven y familias.';
        break;
      case 'Servicios Profesionales':
        zoneDesc = 'Zona corporativa ideal para servicios B2B y profesionales.';
        break;
      case 'Entretenimiento':
        zoneDesc = 'Zona de ocio con público diverso buscando experiencias.';
        break;
      case 'Automotriz y Transporte':
        zoneDesc = 'Zona automotriz con alto tráfico vehicular.';
        break;
      case 'Industria y Manufactura':
        zoneDesc = 'Zona industrial con trabajadores y operadores.';
        break;
      default:
        zoneDesc = `Zona especializada en ${top.label.toLowerCase()}.`;
    }
    return { interpretation: zoneDesc, zoneType: 'specialized' };
  }
  
  // Caso: Zona mixta (diversificada)
  const topThree = distribution.slice(0, 3).map(d => d.label.toLowerCase());
  const brandNote = knownBrands.length >= 3 
    ? ` Presencia de marcas reconocidas como ${knownBrands.slice(0, 3).join(', ')}.`
    : '';
  
  return {
    interpretation: `Zona comercial mixta con ${topThree.join(', ')}.${brandNote}`,
    zoneType: 'mixed',
  };
}

// ============================================================
// Calcular nivel socioeconómico
// ============================================================
function calculateSocioeconomicLevel(
  distribution: CategoryDistribution[],
  knownBrands: string[],
  totalBusinesses: number
): 'bajo' | 'medio' | 'medio-alto' | 'alto' {
  let score = 0;
  
  // Puntos por presencia de servicios financieros
  const financial = distribution.find(d => d.label === 'Servicios Financieros');
  if (financial) {
    score += Math.min(3, Math.floor(financial.percentage / 5));
  }
  
  // Puntos por servicios profesionales
  const professional = distribution.find(d => d.label === 'Servicios Profesionales');
  if (professional) {
    score += Math.min(3, Math.floor(professional.percentage / 5));
  }
  
  // Puntos por marcas conocidas premium
  const premiumBrands = ['STARBUCKS', 'LIVERPOOL', 'PALACIO DE HIERRO', 'COSTCO', 'CITY MARKET'];
  for (const brand of knownBrands) {
    if (premiumBrands.some(pb => brand.toUpperCase().includes(pb))) {
      score += 2;
    }
  }
  
  // Puntos por densidad comercial alta
  if (totalBusinesses > 100) score += 2;
  else if (totalBusinesses > 50) score += 1;
  
  // Puntos por marcas reconocidas en general
  score += Math.min(3, Math.floor(knownBrands.length / 3));
  
  // Clasificación
  if (score >= 10) return 'alto';
  if (score >= 6) return 'medio-alto';
  if (score >= 3) return 'medio';
  return 'bajo';
}

// ============================================================
// Perfiles predefinidos por NSE
// ============================================================
const NSE_PROFILES = {
  'alto': {
    audienceProfile: 'Profesionistas y ejecutivos de alto poder adquisitivo',
    commercialEnvironment: 'Zona premium con servicios especializados',
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
    audienceProfile: 'Público popular y trabajadores locales',
    commercialEnvironment: 'Zona de comercio local y servicios básicos',
  },
};

// ============================================================
// SERVIDOR PRINCIPAL
// ============================================================
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

    // Check cache (7 días)
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
            JSON.stringify({ data: cached, source: 'cache', cached_at: cached.last_updated }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Fetch DENUE
    const inegiToken = Deno.env.get('INEGI_DENUE_TOKEN');
    if (!inegiToken) {
      return new Response(
        JSON.stringify({ error: 'INEGI_DENUE_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching DENUE data for: ${latitude}, ${longitude}`);
    const denueUrl = `https://www.inegi.org.mx/app/api/denue/v1/consulta/Buscar/todos/${latitude},${longitude}/500/${inegiToken}`;
    const denueResponse = await fetch(denueUrl);
    
    if (!denueResponse.ok) {
      console.error('DENUE API error:', denueResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch DENUE data' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const denueData: DenueRecord[] = await denueResponse.json();
    console.log(`Found ${denueData.length} businesses from DENUE`);

    // Procesar datos
    const processed = processBusinessData(denueData);
    
    // Calcular NSE
    const socioeconomicLevel = calculateSocioeconomicLevel(
      processed.distribution,
      processed.knownBrands,
      processed.totalBusinesses
    );
    
    const profile = NSE_PROFILES[socioeconomicLevel];
    
    // Sector dominante (nunca "Otros")
    const dominantSector = processed.distribution[0]?.label || 'Comercio Minorista';
    
    // Generar resumen
    const brandMention = processed.knownBrands.length > 0 
      ? ` Marcas reconocidas: ${processed.knownBrands.slice(0, 3).join(', ')}.`
      : '';
    const summary = `${processed.interpretation}${brandMention}`;

    // Datos para guardar - distribución ya procesada
    const demographicsData = {
      billboard_id,
      nearby_businesses_count: processed.totalBusinesses,
      business_sectors: Object.fromEntries(processed.distribution.map(d => [d.label, d.count])),
      dominant_sector: dominantSector,
      audience_profile: profile.audienceProfile,
      socioeconomic_level: socioeconomicLevel,
      commercial_environment: profile.commercialEnvironment,
      ai_summary: summary,
      raw_denue_data: {
        distribution: processed.distribution,
        known_brands: processed.knownBrands,
        interpretation: processed.interpretation,
        zone_type: processed.zoneType,
        sample: denueData.slice(0, 10),
      },
      last_updated: new Date().toISOString(),
    };

    // Guardar
    const { data: saved, error: saveError } = await supabase
      .from('inegi_demographics')
      .upsert(demographicsData, { onConflict: 'billboard_id' })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving demographics:', saveError);
    }

    console.log('Distribution:', JSON.stringify(processed.distribution.slice(0, 5), null, 2));

    return new Response(
      JSON.stringify({ data: saved || demographicsData, source: 'fresh', businesses_found: denueData.length }),
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
