import React, { useState } from 'react';
import { 
  X, MapPin, Car, Building2, Users, Briefcase, ShoppingBag, Coffee, Clock, ArrowRight, GitCompare, Calendar,
  Utensils, Heart, GraduationCap, Scissors, Landmark, Film, Factory, Truck
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

interface CategoryDistribution {
  label: string;
  percentage: number;
  count: number;
}

interface INEGIData {
  socioeconomicLevel?: string;
  nearbyBusinessesCount?: number;
  dominantSector?: string;
  businessSectors?: Record<string, number>;
  audienceProfile?: string;
  commercialEnvironment?: string;
  rawDenueData?: {
    distribution?: CategoryDistribution[];
    known_brands?: string[];
    interpretation?: string;
    zone_type?: 'mixed' | 'specialized' | 'limited';
  };
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

// Display config for categories
const CATEGORY_DISPLAY: Record<string, { emoji: string; icon: React.ElementType }> = {
  'Alimentos y Bebidas': { emoji: '🍔', icon: Utensils },
  'Comercio Minorista': { emoji: '🛒', icon: ShoppingBag },
  'Servicios Financieros': { emoji: '🏦', icon: Landmark },
  'Salud': { emoji: '🏥', icon: Heart },
  'Servicios Personales': { emoji: '💇', icon: Scissors },
  'Educación': { emoji: '🎓', icon: GraduationCap },
  'Servicios Profesionales': { emoji: '🏢', icon: Building2 },
  'Entretenimiento': { emoji: '🎬', icon: Film },
  'Automotriz y Transporte': { emoji: '🚗', icon: Truck },
  'Industria y Manufactura': { emoji: '🏭', icon: Factory },
};

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
  if (sector.includes('comercio') || sector.includes('minorista')) profiles.push({ icon: ShoppingBag, label: 'Consumidores' });
  if (sector.includes('alimento') || sector.includes('bebida')) profiles.push({ icon: Coffee, label: 'Familias' });
  if (trafficLevel === 'alto' || trafficLevel === 'medio') profiles.push({ icon: Car, label: 'Conductores' });
  if (profiles.length === 0) {
    profiles.push({ icon: Users, label: 'Público general' });
    profiles.push({ icon: Car, label: 'Conductores' });
  }
  return profiles.slice(0, 4);
}

// Get top 3 categories from distribution
function getTopCategories(inegiData?: INEGIData): CategoryDistribution[] {
  const distribution = inegiData?.rawDenueData?.distribution;
  if (distribution && distribution.length > 0) {
    return distribution.slice(0, 3);
  }
  return [];
}

// Get known brands
function getKnownBrands(inegiData?: INEGIData): string[] {
  return inegiData?.rawDenueData?.known_brands || [];
}

// Get interpretation text
function getInterpretation(inegiData?: INEGIData): string {
  return inegiData?.rawDenueData?.interpretation || 'Sin información comercial';
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
  const topCategories = getTopCategories(inegiData);
  const knownBrands = getKnownBrands(inegiData);
  const interpretation = getInterpretation(inegiData);

  return (
    <div className="bg-card rounded-xl shadow-xl border border-border overflow-hidden w-[360px] max-h-[90vh] flex flex-col">
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
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
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
          <TabsList className="grid w-full grid-cols-4 h-8 p-0.5">
            <TabsTrigger value="zona" className="text-[11px] px-2 h-full">Zona</TabsTrigger>
            <TabsTrigger value="trafico" className="text-[11px] px-2 h-full">Tráfico</TabsTrigger>
            <TabsTrigger value="comercio" className="text-[11px] px-2 h-full">Comercio</TabsTrigger>
            <TabsTrigger value="audiencia" className="text-[11px] px-2 h-full">Audiencia</TabsTrigger>
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
                <div className="relative h-2 bg-gradient-to-r from-red-400 via-amber-400 to-emerald-400 rounded-full overflow-visible">
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-foreground shadow-md transition-all"
                    style={{ left: `calc(${getNSEPosition(inegiData.socioeconomicLevel)}% - 6px)` }}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="w-3 h-3" />
              <span>{inegiData?.nearbyBusinessesCount || 0} negocios en 500m</span>
            </div>
            <p className="text-xs font-medium text-primary">{interpretation}</p>
            
            {/* Known Brands in Zona tab */}
            {knownBrands.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {knownBrands.slice(0, 5).map((brand, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[9px] h-4 px-1.5">
                    {brand}
                  </Badge>
                ))}
              </div>
            )}
            
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
            ) : topCategories.length > 0 ? (
              <>
                {/* Top 3 categories with bars */}
                <div className="space-y-1.5">
                  {topCategories.map((cat, idx) => {
                    const display = CATEGORY_DISPLAY[cat.label] || { emoji: '📦', icon: Building2 };
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span>{display.emoji}</span>
                          <span className="truncate">{cat.label}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${cat.percentage}%` }} 
                            />
                          </div>
                          <span className="text-muted-foreground w-8 text-right">{cat.percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Interpretation text */}
                <p className="text-xs text-primary font-medium">{interpretation}</p>
                
                {/* Known Brands as badges */}
                {knownBrands.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Marcas detectadas:</p>
                    <div className="flex flex-wrap gap-1">
                      {knownBrands.slice(0, 6).map((brand, idx) => (
                        <Badge key={idx} variant="outline" className="text-[9px] h-4 px-1.5">
                          {brand}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-[9px] text-muted-foreground">Fuente: INEGI DENUE</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Sin datos comerciales disponibles</p>
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
      
      {/* Footer - Fixed with prominent price */}
      <div className="flex-shrink-0 p-3 border-t border-border bg-card space-y-2">
        {/* Price - Prominent */}
        <div className="text-center">
          <span className="text-2xl font-bold text-foreground">${property.price_per_month?.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground ml-1">MXN/mes</span>
        </div>
        
        {/* Secondary Buttons */}
        <div className="flex gap-2">
          <Button 
            variant={isSelected ? "secondary" : "outline"} 
            size="sm" 
            className="flex-1 h-8 text-xs" 
            onClick={() => onCompare?.(property.id)}
          >
            <GitCompare className="w-3.5 h-3.5 mr-1" />Comparar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-8 text-xs" 
            onClick={() => navigate(`/billboard/${property.id}`)}
          >
            <ArrowRight className="w-3.5 h-3.5 mr-1" />Detalles
          </Button>
        </div>
        
        {/* Primary Button */}
        <Button 
          size="sm" 
          className="w-full h-9" 
          onClick={() => navigate(`/billboard/${property.id}?book=true`)}
        >
          <Calendar className="w-4 h-4 mr-2" />Reservar Ahora
        </Button>
      </div>
    </div>
  );
};

export default MaddiScorePopup;
