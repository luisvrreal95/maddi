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

// ============================================================
// TIPOS DE ZONA URBANA
// ============================================================
type UrbanZoneType = 
  | 'industrial'
  | 'commercial'
  | 'corporate'
  | 'residential'
  | 'transit'
  | 'mixed';

interface ZoneClassification {
  type: UrbanZoneType;
  confidence: number;
  signals: string[];
}

interface ProcessedData {
  distribution: CategoryDistribution[];
  totalBusinesses: number;
  knownBrands: string[];
  interpretation: string;
  zoneType: 'mixed' | 'specialized' | 'limited';
  urbanZone: ZoneClassification;
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
// ============================================================
// CLASIFICACIÓN DE ZONA URBANA
// Combina múltiples señales para inferir el tipo de zona
// ============================================================
function classifyUrbanZone(
  distribution: CategoryDistribution[],
  totalBusinesses: number,
  knownBrands: string[]
): ZoneClassification {
  const signals: string[] = [];
  let scores: Record<UrbanZoneType, number> = {
    industrial: 0,
    commercial: 0,
    corporate: 0,
    residential: 0,
    transit: 0,
    mixed: 0,
  };

  // Helper to get percentage for a category
  const getPct = (label: string): number => {
    const found = distribution.find(d => d.label === label);
    return found?.percentage || 0;
  };

  // ========== SIGNAL 1: Category Distribution ==========
  const industrialPct = getPct('Industria y Manufactura');
  const automotrizPct = getPct('Automotriz y Transporte');
  const comercioPct = getPct('Comercio Minorista');
  const alimentosPct = getPct('Alimentos y Bebidas');
  const financieroPct = getPct('Servicios Financieros');
  const profesionalPct = getPct('Servicios Profesionales');
  const entretenimientoPct = getPct('Entretenimiento');
  const saludPct = getPct('Salud');
  const educacionPct = getPct('Educación');
  const personalPct = getPct('Servicios Personales');

  // Industrial signals
  if (industrialPct >= 10) {
    scores.industrial += 30;
    signals.push(`Industria/Manufactura: ${industrialPct}%`);
  }
  if (automotrizPct >= 15 && alimentosPct < 15 && entretenimientoPct < 10) {
    scores.industrial += 20;
    scores.transit += 15;
    signals.push(`Alto Automotriz (${automotrizPct}%) con bajo entretenimiento`);
  }
  if (financieroPct >= 12 && comercioPct < 30 && alimentosPct < 15) {
    scores.industrial += 15;
    signals.push(`Servicios Financieros sin retail dominante`);
  }

  // Commercial signals
  if (comercioPct >= 35) {
    scores.commercial += 35;
    signals.push(`Comercio dominante: ${comercioPct}%`);
  }
  if (alimentosPct >= 20 && comercioPct >= 20) {
    scores.commercial += 20;
    signals.push(`Comercio + Alimentos fuerte`);
  }
  if (entretenimientoPct >= 8) {
    scores.commercial += 15;
    signals.push(`Entretenimiento presente: ${entretenimientoPct}%`);
  }

  // Corporate signals
  if (profesionalPct >= 15 && financieroPct >= 10) {
    scores.corporate += 30;
    signals.push(`Servicios profesionales + financieros`);
  }
  if (profesionalPct >= 20) {
    scores.corporate += 20;
    signals.push(`Alta concentración profesional: ${profesionalPct}%`);
  }

  // Residential signals
  if (personalPct >= 15 && comercioPct >= 20 && comercioPct < 40) {
    scores.residential += 20;
    signals.push(`Servicios personales + comercio de proximidad`);
  }
  if (saludPct >= 10 && educacionPct >= 5) {
    scores.residential += 15;
    signals.push(`Salud + Educación (servicios familiares)`);
  }

  // Transit signals
  if (automotrizPct >= 20) {
    scores.transit += 25;
    signals.push(`Automotriz dominante: ${automotrizPct}%`);
  }

  // ========== SIGNAL 2: Business Diversity ==========
  const categoriesWithData = distribution.filter(d => d.percentage >= 5).length;
  const diversityScore = categoriesWithData / 10; // 0-1
  
  if (diversityScore < 0.3) {
    // Low diversity = specialized zone
    if (industrialPct >= 8 || automotrizPct >= 15) {
      scores.industrial += 15;
      signals.push('Baja diversidad comercial');
    }
  } else if (diversityScore > 0.6) {
    scores.mixed += 20;
    scores.commercial += 10;
    signals.push('Alta diversidad comercial');
  }

  // ========== SIGNAL 3: Business Density ==========
  // Few businesses with certain patterns = industrial
  if (totalBusinesses < 30) {
    if (automotrizPct >= 10 || financieroPct >= 10) {
      scores.industrial += 20;
      signals.push(`Baja densidad (${totalBusinesses} negocios) con servicios de soporte`);
    } else {
      scores.residential += 15;
    }
  } else if (totalBusinesses > 80) {
    scores.commercial += 15;
    signals.push(`Alta densidad: ${totalBusinesses} negocios`);
  }

  // ========== SIGNAL 4: Brand Types ==========
  const bankBrands = ['BBVA', 'BANORTE', 'SANTANDER', 'HSBC', 'CITIBANAMEX', 'BANAMEX', 'SCOTIABANK', 'INBURSA'];
  const retailBrands = ['WALMART', 'SORIANA', 'CHEDRAUI', 'COSTCO', 'SAMS CLUB', 'LIVERPOOL', 'COPPEL'];
  const foodBrands = ['STARBUCKS', 'MCDONALDS', 'BURGER KING', 'DOMINOS', 'OXXO', 'VIPS'];
  
  const hasBanks = knownBrands.some(b => bankBrands.some(bb => b.toUpperCase().includes(bb)));
  const hasRetail = knownBrands.some(b => retailBrands.some(rb => b.toUpperCase().includes(rb)));
  const hasFood = knownBrands.some(b => foodBrands.some(fb => b.toUpperCase().includes(fb)));

  if (hasBanks && !hasRetail && !hasFood) {
    scores.industrial += 10;
    scores.corporate += 10;
    signals.push('Bancos sin retail/restaurantes');
  }
  if (hasRetail && hasFood) {
    scores.commercial += 15;
    signals.push('Presencia de retail y restaurantes');
  }

  // ========== SIGNAL 5: Industrial Pattern Detection ==========
  // Key pattern: High automotive/transport + financial services + low entertainment/food = Industrial
  const industrialPattern = 
    automotrizPct >= 12 && 
    (financieroPct >= 8 || comercioPct >= 30) && 
    entretenimientoPct < 8 && 
    alimentosPct < 18;
  
  if (industrialPattern) {
    scores.industrial += 25;
    signals.push('Patrón industrial detectado: servicios de soporte laboral');
  }

  // ========== Determine Winner ==========
  const maxScore = Math.max(...Object.values(scores));
  let winnerType: UrbanZoneType = 'mixed';
  
  // Find the type with highest score
  for (const [type, score] of Object.entries(scores)) {
    if (score === maxScore && score > 0) {
      winnerType = type as UrbanZoneType;
      break;
    }
  }

  // If top score is too low or tied, default to mixed
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? Math.min(0.95, maxScore / 100) : 0.3;

  // Override: If no clear winner (score < 25), it's mixed
  if (maxScore < 25) {
    winnerType = 'mixed';
  }

  return {
    type: winnerType,
    confidence,
    signals: signals.slice(0, 5), // Top 5 signals
  };
}

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
  
