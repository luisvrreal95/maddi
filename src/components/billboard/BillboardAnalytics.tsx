import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { logAPIUsage } from '@/lib/apiUsageLogger';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Users,
  TrendingUp,
  Clock,
  Eye,
  Building2,
  Store,
  MapPin,
  Calendar,
  Wifi,
  Activity,
  GraduationCap,
  Hotel,
  Car,
  Hospital,
  UtensilsCrossed,
  Landmark,
  Target,
  DollarSign,
} from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface BillboardAnalyticsProps {
  billboardId: string;
  latitude: number;
  longitude: number;
  dailyImpressions: number | null;
  city: string;
  pricePerMonth?: number;
}

interface TrafficDataRecord {
  estimated_daily_impressions: number;
  recorded_at: string;
  confidence: number;
  current_speed: number | null;
  free_flow_speed: number | null;
}

interface INEGIData {
  nearby_businesses_count: number | null;
  socioeconomic_level: string | null;
  dominant_sector: string | null;
  commercial_environment: string | null;
  audience_profile: string | null;
  raw_denue_data?: {
    distribution?: Array<{ label: string; percentage: number; count: number }>;
    known_brands?: string[];
  };
}

interface POICategory {
  count: number;
  topItems: Array<{ name: string; category: string; distance: number }>;
}

interface POIData {
  categories: Record<string, POICategory>;
  top5: Array<{ name: string; category: string; distance: number }>;
  totalPOIs: number;
  radius: number;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Educación': <GraduationCap className="w-4 h-4" />,
  'Hoteles': <Hotel className="w-4 h-4" />,
  'Autos': <Car className="w-4 h-4" />,
  'Salud': <Hospital className="w-4 h-4" />,
  'Retail / Plazas': <Store className="w-4 h-4" />,
  'Alimentos y bebidas': <UtensilsCrossed className="w-4 h-4" />,
  'Gobierno / Servicios públicos': <Building2 className="w-4 h-4" />,
  'Servicios profesionales': <Landmark className="w-4 h-4" />,
};

