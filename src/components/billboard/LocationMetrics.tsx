import React from 'react';
import { Car, Building2, BarChart3, TrendingUp, Users, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LocationMetricsProps {
  dailyImpressions?: number | null;
  nearbyBusinessesCount?: number | null;
  socioeconomicLevel?: string | null;
  dominantSector?: string | null;
  commercialEnvironment?: string | null;
  isLoadingTraffic?: boolean;
  isLoadingInegi?: boolean;
}

function getTrafficLabel(impressions?: number | null): { label: string; color: string } {
  if (!impressions) return { label: 'Sin datos', color: 'muted-foreground' };
  if (impressions >= 20000) return { label: 'Muy alto', color: 'success' };
  if (impressions >= 10000) return { label: 'Alto', color: 'primary' };
  if (impressions >= 5000) return { label: 'Medio', color: 'warning' };
  return { label: 'Bajo', color: 'muted-foreground' };
}

function getActivityLabel(count?: number | null): { label: string; color: string } {
  if (!count) return { label: 'Sin datos', color: 'muted-foreground' };
  if (count >= 100) return { label: 'Muy activa', color: 'success' };
  if (count >= 50) return { label: 'Activa', color: 'primary' };
  if (count >= 20) return { label: 'Moderada', color: 'warning' };
  return { label: 'Baja', color: 'muted-foreground' };
}

function getNSELabel(level?: string | null): { label: string; color: string; position: number } {
  const normalized = level?.toLowerCase() || '';
  if (normalized.includes('alto') && !normalized.includes('medio')) 
    return { label: 'Alto', color: 'success', position: 100 };
  if (normalized.includes('medio-alto') || normalized.includes('medio alto')) 
    return { label: 'Medio-Alto', color: 'success', position: 75 };
  if (normalized.includes('medio') && !normalized.includes('alto')) 
    return { label: 'Medio', color: 'warning', position: 50 };
  if (normalized.includes('bajo')) 
    return { label: 'Bajo', color: 'destructive', position: 25 };
  return { label: 'Sin datos', color: 'muted-foreground', position: 50 };
}

const LocationMetrics: React.FC<LocationMetricsProps> = ({
  dailyImpressions,
  nearbyBusinessesCount,
  socioeconomicLevel,
  dominantSector,
  commercialEnvironment,
  isLoadingTraffic,
  isLoadingInegi,
}) => {
  const traffic = getTrafficLabel(dailyImpressions);
  const activity = getActivityLabel(nearbyBusinessesCount);
  const nse = getNSELabel(socioeconomicLevel);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        Datos de la Ubicación
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Traffic Card */}
        <Card>
          <CardContent className="p-4">
            {isLoadingTraffic ? (
              <div className="animate-pulse h-24 bg-muted rounded" />
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Car className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Tráfico</span>
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">
                  {dailyImpressions ? `${(dailyImpressions / 1000).toFixed(1)}k` : 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground mb-2">vistas/día</p>
                <Badge variant="outline" className={`text-${traffic.color} border-${traffic.color}`}>
                  {traffic.label}
                </Badge>
              </>
            )}
          </CardContent>
        </Card>

        {/* Commerce Card */}
        <Card>
          <CardContent className="p-4">
            {isLoadingInegi ? (
              <div className="animate-pulse h-24 bg-muted rounded" />
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Comercio</span>
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">
                  {nearbyBusinessesCount || 0}
                </p>
                <p className="text-xs text-muted-foreground mb-2">negocios (500m)</p>
                <Badge variant="outline" className={`text-${activity.color} border-${activity.color}`}>
                  {activity.label}
                </Badge>
              </>
            )}
          </CardContent>
        </Card>

        {/* NSE Card */}
        <Card>
          <CardContent className="p-4">
            {isLoadingInegi ? (
              <div className="animate-pulse h-24 bg-muted rounded" />
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">NSE</span>
                </div>
                <p className="text-2xl font-bold text-foreground mb-1">
                  {nse.label}
                </p>
                <p className="text-xs text-muted-foreground mb-2">nivel socioeconómico</p>
                {/* Visual bar */}
                <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full bg-${nse.color}`}
                    style={{ width: `${nse.position}%` }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional info */}
      {(dominantSector || commercialEnvironment) && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          {dominantSector && (
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm">
                <strong className="text-foreground">Sector dominante:</strong>{' '}
                <span className="text-muted-foreground">{dominantSector}</span>
              </span>
            </div>
          )}
          {commercialEnvironment && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{commercialEnvironment}</span>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground pt-2">
            Fuente: TomTom (tráfico) · INEGI DENUE (actividad económica)
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationMetrics;
