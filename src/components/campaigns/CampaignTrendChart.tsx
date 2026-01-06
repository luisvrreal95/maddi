import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { format, eachDayOfInterval, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';

interface CampaignTrendChartProps {
  startDate: string;
  endDate: string;
  dailyImpressions: number;
  isActive?: boolean;
}

const CampaignTrendChart: React.FC<CampaignTrendChartProps> = ({
  startDate,
  endDate,
  dailyImpressions,
  isActive = false,
}) => {
  const chartData = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    // Calculate end date for chart (today if active, else end date)
    const chartEnd = isActive && isBefore(now, end) ? now : end;
    
    // Get all days in range
    const days = eachDayOfInterval({ start, end: chartEnd });
    
    // Generate data with natural variation (+/- 20%)
    return days.map((day, index) => {
      // Create reproducible "random" variation based on day
      const seed = day.getDate() * 7 + day.getMonth() * 31;
      const variation = (Math.sin(seed) * 0.2); // -20% to +20%
      const impressions = Math.round(dailyImpressions * (1 + variation));
      
      // Add weekend boost (Sat/Sun have more traffic on some billboards)
      const dayOfWeek = day.getDay();
      const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.1 : 1;
      
      return {
        date: format(day, 'dd MMM', { locale: es }),
        fullDate: format(day, "d 'de' MMMM", { locale: es }),
        impressions: Math.round(impressions * weekendBoost),
        isFuture: isAfter(day, now),
      };
    });
  }, [startDate, endDate, dailyImpressions, isActive]);

  const totalImpressions = chartData.reduce((sum, day) => sum + (day.isFuture ? 0 : day.impressions), 0);
  const averageImpressions = Math.round(
    chartData.filter(d => !d.isFuture).reduce((sum, d) => sum + d.impressions, 0) / 
    Math.max(1, chartData.filter(d => !d.isFuture).length)
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">{payload[0]?.payload?.fullDate}</p>
          <p className="text-sm font-semibold text-foreground">
            {payload[0]?.value?.toLocaleString()} personas
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Impresiones por Día
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="impressionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                width={35}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="impressions"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#impressionsGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Total acumulado</p>
            <p className="text-lg font-bold text-foreground">{totalImpressions.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Promedio diario</p>
            <p className="text-lg font-bold text-foreground">{averageImpressions.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CampaignTrendChart;
