import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Improved SCIAN sector categories mapping using first 3 digits
// Known brands to detect
const KNOWN_BRANDS = [
  // Conveniencia
  'OXXO', '7-ELEVEN', 'EXTRA', 'CIRCLE K', 'KIOSKO',
  // Comida rápida
  'STARBUCKS', 'MCDONALDS', "MCDONALD'S", 'BURGER KING', 'CARLS JR', "CARL'S JR", 
  'DOMINOS', "DOMINO'S", 'LITTLE CAESARS', 'SUBWAY', 'KFC', 'WENDYS', "WENDY'S",
  'PIZZA HUT', 'CHILIS', "CHILI'S", 'APPLEBEES', "APPLEBEE'S", 'VIPS', 'TOKS',
  'ITALIANNIS', "ITALIANNI'S", 'OLIVE GARDEN', 'JOHNNY ROCKETS', 'WINGS',
  // Cafeterías
  'STARBUCKS', 'PUNTA DEL CIELO', 'CIELITO QUERIDO', 'COFFEE FACTORY', 'ANDATTI',
  // Supermercados
  'WALMART', 'SORIANA', 'CHEDRAUI', 'HEB', 'H-E-B', 'COSTCO', 'SAMS CLUB', "SAM'S CLUB",
  'LA COMER', 'CITY MARKET', 'FRESKO', 'SUPERAMA', 'BODEGA AURRERA', 'MEGA',
  // Bancos
  'BBVA', 'BANORTE', 'SANTANDER', 'HSBC', 'CITIBANAMEX', 'BANAMEX', 'AZTECA', 
  'SCOTIABANK', 'INBURSA', 'BANCOPPEL', 'BANREGIO',
  // Gasolineras
  'PEMEX', 'MOBIL', 'SHELL', 'TOTAL', 'BP', 'G500', 'REDCO', 'ORSAN',
  // Entretenimiento
  'CINEPOLIS', 'CINEMEX', 'CINEMARK', 'LIVERPOOL', 'PALACIO DE HIERRO', 
  'SEARS', 'SUBURBIA', 'COPPEL', 'ELEKTRA', 'FAMSA',
  // Farmacias
  'FARMACIAS GUADALAJARA', 'BENAVIDES', 'DEL AHORRO', 'SIMILARES', 'SAN PABLO',
  'FARMACIA YZA', 'FARMAPRONTO',
  // Telecomunicaciones
  'TELCEL', 'MOVISTAR', 'AT&T', 'IZZI', 'TOTALPLAY', 'TELMEX',
  // Muebles y hogar
  'HOME DEPOT', 'LOWES', 'IKEA', 'OFFICE DEPOT', 'OFFICE MAX',
];

// Shopping center indicators
const SHOPPING_CENTER_KEYWORDS = [
  'PLAZA', 'CENTRO COMERCIAL', 'MALL', 'GALERIAS', 'GALERÍAS', 'TOWN CENTER',
  'OUTLET', 'FASHION', 'PASEO', 'ANTEA', 'PARQUE', 'FORUM', 'ALTACIA',
  'ARBOLEDAS', 'MULTIPLAZA', 'SENDERO', 'PUNTO', 'CITY CENTER',
];

