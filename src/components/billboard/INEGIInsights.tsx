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
  Car,
  BarChart3,
  Scissors,
  Factory,
  Landmark,
  MoreHorizontal
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface INEGIInsightsProps {
  billboard: {
    id: string;
    latitude: number;
    longitude: number;
  };
}

interface ConsolidatedSector {
  count: number;
  percentage: number;
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
    consolidated_sectors?: Record<string, ConsolidatedSector>;
    known_brands?: string[];
    shopping_centers?: string[];
  };
}

const SECTOR_ICONS: Record<string, React.ReactNode> = {
  'Comercio al por menor': <ShoppingBag className="h-4 w-4" />,
  'Comercio al por mayor': <Building2 className="h-4 w-4" />,
  'Alojamiento y alimentos': <Utensils className="h-4 w-4" />,
  'Servicios financieros': <TrendingUp className="h-4 w-4" />,
  'Servicios de salud': <Heart className="h-4 w-4" />,
  'Servicios educativos': <GraduationCap className="h-4 w-4" />,
  'Servicios profesionales': <Briefcase className="h-4 w-4" />,
  'Transporte': <Car className="h-4 w-4" />,
};

// Display configuration for the 8 consolidated categories
const CATEGORY_DISPLAY: Record<string, { emoji: string; icon: React.ReactNode }> = {
  'Alimentos y Bebidas': { emoji: '🍔', icon: <Utensils className="h-4 w-4" /> },
  'Comercio Minorista': { emoji: '🛒', icon: <ShoppingBag className="h-4 w-4" /> },
  'Servicios Financieros': { emoji: '🏦', icon: <Landmark className="h-4 w-4" /> },
  'Salud': { emoji: '🏥', icon: <Heart className="h-4 w-4" /> },
  'Servicios Personales': { emoji: '💇', icon: <Scissors className="h-4 w-4" /> },
  'Educación': { emoji: '🎓', icon: <GraduationCap className="h-4 w-4" /> },
  'Industrial / Bodegas': { emoji: '🏭', icon: <Factory className="h-4 w-4" /> },
  'Oficinas / Profesionales': { emoji: '🏢', icon: <Building2 className="h-4 w-4" /> },
  'Otros': { emoji: '📦', icon: <MoreHorizontal className="h-4 w-4" /> },
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
      }
    };

    checkCached();
  }, [billboard.id]);

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

  // Get top sectors for display
  const getTopSectors = () => {
    if (!data?.business_sectors) return [];
    return Object.entries(data.business_sectors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4);
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

  const topSectors = getTopSectors();

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

        {/* Commercial Distribution - Consolidated Sectors */}
        {data.raw_denue_data?.consolidated_sectors && Object.keys(data.raw_denue_data.consolidated_sectors).length > 0 ? (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium text-foreground mb-3">Distribución Comercial</p>
            <div className="space-y-2.5">
              {Object.entries(data.raw_denue_data.consolidated_sectors)
                .sort((a, b) => b[1].percentage - a[1].percentage)
                .slice(0, 6)
                .map(([sector, sectorData]) => (
                  <div key={sector} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 min-w-[140px]">
                      <span className="text-base">{CATEGORY_DISPLAY[sector]?.emoji || '📦'}</span>
                      <span className="text-sm truncate">{sector}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <Progress value={sectorData.percentage} className="h-2 flex-1" />
                      <span className="text-sm text-muted-foreground w-10 text-right font-medium">
                        {sectorData.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : topSectors.length > 0 && (
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Sectores Dominantes</p>
            <div className="flex flex-wrap gap-2">
              {topSectors.map(([sector, count]) => (
                <Badge 
                  key={sector} 
                  variant="outline" 
                  className="flex items-center gap-1.5 py-1"
                >
                  {SECTOR_ICONS[sector] || <Building2 className="h-3 w-3" />}
                  <span className="text-xs">{sector}</span>
                  <span className="text-xs text-muted-foreground">({count})</span>
                </Badge>
              ))}
            </div>
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
          Estimación basada en actividad económica · Fuente: INEGI/DENUE · 
          Actualizado: {new Date(data.last_updated).toLocaleDateString('es-MX')}
        </p>
      </CardContent>
    </Card>
  );
};
