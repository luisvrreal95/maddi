import React from 'react';
import { 
  X, MapPin, Car, Building2, Clock, ArrowRight, GitCompare, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ZoneTypeIndicator, UrbanZoneType } from '@/components/billboard/ZoneTypeIndicator';

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

interface UrbanZoneData {
  type: UrbanZoneType;
  confidence: number;
  signals: string[];
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
    urban_zone?: UrbanZoneData;
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

function getNSELabel(level: string): string {
  const normalized = level?.toLowerCase() || '';
  if (normalized.includes('alto') && !normalized.includes('medio')) return 'Alto';
  if (normalized.includes('medio-alto')) return 'Medio-Alto';
  if (normalized.includes('medio') && !normalized.includes('alto')) return 'Medio';
  if (normalized.includes('bajo')) return 'Bajo';
  return 'Sin datos';
}

// Get urban zone classification
function getUrbanZone(inegiData?: INEGIData): UrbanZoneData | undefined {
  return inegiData?.rawDenueData?.urban_zone;
}

const MaddiScorePopup: React.FC<MaddiScorePopupProps> = ({
  property, trafficData, inegiData, isLoadingTraffic, isLoadingInegi, onClose, onCompare, isSelected = false,
}) => {
  const navigate = useNavigate();
  
  const trafficLevel = getTrafficLevel(trafficData?.currentSpeed, trafficData?.freeFlowSpeed);
  const urbanZone = getUrbanZone(inegiData);

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
      
      {/* Scrollable Content - Simplified: Only Traffic and Zone */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {/* Title */}
        <div>
          <h3 className="font-semibold text-foreground text-sm line-clamp-1">{property.title}</h3>
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <MapPin className="w-3 h-3" />
            <span className="line-clamp-1">{property.address}</span>
          </div>
        </div>
        
        {/* Traffic Info - Compact */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Tráfico</span>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: trafficLevel.color }} />
              <span className="text-xs font-medium">{trafficLevel.label}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Car className="w-3 h-3" />
              <span>{property.daily_impressions?.toLocaleString() || 'N/A'} imp/día</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Pico: 7-9AM</span>
            </div>
          </div>
        </div>
        
        {/* Zone Info - Compact */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-foreground">Zona</span>
            {urbanZone && (
              <ZoneTypeIndicator 
                zoneType={urbanZone.type}
                variant="compact"
                showTooltip={false}
              />
            )}
          </div>
          {inegiData?.socioeconomicLevel && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">NSE:</span>
              <Badge variant="outline" className="text-[10px] h-5" style={{ borderColor: getNSEColor(inegiData.socioeconomicLevel), color: getNSEColor(inegiData.socioeconomicLevel) }}>
                {getNSELabel(inegiData.socioeconomicLevel)}
              </Badge>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="w-3 h-3" />
            <span>{inegiData?.nearbyBusinessesCount || 0} negocios en 500m</span>
          </div>
        </div>
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
