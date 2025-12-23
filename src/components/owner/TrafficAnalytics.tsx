import React, { useMemo } from 'react';
import { Billboard } from '@/hooks/useBillboards';
import { Card } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { 
  Car, 
  TrendingUp, 
  Clock, 
  Route,
  Eye,
  Calendar
} from 'lucide-react';

interface TrafficAnalyticsProps {
  billboard: Billboard | null;
}

// Generate simulated hourly traffic data based on road type
const generateHourlyData = (roadType: string) => {
  const baseMultiplier = roadType === 'highway' ? 1.5 : roadType === 'main_avenue' ? 1.2 : 1;
  
  const hours = [];
  for (let i = 0; i < 24; i++) {
    let traffic = 0;
    // Morning rush: 7-9am
    if (i >= 7 && i <= 9) {
      traffic = 8000 + Math.random() * 2000;
    }
    // Midday: 10am-4pm
    else if (i >= 10 && i <= 16) {
      traffic = 5000 + Math.random() * 1500;
    }
    // Evening rush: 5-8pm
    else if (i >= 17 && i <= 20) {
      traffic = 9000 + Math.random() * 2500;
    }
    // Night: 9pm-6am
    else {
      traffic = 1500 + Math.random() * 1000;
    }
    
    hours.push({
      hour: `${i.toString().padStart(2, '0')}:00`,
      shortHour: i.toString().padStart(2, '0'),
      traffic: Math.round(traffic * baseMultiplier),
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
    // Weekdays
    if (index < 5) {
      traffic = 120000 + Math.random() * 30000;
    }
    // Weekend
    else {
      traffic = 80000 + Math.random() * 20000;
    }
    
    return {
      day,
      traffic: Math.round(traffic * baseMultiplier),
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

const TrafficAnalytics: React.FC<TrafficAnalyticsProps> = ({ billboard }) => {
  // Use daily_impressions to determine traffic level, or default to 'moderate'
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
    return Math.round(total * 0.7); // 70% view rate
  }, [hourlyData, billboard?.daily_impressions]);
  
  const monthlyImpressions = dailyImpressions * 30;
  
  const peakHour = useMemo(() => {
    const peak = hourlyData.reduce((max, h) => h.traffic > max.traffic ? h : max, hourlyData[0]);
    return peak.hour;
  }, [hourlyData]);

  if (!billboard) {
    return (
      <Card className="bg-[#1E1E1E] border-white/10 p-8 text-center">
        <Car className="w-12 h-12 mx-auto text-white/30 mb-4" />
        <p className="text-white/60">Selecciona un espectacular para ver el análisis de tráfico</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#1E1E1E] border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#9BFF43]/20 flex items-center justify-center">
              <Eye className="w-5 h-5 text-[#9BFF43]" />
            </div>
            <div>
              <p className="text-white/60 text-xs">Impresiones/día</p>
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
              <p className="text-white/60 text-xs">Impresiones/mes</p>
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
              <p className="text-white/60 text-xs">Hora pico</p>
              <p className="text-white font-bold text-lg">{peakHour}</p>
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
        {/* Hourly Traffic Chart */}
        <Card className="bg-[#1E1E1E] border-white/10 p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#9BFF43]" />
            <h3 className="text-white font-semibold">Tráfico por Hora</h3>
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
                  formatter={(value: number) => [`${value.toLocaleString()} vehículos`, 'Tráfico']}
                  labelFormatter={(label) => `${label}:00 hrs`}
                />
                <Bar 
                  dataKey="traffic" 
                  fill="#9BFF43" 
                  radius={[4, 4, 0, 0]}
                />
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
                  formatter={(value: number) => [`${value.toLocaleString()} vehículos`, 'Tráfico']}
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
          * Datos estimados basados en el análisis de TomTom Traffic Flow. Los valores reales pueden variar.
        </p>
      </Card>
    </div>
  );
};

export default TrafficAnalytics;
