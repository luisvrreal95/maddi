import React, { useState } from 'react';
import { 
  X, MapPin, Car, Building2, Users, Briefcase, ShoppingBag, Coffee, Fuel, Store, Clock, ArrowRight, GitCompare, Calendar, AlertCircle,
  Utensils, Wine, Pill, GraduationCap, Heart, Hotel, Dumbbell, Wrench, Scissors, Landmark, Film, MoreHorizontal, Smartphone, Shirt, Package,
  BarChart3
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
  if (sector.includes('financier') || sector.includes('profesional')) profiles.push({ icon: Briefcase, label: 'Oficinistas' });
  if (sector.includes('comercio') || sector.includes('menudeo')) profiles.push({ icon: ShoppingBag, label: 'Consumidores' });
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
  'Otros servicios': MoreHorizontal,
};

function categorizeBusinesses(sectors?: Record<string, number>): Array<{ icon: React.ElementType; label: string; count: number }> {
  if (!sectors) return [];
  return Object.entries(sectors)
    .map(([sector, count]) => ({ icon: CATEGORY_ICONS[sector] || MoreHorizontal, label: sector, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
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
  const businessCategories = categorizeBusinesses(inegiData?.businessSectors);

  return (
    <div className="bg-card rounded-xl shadow-xl border border-border overflow-hidden w-[320px]">
      {/* Header */}
      <div className="relative h-28">
        <img src={property.image_url || '/placeholder.svg'} alt={property.title} className="w-full h-full object-cover" />
        <button onClick={onClose} className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background">
          <X className="w-4 h-4" />
        </button>
        <Badge className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-sm text-foreground text-xs">
          {property.billboard_type || 'Espectacular'}
        </Badge>
      </div>
      
      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Title */}
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1">{property.title}</h3>
          <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
            <MapPin className="w-3 h-3" />
            <span className="line-clamp-1">{property.address}</span>
          </div>
        </div>
        
        {/* Maddi Score */}
        <div className="bg-muted/50 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-muted-foreground">MADDI SCORE</span>
            <Progress value={maddiScore} className="h-1.5 w-24 mt-1" />
          </div>
          <span className="text-2xl font-bold" style={{ color: maddiColor }}>{maddiScore}</span>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-8">
            <TabsTrigger value="zona" className="text-xs px-1">Zona</TabsTrigger>
            <TabsTrigger value="trafico" className="text-xs px-1">Tráfico</TabsTrigger>
            <TabsTrigger value="comercio" className="text-xs px-1">Comercio</TabsTrigger>
            <TabsTrigger value="audiencia" className="text-xs px-1">Audiencia</TabsTrigger>
          </TabsList>
          
          <TabsContent value="zona" className="mt-2 space-y-2 min-h-[100px]">
            {inegiData?.socioeconomicLevel && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">Nivel Socioeconómico</span>
                  <Badge variant="outline" className="text-xs" style={{ borderColor: getNSEColor(inegiData.socioeconomicLevel), color: getNSEColor(inegiData.socioeconomicLevel) }}>
                    {getNSELabel(inegiData.socioeconomicLevel)}
                  </Badge>
                </div>
                <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${getNSEPosition(inegiData.socioeconomicLevel)}%`, backgroundColor: getNSEColor(inegiData.socioeconomicLevel) }} />
                </div>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              <Building2 className="w-3 h-3 inline mr-1" />
              {inegiData?.nearbyBusinessesCount || 0} negocios en 500m
            </div>
            <p className="text-[10px] text-muted-foreground">Fuente: INEGI (DENUE)</p>
          </TabsContent>
          
          <TabsContent value="trafico" className="mt-2 space-y-2 min-h-[100px]">
            {isLoadingTraffic ? (
              <div className="animate-pulse h-16 bg-muted rounded" />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: trafficLevel.color }} />
                  <span className="text-sm font-medium">Tráfico {trafficLevel.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <Clock className="w-3 h-3 mx-auto mb-1 text-muted-foreground" />
                    <span>Pico: 7-9AM</span>
                  </div>
                  <div className="bg-muted/50 rounded p-2 text-center">
                    <Car className="w-3 h-3 mx-auto mb-1 text-muted-foreground" />
                    <span>{property.daily_impressions?.toLocaleString() || 'N/A'}/día</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">Fuente: TomTom</p>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="comercio" className="mt-2 space-y-2 min-h-[100px]">
            {isLoadingInegi ? (
              <div className="animate-pulse h-16 bg-muted rounded" />
            ) : businessCategories.length > 0 ? (
              <div className="grid grid-cols-2 gap-1">
                {businessCategories.map((cat, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-xs">
                    <cat.icon className="w-3 h-3 text-muted-foreground" />
                    <span className="truncate">{cat.label.replace('Tiendas de ', '')}: <strong>{cat.count}</strong></span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sin datos comerciales</p>
            )}
            <p className="text-[10px] text-muted-foreground">Fuente: INEGI (DENUE)</p>
          </TabsContent>
          
          <TabsContent value="audiencia" className="mt-2 space-y-2 min-h-[100px]">
            <div className="flex flex-wrap gap-1.5">
              {audienceProfiles.map((profile, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs gap-1">
                  <profile.icon className="w-3 h-3" />{profile.label}
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">Perfil inferido según movilidad y negocios</p>
          </TabsContent>
        </Tabs>
        
        {/* Price & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <span className="text-lg font-bold">${property.price_per_month?.toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">/mes</span>
          </div>
          <div className="flex gap-1.5">
            <Button variant={isSelected ? "secondary" : "outline"} size="sm" className="h-8 px-2" onClick={() => onCompare?.(property.id)}>
              <GitCompare className="w-3.5 h-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => navigate(`/billboard/${property.id}`)}>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" className="h-8" onClick={() => navigate(`/billboard/${property.id}?book=true`)}>
              <Calendar className="w-3.5 h-3.5 mr-1" />Reservar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaddiScorePopup;
