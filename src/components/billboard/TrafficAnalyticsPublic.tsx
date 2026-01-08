import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts';
import { 
  Car, 
  TrendingUp, 
  Clock, 
  Route,
  Eye,
  Calendar,
  Info,
  Wifi,
  AlertTriangle,
  Activity
} from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TrafficAnalyticsPublicProps {
  billboardId: string;
  dailyImpressions: number | null;
  city: string;
}

interface TrafficDataRecord {
  estimated_daily_impressions: number;
  recorded_at: string;
  confidence: number;
  free_flow_speed: number;
}

// Generate simulated hourly traffic data based on road type with peak highlighting
const generateHourlyData = (roadType: string) => {
  const baseMultiplier = roadType === 'highway' ? 1.5 : roadType === 'main_avenue' ? 1.2 : 1;
  
  const hours = [];
  for (let i = 0; i < 24; i++) {
    let traffic = 0;
    let isPeak = false;
    let isLow = false;
    
    // Morning rush: 7-9am
    if (i >= 7 && i <= 9) {
      traffic = 8000 + Math.random() * 2000;
      isPeak = true;
    }
    // Midday: 10am-4pm
    else if (i >= 10 && i <= 16) {
      traffic = 5000 + Math.random() * 1500;
    }
    // Evening rush: 5-8pm
    else if (i >= 17 && i <= 20) {
      traffic = 9000 + Math.random() * 2500;
      isPeak = true;
    }
    // Night: 9pm-6am
    else {
      traffic = 1500 + Math.random() * 1000;
      isLow = true;
    }
    
    hours.push({
      hour: `${i.toString().padStart(2, '0')}:00`,
      shortHour: i.toString().padStart(2, '0'),
      traffic: Math.round(traffic * baseMultiplier),
      isPeak,
      isLow,
    });
  }
  return hours;
};

// Generate daily traffic data
const generateDailyData = (roadType: string) => {
  const baseMultiplier = roadType === 'highway' ? 1.5 : roadType === 'main_avenue' ? 1.2 : 1;
  
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  return days.map((day, index) => {
    let traffic = 0;
    let isWeekend = false;
    // Weekdays
    if (index < 5) {
      traffic = 120000 + Math.random() * 30000;
    }
    // Weekend
    else {
      traffic = 80000 + Math.random() * 20000;
      isWeekend = true;
    }
    
    return {
      day,
      traffic: Math.round(traffic * baseMultiplier),
      isWeekend,
    };
  });
};

// Determine road type from traffic level
const getRoadType = (trafficLevel?: string) => {
  switch (trafficLevel) {
    case 'Muy Alto':
    case 'very_high':
      return { type: 'highway', label: 'Autopista / Vía rápida', icon: '🛣️' };
    case 'Alto':
    case 'high':
      return { type: 'main_avenue', label: 'Avenida Principal', icon: '🛤️' };
    case 'Moderado':
    case 'moderate':
      return { type: 'urban', label: 'Calle Urbana', icon: '🏙️' };
    default:
      return { type: 'local', label: 'Calle Local', icon: '🏘️' };
  }
};

// Calculate peak hours based on road type
const getPeakHours = (roadType: string): string => {
  switch (roadType) {
    case 'highway':
      return '7:00-9:00 AM, 6:00-8:00 PM';
    case 'main_avenue':
      return '7:30-9:30 AM, 5:30-7:30 PM';
    case 'urban':
      return '8:00-10:00 AM, 5:00-7:00 PM';
    default:
      return '12:00-2:00 PM, 6:00-8:00 PM';
  }
};