const SECTOR_CATEGORIES_3: Record<string, string> = {
  // Restaurantes y alimentos (72)
  '722': 'Restaurantes y bares',
  '721': 'Hoteles y alojamiento',
  '723': 'Servicios de comida',
  
  // Comercio al por menor (46)
  '461': 'Tiendas de abarrotes',
  '462': 'Tiendas departamentales',
  '463': 'Papelerías y librerías',
  '464': 'Farmacias y perfumerías',
  '465': 'Gasolineras',
  '466': 'Ferreterías',
  '467': 'Tiendas de ropa',
  '468': 'Venta de vehículos',
  '469': 'Otros comercios',
  
  // Comercio al por mayor (43)
  '431': 'Mayoristas de alimentos',
  '432': 'Mayoristas de textiles',
  '433': 'Mayoristas de farmacia',
  '434': 'Mayoristas de materiales',
  '435': 'Mayoristas de maquinaria',
  '436': 'Mayoristas de muebles',
  '437': 'Mayoristas de materias primas',
  
  // Servicios financieros (52)
  '521': 'Banca central',
  '522': 'Bancos y financieras',
  '523': 'Casas de bolsa',
  '524': 'Seguros y fianzas',
  
  // Servicios de salud (62)
  '621': 'Consultorios médicos',
  '622': 'Hospitales',
  '623': 'Asilos y guarderías',
  '624': 'Asistencia social',
  
  // Servicios educativos (61)
  '611': 'Escuelas y educación',
  
  // Servicios profesionales (54)
  '541': 'Servicios legales y contables',
  '542': 'Diseño y arquitectura',
  
  // Entretenimiento (71)
  '711': 'Artes y espectáculos',
  '712': 'Museos',
  '713': 'Entretenimiento y recreación',
  
  // Transporte (48, 49)
  '481': 'Transporte aéreo',
  '482': 'Transporte ferroviario',
  '483': 'Transporte marítimo',
  '484': 'Autotransporte de carga',
  '485': 'Transporte de pasajeros',
  '486': 'Transporte por ductos',
  '487': 'Turismo y transporte',
  '488': 'Servicios de transporte',
  '491': 'Servicios postales',
  '492': 'Mensajería y paquetería',
  '493': 'Almacenamiento',
  
  // Información (51)
  '511': 'Edición',
  '512': 'Cine y video',
  '515': 'Radio y televisión',
  '517': 'Telecomunicaciones',
  '518': 'Servicios de internet',
  '519': 'Servicios de información',
  
  // Inmobiliarios (53)
  '531': 'Servicios inmobiliarios',
  '532': 'Alquiler de bienes',
  '533': 'Arrendadoras',
  
  // Corporativos (55)
  '551': 'Corporativos',
  
  // Servicios de apoyo (56)
  '561': 'Servicios administrativos',
  '562': 'Manejo de residuos',
  
  // Otros servicios (81)
  '811': 'Reparación y mantenimiento',
  '812': 'Servicios personales',
  '813': 'Asociaciones',
  '814': 'Hogares con empleados',
  
  // Manufactura (31-33)
  '311': 'Alimentos procesados',
  '312': 'Bebidas y tabaco',
  '313': 'Textiles',
  '314': 'Productos textiles',
  '315': 'Prendas de vestir',
  '316': 'Cuero y calzado',
  '321': 'Productos de madera',
  '322': 'Papel',
  '323': 'Impresión',
  '324': 'Derivados del petróleo',
  '325': 'Química',
  '326': 'Plástico y hule',
  '327': 'Minerales no metálicos',
  '331': 'Metales básicos',
  '332': 'Productos metálicos',
  '333': 'Maquinaria',
  '334': 'Electrónicos',
  '335': 'Equipos eléctricos',
  '336': 'Automotriz',
  '337': 'Muebles',
  '339': 'Otras manufacturas',
};

