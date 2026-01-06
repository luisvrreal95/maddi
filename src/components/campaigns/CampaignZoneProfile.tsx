import React from 'react';
import { Building2, MapPin, Info, BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface CampaignZoneProfileProps {
  socioeconomicLevel?: string | null;
  commercialEnvironment?: string | null;
  nearbyBusinessesCount?: number | null;
}

function getNSEPosition(level: string): number {
  const normalized = level?.toLowerCase() || '';
  if (normalized.includes('alto') && !normalized.includes('medio')) return 100;
  if (normalized.includes('medio-alto') || normalized.includes('medio alto')) return 75;
  if (normalized.includes('medio') && !normalized.includes('alto')) return 50;
  if (normalized.includes('bajo')) return 25;
  return 50;
}

function getNSELabel(level: string): string {
  const normalized = level?.toLowerCase() || '';
  if (normalized.includes('alto') && !normalized.includes('medio')) return 'Alto';
  if (normalized.includes('medio-alto') || normalized.includes('medio alto')) return 'Medio-Alto';
  if (normalized.includes('medio') && !normalized.includes('alto')) return 'Medio';
  if (normalized.includes('bajo')) return 'Bajo';
  return 'Sin datos';
}

function getNSEColor(level: string): string {
  const normalized = level?.toLowerCase() || '';
  if (normalized.includes('alto') && !normalized.includes('medio')) return 'hsl(var(--success))';
  if (normalized.includes('medio-alto') || normalized.includes('medio alto')) return 'hsl(142 71% 45%)';
  if (normalized.includes('medio') && !normalized.includes('alto')) return 'hsl(var(--warning))';
  if (normalized.includes('bajo')) return 'hsl(var(--destructive))';
  return 'hsl(var(--muted-foreground))';
}

const CampaignZoneProfile: React.FC<CampaignZoneProfileProps> = ({
  socioeconomicLevel,
  commercialEnvironment,
  nearbyBusinessesCount,
}) => {
  const nsePosition = socioeconomicLevel ? getNSEPosition(socioeconomicLevel) : 50;
  const nseLabel = socioeconomicLevel ? getNSELabel(socioeconomicLevel) : 'Sin datos';
  const nseColor = socioeconomicLevel ? getNSEColor(socioeconomicLevel) : 'hsl(var(--muted-foreground))';

  return (
    <Card className="p-5 bg-card">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-muted-foreground" />
        Perfil de la Zona
      </h3>

      {/* Socioeconomic Level */}
      <div className="mb-5">
        <p className="text-sm text-muted-foreground mb-3">Nivel Socioeconómico</p>
        <div className="relative">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Bajo</span>
            <span>Medio</span>
            <span>Alto</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="absolute h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${nsePosition}%`,
                backgroundColor: nseColor,
              }}
            />
          </div>
          <div 
            className="absolute -top-1 w-4 h-4 rounded-full border-2 border-background shadow-md transition-all duration-500"
            style={{ 
              left: `calc(${nsePosition}% - 8px)`,
              top: '20px',
              backgroundColor: nseColor,
            }}
          />
        </div>
        <Badge 
          variant="outline" 
          className="mt-3"
          style={{ borderColor: nseColor, color: nseColor }}
        >
          {nseLabel}
        </Badge>
      </div>

      {/* Commercial Environment */}
      {commercialEnvironment && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Entorno Comercial</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {commercialEnvironment}
          </p>
        </div>
      )}

      {/* Nearby Businesses */}
      {nearbyBusinessesCount !== null && nearbyBusinessesCount !== undefined && (
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">
              <strong>{nearbyBusinessesCount}</strong> negocios cercanos (500m)
            </span>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 mt-4 p-3 bg-muted/50 rounded-lg">
        <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Estimaciones basadas en actividad económica · Fuente: INEGI (DENUE)
        </p>
      </div>
    </Card>
  );
};

export default CampaignZoneProfile;
