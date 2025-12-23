import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Mock data for demonstration
const monthlyData = [
  { month: 'Sep', earnings: 18000, bookings: 15000 },
  { month: 'Oct', earnings: 22000, bookings: 19000 },
  { month: 'Nov', earnings: 19000, bookings: 16000 },
  { month: 'Dic', earnings: 25000, bookings: 21000 },
  { month: 'Ene', earnings: 21000, bookings: 18000 },
  { month: 'Feb', earnings: 28000, bookings: 24000 },
  { month: 'Mar', earnings: 24000, bookings: 20000 },
  { month: 'Abr', earnings: 26000, bookings: 22000 },
  { month: 'May', earnings: 30000, bookings: 26000 },
  { month: 'Jun', earnings: 32000, bookings: 28000 },
  { month: 'Jul', earnings: 29000, bookings: 25000 },
  { month: 'Ago', earnings: 35000, bookings: 30000 },
];

interface EarningsChartProps {
  totalEarnings?: number;
}

const EarningsChart: React.FC<EarningsChartProps> = ({ totalEarnings = 35000 }) => {
  const [period, setPeriod] = useState('mensual');

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg px-3 py-2">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-sm text-primary font-bold">${payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-background rounded-2xl border border-border p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground">${totalEarnings.toLocaleString()}</h2>
          <p className="text-muted-foreground">Ganancias</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32 bg-background border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mensual">Mensual</SelectItem>
            <SelectItem value="semanal">Semanal</SelectItem>
            <SelectItem value="anual">Anual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(220, 80%, 55%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(220, 80%, 55%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="bookings"
              stroke="hsl(142, 76%, 36%)"
              strokeWidth={2}
              fill="url(#colorBookings)"
            />
            <Area
              type="monotone"
              dataKey="earnings"
              stroke="hsl(220, 80%, 55%)"
              strokeWidth={2}
              fill="url(#colorEarnings)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EarningsChart;