// Consolidated 8 main categories for user-friendly display
const CONSOLIDATED_MAPPING: Record<string, string> = {
  // 🍔 Alimentos y Bebidas
  'Restaurantes y bares': 'Alimentos y Bebidas',
  'Cafeterías': 'Alimentos y Bebidas',
  'Bares y antros': 'Alimentos y Bebidas',
  'Hoteles y alojamiento': 'Alimentos y Bebidas',
  'Servicios de comida': 'Alimentos y Bebidas',
  'Alimentos y hospedaje': 'Alimentos y Bebidas',
  
  // 🛒 Comercio Minorista
  'Tiendas de abarrotes': 'Comercio Minorista',
  'Supermercados': 'Comercio Minorista',
  'Tiendas departamentales': 'Comercio Minorista',
  'Tiendas de ropa': 'Comercio Minorista',
  'Farmacias y perfumerías': 'Comercio Minorista',
  'Ferreterías': 'Comercio Minorista',
  'Gasolineras': 'Comercio Minorista',
  'Papelerías y librerías': 'Comercio Minorista',
  'Venta de vehículos': 'Comercio Minorista',
  'Otros comercios': 'Comercio Minorista',
  'Comercio minorista': 'Comercio Minorista',
  'Comercio mayorista': 'Comercio Minorista',
  'Mayoristas de alimentos': 'Comercio Minorista',
  'Mayoristas de textiles': 'Comercio Minorista',
  'Mayoristas de farmacia': 'Comercio Minorista',
  'Mayoristas de materiales': 'Comercio Minorista',
  'Mayoristas de maquinaria': 'Comercio Minorista',
  'Mayoristas de muebles': 'Comercio Minorista',
  'Mayoristas de materias primas': 'Comercio Minorista',
  'Refacciones': 'Comercio Minorista',
  
  // 🏦 Servicios Financieros
  'Banca central': 'Servicios Financieros',
  'Bancos y financieras': 'Servicios Financieros',
  'Casas de bolsa': 'Servicios Financieros',
  'Seguros y fianzas': 'Servicios Financieros',
  'Servicios financieros': 'Servicios Financieros',
  
  // 🏥 Salud
  'Consultorios médicos': 'Salud',
  'Hospitales': 'Salud',
  'Asilos y guarderías': 'Salud',
  'Asistencia social': 'Salud',
  'Laboratorios': 'Salud',
  'Ópticas': 'Salud',
  'Servicios de salud': 'Salud',
  
  // 💇 Servicios Personales
  'Belleza y spa': 'Servicios Personales',
  'Gimnasios': 'Servicios Personales',
  'Servicios personales': 'Servicios Personales',
  'Reparación y mantenimiento': 'Servicios Personales',
  'Talleres mecánicos': 'Servicios Personales',
  'Autolavados': 'Servicios Personales',
  'Otros servicios': 'Servicios Personales',
  'Estacionamientos': 'Servicios Personales',
  'Entretenimiento': 'Servicios Personales',
  'Artes y espectáculos': 'Servicios Personales',
  'Museos': 'Servicios Personales',
  'Entretenimiento y recreación': 'Servicios Personales',
  'Cine y entretenimiento': 'Servicios Personales',
  
  // 🎓 Educación
  'Escuelas y educación': 'Educación',
  'Educación': 'Educación',
  
  // 🏭 Industrial / Bodegas
  'Almacenamiento': 'Industrial / Bodegas',
  'Manufactura': 'Industrial / Bodegas',
  'Alimentos procesados': 'Industrial / Bodegas',
  'Bebidas y tabaco': 'Industrial / Bodegas',
  'Textiles': 'Industrial / Bodegas',
  'Productos textiles': 'Industrial / Bodegas',
  'Prendas de vestir': 'Industrial / Bodegas',
  'Cuero y calzado': 'Industrial / Bodegas',
  'Productos de madera': 'Industrial / Bodegas',
  'Papel': 'Industrial / Bodegas',
  'Impresión': 'Industrial / Bodegas',
  'Derivados del petróleo': 'Industrial / Bodegas',
  'Química': 'Industrial / Bodegas',
  'Plástico y hule': 'Industrial / Bodegas',
  'Minerales no metálicos': 'Industrial / Bodegas',
  'Metales básicos': 'Industrial / Bodegas',
  'Productos metálicos': 'Industrial / Bodegas',
  'Maquinaria': 'Industrial / Bodegas',
  'Electrónicos': 'Industrial / Bodegas',
  'Equipos eléctricos': 'Industrial / Bodegas',
  'Automotriz': 'Industrial / Bodegas',
  'Muebles': 'Industrial / Bodegas',
  'Otras manufacturas': 'Industrial / Bodegas',
  'Transporte aéreo': 'Industrial / Bodegas',
  'Transporte ferroviario': 'Industrial / Bodegas',
  'Transporte marítimo': 'Industrial / Bodegas',
  'Autotransporte de carga': 'Industrial / Bodegas',
  'Transporte de pasajeros': 'Industrial / Bodegas',
  'Transporte por ductos': 'Industrial / Bodegas',
  'Turismo y transporte': 'Industrial / Bodegas',
  'Servicios de transporte': 'Industrial / Bodegas',
  'Servicios postales': 'Industrial / Bodegas',
  'Mensajería y paquetería': 'Industrial / Bodegas',
  'Transporte': 'Industrial / Bodegas',
  'Mensajería': 'Industrial / Bodegas',
  
  // 🏢 Oficinas / Profesionales
  'Corporativos': 'Oficinas / Profesionales',
  'Servicios legales y contables': 'Oficinas / Profesionales',
  'Servicios legales': 'Oficinas / Profesionales',
  'Contabilidad': 'Oficinas / Profesionales',
  'Diseño y arquitectura': 'Oficinas / Profesionales',
  'Servicios profesionales': 'Oficinas / Profesionales',
  'Servicios administrativos': 'Oficinas / Profesionales',
  'Tecnología': 'Oficinas / Profesionales',
  'Telecomunicaciones': 'Oficinas / Profesionales',
  'Edición': 'Oficinas / Profesionales',
  'Cine y video': 'Oficinas / Profesionales',
  'Radio y televisión': 'Oficinas / Profesionales',
  'Servicios de internet': 'Oficinas / Profesionales',
  'Servicios de información': 'Oficinas / Profesionales',
  'Medios e información': 'Oficinas / Profesionales',
  'Servicios inmobiliarios': 'Oficinas / Profesionales',
  'Alquiler de bienes': 'Oficinas / Profesionales',
  'Arrendadoras': 'Oficinas / Profesionales',
  'Inmobiliarios': 'Oficinas / Profesionales',
  'Manejo de residuos': 'Oficinas / Profesionales',
  'Asociaciones': 'Oficinas / Profesionales',
  'Hogares con empleados': 'Servicios Personales',
  'Servicios de apoyo': 'Oficinas / Profesionales',
};