const CHART_COLORS = ['hsl(var(--primary))', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#06B6D4', '#EF4444'];

const generateHourlyData = (baseImpressions: number) => {
  const multipliers = [0.1, 0.08, 0.05, 0.05, 0.08, 0.15, 0.35, 0.65, 0.55, 0.45, 0.5, 0.55, 0.6, 0.55, 0.5, 0.55, 0.7, 0.85, 0.75, 0.6, 0.45, 0.35, 0.25, 0.15];
  return multipliers.map((mult, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}`,
    traffic: Math.round((baseImpressions / 24) * mult * (1 + Math.random() * 0.2)),
    isPeak: mult >= 0.65,
  }));
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toLocaleString();
};

const getTrafficLevel = (current: number | null, freeFlow: number | null) => {
  if (current === null || freeFlow === null) return null;
  const ratio = current / freeFlow;
  if (ratio >= 0.8) return { label: 'Fluido', color: 'text-green-400', bg: 'bg-green-500/10' };
  if (ratio >= 0.5) return { label: 'Moderado', color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
  return { label: 'Denso (alta visibilidad)', color: 'text-primary', bg: 'bg-primary/10' };
};

const BillboardAnalytics: React.FC<BillboardAnalyticsProps> = ({
  billboardId,
  latitude,
  longitude,
  dailyImpressions: initialImpressions,
  city,
  pricePerMonth = 0,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [dailyImpressions, setDailyImpressions] = useState(initialImpressions);
  const [dataSource, setDataSource] = useState<'live' | 'estimated'>('estimated');
  const [inegiData, setInegiData] = useState<INEGIData | null>(null);
  const [poiData, setPoiData] = useState<POIData | null>(null);
  const [trafficConfidence, setTrafficConfidence] = useState<number | null>(null);
  const [trafficLevel, setTrafficLevel] = useState<ReturnType<typeof getTrafficLevel>>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch traffic data from edge function (includes caching logic)
        const startTime = Date.now();
        const { data: trafficResponse, error: trafficError } = await supabase.functions.invoke('get-traffic-data', {
          body: { billboard_id: billboardId, latitude, longitude, city }
        });
        logAPIUsage({ api_name: 'tomtom', endpoint_type: 'traffic_flow', billboard_id: billboardId, source_screen: 'billboard_detail', response_status: trafficError ? 500 : 200, latency_ms: Date.now() - startTime });

        if (trafficResponse?.trafficData) {
          const td = trafficResponse.trafficData;
          if (td.estimated_daily_impressions) {
            setDailyImpressions(td.estimated_daily_impressions);
            setDataSource(trafficResponse.source === 'tomtom' ? 'live' : 'estimated');
          }
          setTrafficConfidence(td.confidence);
          setTrafficLevel(getTrafficLevel(td.current_speed, td.free_flow_speed));
          if (td.recorded_at) setLastUpdate(new Date(td.recorded_at));
        }

        // Fetch INEGI data
        const { data: inegi } = await supabase
          .from('inegi_demographics')
          .select('*')
          .eq('billboard_id', billboardId)
          .maybeSingle();
        if (inegi) setInegiData(inegi as INEGIData);

        // Fetch POI data
        const { data: poiCache } = await supabase
          .from('poi_overview_cache')
          .select('data')
          .eq('billboard_id', billboardId)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (poiCache?.data) {
          setPoiData(poiCache.data as unknown as POIData);
        } else {
          const { data: freshPoi } = await supabase.functions.invoke('get-poi-overview', {
            body: { billboard_id: billboardId, latitude, longitude }
          });
          if (freshPoi?.success) {
            setPoiData({
              categories: freshPoi.categories || {},
              top5: freshPoi.top5 || [],
              totalPOIs: freshPoi.totalPOIs || 0,
              radius: freshPoi.radius || 500,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (billboardId) fetchData();
  }, [billboardId, latitude, longitude, city]);

  const impressions = dailyImpressions || 25000;
  const monthlyImpressions = impressions * 30;
  const hourlyData = useMemo(() => generateHourlyData(impressions), [impressions]);
  const cpm = pricePerMonth > 0 ? (pricePerMonth / (monthlyImpressions / 1000)).toFixed(2) : null;
  const estimatedReach = Math.round(monthlyImpressions * 0.7);

  const peakHoursLabel = useMemo(() => {
    const peaks = hourlyData.filter(h => h.isPeak);
    if (peaks.length === 0) return '7:00 - 9:00, 17:00 - 19:00';
    return '7:00 - 9:00, 17:00 - 19:00';
  }, [hourlyData]);

  const poiDistribution = useMemo(() => {
    if (!poiData?.categories) return [];
    return Object.entries(poiData.categories)
      .map(([name, data]) => ({ name, value: data.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [poiData]);

  const inegiDistribution = useMemo(() => {
    if (!inegiData?.raw_denue_data?.distribution) return [];
    return inegiData.raw_denue_data.distribution.slice(0, 5);
  }, [inegiData]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Análisis de ubicación
        </h2>
        <div className="flex items-center gap-2">
          {dataSource === 'live' && (
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
              <Wifi className="w-3 h-3 mr-1" />
              Datos en vivo
            </Badge>
          )}
          {trafficConfidence !== null && (
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-xs">
                    Confianza: {Math.round(trafficConfidence * 100)}%
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Nivel de confianza de los datos de tráfico</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* === ROI & IMPACT METRICS === */}
      <Card className="bg-card border-border p-5">
        <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          Métricas de impacto
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-primary/10 rounded-xl p-4 text-center">
            <Eye className="w-5 h-5 text-primary mx-auto mb-1.5" />
            <p className="text-xl font-bold text-foreground">{formatNumber(impressions)}</p>
            <p className="text-xs text-muted-foreground">Impresiones/día</p>
          </div>
          <div className="bg-blue-500/10 rounded-xl p-4 text-center">
            <Calendar className="w-5 h-5 text-blue-500 mx-auto mb-1.5" />
            <p className="text-xl font-bold text-foreground">{formatNumber(monthlyImpressions)}</p>
            <p className="text-xs text-muted-foreground">Impresiones/mes</p>
          </div>
          <div className="bg-purple-500/10 rounded-xl p-4 text-center">
            <Users className="w-5 h-5 text-purple-500 mx-auto mb-1.5" />
            <p className="text-xl font-bold text-foreground">{formatNumber(estimatedReach)}</p>
            <p className="text-xs text-muted-foreground">Alcance mensual</p>
          </div>
          {cpm && (
            <div className="bg-emerald-500/10 rounded-xl p-4 text-center">
              <DollarSign className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
              <p className="text-xl font-bold text-foreground">${cpm}</p>
              <p className="text-xs text-muted-foreground">CPM estimado</p>
            </div>
          )}
        </div>

        {/* Traffic level & peak hours inline */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="flex items-center gap-3 bg-secondary/40 rounded-xl p-3">
            <Clock className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Horas pico</p>
              <p className="text-sm font-semibold text-foreground">{peakHoursLabel}</p>
            </div>
          </div>
          {trafficLevel && (
            <div className={`flex items-center gap-3 ${trafficLevel.bg} rounded-xl p-3`}>
              <Car className="w-5 h-5 flex-shrink-0 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Nivel de tráfico</p>
                <p className={`text-sm font-semibold ${trafficLevel.color}`}>{trafficLevel.label}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* === HOURLY TRAFFIC CHART === */}
      <Card className="bg-card border-border p-5">
        <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Tráfico estimado por hora
        </p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData}>
              <XAxis
                dataKey="hour"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                interval={2}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
                formatter={(value: number) => [`${value.toLocaleString()} vehículos`, 'Tráfico']}
                labelFormatter={(label) => `${label}:00 hrs`}
              />
              <Bar dataKey="traffic" radius={[3, 3, 0, 0]}>
                {hourlyData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isPeak ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.3)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
            <span>Hora pico</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/30" />
            <span>Normal</span>
          </div>
        </div>
      </Card>

      {/* === AUDIENCE & DEMOGRAPHICS === */}
      {inegiData && (
        <Card className="bg-card border-border p-5">
          <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Perfil de audiencia
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {inegiData.socioeconomic_level && (
              <div className="bg-secondary/40 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Nivel socioeconómico</p>
                <Badge
                  className={`text-sm capitalize ${
                    inegiData.socioeconomic_level === 'alto' ? 'bg-emerald-500/20 text-emerald-400' :
                    inegiData.socioeconomic_level === 'medio-alto' ? 'bg-emerald-400/20 text-emerald-300' :
                    inegiData.socioeconomic_level === 'medio' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-orange-500/20 text-orange-400'
                  }`}
                >
                  {inegiData.socioeconomic_level}
                </Badge>
              </div>
            )}
            {inegiData.dominant_sector && (
              <div className="bg-secondary/40 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Sector dominante</p>
                <p className="text-sm font-medium text-foreground">{inegiData.dominant_sector}</p>
              </div>
            )}
            <div className="bg-secondary/40 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-1">Negocios en 500m</p>
              <p className="text-xl font-bold text-foreground">{inegiData.nearby_businesses_count || 0}</p>
            </div>
          </div>

          {inegiData.audience_profile && (
            <p className="text-sm text-muted-foreground bg-secondary/30 rounded-xl p-3 mb-4">
              {inegiData.audience_profile}
            </p>
          )}

          {/* Distribution bars */}
          {inegiDistribution.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-muted-foreground">Distribución comercial</p>
              {inegiDistribution.map((cat, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-xs text-foreground w-36 truncate">{cat.label}</span>
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: CHART_COLORS[idx % CHART_COLORS.length]
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right">{cat.percentage}%</span>
                </div>
              ))}
            </div>
          )}

          {/* Known Brands */}
          {inegiData.raw_denue_data?.known_brands && inegiData.raw_denue_data.known_brands.length > 0 && (
            <div className="mt-4 bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-xs font-medium text-foreground mb-2">Marcas reconocidas cercanas</p>
              <div className="flex flex-wrap gap-1.5">
                {inegiData.raw_denue_data.known_brands.map((brand, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {brand}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* === NEARBY PLACES & POI === */}
      {poiData && poiData.totalPOIs > 0 && (
        <Card className="bg-card border-border p-5">
          <p className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Entorno comercial
            <Badge variant="outline" className="text-xs ml-auto">{poiData.totalPOIs} lugares en {poiData.radius}m</Badge>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* POI Pie Chart */}
            {poiDistribution.length > 0 && (
              <div className="bg-secondary/30 rounded-xl p-4">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={poiDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={65}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {poiDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                        }}
                        formatter={(value: number, name: string) => [`${value} lugares`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Categories list */}
            <div className="space-y-2">
              {poiDistribution.map((cat, idx) => (
                <div key={cat.name} className="flex items-center gap-3 p-2.5 bg-secondary/20 rounded-lg">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                  />
                  <div className="w-7 h-7 rounded-lg bg-secondary/50 flex items-center justify-center text-primary flex-shrink-0">
                    {categoryIcons[cat.name] || <Store className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-sm text-foreground flex-1 truncate">{cat.name}</span>
                  <Badge variant="secondary" className="text-xs">{cat.value}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Top nearby places */}
          {poiData.top5 && poiData.top5.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">Lugares más cercanos</p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {poiData.top5.map((place, idx) => (
                  <div key={idx} className="bg-secondary/30 rounded-xl p-3 text-center">
                    <div className="w-6 h-6 rounded-full bg-primary/20 text-primary mx-auto mb-1.5 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <p className="text-xs font-medium text-foreground truncate">{place.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{place.distance}m</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Attribution */}
      <p className="text-[10px] text-muted-foreground text-center">
        Datos: TomTom Traffic · INEGI DENUE
        {lastUpdate && ` · Actualizado: ${lastUpdate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`}
      </p>
    </div>
  );
};

export default BillboardAnalytics;
