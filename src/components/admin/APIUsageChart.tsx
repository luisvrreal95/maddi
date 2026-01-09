import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Zap, AlertTriangle, Clock } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";

interface APIUsageData {
  totalRequests: number;
  requestsByAPI: { api: string; count: number; color: string }[];
  requestsByScreen: { screen: string; count: number }[];
  dailyRequests: { date: string; tomtom: number; mapbox: number; inegi: number }[];
  avgLatency: number;
  errorRate: number;
}

const API_COLORS: Record<string, string> = {
  tomtom: '#FF6B35',
  mapbox: '#4264FB',
  inegi: '#00A86B'
};

const chartConfig = {
  tomtom: {
    label: "TomTom",
    color: API_COLORS.tomtom,
  },
  mapbox: {
    label: "Mapbox",
    color: API_COLORS.mapbox,
  },
  inegi: {
    label: "INEGI",
    color: API_COLORS.inegi,
  },
} satisfies ChartConfig;

const APIUsageChart = () => {
  const [data, setData] = useState<APIUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    const fetchAPIUsage = async () => {
      setLoading(true);
      try {
        const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const startDate = startOfDay(subDays(new Date(), daysBack));

        const { data: logs, error } = await supabase
          .from('api_usage_logs')
          .select('*')
          .gte('request_timestamp', startDate.toISOString())
          .order('request_timestamp', { ascending: true });

        if (error) throw error;

        if (!logs || logs.length === 0) {
          setData({
            totalRequests: 0,
            requestsByAPI: [],
            requestsByScreen: [],
            dailyRequests: [],
            avgLatency: 0,
            errorRate: 0
          });
          return;
        }

        // Process data
        const apiCounts: Record<string, number> = {};
        const screenCounts: Record<string, number> = {};
        const dailyCounts: Record<string, { tomtom: number; mapbox: number; inegi: number }> = {};
        let totalLatency = 0;
        let latencyCount = 0;
        let errorCount = 0;

        logs.forEach(log => {
          // Count by API
          apiCounts[log.api_name] = (apiCounts[log.api_name] || 0) + 1;
          
          // Count by screen
          const screen = log.source_screen || 'unknown';
          screenCounts[screen] = (screenCounts[screen] || 0) + 1;

          // Daily counts
          const day = format(new Date(log.request_timestamp), 'yyyy-MM-dd');
          if (!dailyCounts[day]) {
            dailyCounts[day] = { tomtom: 0, mapbox: 0, inegi: 0 };
          }
          const apiKey = log.api_name as 'tomtom' | 'mapbox' | 'inegi';
          if (dailyCounts[day][apiKey] !== undefined) {
            dailyCounts[day][apiKey]++;
          }

          // Latency
          if (log.latency_ms) {
            totalLatency += log.latency_ms;
            latencyCount++;
          }

          // Errors
          if (log.response_status && log.response_status >= 400) {
            errorCount++;
          }
        });

        // Format data for charts
        const requestsByAPI = Object.entries(apiCounts).map(([api, count]) => ({
          api,
          count,
          color: API_COLORS[api] || '#888'
        }));

        const requestsByScreen = Object.entries(screenCounts)
          .map(([screen, count]) => ({ screen, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        const dailyRequests = Object.entries(dailyCounts)
          .map(([date, counts]) => ({
            date: format(new Date(date), 'dd/MM', { locale: es }),
            ...counts
          }))
          .slice(-14); // Last 14 days max for readability

        setData({
          totalRequests: logs.length,
          requestsByAPI,
          requestsByScreen,
          dailyRequests,
          avgLatency: latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
          errorRate: logs.length > 0 ? Math.round((errorCount / logs.length) * 100) : 0
        });
      } catch (error) {
        console.error('Error fetching API usage:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAPIUsage();
  }, [period]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || data.totalRequests === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Activity className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No hay datos de uso de APIs todavía</p>
          <p className="text-sm text-muted-foreground mt-1">
            Los logs se registrarán cuando los usuarios interactúen con el mapa
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector and summary stats */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                period === p 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {p === '7d' ? '7 días' : p === '30d' ? '30 días' : '90 días'}
            </button>
          ))}
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm">
              <span className="font-bold">{data.totalRequests.toLocaleString()}</span> requests
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span className="text-sm">
              <span className="font-bold">{data.avgLatency}ms</span> avg
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm">
              <span className="font-bold">{data.errorRate}%</span> errores
            </span>
          </div>
        </div>
      </div>

      {/* Stats by API */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.requestsByAPI.map((api) => (
          <Card key={api.api} className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: api.color }}
                  />
                  <span className="font-medium capitalize">{api.api}</span>
                </div>
                <span className="text-2xl font-bold">{api.count.toLocaleString()}</span>
              </div>
              <div className="mt-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ 
                      width: `${(api.count / data.totalRequests) * 100}%`,
                      backgroundColor: api.color 
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {Math.round((api.count / data.totalRequests) * 100)}% del total
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily requests chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Requests por Día</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <LineChart data={data.dailyRequests}>
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="tomtom" 
                  stroke={API_COLORS.tomtom} 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="mapbox" 
                  stroke={API_COLORS.mapbox} 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="inegi" 
                  stroke={API_COLORS.inegi} 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Requests by screen */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Top Pantallas por Consumo</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={data.requestsByScreen} layout="vertical">
                <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis 
                  type="category" 
                  dataKey="screen" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  width={100}
                  tickFormatter={(value) => value.replace(/_/g, ' ')}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        {Object.entries(API_COLORS).map(([api, color]) => (
          <div key={api} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm capitalize">{api}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default APIUsageChart;