// Consolidate detailed sectors into 8 main categories with percentages
function consolidateSectors(sectorCounts: Record<string, number>): Record<string, { count: number; percentage: number }> {
  const consolidated: Record<string, number> = {};
  let total = 0;
  
  for (const [sector, count] of Object.entries(sectorCounts)) {
    const category = CONSOLIDATED_MAPPING[sector] || 'Otros';
    consolidated[category] = (consolidated[category] || 0) + count;
    total += count;
  }
  
  // Convert to percentages
  const result: Record<string, { count: number; percentage: number }> = {};
  for (const [category, count] of Object.entries(consolidated)) {
    result[category] = {
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  }
  
  return result;
};

// Fallback mapping using first 2 digits
const SECTOR_CATEGORIES_2: Record<string, string> = {
  '43': 'Comercio mayorista',
  '46': 'Comercio minorista',
  '72': 'Alimentos y hospedaje',
  '52': 'Servicios financieros',
  '62': 'Servicios de salud',
  '61': 'Educación',
  '71': 'Entretenimiento',
  '81': 'Otros servicios',
  '31': 'Manufactura',
  '32': 'Manufactura',
  '33': 'Manufactura',
  '48': 'Transporte',
  '49': 'Mensajería',
  '51': 'Medios e información',
  '53': 'Inmobiliarios',
  '54': 'Servicios profesionales',
  '55': 'Corporativos',
  '56': 'Servicios de apoyo',
};

// Categorize by activity text as fallback
function categorizeByActivity(claseActividad: string): string {
  const text = claseActividad.toLowerCase();
  
  // Restaurantes y comida
  if (text.includes('restaurante') || text.includes('comida') || text.includes('preparación de alimentos') || text.includes('taquería') || text.includes('pizzería') || text.includes('mariscos')) 
    return 'Restaurantes y bares';
  if (text.includes('cafetería') || text.includes('café') || text.includes('nevería') || text.includes('heladería'))
    return 'Cafeterías';
  if (text.includes('bar') || text.includes('cantina') || text.includes('bebidas alcohólicas') || text.includes('antro') || text.includes('discoteca'))
    return 'Bares y antros';
  
  // Gasolineras
  if (text.includes('gasolinera') || text.includes('combustible') || text.includes('gasolina') || text.includes('diesel'))
    return 'Gasolineras';
  
  // Comercio
  if (text.includes('tienda') || text.includes('abarrote') || text.includes('minisuper') || text.includes('miscelánea') || text.includes('conveniencia'))
    return 'Tiendas de abarrotes';
  if (text.includes('supermercado') || text.includes('autoservicio'))
    return 'Supermercados';
  if (text.includes('farmacia') || text.includes('medicamento') || text.includes('botica'))
    return 'Farmacias y perfumerías';
  if (text.includes('ropa') || text.includes('vestir') || text.includes('calzado') || text.includes('zapatería'))
    return 'Tiendas de ropa';
  if (text.includes('ferretería') || text.includes('material') || text.includes('construcción'))
    return 'Ferreterías';
  
  // Servicios financieros
  if (text.includes('banco') || text.includes('financier') || text.includes('cajero') || text.includes('crédito'))
    return 'Bancos y financieras';
  if (text.includes('seguro') || text.includes('asegurador'))
    return 'Seguros y fianzas';
  
  // Salud
  if (text.includes('hospital') || text.includes('clínica') || text.includes('sanatorio'))
    return 'Hospitales';
  if (text.includes('consultorio') || text.includes('médico') || text.includes('dental') || text.includes('dentista') || text.includes('doctor'))
    return 'Consultorios médicos';
  if (text.includes('óptica') || text.includes('lentes') || text.includes('optometría'))
    return 'Ópticas';
  if (text.includes('laboratorio') || text.includes('análisis clínicos'))
    return 'Laboratorios';
  
  // Educación
  if (text.includes('escuela') || text.includes('colegio') || text.includes('universidad') || text.includes('instituto') || text.includes('educativ'))
    return 'Escuelas y educación';
  if (text.includes('guardería') || text.includes('estancia infantil') || text.includes('kinder'))
    return 'Asilos y guarderías';
  
  // Entretenimiento
  if (text.includes('cine') || text.includes('película') || text.includes('teatro'))
    return 'Cine y entretenimiento';
  if (text.includes('gimnasio') || text.includes('deportivo') || text.includes('fitness') || text.includes('gym'))
    return 'Gimnasios';
  if (text.includes('spa') || text.includes('masaje') || text.includes('estética') || text.includes('belleza') || text.includes('salón'))
    return 'Belleza y spa';
  
  // Hospedaje
  if (text.includes('hotel') || text.includes('hospedaje') || text.includes('alojamiento') || text.includes('motel'))
    return 'Hoteles y alojamiento';
  
  // Automotriz
  if (text.includes('taller') || text.includes('mecánico') || text.includes('automotriz') || text.includes('reparación de automóvil'))
    return 'Talleres mecánicos';
  if (text.includes('refaccion') || text.includes('autopartes'))
    return 'Refacciones';
  if (text.includes('lavado') || text.includes('autolavado') || text.includes('car wash'))
    return 'Autolavados';
  if (text.includes('estacionamiento') || text.includes('parking'))
    return 'Estacionamientos';
  
  // Servicios profesionales
  if (text.includes('abogado') || text.includes('legal') || text.includes('notaría') || text.includes('jurídic'))
    return 'Servicios legales';
  if (text.includes('contabl') || text.includes('contador') || text.includes('fiscal'))
    return 'Contabilidad';
  if (text.includes('arquitect') || text.includes('diseño') || text.includes('ingeniería'))
    return 'Diseño y arquitectura';
  
  // Tecnología
  if (text.includes('computadora') || text.includes('cómputo') || text.includes('software') || text.includes('tecnología') || text.includes('internet'))
    return 'Tecnología';
  if (text.includes('celular') || text.includes('telefonía') || text.includes('comunicación'))
    return 'Telecomunicaciones';
  
  return 'Otros servicios';
}

// Get sector name from SCIAN code
function getSectorFromCode(codigoAct: string, claseActividad: string): string {
  if (!codigoAct || codigoAct.length < 3) {
    return categorizeByActivity(claseActividad);
  }
  
  // Try 3-digit code first
  const code3 = codigoAct.substring(0, 3);
  if (SECTOR_CATEGORIES_3[code3]) {
    return SECTOR_CATEGORIES_3[code3];
  }
  
  // Try 2-digit code
  const code2 = codigoAct.substring(0, 2);
  if (SECTOR_CATEGORIES_2[code2]) {
    return SECTOR_CATEGORIES_2[code2];
  }
  
  // Fallback to text analysis
  return categorizeByActivity(claseActividad);
}

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

// Extract known brands from business data
function extractKnownBrands(denueData: DenueRecord[]): string[] {
  const foundBrands = new Set<string>();
  
  for (const business of denueData) {
    const name = business.Nombre?.toUpperCase() || '';
    
    for (const brand of KNOWN_BRANDS) {
      if (name.includes(brand.toUpperCase())) {
        // Normalize brand name
        const normalizedBrand = brand.replace(/[']/g, '').toUpperCase();
        foundBrands.add(normalizedBrand);
        break;
      }
    }
  }
  
  return Array.from(foundBrands).slice(0, 20);
}

// Extract shopping centers
function extractShoppingCenters(denueData: DenueRecord[]): string[] {
  const centers = new Set<string>();
  
  for (const business of denueData) {
    const centroComercial = business.CentroComercial?.trim();
    if (centroComercial && centroComercial.length > 2) {
      centers.add(centroComercial);
    }
    
    // Also check business name for shopping center indicators
    const name = business.Nombre?.toUpperCase() || '';
    for (const keyword of SHOPPING_CENTER_KEYWORDS) {
      if (name.includes(keyword) && name.length < 50) {
        // Skip generic names
        if (!name.includes('TIENDA') && !name.includes('LOCAL')) {
          centers.add(business.Nombre);
          break;
        }
      }
    }
  }
  
  return Array.from(centers).slice(0, 5);
}

// Calculate business size distribution
function calculateSizeDistribution(denueData: DenueRecord[]): { micro: number; small: number; medium: number; large: number } {
  const distribution = { micro: 0, small: 0, medium: 0, large: 0 };
  
  for (const business of denueData) {
    const perOcu = business.Per_ocu?.toLowerCase() || '';
    
    if (perOcu.includes('251') || perOcu.includes('más de')) {
      distribution.large++;
    } else if (perOcu.includes('51 a') || perOcu.includes('101')) {
      distribution.medium++;
    } else if (perOcu.includes('11 a') || perOcu.includes('31 a')) {
      distribution.small++;
    } else {
      distribution.micro++;
    }
  }
  
  return distribution;
}

// Get top businesses for display
function getTopBusinesses(denueData: DenueRecord[], sectorCounts: Record<string, number>): Array<{ name: string; category: string; size: string }> {
  const topBusinesses: Array<{ name: string; category: string; size: string; score: number }> = [];
  
  for (const business of denueData) {
    const perOcu = business.Per_ocu?.toLowerCase() || '';
    let sizeScore = 0;
    let sizeLabel = 'Micro';
    
    if (perOcu.includes('251') || perOcu.includes('más de')) {
      sizeScore = 4;
      sizeLabel = 'Grande';
    } else if (perOcu.includes('51 a') || perOcu.includes('101')) {
      sizeScore = 3;
      sizeLabel = 'Mediana';
    } else if (perOcu.includes('11 a') || perOcu.includes('31 a')) {
      sizeScore = 2;
      sizeLabel = 'Pequeña';
    } else {
      sizeScore = 1;
    }
    
    // Skip very generic names
    const name = business.Nombre || '';
    if (name.length > 3 && name.length < 60) {
      topBusinesses.push({
        name: name,
        category: getSectorFromCode(business.Codigo_act || '', business.Clase_actividad || ''),
        size: sizeLabel,
        score: sizeScore,
      });
    }
  }
  
  // Sort by size score and return top 10
  return topBusinesses
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(({ name, category, size }) => ({ name, category, size }));
}

// Calculate socioeconomic level based on business types and sizes
function calculateSocioeconomicLevel(
  sectorCounts: Record<string, number>,
  denueData: DenueRecord[]
): 'bajo' | 'medio' | 'medio-alto' | 'alto' {
  let score = 0;
  
  // Servicios financieros y profesionales (+3 puntos cada 5 negocios)
  const financial = (sectorCounts['Bancos y financieras'] || 0) + (sectorCounts['Seguros y fianzas'] || 0);
  const professional = (sectorCounts['Servicios legales'] || 0) + (sectorCounts['Contabilidad'] || 0) + (sectorCounts['Diseño y arquitectura'] || 0);
  const corporate = sectorCounts['Corporativos'] || 0;
  score += Math.floor((financial + professional + corporate) / 5) * 3;
  
  // Entretenimiento y alojamiento (+2 puntos cada 5)
  const entertainment = (sectorCounts['Cine y entretenimiento'] || 0) + (sectorCounts['Gimnasios'] || 0);
  const hotels = sectorCounts['Hoteles y alojamiento'] || 0;
  score += Math.floor((entertainment + hotels) / 5) * 2;
  
  // Comercio al por menor (neutro, +1 cada 10)
  const retail = (sectorCounts['Comercio minorista'] || 0) + (sectorCounts['Tiendas de abarrotes'] || 0) + (sectorCounts['Supermercados'] || 0);
  score += Math.floor(retail / 10);
  
  // Servicios de salud y educativos (+1 cada 3)
  const health = (sectorCounts['Hospitales'] || 0) + (sectorCounts['Consultorios médicos'] || 0);
  const education = sectorCounts['Escuelas y educación'] || 0;
  score += Math.floor((health + education) / 3);
  
  // Count large companies by employee stratum
  const largeCompanies = denueData.filter(b => {
    const perOcu = b.Per_ocu || '';
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

    // Process and categorize businesses using improved mapping
    const sectorCounts: Record<string, number> = {};
    const businessesBySector: Record<string, string[]> = {};

    for (const business of denueData) {
      const sectorName = getSectorFromCode(business.Codigo_act || '', business.Clase_actividad || '');
      
      sectorCounts[sectorName] = (sectorCounts[sectorName] || 0) + 1;
      
      if (!businessesBySector[sectorName]) {
        businessesBySector[sectorName] = [];
      }
      if (businessesBySector[sectorName].length < 10) {
        businessesBySector[sectorName].push(business.Nombre);
      }
    }

    // Log sector breakdown for debugging
    console.log('Sector breakdown:', JSON.stringify(sectorCounts, null, 2));

    // Find dominant sector
    let dominantSector = 'Sin datos';
    let maxCount = 0;
    for (const [sector, count] of Object.entries(sectorCounts)) {
      if (count > maxCount && sector !== 'Otros servicios') {
        maxCount = count;
        dominantSector = sector;
      }
    }

    // Calculate socioeconomic level using predefined rules
    const socioeconomicLevel = calculateSocioeconomicLevel(sectorCounts, denueData);
    
    // Consolidate sectors into 8 main categories
    const consolidatedSectors = consolidateSectors(sectorCounts);
    console.log('Consolidated sectors:', JSON.stringify(consolidatedSectors, null, 2));
    
    // Extract additional insights
    const knownBrands = extractKnownBrands(denueData);
    const shoppingCenters = extractShoppingCenters(denueData);
    const sizeDistribution = calculateSizeDistribution(denueData);
    const topBusinesses = getTopBusinesses(denueData, sectorCounts);
    
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
    
    const brandsText = knownBrands.length > 0 
      ? ` Marcas reconocidas: ${knownBrands.slice(0, 3).join(', ')}.`
      : '';
    
    const summary = `Zona ${densityText} con ${denueData.length} negocios en 500m. Predomina el sector de ${dominantSector.toLowerCase()}.${brandsText}`;

    // Save to database - include new fields in raw_denue_data as JSON
    const enrichedData = {
      known_brands: knownBrands,
      shopping_centers: shoppingCenters,
      size_distribution: sizeDistribution,
      top_businesses: topBusinesses,
      consolidated_sectors: consolidatedSectors,
    };

    const demographicsData = {
      billboard_id,
      nearby_businesses_count: denueData.length,
      business_sectors: sectorCounts,
      dominant_sector: dominantSector,
      audience_profile: audienceProfile,
      socioeconomic_level: socioeconomicLevel,
      commercial_environment: commercialEnvironment,
      ai_summary: summary,
      raw_denue_data: { ...enrichedData, sample: denueData.slice(0, 20) },
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
