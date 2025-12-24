import React, { useMemo, useState, useEffect } from 'react';
import { Billboard } from '@/hooks/useBillboards';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  ReferenceLine
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
  WifiOff,
  AlertTriangle
} from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TrafficAnalyticsProps {
  billboard: Billboard | null;
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
      fill: isPeak ? '#9BFF43' : isLow ? '#FF6B6B' : '#4A5568',
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

const TrafficAnalytics: React.FC<TrafficAnalyticsProps> = ({ billboard }) => {
  const [trafficHistory, setTrafficHistory] = useState<TrafficDataRecord[]>([]);
  const [dataSource, setDataSource] = useState<'live' | 'estimated' | 'none'>('none');
  const [confidenceLevel, setConfidenceLevel] = useState<'Alta' | 'Media' | 'Baja'>('Media');

  // Fetch traffic history
  useEffect(() => {
    const fetchTrafficHistory = async () => {
      if (!billboard?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('traffic_data')
          .select('estimated_daily_impressions, recorded_at, confidence, free_flow_speed')
          .eq('billboard_id', billboard.id)
          .order('recorded_at', { ascending: false })
          .limit(10);
        
        if (!error && data && data.length > 0) {
          setTrafficHistory(data);
          setDataSource('live');
          
          // Calculate average confidence
          const avgConfidence = data.reduce((sum, d) => sum + (d.confidence || 0), 0) / data.length;
          if (avgConfidence >= 0.8) setConfidenceLevel('Alta');
          else if (avgConfidence >= 0.5) setConfidenceLevel('Media');
          else setConfidenceLevel('Baja');
        } else if (billboard.daily_impressions) {
          setDataSource('estimated');
        } else {
          setDataSource('none');
        }
      } catch (err) {
        console.error('Error fetching traffic history:', err);
      }
    };
    
    fetchTrafficHistory();
  }, [billboard?.id]);

  // Use daily_impressions to determine traffic level
  const estimatedTrafficLevel = useMemo(() => {
    if (!billboard?.daily_impressions) return 'Moderado';
    if (billboard.daily_impressions > 50000) return 'Muy Alto';
    if (billboard.daily_impressions > 30000) return 'Alto';
    if (billboard.daily_impressions > 15000) return 'Moderado';
    return 'Bajo';
  }, [billboard?.daily_impressions]);
  
  const roadInfo = useMemo(() => getRoadType(estimatedTrafficLevel), [estimatedTrafficLevel]);
  
  const hourlyData = useMemo(() => generateHourlyData(roadInfo.type), [roadInfo.type]);
  const dailyData = useMemo(() => generateDailyData(roadInfo.type), [roadInfo.type]);
  
  // Calculate KPIs
  const dailyImpressions = useMemo(() => {
    if (billboard?.daily_impressions) return billboard.daily_impressions;
    const total = hourlyData.reduce((acc, h) => acc + h.traffic, 0);
    return Math.round(total * 0.7);
  }, [hourlyData, billboard?.daily_impressions]);
  
  const monthlyImpressions = dailyImpressions * 30;
  
  const peakHour = useMemo(() => {
    const peak = hourlyData.reduce((max, h) => h.traffic > max.traffic ? h : max, hourlyData[0]);
    return peak.hour;
  }, [hourlyData]);

  const dynamicPeakHours = useMemo(() => getPeakHours(roadInfo.type), [roadInfo.type]);

  // Calculate city ranking (mock for now)
  const cityRanking = useMemo(() => {
    if (!billboard?.daily_impressions) return null;
    // Estimate ranking based on impressions
    if (billboard.daily_impressions > 40000) return 'Top 10%';
    if (billboard.daily_impressions > 25000) return 'Top 25%';
    if (billboard.daily_impressions > 15000) return 'Top 50%';
    return 'Top 75%';
  }, [billboard?.daily_impressions]);

  if (!billboard) {
    return (
      <Card className="bg-[#1E1E1E] border-white/10 p-8 text-center">
        <Car className="w-12 h-12 mx-auto text-white/30 mb-4" />
        <p className="text-white/60">Selecciona un espectacular para ver el análisis de tráfico</p>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Data Source Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {dataSource === 'live' ? (
              <Badge className="bg-[#9BFF43]/20 text-[#9BFF43] border-[#9BFF43]/30">
                <Wifi className="w-3 h-3 mr-1" />
                Datos en vivo
              </Badge>
            ) : dataSource === 'estimated' ? (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Datos estimados
              </Badge>
            ) : (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                <WifiOff className="w-3 h-3 mr-1" />
                Sin datos
              </Badge>
            )}
            {dataSource !== 'none' && (
              <Badge variant="outline" className="border-white/20 text-white/60">
                Confianza: {confidenceLevel}
              </Badge>
            )}
          </div>
          {cityRanking && (
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              🏆 {cityRanking} de tráfico en {billboard.city}
            </Badge>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[#1E1E1E] border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#9BFF43]/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-[#9BFF43]" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-white/60 text-xs">Impresiones/día</p>
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-white/30" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#2A2A2A] border-white/10 text-white max-w-xs">
                      <p className="text-sm">Número estimado de vehículos que pasan diariamente frente al espectacular, multiplicado por factor de visibilidad.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <p className="text-white font-bold text-lg">~{(dailyImpressions / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </Card>
          
          <Card className="bg-[#1E1E1E] border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-white/60 text-xs">Impresiones/mes</p>
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="w-3 h-3 text-white/30" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#2A2A2A] border-white/10 text-white max-w-xs">
                      <p className="text-sm">Impresiones diarias multiplicadas por 30 días. Valor estimado mensual.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <p className="text-white font-bold text-lg">~{(monthlyImpressions / 1000000).toFixed(1)}M</p>
              </div>
            </div>
          </Card>
          
          <Card className="bg-[#1E1E1E] border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-white/60 text-xs">Horas pico</p>
                <p className="text-white font-bold text-sm">{dynamicPeakHours}</p>
              </div>
            </div>
          </Card>
          
          <Card className="bg-[#1E1E1E] border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Route className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white/60 text-xs">Tipo de vía</p>
                <p className="text-white font-bold text-sm">{roadInfo.icon} {roadInfo.label}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hourly Traffic Chart with Peak Highlighting */}
          <Card className="bg-[#1E1E1E] border-white/10 p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#9BFF43]" />
                <h3 className="text-white font-semibold">Tráfico por Hora</h3>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-[#9BFF43]" />
                  <span className="text-white/60">Hora pico</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-[#FF6B6B]" />
                  <span className="text-white/60">Hora baja</span>
                </div>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="shortHour" 
                    stroke="#666"
                    tick={{ fill: '#999', fontSize: 10 }}
                    interval={2}
                  />
                  <YAxis 
                    stroke="#666"
                    tick={{ fill: '#999', fontSize: 10 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#1E1E1E', 
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#fff' }}
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
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Daily Traffic Chart */}
          <Card className="bg-[#1E1E1E] border-white/10 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h3 className="text-white font-semibold">Tráfico por Día</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="day" 
                    stroke="#666"
                    tick={{ fill: '#999', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#666"
                    tick={{ fill: '#999', fontSize: 10 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#1E1E1E', 
                      border: '1px solid #333',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#fff' }}
                    formatter={(value: number, name: string, props: any) => {
                      const label = props.payload.isWeekend ? '📅 Fin de semana' : 'Entre semana';
                      return [`${value.toLocaleString()} vehículos`, label];
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="traffic" 
                    stroke="#60A5FA" 
                    strokeWidth={3}
                    dot={{ fill: '#60A5FA', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: '#60A5FA' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Traffic Level Badge */}
        <Card className="bg-[#1E1E1E] border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Car className="w-5 h-5 text-white/60" />
              <span className="text-white/80">Nivel de tráfico estimado:</span>
            </div>
            <div className={`px-4 py-2 rounded-full font-semibold text-sm ${
              estimatedTrafficLevel === 'Muy Alto' ? 'bg-red-500/20 text-red-400' :
              estimatedTrafficLevel === 'Alto' ? 'bg-orange-500/20 text-orange-400' :
              estimatedTrafficLevel === 'Moderado' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-green-500/20 text-green-400'
            }`}>
              {estimatedTrafficLevel}
            </div>
          </div>
          <p className="text-white/50 text-sm mt-2">
            * Datos {dataSource === 'live' ? 'obtenidos de TomTom Traffic Flow API' : 'estimados basados en características de la ubicación'}. 
            {(billboard as any).last_traffic_update && ` Última actualización: ${new Date((billboard as any).last_traffic_update).toLocaleDateString('es-MX')}`}
          </p>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default TrafficAnalytics;
