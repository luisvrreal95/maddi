import React from 'react';
import { 
  X, MapPin, Car, Building2, Users, Briefcase, ShoppingBag, Coffee, Fuel, Store, Clock, ArrowRight, GitCompare, Calendar, AlertCircle,
  Utensils, Wine, Pill, GraduationCap, Heart, Hotel, Dumbbell, Wrench, Scissors, Landmark, Film, MoreHorizontal, Smartphone, Shirt, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';

interface TrafficData {
  currentSpeed?: number;
  freeFlowSpeed?: number;
  confidence?: number;
}

interface INEGIData {
  socioeconomicLevel?: string;
  nearbyBusinessesCount?: number;
  dominantSector?: string;
  businessSectors?: Record<string, number>;
  audienceProfile?: string;
}

interface MaddiScorePopupProps {
  property: {
    id: string;
    title: string;
    address: string;
    city: string;
    price_per_month: number;
    image_url?: string;
    daily_impressions?: number;
    billboard_type?: string;
  };
  trafficData?: TrafficData;
  inegiData?: INEGIData;
  isLoadingTraffic?: boolean;
  isLoadingInegi?: boolean;
  onClose: () => void;
  onCompare?: (id: string) => void;
  isSelected?: boolean;
}

// Calcula el Maddi Score (0-100) - NSE temporalmente excluido hasta integración AGEB
function calculateMaddiScore(data: {
  trafficLevel: 'bajo' | 'medio' | 'alto';
  congestionRatio: number;
  nearbyBusinessesCount: number;
}): number {
  let score = 0;
  
  // Tráfico (40% - aumentado ya que NSE está deshabilitado)
  if (data.trafficLevel === 'alto') score += 40;
  else if (data.trafficLevel === 'medio') score += 25;
  else score += 12;
  
  // Ratio de congestión = mayor exposición (25%)
  score += Math.min(25, Math.round(data.congestionRatio * 25));
  
  // Actividad comercial (35% - aumentado ya que NSE está deshabilitado)
  if (data.nearbyBusinessesCount >= 100) score += 35;
  else if (data.nearbyBusinessesCount >= 50) score += 25;
  else if (data.nearbyBusinessesCount >= 20) score += 15;
  else score += 8;
  
  return Math.min(100, score);
}

function getTrafficLevel(currentSpeed?: number, freeFlowSpeed?: number): { level: 'bajo' | 'medio' | 'alto'; label: string; color: string } {
  if (!currentSpeed || !freeFlowSpeed) return { level: 'medio', label: 'Medio', color: 'hsl(var(--warning))' };
  
  const ratio = currentSpeed / freeFlowSpeed;
  if (ratio < 0.5) return { level: 'alto', label: 'Alto', color: 'hsl(var(--destructive))' };
  if (ratio < 0.8) return { level: 'medio', label: 'Medio', color: 'hsl(var(--warning))' };
  return { level: 'bajo', label: 'Bajo', color: 'hsl(var(--success))' };
}

function getCommercialActivityLevel(count: number): { level: string; color: string } {
  if (count >= 80) return { level: 'Muy activa', color: 'hsl(var(--success))' };
  if (count >= 30) return { level: 'Activa', color: 'hsl(var(--warning))' };
  return { level: 'Baja', color: 'hsl(var(--muted-foreground))' };
}

// NSE color function - temporarily disabled until AGEB integration
// function getNSEColor(level: string): string {
//   const normalized = level?.toLowerCase() || '';
//   if (normalized.includes('alto') && !normalized.includes('medio')) return 'hsl(var(--success))';
//   if (normalized.includes('medio-alto') || normalized.includes('medio alto')) return 'hsl(142 71% 45%)';
//   if (normalized.includes('medio')) return 'hsl(var(--warning))';
//   return 'hsl(var(--muted-foreground))';
// }

function getMaddiScoreColor(score: number): string {
  if (score >= 81) return 'hsl(var(--success))';
  if (score >= 61) return 'hsl(142 71% 45%)';
  if (score >= 41) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

function inferAudienceProfiles(dominantSector?: string, trafficLevel?: string): Array<{ icon: React.ElementType; label: string }> {
  const profiles: Array<{ icon: React.ElementType; label: string }> = [];
  const sector = dominantSector?.toLowerCase() || '';
  
  if (sector.includes('financier') || sector.includes('profesional') || sector.includes('corporativ')) {
    profiles.push({ icon: Briefcase, label: 'Oficinistas' });
  }
  if (sector.includes('comercio') || sector.includes('menudeo') || sector.includes('retail')) {
    profiles.push({ icon: ShoppingBag, label: 'Consumidores' });
  }
  if (sector.includes('alimento') || sector.includes('restaur') || sector.includes('alojamiento')) {
    profiles.push({ icon: Coffee, label: 'Familias' });
  }
  if (trafficLevel === 'alto' || trafficLevel === 'medio') {
    profiles.push({ icon: Car, label: 'Conductores' });
  }
  
  // Si no hay perfiles específicos, agregar genéricos
  if (profiles.length === 0) {
    profiles.push({ icon: Users, label: 'Público general' });
    profiles.push({ icon: Car, label: 'Conductores' });
  }
  
  return profiles.slice(0, 4);
}

// Complete icon mapping for all business categories
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Restaurantes y bares': Utensils,
  'Cafeterías': Coffee,
  'Bares y antros': Wine,
  'Gasolineras': Fuel,
  'Tiendas de abarrotes': Store,
  'Supermercados': ShoppingBag,
  'Tiendas de ropa': Shirt,
  'Tiendas departamentales': ShoppingBag,
  'Farmacias y perfumerías': Pill,
  'Ferreterías': Wrench,
  'Bancos y financieras': Landmark,
  'Seguros y fianzas': Landmark,
  'Hospitales': Heart,
  'Consultorios médicos': Heart,
  'Ópticas': Heart,
  'Laboratorios': Heart,
  'Escuelas y educación': GraduationCap,
  'Asilos y guarderías': GraduationCap,
  'Hoteles y alojamiento': Hotel,
  'Gimnasios': Dumbbell,
  'Belleza y spa': Scissors,
  'Cine y entretenimiento': Film,
  'Talleres mecánicos': Wrench,
  'Refacciones': Wrench,
  'Autolavados': Car,
  'Estacionamientos': Car,
  'Servicios legales': Briefcase,
  'Contabilidad': Briefcase,
  'Diseño y arquitectura': Building2,
  'Tecnología': Smartphone,
  'Telecomunicaciones': Smartphone,
  'Corporativos': Building2,
  'Comercio minorista': Store,
  'Comercio mayorista': Package,
  'Servicios profesionales': Briefcase,
  'Otros servicios': MoreHorizontal,
};

function categorizeBusinesses(sectors?: Record<string, number>): Array<{ icon: React.ElementType; label: string; count: number }> {
  if (!sectors) return [];
  
  const categories: Array<{ icon: React.ElementType; label: string; count: number }> = [];
  
  // Map all sectors directly - they now come properly categorized from the edge function
  Object.entries(sectors).forEach(([sector, count]) => {
    const icon = CATEGORY_ICONS[sector] || MoreHorizontal;
    categories.push({ icon, label: sector, count });
  });
  
  // Sort by count descending
  categories.sort((a, b) => b.count - a.count);
  
  return categories;
}

const MaddiScorePopup: React.FC<MaddiScorePopupProps> = ({
  property,
  trafficData,
  inegiData,
  isLoadingTraffic,
  isLoadingInegi,
  onClose,
  onCompare,
  isSelected = false,
}) => {
  const navigate = useNavigate();
  
  const trafficLevel = getTrafficLevel(trafficData?.currentSpeed, trafficData?.freeFlowSpeed);
  const congestionRatio = trafficData?.currentSpeed && trafficData?.freeFlowSpeed 
    ? 1 - (trafficData.currentSpeed / trafficData.freeFlowSpeed)
    : 0.5;
  
  const maddiScore = calculateMaddiScore({
    trafficLevel: trafficLevel.level,
    congestionRatio,
    nearbyBusinessesCount: inegiData?.nearbyBusinessesCount || 0,
  });
  
  const commercialActivity = getCommercialActivityLevel(inegiData?.nearbyBusinessesCount || 0);
  const maddiColor = getMaddiScoreColor(maddiScore);
  const audienceProfiles = inferAudienceProfiles(inegiData?.dominantSector, trafficLevel.level);
  const businessCategories = categorizeBusinesses(inegiData?.businessSectors);
  
  const handleViewDetails = () => {
    navigate(`/billboard/${property.id}`);
  };
  
  const handleCompare = () => {
    onCompare?.(property.id);
  };
  
  const handleBook = () => {
    navigate(`/billboard/${property.id}?book=true`);
  };

  return (
    <div className="bg-card rounded-xl shadow-xl border border-border overflow-hidden w-[340px] max-h-[85vh] overflow-y-auto">
      {/* Header con imagen */}
      <div className="relative h-32">
        <img 
          src={property.image_url || '/placeholder.svg'} 
          alt={property.title}
          className="w-full h-full object-cover"
        />
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <Badge className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm text-foreground">
          {property.billboard_type || 'Espectacular'}
        </Badge>
      </div>
      
      {/* Contenido principal */}
      <div className="p-4 space-y-4">
        {/* Título y ubicación */}
        <div>
          <h3 className="font-semibold text-lg text-foreground line-clamp-1">{property.title}</h3>
          <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="line-clamp-1">{property.address}, {property.city}</span>
          </div>
        </div>
        
        {/* Maddi Score */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">MADDI SCORE</span>
            <span className="text-2xl font-bold" style={{ color: maddiColor }}>{maddiScore}</span>
          </div>
          <Progress 
            value={maddiScore} 
            className="h-2"
            style={{ 
              ['--progress-background' as string]: maddiColor,
            }}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Estimaciones basadas en tráfico y actividad económica
          </p>
        </div>
        
        <Separator />
        
        {/* Tráfico vehicular */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Tráfico Vehicular</span>
          </div>
          
          {isLoadingTraffic ? (
            <div className="animate-pulse h-16 bg-muted rounded-lg" />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <div 
                  className="w-3 h-3 rounded-full mx-auto mb-1"
                  style={{ backgroundColor: trafficLevel.color }}
                />
                <span className="text-xs font-medium">{trafficLevel.label}</span>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <Clock className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                <span className="text-xs">7-9AM, 5-8PM</span>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <MapPin className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                <span className="text-xs">Principal</span>
              </div>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Datos de movilidad estimados con TomTom
          </p>
        </div>
        
        <Separator />
        
        {/* Actividad comercial */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Actividad Comercial (500m)</span>
            </div>
            <Badge 
              variant="outline" 
              className="text-xs"
              style={{ borderColor: commercialActivity.color, color: commercialActivity.color }}
            >
              {commercialActivity.level}
            </Badge>
          </div>
          
          {isLoadingInegi ? (
            <div className="animate-pulse h-20 bg-muted rounded-lg" />
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-2">
                {inegiData?.nearbyBusinessesCount || 0} establecimientos cercanos
              </p>
              {businessCategories.length > 0 ? (
                <ScrollArea className={businessCategories.length > 6 ? 'h-32' : ''}>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {businessCategories.map((cat, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-sm">
                        <cat.icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="truncate text-xs">
                          {cat.label.replace(' y ', '/').replace('Tiendas de ', '').replace(' y alojamiento', '')}: <strong>{cat.count}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Analizando establecimientos cercanos...
                </p>
              )}
            </>
          )}
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Basado en establecimientos – INEGI (DENUE)
          </p>
        </div>
        
        <Separator />
        
        {/* Perfil de audiencia */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Perfil de Audiencia Inferido</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {audienceProfiles.map((profile, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs gap-1">
                <profile.icon className="w-3 h-3" />
                {profile.label}
              </Badge>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Perfil inferido según movilidad y tipo de negocios cercanos
          </p>
        </div>
        
        <Separator />
        
        {/* Precio (NSE temporarily disabled) */}
        <div className="flex items-center justify-end">
          <div className="text-right">
            <span className="text-xl font-bold text-foreground">
              ${property.price_per_month?.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground">/mes</span>
          </div>
        </div>
        
        {/* Botones de acción */}
        <div className="flex gap-2">
          <Button 
            variant={isSelected ? "secondary" : "outline"} 
            size="sm" 
            className="flex-1 gap-1"
            onClick={handleCompare}
          >
            <GitCompare className="w-3.5 h-3.5" />
            {isSelected ? 'Comparando' : 'Comparar'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 gap-1"
            onClick={handleViewDetails}
          >
            Detalles
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
          <Button 
            size="sm" 
            className="flex-1 gap-1"
            onClick={handleBook}
          >
            <Calendar className="w-3.5 h-3.5" />
            Reservar
          </Button>
        </div>
        
        {/* Disclaimer */}
        <div className="bg-muted/30 rounded-lg p-2.5 flex gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Los indicadores mostrados son estimaciones basadas en datos de movilidad (TomTom) y actividad económica (INEGI). No representan mediciones oficiales exactas.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MaddiScorePopup;
