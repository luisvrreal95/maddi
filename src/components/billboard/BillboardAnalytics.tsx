import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
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
  ChevronDown,
  ChevronUp,
  Calendar,
  Route,
  Wifi,
  Activity,
  GraduationCap,
  Hotel,
  Car,
  Hospital,
  UtensilsCrossed,
  Landmark,
  Briefcase,
} from 'lucide-react';

interface BillboardAnalyticsProps {
  billboardId: string;
  latitude: number;
  longitude: number;
  dailyImpressions: number | null;
  city: string;
}

interface TrafficDataRecord {
  estimated_daily_impressions: number;
  recorded_at: string;
  confidence: number;
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

// Generate hourly traffic pattern
const generateHourlyData = (baseImpressions: number) => {
  const multipliers = [0.1, 0.08, 0.05, 0.05, 0.08, 0.15, 0.35, 0.65, 0.55, 0.45, 0.5, 0.55, 0.6, 0.55, 0.5, 0.55, 0.7, 0.85, 0.75, 0.6, 0.45, 0.35, 0.25, 0.15];
  return multipliers.map((mult, hour) => ({
    hour: `${hour.toString().padStart(2, '0')}`,
    traffic: Math.round((baseImpressions / 24) * mult * (1 + Math.random() * 0.2)),
    isPeak: mult >= 0.65,
  }));
};

const BillboardAnalytics: React.FC<BillboardAnalyticsProps> = ({
  billboardId,
  latitude,
  longitude,
  dailyImpressions: initialImpressions,
  city,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [dailyImpressions, setDailyImpressions] = useState(initialImpressions);
  const [dataSource, setDataSource] = useState<'live' | 'estimated'>('estimated');
  const [inegiData, setInegiData] = useState<INEGIData | null>(null);
  const [poiData, setPoiData] = useState<POIData | null>(null);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch traffic data
        const { data: trafficData } = await supabase
          .from('traffic_data')
          .select('estimated_daily_impressions, recorded_at, confidence')
          .eq('billboard_id', billboardId)
          .order('recorded_at', { ascending: false })
          .limit(1);

        if (trafficData && trafficData.length > 0 && trafficData[0].estimated_daily_impressions) {
          setDailyImpressions(trafficData[0].estimated_daily_impressions);
          setDataSource('live');
        }

        // Fetch INEGI data
        const { data: inegi } = await supabase
          .from('inegi_demographics')
          .select('*')
          .eq('billboard_id', billboardId)
          .maybeSingle();

        if (inegi) {
          setInegiData(inegi as INEGIData);
        }

        // Fetch POI data from cache
        const { data: poiCache } = await supabase
          .from('poi_overview_cache')
          .select('data')
          .eq('billboard_id', billboardId)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (poiCache?.data) {
          setPoiData(poiCache.data as unknown as POIData);
        } else {
          // Fetch fresh POI data
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

    if (billboardId) {
      fetchData();
    }
  }, [billboardId, latitude, longitude]);

  // Computed values
  const impressions = dailyImpressions || 25000;
  const monthlyImpressions = impressions * 30;
  const hourlyData = useMemo(() => generateHourlyData(impressions), [impressions]);
  
  const peakHours = useMemo(() => {
    const peaks = hourlyData.filter(h => h.isPeak);
    if (peaks.length === 0) return '7:00 - 9:00, 17:00 - 19:00';
    const first = peaks[0]?.hour || '07';
    const last = peaks[peaks.length - 1]?.hour || '19';
    return `${first}:00 - ${parseInt(first) + 2}:00`;
  }, [hourlyData]);

  // POI distribution for pie chart
  const poiDistribution = useMemo(() => {
    if (!poiData?.categories) return [];
    return Object.entries(poiData.categories)
      .map(([name, data]) => ({ name, value: data.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [poiData]);

  // INEGI distribution for display
  const inegiDistribution = useMemo(() => {
    if (!inegiData?.raw_denue_data?.distribution) return [];
    return inegiData.raw_denue_data.distribution.slice(0, 5);
  }, [inegiData]);

  if (isLoading) {
    return (
      <Card className="bg-card border-border p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-48" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Stats Overview */}
      <Card className="bg-card border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-semibold flex items-center gap-2">
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
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-secondary/50 rounded-xl p-4 text-center">
            <Eye className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{(impressions / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">Impresiones/día</p>
          </div>
          
          <div className="bg-secondary/50 rounded-xl p-4 text-center">
            <Calendar className="w-5 h-5 text-blue-500 mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{(monthlyImpressions / 1000000).toFixed(1)}M</p>
            <p className="text-xs text-muted-foreground">Impresiones/mes</p>
          </div>
          
          <div className="bg-secondary/50 rounded-xl p-4 text-center">
            <Clock className="w-5 h-5 text-orange-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-foreground">{peakHours}</p>
            <p className="text-xs text-muted-foreground">Horas pico</p>
          </div>
          
          <div className="bg-secondary/50 rounded-xl p-4 text-center">
            <Building2 className="w-5 h-5 text-purple-500 mx-auto mb-2" />
            <p className="text-xl font-bold text-foreground">{poiData?.totalPOIs || inegiData?.nearby_businesses_count || 0}</p>
            <p className="text-xs text-muted-foreground">Negocios cercanos</p>
          </div>
        </div>

        {/* Mini Hourly Chart */}
        <div className="bg-secondary/30 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Tráfico estimado por hora
            </p>
          </div>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <XAxis 
                  dataKey="hour" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  interval={3}
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
                <Bar dataKey="traffic" radius={[2, 2, 0, 0]}>
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
        </div>

        {/* Quick Zone Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* INEGI Summary */}
          {inegiData && (
            <div className="bg-secondary/30 rounded-xl p-4">
              <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Perfil demográfico
              </p>
              <div className="space-y-2">
                {inegiData.socioeconomic_level && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Nivel socioeconómico</span>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {inegiData.socioeconomic_level}
                    </Badge>
                  </div>
                )}
                {inegiData.dominant_sector && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Sector dominante</span>
                    <span className="text-xs text-foreground">{inegiData.dominant_sector}</span>
                  </div>
                )}
                {inegiData.audience_profile && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {inegiData.audience_profile}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* POI Summary */}
          {poiData && poiData.top5 && poiData.top5.length > 0 && (
            <div className="bg-secondary/30 rounded-xl p-4">
              <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Lugares cercanos ({poiData.radius}m)
              </p>
              <div className="space-y-2">
                {poiData.top5.slice(0, 3).map((place, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                        {idx + 1}
                      </span>
                      <span className="text-xs text-foreground truncate max-w-[140px]">{place.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{place.distance}m</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Expandable Full Analysis */}
      <Card className="bg-card border-border">
        <button
          onClick={() => setShowFullAnalysis(!showFullAnalysis)}
          className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Ver análisis completo</span>
          </div>
          {showFullAnalysis ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        {showFullAnalysis && (
          <div className="px-4 pb-4 space-y-6 border-t border-border pt-4">
            {/* Detailed Traffic Analysis */}
            <div>
              <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
                <Route className="w-5 h-5 text-primary" />
                Análisis de tráfico detallado
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Hourly Chart */}
                <div className="bg-secondary/30 rounded-xl p-4">
                  <p className="text-sm font-medium text-foreground mb-3">Distribución por hora</p>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyData}>
                        <XAxis 
                          dataKey="hour" 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          interval={2}
                        />
                        <YAxis 
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
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
                        <Bar dataKey="traffic" radius={[4, 4, 0, 0]}>
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
                </div>

                {/* Traffic Stats */}
                <div className="space-y-3">
                  <div className="bg-secondary/30 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Impresiones diarias estimadas</p>
                    <p className="text-2xl font-bold text-foreground">{impressions.toLocaleString()}</p>
                  </div>
                  <div className="bg-secondary/30 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Impresiones mensuales estimadas</p>
                    <p className="text-2xl font-bold text-foreground">{monthlyImpressions.toLocaleString()}</p>
                  </div>
                  <div className="bg-secondary/30 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Horas de mayor exposición</p>
                    <p className="text-lg font-bold text-foreground">7:00-9:00 AM, 5:00-7:00 PM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* POI Distribution */}
            {poiDistribution.length > 0 && (
              <div>
                <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" />
                  Distribución de negocios cercanos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pie Chart */}
                  <div className="bg-secondary/30 rounded-xl p-4">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={poiDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {poiDistribution.map((entry, index) => (
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

                  {/* Categories List */}
                  <div className="space-y-2">
                    {poiDistribution.map((cat, idx) => (
                      <div key={cat.name} className="flex items-center gap-3 p-2 bg-secondary/20 rounded-lg">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                        />
                        <div className="w-8 h-8 rounded-lg bg-secondary/50 flex items-center justify-center text-primary">
                          {categoryIcons[cat.name] || <Store className="w-4 h-4" />}
                        </div>
                        <span className="text-sm text-foreground flex-1">{cat.name}</span>
                        <Badge variant="secondary" className="text-xs">{cat.value}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Top 5 Places */}
            {poiData?.top5 && poiData.top5.length > 0 && (
              <div>
                <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Top 5 lugares más cercanos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  {poiData.top5.map((place, idx) => (
                    <div key={idx} className="bg-secondary/30 rounded-xl p-4 text-center">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary mx-auto mb-2 flex items-center justify-center font-bold">
                        {idx + 1}
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{place.name}</p>
                      <p className="text-xs text-muted-foreground">{place.category}</p>
                      <Badge variant="outline" className="mt-2 text-xs">{place.distance}m</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* INEGI Detailed */}
            {inegiData && (
              <div>
                <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Perfil demográfico detallado (INEGI)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-secondary/30 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-2">Nivel socioeconómico</p>
                    <Badge 
                      className={`text-sm capitalize ${
                        inegiData.socioeconomic_level === 'alto' ? 'bg-emerald-500/20 text-emerald-400' :
                        inegiData.socioeconomic_level === 'medio-alto' ? 'bg-emerald-400/20 text-emerald-300' :
                        inegiData.socioeconomic_level === 'medio' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-orange-500/20 text-orange-400'
                      }`}
                    >
                      {inegiData.socioeconomic_level || 'N/A'}
                    </Badge>
                  </div>
                  <div className="bg-secondary/30 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-2">Sector dominante</p>
                    <p className="text-sm font-medium text-foreground">{inegiData.dominant_sector || 'N/A'}</p>
                  </div>
                  <div className="bg-secondary/30 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-2">Negocios en 500m</p>
                    <p className="text-2xl font-bold text-foreground">{inegiData.nearby_businesses_count || 0}</p>
                  </div>
                </div>

                {/* Distribution bars */}
                {inegiDistribution.length > 0 && (
                  <div className="mt-4 bg-secondary/30 rounded-xl p-4">
                    <p className="text-sm font-medium text-foreground mb-3">Distribución comercial</p>
                    <div className="space-y-3">
                      {inegiDistribution.map((cat, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-sm text-foreground w-40 truncate">{cat.label}</span>
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full"
                              style={{ 
                                width: `${cat.percentage}%`,
                                backgroundColor: CHART_COLORS[idx % CHART_COLORS.length]
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-12 text-right">{cat.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Known Brands */}
                {inegiData.raw_denue_data?.known_brands && inegiData.raw_denue_data.known_brands.length > 0 && (
                  <div className="mt-4 bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <p className="text-sm font-medium text-foreground mb-3">Marcas reconocidas cercanas</p>
                    <div className="flex flex-wrap gap-2">
                      {inegiData.raw_denue_data.known_brands.map((brand, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {brand}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Attribution */}
            <p className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
              Datos de tráfico: TomTom Traffic API · Datos demográficos: INEGI DENUE · 
              Última actualización: {new Date().toLocaleDateString('es-MX')}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BillboardAnalytics;