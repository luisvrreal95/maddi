import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Car, RefreshCw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TrafficEstimateProps {
  billboardId: string;
  latitude: number;
  longitude: number;
  city?: string;
}

interface TrafficData {
  estimated_daily_impressions: number | null;
  current_speed: number | null;
  free_flow_speed: number | null;
  confidence: number | null;
  recorded_at: string | null;
}

const TrafficEstimate: React.FC<TrafficEstimateProps> = ({ 
  billboardId, 
  latitude, 
  longitude,
  city = '',
}) => {
  const [trafficData, setTrafficData] = useState<TrafficData | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    fetchTrafficData();
  }, [billboardId]);

  const fetchTrafficData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-traffic-data', {
        body: { billboard_id: billboardId, latitude, longitude, city }
      });

      if (error) throw error;

      if (data?.trafficData) {
        setTrafficData(data.trafficData);
        setSource(data.source || null);
        if (data.trafficData.recorded_at) {
          setLastUpdate(new Date(data.trafficData.recorded_at));
        }
      }
    } catch (error) {
      console.error('Error fetching traffic data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (lastUpdate) {
      const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 7) {
        toast.info(`Los datos se actualizan semanalmente. Próxima actualización disponible en ${Math.ceil(7 - daysSinceUpdate)} días.`);
        return;
      }
    }
    await fetchTrafficData();
    toast.success('Datos de tráfico actualizados');
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return 'N/A';
    return num.toLocaleString();
  };

  const getTrafficLevel = (current: number | null, freeFlow: number | null) => {
    if (current === null || freeFlow === null) return { label: 'Desconocido', color: 'text-muted-foreground' };
    const ratio = current / freeFlow;
    if (ratio >= 0.8) return { label: 'Fluido', color: 'text-green-400' };
    if (ratio >= 0.5) return { label: 'Moderado', color: 'text-yellow-400' };
    return { label: 'Denso (alta visibilidad)', color: 'text-primary' };
  };

  const getSourceLabel = (src: string | null) => {
    switch (src) {
      case 'tomtom': return 'TomTom';
      case 'cache': return 'Cache';
      case 'location_estimate':
      case 'fallback': return 'Estimación por ubicación';
      default: return 'Desconocido';
    }
  };

  const trafficLevel = getTrafficLevel(trafficData?.current_speed ?? null, trafficData?.free_flow_speed ?? null);

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Car className="w-5 h-5 text-primary" />
          <h3 className="text-foreground font-semibold">Tráfico vehicular estimado</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Estimación basada en datos de tráfico vehicular. Fuente: {getSourceLabel(source)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {isLoading && !trafficData ? (
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </div>
      ) : trafficData ? (
        <div className="space-y-4">
          <div className="bg-primary/10 rounded-lg p-4">
            <p className="text-muted-foreground text-sm mb-1">Impresiones diarias estimadas</p>
            <p className="text-primary text-3xl font-bold">
              ~{formatNumber(trafficData.estimated_daily_impressions)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-1">Nivel de tráfico</p>
              <p className={`font-semibold ${trafficLevel.color}`}>
                {trafficLevel.label}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs mb-1">Confianza</p>
              <p className="text-foreground font-semibold">
                {trafficData.confidence ? `${Math.round(trafficData.confidence * 100)}%` : 'N/A'}
              </p>
            </div>
          </div>

          {lastUpdate && (
            <p className="text-muted-foreground text-xs">
              Última actualización: {lastUpdate.toLocaleDateString('es-MX', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              })}
            </p>
          )}

          <p className="text-muted-foreground text-xs flex items-center gap-1 border-t border-border pt-3">
            <span className="opacity-70">Fuente: {getSourceLabel(source)}</span>
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          No hay datos de tráfico disponibles para esta ubicación.
        </p>
      )}
    </div>
  );
};

export default TrafficEstimate;