export const TrafficAnalyticsPublic: React.FC<TrafficAnalyticsPublicProps> = ({ 
  billboardId, 
  dailyImpressions: initialImpressions,
  city 
}) => {
  const [trafficHistory, setTrafficHistory] = useState<TrafficDataRecord[]>([]);
  const [dataSource, setDataSource] = useState<'live' | 'estimated' | 'none'>('none');
  const [confidenceLevel, setConfidenceLevel] = useState<'Alta' | 'Media' | 'Baja'>('Media');
  const [isLoading, setIsLoading] = useState(true);
  const [dailyImpressions, setDailyImpressions] = useState(initialImpressions);

  // Fetch traffic history
  useEffect(() => {
    const fetchTrafficHistory = async () => {
      if (!billboardId) return;
      
      try {
        const { data, error } = await supabase
          .from('traffic_data')
          .select('estimated_daily_impressions, recorded_at, confidence, free_flow_speed')
          .eq('billboard_id', billboardId)
          .order('recorded_at', { ascending: false })
          .limit(10);
        
        if (!error && data && data.length > 0) {
          setTrafficHistory(data);
          setDataSource('live');
          
          // Use latest impressions from traffic_data if available
          if (data[0].estimated_daily_impressions) {
            setDailyImpressions(data[0].estimated_daily_impressions);
          }
          
          // Calculate average confidence
          const avgConfidence = data.reduce((sum, d) => sum + (d.confidence || 0), 0) / data.length;
          if (avgConfidence >= 0.8) setConfidenceLevel('Alta');
          else if (avgConfidence >= 0.5) setConfidenceLevel('Media');
          else setConfidenceLevel('Baja');
        } else if (initialImpressions) {
          setDataSource('estimated');
        } else {
          setDataSource('none');
        }
      } catch (err) {
        console.error('Error fetching traffic history:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTrafficHistory();
  }, [billboardId, initialImpressions]);

  // Use daily_impressions to determine traffic level
  const estimatedTrafficLevel = useMemo(() => {
    if (!dailyImpressions) return 'Moderado';
    if (dailyImpressions > 50000) return 'Muy Alto';
    if (dailyImpressions > 30000) return 'Alto';
    if (dailyImpressions > 15000) return 'Moderado';
    return 'Bajo';
  }, [dailyImpressions]);
  
  const roadInfo = useMemo(() => getRoadType(estimatedTrafficLevel), [estimatedTrafficLevel]);
  
  const hourlyData = useMemo(() => generateHourlyData(roadInfo.type), [roadInfo.type]);
  const dailyData = useMemo(() => generateDailyData(roadInfo.type), [roadInfo.type]);
  
  // Calculate KPIs
  const computedDailyImpressions = useMemo(() => {
    if (dailyImpressions) return dailyImpressions;
    const total = hourlyData.reduce((acc, h) => acc + h.traffic, 0);
    return Math.round(total * 0.7);
  }, [hourlyData, dailyImpressions]);
  
  const monthlyImpressions = computedDailyImpressions * 30;
  
  const dynamicPeakHours = useMemo(() => getPeakHours(roadInfo.type), [roadInfo.type]);

  // Calculate city ranking (mock for now)
  const cityRanking = useMemo(() => {
    if (!dailyImpressions) return null;
    // Estimate ranking based on impressions
    if (dailyImpressions > 40000) return 'Top 10%';
    if (dailyImpressions > 25000) return 'Top 25%';
    if (dailyImpressions > 15000) return 'Top 50%';
    return 'Top 75%';
  }, [dailyImpressions]);

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Análisis de Tráfico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Análisis de Tráfico
          </CardTitle>
          <div className="flex items-center gap-2">
            {dataSource === 'live' ? (
              <Badge className="bg-primary/20 text-primary border-primary/30">
                <Wifi className="w-3 h-3 mr-1" />
                Datos en vivo
              </Badge>
            ) : dataSource === 'estimated' ? (
              <Badge variant="secondary">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Estimado
              </Badge>
            ) : null}
            {cityRanking && (
              <Badge variant="outline" className="border-primary/30 text-primary">
                🏆 {cityRanking} en {city}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-muted-foreground text-xs">Impresiones/día</p>
                    <UITooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Número estimado de vehículos que pasan diariamente frente al espectacular.</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <p className="text-foreground font-bold text-lg">~{(computedDailyImpressions / 1000).toFixed(0)}K</p>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Impresiones/mes</p>
                  <p className="text-foreground font-bold text-lg">~{(monthlyImpressions / 1000000).toFixed(1)}M</p>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Horas pico</p>
                  <p className="text-foreground font-bold text-xs">{dynamicPeakHours}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Route className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tipo de vía</p>
                  <p className="text-foreground font-bold text-xs">{roadInfo.icon} {roadInfo.label}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hourly Traffic Chart */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="text-foreground font-semibold">Tráfico por Hora</h3>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-primary" />
                    <span className="text-muted-foreground">Hora pico</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-destructive/60" />
                    <span className="text-muted-foreground">Hora baja</span>
                  </div>
                </div>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="shortHour" 
                      className="text-muted-foreground"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      interval={2}
                    />
                    <YAxis 
                      className="text-muted-foreground"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number, name: string, props: any) => {
                        const label = props.payload.isPeak ? '🔥 Hora pico' : props.payload.isLow ? '🌙 Hora baja' : 'Tráfico';
                        return [`${value.toLocaleString()} vehículos`, label];
                      }}
                      labelFormatter={(label) => `${label}:00 hrs`}
                    />
                    <Bar 
                      dataKey="traffic" 
                      radius={[4, 4, 0, 0]}
                    >
                      {hourlyData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isPeak ? 'hsl(var(--primary))' : entry.isLow ? 'hsl(var(--destructive) / 0.6)' : 'hsl(var(--muted-foreground) / 0.4)'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Daily Traffic Chart */}
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-500" />
                <h3 className="text-foreground font-semibold">Tráfico por Día</h3>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="day" 
                      className="text-muted-foreground"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      className="text-muted-foreground"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                    />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number, name: string, props: any) => {
                        const label = props.payload.isWeekend ? '📅 Fin de semana' : 'Entre semana';
                        return [`${value.toLocaleString()} vehículos`, label];
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="traffic" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Traffic Level Badge */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Car className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">Nivel de tráfico estimado:</span>
            </div>
            <Badge 
              variant={
                estimatedTrafficLevel === 'Muy Alto' ? 'destructive' :
                estimatedTrafficLevel === 'Alto' ? 'default' :
                'secondary'
              }
              className={
                estimatedTrafficLevel === 'Muy Alto' ? 'bg-red-500/20 text-red-500 border-red-500/30' :
                estimatedTrafficLevel === 'Alto' ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' :
                estimatedTrafficLevel === 'Moderado' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' :
                'bg-green-500/20 text-green-500 border-green-500/30'
              }
            >
              {estimatedTrafficLevel}
            </Badge>
          </div>

          {/* Confidence info */}
          {dataSource !== 'none' && (
            <p className="text-xs text-muted-foreground text-center">
              Datos de tráfico con confianza {confidenceLevel.toLowerCase()} · 
              Fuente: TomTom Traffic API
            </p>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default TrafficAnalyticsPublic;
