import React, { useState } from 'react';
import { 
  X, MapPin, Car, Building2, Users, Briefcase, ShoppingBag, Coffee, Fuel, Store, Clock, ArrowRight, GitCompare, Calendar,
  Utensils, Wine, Pill, GraduationCap, Heart, Hotel, Dumbbell, Wrench, Scissors, Landmark, Film, MoreHorizontal, Smartphone, Shirt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  commercialEnvironment?: string;
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

function calculateMaddiScore(data: {
  trafficLevel: 'bajo' | 'medio' | 'alto';
  congestionRatio: number;
  nearbyBusinessesCount: number;
}): number {
  let score = 0;
  if (data.trafficLevel === 'alto') score += 40;
  else if (data.trafficLevel === 'medio') score += 25;
  else score += 12;
  score += Math.min(25, Math.round(data.congestionRatio * 25));
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

function getNSEColor(level: string): string {
  const normalized = level?.toLowerCase() || '';
  if (normalized.includes('alto') && !normalized.includes('medio')) return 'hsl(var(--success))';
  if (normalized.includes('medio-alto')) return 'hsl(142 71% 45%)';
  if (normalized.includes('medio')) return 'hsl(var(--warning))';
  if (normalized.includes('bajo')) return 'hsl(var(--destructive))';
  return 'hsl(var(--muted-foreground))';
}

function getNSEPosition(level: string): number {
  const normalized = level?.toLowerCase() || '';
  if (normalized.includes('alto') && !normalized.includes('medio')) return 100;
  if (normalized.includes('medio-alto')) return 75;
  if (normalized.includes('medio') && !normalized.includes('alto')) return 50;
  if (normalized.includes('bajo')) return 25;
  return 50;
}

function getNSELabel(level: string): string {
  const normalized = level?.toLowerCase() || '';
  if (normalized.includes('alto') && !normalized.includes('medio')) return 'Alto';
  if (normalized.includes('medio-alto')) return 'Medio-Alto';
  if (normalized.includes('medio') && !normalized.includes('alto')) return 'Medio';
  if (normalized.includes('bajo')) return 'Bajo';
  return 'Sin datos';
}

function getMaddiScoreColor(score: number): string {
  if (score >= 81) return 'hsl(var(--success))';
  if (score >= 61) return 'hsl(142 71% 45%)';
  if (score >= 41) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

function inferAudienceProfiles(dominantSector?: string, trafficLevel?: string): Array<{ icon: React.ElementType; label: string }> {
  const profiles: Array<{ icon: React.ElementType; label: string }> = [];
  const sector = dominantSector?.toLowerCase() || '';
  if (sector.includes('financier') || sector.includes('profesional') || sector.includes('corporativo')) profiles.push({ icon: Briefcase, label: 'Oficinistas' });
  if (sector.includes('comercio') || sector.includes('menudeo') || sector.includes('tienda')) profiles.push({ icon: ShoppingBag, label: 'Consumidores' });
  if (sector.includes('alimento') || sector.includes('restaur')) profiles.push({ icon: Coffee, label: 'Familias' });
  if (trafficLevel === 'alto' || trafficLevel === 'medio') profiles.push({ icon: Car, label: 'Conductores' });
  if (profiles.length === 0) {
    profiles.push({ icon: Users, label: 'Público general' });
    profiles.push({ icon: Car, label: 'Conductores' });
  }
  return profiles.slice(0, 4);
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Restaurantes y bares': Utensils, 'Cafeterías': Coffee, 'Bares y antros': Wine, 'Gasolineras': Fuel,
  'Tiendas de abarrotes': Store, 'Supermercados': ShoppingBag, 'Tiendas de ropa': Shirt,
  'Farmacias y perfumerías': Pill, 'Ferreterías': Wrench, 'Bancos y financieras': Landmark,
  'Hospitales': Heart, 'Consultorios médicos': Heart, 'Escuelas y educación': GraduationCap,
  'Hoteles y alojamiento': Hotel, 'Gimnasios': Dumbbell, 'Belleza y spa': Scissors,
  'Cine y entretenimiento': Film, 'Talleres mecánicos': Wrench, 'Tecnología': Smartphone,
  'Corporativos': Building2, 'Comercio minorista': Store, 'Servicios profesionales': Briefcase,
  'Comercio mayorista': Store, 'Alimentos y hospedaje': Utensils, 'Servicios de salud': Heart,
  'Educación': GraduationCap, 'Entretenimiento': Film, 'Otros servicios': MoreHorizontal,
  'Manufactura': Building2, 'Transporte': Car, 'Servicios financieros': Landmark,
};

// Get top 3 categories excluding generic ones
function getTop3Categories(sectors?: Record<string, number>): Array<{ label: string; count: number; icon: React.ElementType }> {
  if (!sectors) return [];
  
  return Object.entries(sectors)
    .filter(([sector]) => !sector.toLowerCase().includes('otros'))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([sector, count]) => ({
      label: sector,
      count,
      icon: CATEGORY_ICONS[sector] || MoreHorizontal,
    }));
}

// Generate interpretive text based on business data
function getZoneInterpretation(sectors?: Record<string, number>, totalBusinesses?: number): string {
  if (!sectors || !totalBusinesses) return 'Sin información comercial';
  
  const entries = Object.entries(sectors).sort((a, b) => b[1] - a[1]);
  const top = entries[0];
  
  if (!top) return 'Zona sin clasificar';
  
  const [sector, count] = top;
  const percentage = Math.round((count / totalBusinesses) * 100);
  
  // High concentration in one sector
  if (percentage > 30) {
    if (sector.includes('Restaurante') || sector.includes('Alimento')) return 'Zona gastronómica activa';
    if (sector.includes('Comercio') || sector.includes('Tienda')) return 'Zona de comercio local activa';
    if (sector.includes('financier') || sector.includes('Corporat')) return 'Zona corporativa y de negocios';
    if (sector.includes('Salud') || sector.includes('médico')) return 'Zona de servicios de salud';
    if (sector.includes('Educación') || sector.includes('Escuela')) return 'Zona educativa';
  }
  
  // Mixed zone
  if (totalBusinesses > 100) return 'Alta presencia de servicios y consumo';
  if (totalBusinesses > 50) return 'Entorno comercial mixto';
  return 'Actividad comercial moderada';
}

const MaddiScorePopup: React.FC<MaddiScorePopupProps> = ({
  property, trafficData, inegiData, isLoadingTraffic, isLoadingInegi, onClose, onCompare, isSelected = false,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('zona');
  
  const trafficLevel = getTrafficLevel(trafficData?.currentSpeed, trafficData?.freeFlowSpeed);
  const congestionRatio = trafficData?.currentSpeed && trafficData?.freeFlowSpeed 
    ? 1 - (trafficData.currentSpeed / trafficData.freeFlowSpeed) : 0.5;
  
  const maddiScore = calculateMaddiScore({
    trafficLevel: trafficLevel.level, congestionRatio,
    nearbyBusinessesCount: inegiData?.nearbyBusinessesCount || 0,
  });
  
  const maddiColor = getMaddiScoreColor(maddiScore);
  const audienceProfiles = inferAudienceProfiles(inegiData?.dominantSector, trafficLevel.level);
  const top3Categories = getTop3Categories(inegiData?.businessSectors);
  const zoneInterpretation = getZoneInterpretation(inegiData?.businessSectors, inegiData?.nearbyBusinessesCount);

  return (
    <div className="bg-card rounded-xl shadow-xl border border-border overflow-hidden w-[320px] max-h-[85vh] flex flex-col">
      {/* Header - Fixed */}
      <div className="relative h-24 flex-shrink-0">
        <img src={property.image_url || '/placeholder.svg'} alt={property.title} className="w-full h-full object-cover" />
        <button onClick={onClose} className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background">
          <X className="w-4 h-4" />
        </button>
        <Badge className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm text-foreground text-xs">
          {property.billboard_type || 'Espectacular'}
        </Badge>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Title */}
        <div>
          <h3 className="font-semibold text-foreground text-sm line-clamp-1">{property.title}</h3>
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <MapPin className="w-3 h-3" />
            <span className="line-clamp-1">{property.address}</span>
          </div>
        </div>
        
        {/* Maddi Score - Compact */}
        <div className="bg-muted/50 rounded-lg p-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium text-muted-foreground uppercase">MADDI SCORE</span>
            <Progress value={maddiScore} className="h-1.5 w-20 mt-0.5" />
          </div>
          <span className="text-xl font-bold" style={{ color: maddiColor }}>{maddiScore}</span>
        </div>

        {/* Tabs - Compact */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-7">
            <TabsTrigger value="zona" className="text-[10px] px-1">Zona</TabsTrigger>
            <TabsTrigger value="trafico" className="text-[10px] px-1">Tráfico</TabsTrigger>
            <TabsTrigger value="comercio" className="text-[10px] px-1">Comercio</TabsTrigger>
            <TabsTrigger value="audiencia" className="text-[10px] px-1">Audiencia</TabsTrigger>
          </TabsList>
          
          <TabsContent value="zona" className="mt-2 space-y-2">
            {inegiData?.socioeconomicLevel && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">Nivel Socioeconómico</span>
                  <Badge variant="outline" className="text-[10px] h-5" style={{ borderColor: getNSEColor(inegiData.socioeconomicLevel), color: getNSEColor(inegiData.socioeconomicLevel) }}>
                    {getNSELabel(inegiData.socioeconomicLevel)}
                  </Badge>
                </div>
                <div className="relative h-1 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${getNSEPosition(inegiData.socioeconomicLevel)}%`, backgroundColor: getNSEColor(inegiData.socioeconomicLevel) }} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="w-3 h-3" />
              <span>{inegiData?.nearbyBusinessesCount || 0} negocios en 500m</span>
            </div>
            <p className="text-xs font-medium text-primary">{zoneInterpretation}</p>
            <p className="text-[9px] text-muted-foreground">Fuente: INEGI DENUE (actividad económica)</p>
          </TabsContent>
          
          <TabsContent value="trafico" className="mt-2 space-y-2">
            {isLoadingTraffic ? (
              <div className="animate-pulse h-12 bg-muted rounded" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: trafficLevel.color }} />
                  <span className="text-xs font-medium">Tráfico {trafficLevel.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/50 rounded p-1.5 text-center">
                    <Clock className="w-3 h-3 mx-auto mb-0.5 text-muted-foreground" />
                    <span className="text-[10px]">Pico: 7-9AM</span>
                  </div>
                  <div className="bg-muted/50 rounded p-1.5 text-center">
                    <Car className="w-3 h-3 mx-auto mb-0.5 text-muted-foreground" />
                    <span className="text-[10px]">{property.daily_impressions?.toLocaleString() || 'N/A'}/día</span>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground">Fuente: TomTom</p>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="comercio" className="mt-2 space-y-2">
            {isLoadingInegi ? (
              <div className="animate-pulse h-12 bg-muted rounded" />
            ) : top3Categories.length > 0 ? (
              <>
                <p className="text-[10px] font-medium text-muted-foreground uppercase">Top categorías</p>
                <div className="space-y-1">
                  {top3Categories.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1">
                      <div className="flex items-center gap-1.5">
                        <cat.icon className="w-3 h-3 text-primary" />
                        <span className="truncate max-w-[160px]">{cat.label}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{cat.count}</Badge>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground">Fuente: INEGI DENUE (actividad económica)</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Sin datos comerciales</p>
            )}
          </TabsContent>
          
          <TabsContent value="audiencia" className="mt-2 space-y-2">
            <div className="flex flex-wrap gap-1">
              {audienceProfiles.map((profile, idx) => (
                <Badge key={idx} variant="secondary" className="text-[10px] gap-1 h-5">
                  <profile.icon className="w-2.5 h-2.5" />{profile.label}
                </Badge>
              ))}
            </div>
            {inegiData?.commercialEnvironment && (
              <p className="text-xs text-muted-foreground">{inegiData.commercialEnvironment}</p>
            )}
            <p className="text-[9px] text-muted-foreground">Perfil inferido según movilidad y negocios</p>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Footer - Fixed */}
      <div className="flex-shrink-0 p-3 pt-2 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-base font-bold">${property.price_per_month?.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground">/mes</span>
          </div>
          <Button 
            variant={isSelected ? "secondary" : "outline"} 
            size="sm" 
            className="h-7 px-2 text-[10px]" 
            onClick={() => onCompare?.(property.id)}
          >
            <GitCompare className="w-3 h-3 mr-1" />Comparar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 px-2 text-[10px]" 
            onClick={() => navigate(`/billboard/${property.id}`)}
          >
            <ArrowRight className="w-3 h-3 mr-1" />Detalles
          </Button>
          <Button 
            size="sm" 
            className="h-7 px-2 text-[10px]" 
            onClick={() => navigate(`/billboard/${property.id}?book=true`)}
          >
            <Calendar className="w-3 h-3 mr-1" />Reservar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MaddiScorePopup;