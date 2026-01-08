import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  TrendingUp, 
  Store, 
  RefreshCw,
  Building2,
  Utensils,
  ShoppingBag,
  Briefcase,
  GraduationCap,
  Heart,
  Truck,
  BarChart3,
  Scissors,
  Factory,
  Landmark,
  Film
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ZoneTypeIndicator, UrbanZoneType } from './ZoneTypeIndicator';

interface INEGIInsightsProps {
  billboard: {
    id: string;
    latitude: number;
    longitude: number;
  };
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

interface DemographicsData {
  id: string;
  billboard_id: string;
  nearby_businesses_count: number;
  business_sectors: Record<string, number>;
  dominant_sector: string;
  audience_profile: string;
  socioeconomic_level: 'bajo' | 'medio' | 'medio-alto' | 'alto';
  commercial_environment: string;
  ai_summary: string;
  last_updated: string;
  raw_denue_data?: {
    distribution?: CategoryDistribution[];
    known_brands?: string[];
    interpretation?: string;
    zone_type?: 'mixed' | 'specialized' | 'limited';
    urban_zone?: UrbanZoneData;
  };
}

// Display configuration for categories
const CATEGORY_DISPLAY: Record<string, { emoji: string; icon: React.ReactNode; color: string }> = {
  'Alimentos y Bebidas': { emoji: '🍔', icon: <Utensils className="h-4 w-4" />, color: 'bg-orange-500' },
  'Comercio Minorista': { emoji: '🛒', icon: <ShoppingBag className="h-4 w-4" />, color: 'bg-blue-500' },
  'Servicios Financieros': { emoji: '🏦', icon: <Landmark className="h-4 w-4" />, color: 'bg-emerald-500' },
  'Salud': { emoji: '🏥', icon: <Heart className="h-4 w-4" />, color: 'bg-red-500' },
  'Servicios Personales': { emoji: '💇', icon: <Scissors className="h-4 w-4" />, color: 'bg-purple-500' },
  'Educación': { emoji: '🎓', icon: <GraduationCap className="h-4 w-4" />, color: 'bg-indigo-500' },
  'Servicios Profesionales': { emoji: '🏢', icon: <Building2 className="h-4 w-4" />, color: 'bg-slate-500' },
  'Entretenimiento': { emoji: '🎬', icon: <Film className="h-4 w-4" />, color: 'bg-pink-500' },
  'Automotriz y Transporte': { emoji: '🚗', icon: <Truck className="h-4 w-4" />, color: 'bg-amber-500' },
  'Industria y Manufactura': { emoji: '🏭', icon: <Factory className="h-4 w-4" />, color: 'bg-gray-500' },
};

const SOCIOECONOMIC_COLORS: Record<string, string> = {
  'bajo': 'bg-orange-500',
  'medio': 'bg-yellow-500',
  'medio-alto': 'bg-emerald-400',
  'alto': 'bg-emerald-500',
};

const SOCIOECONOMIC_LABELS: Record<string, string> = {
  'bajo': 'Bajo',
  'medio': 'Medio',
  'medio-alto': 'Medio-Alto',
  'alto': 'Alto',
};

export const INEGIInsights = ({ billboard }: INEGIInsightsProps) => {
  const [data, setData] = useState<DemographicsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // Check for cached data on mount
  useEffect(() => {
    const checkCached = async () => {
      const { data: cached } = await supabase
        .from('inegi_demographics')
        .select('*')
        .eq('billboard_id', billboard.id)
        .single();

      if (cached) {
        setData(cached as DemographicsData);
        setHasAnalyzed(true);

        // Check for both distribution and urban_zone
        const raw = (cached as any).raw_denue_data as any;
        const hasDistribution = Array.isArray(raw?.distribution) && raw.distribution.length > 0;
        const hasUrbanZone = raw?.urban_zone?.type;

        if (!hasDistribution || !hasUrbanZone) {
          try {
            const { data: result, error } = await supabase.functions.invoke('analyze-inegi-data', {
              body: {
                billboard_id: billboard.id,
                latitude: billboard.latitude,
                longitude: billboard.longitude,
                force_refresh: true,
              },
            });

            if (!error && result?.data) {
              setData(result.data as DemographicsData);
            }
          } catch (e) {
            console.error('Error backfilling INEGI data:', e);
          }
        }
      }
    };

    checkCached();
  }, [billboard.id, billboard.latitude, billboard.longitude]);

  const fetchAnalysis = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('analyze-inegi-data', {
        body: {
          billboard_id: billboard.id,
          latitude: billboard.latitude,
          longitude: billboard.longitude,
          force_refresh: forceRefresh,
        },
      });

      if (error) throw error;

      if (result?.data) {
        setData(result.data as DemographicsData);
        setHasAnalyzed(true);
        if (result.source === 'fresh') {
          toast.success('Datos INEGI actualizados');
        }
      }
    } catch (error) {
      console.error('Error fetching INEGI data:', error);
      toast.error('Error al obtener datos demográficos');
    } finally {
      setIsLoading(false);
    }
  };

  // Get distribution from raw_denue_data
  const getDistribution = (): CategoryDistribution[] => {
    return data?.raw_denue_data?.distribution || [];
  };

  // Get known brands
  const getKnownBrands = (): string[] => {
    return data?.raw_denue_data?.known_brands || [];
  };

  // Get urban zone classification
  const getUrbanZone = (): UrbanZoneData | undefined => {
    return data?.raw_denue_data?.urban_zone;
  };

  if (!hasAnalyzed && !isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Perfil Demográfico y Comercial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">
              Analiza el entorno comercial y demográfico en un radio de 500m
            </p>
            <Button onClick={() => fetchAnalysis()} disabled={isLoading}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Analizar zona con INEGI
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Datos obtenidos del Directorio Estadístico Nacional de Unidades Económicas (DENUE)
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Perfil Demográfico y Comercial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const distribution = getDistribution();
  const knownBrands = getKnownBrands();
  const urbanZone = getUrbanZone();
  const interpretation = data.raw_denue_data?.interpretation;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Perfil Demográfico y Comercial
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => fetchAnalysis(true)}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Urban Zone Classification - NEW PROMINENT SECTION */}
        {urbanZone && (
          <ZoneTypeIndicator 
            zoneType={urbanZone.type} 
            confidence={urbanZone.confidence}
            variant="full"
            showCampaigns={true}
          />
        )}

        {/* Audience Profile */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <div className="p-2 rounded-full bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Perfil de Audiencia</p>
            <p className="text-sm text-muted-foreground">{data.audience_profile}</p>
          </div>
        </div>

        {/* Socioeconomic Level */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <div className="p-2 rounded-full bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground mb-2">Nivel Socioeconómico Estimado</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${SOCIOECONOMIC_COLORS[data.socioeconomic_level]} transition-all`}
                  style={{ 
                    width: data.socioeconomic_level === 'bajo' ? '25%' 
                         : data.socioeconomic_level === 'medio' ? '50%' 
                         : data.socioeconomic_level === 'medio-alto' ? '75%' 
                         : '100%' 
                  }}
                />
              </div>
              <Badge variant="secondary" className="text-xs">
                {SOCIOECONOMIC_LABELS[data.socioeconomic_level]}
              </Badge>
            </div>
          </div>
        </div>

        {/* Commercial Environment */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
          <div className="p-2 rounded-full bg-primary/10">
            <Store className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Entorno Comercial</p>
            <p className="text-sm text-muted-foreground">{data.commercial_environment}</p>
            <p className="text-xs text-primary mt-1 font-medium">
              {data.nearby_businesses_count} negocios en 500m
            </p>
          </div>
        </div>

        {/* Known Brands - NEW SECTION */}
        {knownBrands.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium text-foreground mb-2">Marcas Reconocidas Cercanas</p>
            <div className="flex flex-wrap gap-2">
              {knownBrands.map((brand, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {brand}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Commercial Distribution */}
        {distribution.length > 0 && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium text-foreground mb-3">Distribución Comercial</p>
            <div className="space-y-3">
              {distribution.slice(0, 6).map((cat, idx) => {
                const display = CATEGORY_DISPLAY[cat.label] || { emoji: '📦', icon: <Building2 className="h-4 w-4" />, color: 'bg-gray-500' };
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 min-w-[160px]">
                      <span className="text-base">{display.emoji}</span>
                      <span className="text-sm truncate">{cat.label}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <Progress value={cat.percentage} className="h-2 flex-1" />
                      <span className="text-sm text-muted-foreground w-12 text-right font-medium">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Interpretation */}
            {interpretation && (
              <p className="text-sm text-primary font-medium mt-3">{interpretation}</p>
            )}
          </div>
        )}

        {/* Summary */}
        {data.ai_summary && (
          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium text-foreground">Resumen de zona</p>
            </div>
            <p className="text-sm text-muted-foreground">{data.ai_summary}</p>
          </div>
        )}

        {/* Attribution */}
        <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          Estimación basada en actividad económica · Fuente: INEGI DENUE · 
          Actualizado: {new Date(data.last_updated).toLocaleDateString('es-MX')}
        </p>
      </CardContent>
    </Card>
  );
};