  // Clasificar zona urbana con múltiples señales
  const urbanZone = classifyUrbanZone(distribution, totalBusinesses, knownBrands);
  
  return {
    distribution,
    totalBusinesses,
    knownBrands,
    interpretation,
    zoneType,
    urbanZone,
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
    // Importante: si el cache viene de un formato viejo (sin distribution procesada), NO lo usamos.
    if (!force_refresh) {
      const { data: cached } = await supabase
        .from('inegi_demographics')
        .select('*')
        .eq('billboard_id', billboard_id)
        .single();

      if (cached) {
        const lastUpdated = new Date(cached.last_updated);
        const daysSinceUpdate = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);

        const raw = (cached as any).raw_denue_data as any;
        const hasDistribution = Array.isArray(raw?.distribution) && raw.distribution.length > 0;
        const hasUrbanZone = raw?.urban_zone?.type;

        if (daysSinceUpdate < 7 && hasDistribution && hasUrbanZone) {
          console.log('Returning cached INEGI data');
          return new Response(
            JSON.stringify({ data: cached, source: 'cache', cached_at: cached.last_updated }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        if (daysSinceUpdate < 7 && (!hasDistribution || !hasUrbanZone)) {
          console.log('Cached INEGI data found but missing processed data. Recomputing...');
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
        urban_zone: processed.urbanZone,
        sample: denueData.slice(0, 10),
      },
      last_updated: new Date().toISOString(),
    };

    console.log('Urban Zone Classification:', JSON.stringify(processed.urbanZone, null, 2));

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
