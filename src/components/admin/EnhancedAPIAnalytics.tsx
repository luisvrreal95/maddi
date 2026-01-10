import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, Zap, AlertTriangle, Clock, TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { format, subDays, startOfDay, startOfHour, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface APIUsageData {
  totalRequests: number;
  requestsByAPI: { api: string; count: number; color: string; cost: number }[];
  requestsByScreen: { screen: string; count: number; apis: Record<string, number> }[];
  dailyRequests: { date: string; tomtom: number; mapbox: number; inegi: number; total: number }[];
  hourlyDistribution: { hour: string; count: number }[];
  avgLatency: number;
  errorRate: number;
  estimatedCost: number;
  previousPeriodRequests: number;
  topBillboards: { id: string; title: string; requests: number }[];
  errorLogs: { api: string; status: number; count: number; latency: number }[];
}

// Estimated costs per 1000 requests (in USD)
const API_COSTS: Record<string, number> = {
  tomtom: 0.50,  // Traffic Flow API
  mapbox: 0.25,  // Static Images API
  inegi: 0.00,   // Free government API
};

const API_COLORS: Record<string, string> = {
  tomtom: '#FF6B35',
  mapbox: '#4264FB',
  inegi: '#00A86B'
};

const chartConfig = {
  tomtom: { label: "TomTom", color: API_COLORS.tomtom },
  mapbox: { label: "Mapbox", color: API_COLORS.mapbox },
  inegi: { label: "INEGI", color: API_COLORS.inegi },
  total: { label: "Total", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const EnhancedAPIAnalytics = () => {
  const [data, setData] = useState<APIUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    const fetchAPIUsage = async () => {
      setLoading(true);
      try {
        const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : 90;
        const startDate = startOfDay(subDays(new Date(), daysBack));
        const previousStartDate = startOfDay(subDays(startDate, daysBack));

        // Current period
        const { data: logs, error } = await supabase
          .from('api_usage_logs')
          .select('*')
          .gte('request_timestamp', startDate.toISOString())
          .order('request_timestamp', { ascending: true });

        // Previous period for comparison
        const { data: previousLogs } = await supabase
          .from('api_usage_logs')
          .select('id')
          .gte('request_timestamp', previousStartDate.toISOString())
          .lt('request_timestamp', startDate.toISOString());

        if (error) throw error;

        if (!logs || logs.length === 0) {
          setData({
            totalRequests: 0,
            requestsByAPI: [],
            requestsByScreen: [],
            dailyRequests: [],
            hourlyDistribution: [],
            avgLatency: 0,
            errorRate: 0,
            estimatedCost: 0,
            previousPeriodRequests: previousLogs?.length || 0,
            topBillboards: [],
            errorLogs: [],
          });
          return;
        }

        // Process data
        const apiCounts: Record<string, number> = {};
        const screenData: Record<string, { count: number; apis: Record<string, number> }> = {};
        const dailyCounts: Record<string, Record<string, number>> = {};
        const hourlyCounts: Record<number, number> = {};
        const billboardCounts: Record<string, number> = {};
        const errorsByAPI: Record<string, { count: number; totalLatency: number }> = {};
        
        let totalLatency = 0;
        let latencyCount = 0;
        let errorCount = 0;

        logs.forEach(log => {
          const apiName = log.api_name.toLowerCase();
          
          // Count by API
          apiCounts[apiName] = (apiCounts[apiName] || 0) + 1;
          
          // Count by screen with API breakdown
          const screen = log.source_screen || 'unknown';
          if (!screenData[screen]) {
            screenData[screen] = { count: 0, apis: {} };
          }
          screenData[screen].count++;
          screenData[screen].apis[apiName] = (screenData[screen].apis[apiName] || 0) + 1;

          // Daily counts
          const day = format(new Date(log.request_timestamp), 'yyyy-MM-dd');
          if (!dailyCounts[day]) {
            dailyCounts[day] = { tomtom: 0, mapbox: 0, inegi: 0 };
          }
          if (dailyCounts[day][apiName] !== undefined) {
            dailyCounts[day][apiName]++;
          }

          // Hourly distribution
          const hour = new Date(log.request_timestamp).getHours();
          hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;

          // Billboard counts
          if (log.billboard_id) {
            billboardCounts[log.billboard_id] = (billboardCounts[log.billboard_id] || 0) + 1;
          }

          // Latency
          if (log.latency_ms) {
            totalLatency += log.latency_ms;
            latencyCount++;
          }

          // Errors
          if (log.response_status && log.response_status >= 400) {
            errorCount++;
            if (!errorsByAPI[apiName]) {
              errorsByAPI[apiName] = { count: 0, totalLatency: 0 };
            }
            errorsByAPI[apiName].count++;
            errorsByAPI[apiName].totalLatency += log.latency_ms || 0;
          }
        });

        // Calculate estimated costs
        let estimatedCost = 0;
        const requestsByAPI = Object.entries(apiCounts).map(([api, count]) => {
          const cost = (count / 1000) * (API_COSTS[api] || 0);
          estimatedCost += cost;
          return {
            api,
            count,
            color: API_COLORS[api] || '#888',
            cost,
          };
        });

        // Format data for charts
        const requestsByScreen = Object.entries(screenData)
          .map(([screen, data]) => ({ screen, ...data }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        const dailyRequests = Object.entries(dailyCounts)
          .map(([date, counts]) => ({
            date: format(new Date(date), 'dd/MM', { locale: es }),
            tomtom: counts.tomtom || 0,
            mapbox: counts.mapbox || 0,
            inegi: counts.inegi || 0,
            total: Object.values(counts).reduce((a, b) => a + b, 0),
          }))
          .slice(-14);

        const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
          hour: `${hour.toString().padStart(2, '0')}:00`,
          count: hourlyCounts[hour] || 0,
        }));

        // Get top billboards with titles
        const topBillboardIds = Object.entries(billboardCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([id]) => id);

        let topBillboards: { id: string; title: string; requests: number }[] = [];
        if (topBillboardIds.length > 0) {
          const { data: billboardsData } = await supabase
            .from('billboards')
            .select('id, title')
            .in('id', topBillboardIds);

          topBillboards = topBillboardIds.map(id => {
            const billboard = billboardsData?.find(b => b.id === id);
            return {
              id,
              title: billboard?.title || 'Desconocido',
              requests: billboardCounts[id],
            };
          });
        }

        // Error logs
        const errorLogs = Object.entries(errorsByAPI).map(([api, data]) => ({
          api,
          status: 400,
          count: data.count,
          latency: data.count > 0 ? Math.round(data.totalLatency / data.count) : 0,
        }));

        setData({
          totalRequests: logs.length,
          requestsByAPI,
          requestsByScreen,
          dailyRequests,
          hourlyDistribution,
          avgLatency: latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
          errorRate: logs.length > 0 ? Math.round((errorCount / logs.length) * 100 * 100) / 100 : 0,
          estimatedCost: Math.round(estimatedCost * 100) / 100,
          previousPeriodRequests: previousLogs?.length || 0,
          topBillboards,
          errorLogs,
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

  const growthPercentage = data.previousPeriodRequests > 0 
    ? Math.round(((data.totalRequests - data.previousPeriodRequests) / data.previousPeriodRequests) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
                period === p 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {p === '7d' ? '7 días' : p === '30d' ? '30 días' : '90 días'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{data.totalRequests.toLocaleString()}</p>
              </div>
              <div className={`flex items-center gap-1 text-sm ${growthPercentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {growthPercentage >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(growthPercentage)}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Costo Estimado</p>
                <p className="text-2xl font-bold">${data.estimatedCost.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Latencia Promedio</p>
                <p className="text-2xl font-bold">{data.avgLatency}ms</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasa de Error</p>
                <p className="text-2xl font-bold">{data.errorRate}%</p>
              </div>
              <AlertTriangle className={`w-8 h-8 opacity-50 ${data.errorRate > 5 ? 'text-red-500' : 'text-green-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Breakdown with costs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.requestsByAPI.map((api) => (
          <Card key={api.api} className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: api.color }}
                  />
                  <span className="font-semibold capitalize text-lg">{api.api}</span>
                </div>
                <span className="text-2xl font-bold">{api.count.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{Math.round((api.count / data.totalRequests) * 100)}% del total</span>
                <span className="text-primary">${api.cost.toFixed(2)} USD</span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ 
                    width: `${(api.count / data.totalRequests) * 100}%`,
                    backgroundColor: api.color 
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Tendencia Diaria</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <AreaChart data={data.dailyRequests}>
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area 
                  type="monotone" 
                  dataKey="tomtom" 
                  stackId="1"
                  stroke={API_COLORS.tomtom} 
                  fill={API_COLORS.tomtom}
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="mapbox" 
                  stackId="1"
                  stroke={API_COLORS.mapbox} 
                  fill={API_COLORS.mapbox}
                  fillOpacity={0.6}
                />
                <Area 
                  type="monotone" 
                  dataKey="inegi" 
                  stackId="1"
                  stroke={API_COLORS.inegi} 
                  fill={API_COLORS.inegi}
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Distribución por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={data.hourlyDistribution}>
                <XAxis dataKey="hour" fontSize={10} tickLine={false} axisLine={false} interval={2} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Billboards */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Top Espectaculares por Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topBillboards.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Espectacular</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topBillboards.map((billboard, idx) => (
                    <TableRow key={billboard.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">#{idx + 1}</span>
                          <span className="truncate max-w-[200px]">{billboard.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{billboard.requests.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">Sin datos</p>
            )}
          </CardContent>
        </Card>

        {/* Top Screens */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Top Pantallas por Consumo</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pantalla</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">APIs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.requestsByScreen.slice(0, 5).map((screen) => (
                  <TableRow key={screen.screen}>
                    <TableCell className="font-medium">
                      {screen.screen.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell className="text-right">{screen.count.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {Object.entries(screen.apis).map(([api, count]) => (
                          <Badge 
                            key={api} 
                            variant="outline" 
                            className="text-xs"
                            style={{ borderColor: API_COLORS[api], color: API_COLORS[api] }}
                          >
                            {api}: {count}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Error Logs */}
      {data.errorLogs.length > 0 && (
        <Card className="bg-card border-border border-red-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              Errores por API
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>API</TableHead>
                  <TableHead className="text-right">Errores</TableHead>
                  <TableHead className="text-right">Latencia Promedio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.errorLogs.map((error) => (
                  <TableRow key={error.api}>
                    <TableCell className="font-medium capitalize">{error.api}</TableCell>
                    <TableCell className="text-right text-red-400">{error.count}</TableCell>
                    <TableCell className="text-right">{error.latency}ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-6 justify-center pt-4 border-t border-border">
        {Object.entries(API_COLORS).map(([api, color]) => (
          <div key={api} className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="capitalize font-medium">{api}</span>
            <span className="text-muted-foreground text-sm">
              (${API_COSTS[api]?.toFixed(2) || '0.00'}/1K)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnhancedAPIAnalytics;
