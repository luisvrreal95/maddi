import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Billboard } from '@/hooks/useBillboards';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  DollarSign, 
  Calendar,
  MapPin,
  BarChart3,
  Trophy,
  AlertTriangle,
  Rocket,
  Info
} from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AnalyticsDashboardProps {
  billboards: Billboard[];
  userId: string;
}

interface Booking {
  id: string;
  billboard_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  created_at: string;
}

const COLORS = ['#9BFF43', '#7ED321', '#5AB515', '#3D9A0A', '#2A7A00'];

type TimePeriod = '7d' | '30d';

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ billboards, userId }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previousMonthEarnings, setPreviousMonthEarnings] = useState(0);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const billboardIds = billboards.map(b => b.id);
        
        if (billboardIds.length === 0) {
          setBookings([]);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .in('billboard_id', billboardIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBookings(data || []);
        
        // Calculate previous month earnings
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        
        const prevEarnings = (data || [])
          .filter(b => {
            const createdAt = new Date(b.created_at);
            return b.status === 'approved' && createdAt >= previousMonthStart && createdAt < currentMonthStart;
          })
          .reduce((sum, b) => sum + b.total_price, 0);
        
        setPreviousMonthEarnings(prevEarnings);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [billboards]);

  // Filter bookings based on time period
  const getFilteredBookings = () => {
    const now = new Date();
    const periodStart = new Date();
    periodStart.setDate(now.getDate() - (timePeriod === '7d' ? 7 : 30));
    
    return bookings.filter(b => {
      const createdAt = new Date(b.created_at);
      return createdAt >= periodStart;
    });
  };

  const filteredBookings = getFilteredBookings();

  // Calculate metrics for filtered period
  const totalEarnings = filteredBookings
    .filter(b => b.status === 'approved')
    .reduce((acc, b) => acc + b.total_price, 0);

  const pendingEarnings = filteredBookings
    .filter(b => b.status === 'pending')
    .reduce((acc, b) => acc + b.total_price, 0);

  const approvedBookings = filteredBookings.filter(b => b.status === 'approved').length;
  const pendingBookings = filteredBookings.filter(b => b.status === 'pending').length;
  const rejectedBookings = filteredBookings.filter(b => b.status === 'rejected').length;
  const totalBookings = filteredBookings.length;

  const occupancyRate = billboards.length > 0 
    ? Math.round((approvedBookings / Math.max(billboards.length, 1)) * 100)
    : 0;

  const totalImpressions = billboards.reduce((acc, b) => acc + (b.daily_impressions || 0), 0) * (timePeriod === '7d' ? 7 : 30);
  
  // Calculate earnings change compared to previous period
  const getPreviousPeriodEarnings = () => {
    const now = new Date();
    const periodDays = timePeriod === '7d' ? 7 : 30;
    const periodStart = new Date();
    periodStart.setDate(now.getDate() - periodDays);
    const previousStart = new Date();
    previousStart.setDate(now.getDate() - (periodDays * 2));
    
    return bookings
      .filter(b => {
        const createdAt = new Date(b.created_at);
        return b.status === 'approved' && createdAt >= previousStart && createdAt < periodStart;
      })
      .reduce((acc, b) => acc + b.total_price, 0);
  };
  
  const previousPeriodEarnings = getPreviousPeriodEarnings();
  const earningsChange = previousPeriodEarnings > 0 
    ? ((totalEarnings - previousPeriodEarnings) / previousPeriodEarnings) * 100 
    : 0;
  
  // Find most viewed billboard (using daily_impressions as proxy)
  const mostViewedBillboard = billboards.reduce((max, b) => 
    (b.daily_impressions || 0) > (max?.daily_impressions || 0) ? b : max, 
    billboards[0]
  );

  // Get recommendation for billboard
  const getRecommendation = (billboard: Billboard, revenue: number, bookingCount: number) => {
    const avgPrice = billboards.reduce((sum, b) => sum + Number(b.price_per_month), 0) / billboards.length;
    const price = Number(billboard.price_per_month);
    
    if (bookingCount > 2 && price < avgPrice * 0.8) {
      return { text: 'Subir precio 15%', color: 'text-emerald-400', icon: <TrendingUp className="w-3 h-3" /> };
    }
    if (billboard.is_available && bookingCount === 0) {
      return { text: 'Promocionar', color: 'text-orange-400', icon: <Rocket className="w-3 h-3" /> };
    }
    if (revenue === 0 && !billboard.is_available) {
      return { text: 'Revisar demanda', color: 'text-yellow-400', icon: <AlertTriangle className="w-3 h-3" /> };
    }
    return { text: 'Mantener', color: 'text-white/40', icon: null };
  };

  // Get performance label
  const getPerformanceLabel = (billboard: Billboard, revenue: number) => {
    const maxRevenue = Math.max(...billboards.map(b => {
      return bookings.filter(bk => bk.billboard_id === b.id && bk.status === 'approved')
        .reduce((sum, bk) => sum + bk.total_price, 0);
    }));
    
    if (revenue === maxRevenue && revenue > 0) {
      return { text: 'Top performer', color: 'bg-[#9BFF43]/20 text-[#9BFF43]', icon: <Trophy className="w-3 h-3" /> };
    }
    if (billboard.daily_impressions && billboard.daily_impressions > 30000 && revenue < 5000) {
      return { text: 'Alta oportunidad', color: 'bg-blue-500/20 text-blue-400', icon: <Rocket className="w-3 h-3" /> };
    }
    if (revenue === 0) {
      return { text: 'Bajo rendimiento', color: 'bg-red-500/20 text-red-400', icon: <AlertTriangle className="w-3 h-3" /> };
    }
    return null;
  };

  // Monthly earnings data
  const getMonthlyEarnings = () => {
    const months: { [key: string]: number } = {};
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
      months[key] = 0;
    }

    bookings.filter(b => b.status === 'approved').forEach(booking => {
      const date = new Date(booking.created_at);
      const key = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
      if (months[key] !== undefined) {
        months[key] += booking.total_price;
      }
    });

    return Object.entries(months).map(([name, earnings]) => ({ name, earnings }));
  };

  const bookingsByStatus = [
    { name: 'Aprobadas', value: approvedBookings, color: '#9BFF43' },
    { name: 'Pendientes', value: pendingBookings, color: '#FFC107' },
    { name: 'Rechazadas', value: rejectedBookings, color: '#FF4444' },
  ].filter(item => item.value > 0);

  const revenueByBillboard = billboards.map(billboard => {
    const revenue = bookings
      .filter(b => b.billboard_id === billboard.id && b.status === 'approved')
      .reduce((acc, b) => acc + b.total_price, 0);
    return {
      name: billboard.title.length > 15 ? billboard.title.slice(0, 15) + '...' : billboard.title,
      revenue,
      price: billboard.price_per_month,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const monthlyData = getMonthlyEarnings();
  const dataStartDate = bookings.length > 0 
    ? new Date(Math.min(...bookings.map(b => new Date(b.created_at).getTime()))).toLocaleDateString('es-MX')
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/60">Cargando estadísticas...</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {/* Time Period Filter */}
        <div className="flex items-center justify-between">
          <p className="text-white/60 text-sm">
            Mostrando datos de los últimos {timePeriod === '7d' ? '7 días' : '30 días'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setTimePeriod('7d')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timePeriod === '7d'
                  ? 'bg-[#9BFF43] text-[#121212]'
                  : 'bg-[#2A2A2A] text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Últimos 7 días
            </button>
            <button
              onClick={() => setTimePeriod('30d')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timePeriod === '30d'
                  ? 'bg-[#9BFF43] text-[#121212]'
                  : 'bg-[#2A2A2A] text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Últimos 30 días
            </button>
          </div>
        </div>

        {/* Simplified KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-[#9BFF43]/20 to-[#9BFF43]/5 border-[#9BFF43]/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Ingresos del periodo</p>
                <p className="text-3xl font-bold text-white">${totalEarnings.toLocaleString()}</p>
                {earningsChange !== 0 && (
                  <div className={`flex items-center gap-1 text-sm mt-1 ${earningsChange >= 0 ? 'text-[#9BFF43]' : 'text-red-400'}`}>
                    {earningsChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {earningsChange >= 0 ? 'Sube' : 'Baja'} {Math.abs(earningsChange).toFixed(0)}%
                  </div>
                )}
              </div>
              <div className="w-12 h-12 rounded-full bg-[#9BFF43]/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#9BFF43]" />
              </div>
            </div>
          </Card>

          <Card className="bg-[#1E1E1E] border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Contactos recibidos</p>
                <p className="text-3xl font-bold text-white">{totalBookings}</p>
                <p className="text-sm text-white/40 mt-1">{approvedBookings} confirmados</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white/60" />
              </div>
            </div>
          </Card>

          {/* Most Viewed Billboard */}
          {mostViewedBillboard && (
            <Card className="bg-[#1E1E1E] border-white/10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm mb-1">Espectacular más visto</p>
                  <p className="text-lg font-bold text-white truncate max-w-[150px]">{mostViewedBillboard.title}</p>
                  <p className="text-sm text-white/40 mt-1">
                    {((mostViewedBillboard.daily_impressions || 0) / 1000).toFixed(0)}K impresiones/día
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white/60" />
                </div>
              </div>
            </Card>
          )}

          <Card className="bg-[#1E1E1E] border-white/10 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Vistas estimadas</p>
                <p className="text-3xl font-bold text-white">
                  {totalImpressions >= 1000000 ? `${(totalImpressions / 1000000).toFixed(1)}M` : totalImpressions >= 1000 ? `${(totalImpressions / 1000).toFixed(0)}K` : totalImpressions}
                </p>
                <p className="text-sm text-white/40 mt-1">en {timePeriod === '7d' ? '7 días' : '30 días'}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white/60" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-[#1E1E1E] border-white/10 p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Ganancias Mensuales</h3>
              {dataStartDate && (
                <UITooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="border-white/20 text-white/50 text-xs">
                      <Info className="w-3 h-3 mr-1" />
                      Datos desde {dataStartDate}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="bg-[#2A2A2A] border-white/10">
                    <p className="text-sm">Los datos comienzan desde tu primera reserva</p>
                  </TooltipContent>
                </UITooltip>
              )}
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9BFF43" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#9BFF43" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="name" stroke="#666" tick={{ fill: '#888', fontSize: 12 }} />
                  <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 12 }} tickFormatter={(value) => `$${value >= 1000 ? `${value/1000}k` : value}`} />
                  <Tooltip contentStyle={{ backgroundColor: '#2A2A2A', border: '1px solid #444', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ganancias']} />
                  <Area type="monotone" dataKey="earnings" stroke="#9BFF43" strokeWidth={2} fillOpacity={1} fill="url(#colorEarnings)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="bg-[#1E1E1E] border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Estado de Reservas</h3>
            {bookingsByStatus.length > 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="70%">
                  <PieChart>
                    <Pie data={bookingsByStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {bookingsByStatus.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#2A2A2A', border: '1px solid #444', borderRadius: '8px' }} formatter={(value: number, name: string) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-4">
                  {bookingsByStatus.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-white/60 text-sm">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-white/40">Sin reservas aún</div>
            )}
          </Card>
        </div>

        {/* Revenue by Billboard */}
        {revenueByBillboard.length > 0 && (
          <Card className="bg-[#1E1E1E] border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Ingresos por Espectacular</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByBillboard} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" stroke="#666" tick={{ fill: '#888', fontSize: 12 }} tickFormatter={(value) => `$${value >= 1000 ? `${value/1000}k` : value}`} />
                  <YAxis dataKey="name" type="category" stroke="#666" tick={{ fill: '#888', fontSize: 12 }} width={120} />
                  <Tooltip contentStyle={{ backgroundColor: '#2A2A2A', border: '1px solid #444', borderRadius: '8px' }} formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']} />
                  <Bar dataKey="revenue" fill="#9BFF43" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* Properties Performance Table */}
        <Card className="bg-[#1E1E1E] border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Rendimiento de Propiedades</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Propiedad</th>
                  <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Ubicación</th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium text-sm">Precio/Mes</th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium text-sm">Reservas</th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium text-sm">Ingresos</th>
                  <th className="text-center py-3 px-4 text-white/60 font-medium text-sm">Etiqueta</th>
                  <th className="text-center py-3 px-4 text-white/60 font-medium text-sm">Recomendación</th>
                </tr>
              </thead>
              <tbody>
                {billboards.map((billboard) => {
                  const billboardBookings = bookings.filter(b => b.billboard_id === billboard.id);
                  const approvedCount = billboardBookings.filter(b => b.status === 'approved').length;
                  const revenue = billboardBookings.filter(b => b.status === 'approved').reduce((acc, b) => acc + b.total_price, 0);
                  const perfLabel = getPerformanceLabel(billboard, revenue);
                  const recommendation = getRecommendation(billboard, revenue, approvedCount);
                  
                  return (
                    <tr key={billboard.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#2A2A2A] overflow-hidden">
                            {billboard.image_url ? (
                              <img src={billboard.image_url} alt={billboard.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><MapPin className="w-4 h-4 text-white/40" /></div>
                            )}
                          </div>
                          <span className="text-white font-medium">{billboard.title}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-white/60">{billboard.city}, {billboard.state}</td>
                      <td className="py-4 px-4 text-right text-white">${billboard.price_per_month.toLocaleString()}</td>
                      <td className="py-4 px-4 text-right text-white">{approvedCount}</td>
                      <td className="py-4 px-4 text-right text-[#9BFF43] font-medium">${revenue.toLocaleString()}</td>
                      <td className="py-4 px-4 text-center">
                        {perfLabel ? (
                          <Badge className={`${perfLabel.color} text-xs`}>
                            {perfLabel.icon}
                            <span className="ml-1">{perfLabel.text}</span>
                          </Badge>
                        ) : (
                          <span className="text-white/30">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`flex items-center justify-center gap-1 text-xs ${recommendation.color}`}>
                          {recommendation.icon}
                          {recommendation.text}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default AnalyticsDashboard;
