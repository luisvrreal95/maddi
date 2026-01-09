import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface MonthlyData {
  month: string;
  revenue: number;
  commissions: number;
  campaigns: number;
}

interface CityData {
  name: string;
  value: number;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
const STATUS_COLORS: Record<string, string> = {
  pending: 'hsl(var(--muted-foreground))',
  approved: 'hsl(var(--primary))',
  completed: 'hsl(142, 76%, 36%)',
  rejected: 'hsl(0, 84%, 60%)',
  cancelled: 'hsl(0, 60%, 50%)'
};

const AdminCharts = () => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [statusData, setStatusData] = useState<StatusData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all bookings
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select(`
            id,
            start_date,
            end_date,
            total_price,
            status,
            created_at,
            billboard_id
          `)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Fetch billboards for city data
        const billboardIds = [...new Set(bookings?.map(b => b.billboard_id) || [])];
        const { data: billboards } = await supabase
          .from('billboards')
          .select('id, city')
          .in('id', billboardIds);

        const billboardCityMap = new Map(billboards?.map(b => [b.id, b.city]) || []);

        // Process monthly data (last 6 months)
        const now = new Date();
        const monthlyStats: MonthlyData[] = [];
        
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(now, i);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          
          const monthBookings = bookings?.filter(b => {
            const createdAt = new Date(b.created_at);
            return createdAt >= monthStart && createdAt <= monthEnd;
          }) || [];

          const approvedBookings = monthBookings.filter(b => 
            b.status === 'approved' || b.status === 'completed'
          );

          const revenue = approvedBookings.reduce((sum, b) => sum + Number(b.total_price), 0);
          
          monthlyStats.push({
            month: format(monthDate, 'MMM', { locale: es }),
            revenue,
            commissions: revenue * 0.15,
            campaigns: monthBookings.length
          });
        }
        setMonthlyData(monthlyStats);

        // Process city data
        const cityCount: Record<string, number> = {};
        bookings?.forEach(b => {
          const city = billboardCityMap.get(b.billboard_id) || 'Desconocida';
          if (b.status === 'approved' || b.status === 'completed') {
            cityCount[city] = (cityCount[city] || 0) + Number(b.total_price);
          }
        });
        setCityData(
          Object.entries(cityCount)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
        );

        // Process status data
        const statusCount: Record<string, number> = {};
        bookings?.forEach(b => {
          statusCount[b.status] = (statusCount[b.status] || 0) + 1;
        });
        
        const statusLabels: Record<string, string> = {
          pending: 'Pendientes',
          approved: 'Aprobadas',
          completed: 'Completadas',
          rejected: 'Rechazadas',
          cancelled: 'Canceladas'
        };
        
        setStatusData(
          Object.entries(statusCount).map(([status, value]) => ({
            name: statusLabels[status] || status,
            value,
            color: STATUS_COLORS[status] || COLORS[0]
          }))
        );

      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className={i === 0 ? "lg:col-span-2" : ""}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Revenue & Commissions Chart - Full width */}
      <Card className="lg:col-span-2 bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Ingresos y Comisiones (Últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCommissions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="month" 
                className="text-xs fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                className="text-xs fill-muted-foreground"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value), 
                  name === 'revenue' ? 'Ingresos' : 'Comisiones Maddi'
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend 
                formatter={(value) => value === 'revenue' ? 'Ingresos Totales' : 'Comisiones Maddi'}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorRevenue)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="commissions"
                stroke="hsl(var(--chart-2))"
                fillOpacity={1}
                fill="url(#colorCommissions)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Campaigns by City */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Ingresos por Ciudad</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={cityData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
              <XAxis 
                type="number" 
                className="text-xs fill-muted-foreground"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                className="text-xs fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Ingresos']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Campaign Status Distribution */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Estado de Campañas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => [value, name]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCharts;
