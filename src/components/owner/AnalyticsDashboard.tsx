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
  MessageSquare,
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

const COLORS = ['#9BFF43', '#FFC107', '#FF4444'];

type TimePeriod = '7d' | '30d';

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ billboards, userId }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const periodDays = timePeriod === '7d' ? 7 : 30;

  // Calculate metrics for filtered period
  const totalEarnings = filteredBookings
    .filter(b => b.status === 'approved')
    .reduce((acc, b) => acc + b.total_price, 0);

  const approvedBookings = filteredBookings.filter(b => b.status === 'approved').length;
  const pendingBookings = filteredBookings.filter(b => b.status === 'pending').length;
  const rejectedBookings = filteredBookings.filter(b => b.status === 'rejected').length;
  const totalContacts = filteredBookings.length;

  const totalImpressions = billboards.reduce((acc, b) => acc + (b.daily_impressions || 0), 0) * periodDays;
  
  // Calculate earnings change compared to previous period
  const getPreviousPeriodEarnings = () => {
    const now = new Date();
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

  // Get earnings data for chart based on time period
  const getEarningsChartData = () => {
    const data: { name: string; earnings: number }[] = [];
    const now = new Date();
    
    if (timePeriod === '7d') {
      // Show daily data for 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(now.getDate() - i);
        const dateStr = date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
        
        const dayEarnings = filteredBookings
          .filter(b => {
            const bookingDate = new Date(b.created_at);
            return b.status === 'approved' && 
              bookingDate.toDateString() === date.toDateString();
          })
          .reduce((sum, b) => sum + b.total_price, 0);
        
        data.push({ name: dateStr, earnings: dayEarnings });
      }
    } else {
      // Show weekly data for 30 days (4 weeks)
      for (let i = 3; i >= 0; i--) {
        const weekEnd = new Date();
        weekEnd.setDate(now.getDate() - (i * 7));
        const weekStart = new Date();
        weekStart.setDate(weekEnd.getDate() - 6);
        
        const weekLabel = `${weekStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('es-MX', { day: 'numeric' })}`;
        
        const weekEarnings = filteredBookings
          .filter(b => {
            const bookingDate = new Date(b.created_at);
            return b.status === 'approved' && 
              bookingDate >= weekStart && 
              bookingDate <= weekEnd;
          })
          .reduce((sum, b) => sum + b.total_price, 0);
        
        data.push({ name: weekLabel, earnings: weekEarnings });
      }
    }
    
    return data;
  };

  const bookingsByStatus = [
    { name: 'Aprobadas', value: approvedBookings, color: '#9BFF43' },
    { name: 'Pendientes', value: pendingBookings, color: '#FFC107' },
    { name: 'Rechazadas', value: rejectedBookings, color: '#FF4444' },
  ].filter(item => item.value > 0);

  const earningsChartData = getEarningsChartData();

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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-white/60 text-sm">
              📊 Mostrando datos de los últimos <span className="text-white font-medium">{timePeriod === '7d' ? '7 días' : '30 días'}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTimePeriod('7d')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timePeriod === '7d'
                  ? 'bg-[#9BFF43] text-[#121212] shadow-lg shadow-[#9BFF43]/20'
                  : 'bg-[#2A2A2A] text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Últimos 7 días
            </button>
            <button
              onClick={() => setTimePeriod('30d')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timePeriod === '30d'
                  ? 'bg-[#9BFF43] text-[#121212] shadow-lg shadow-[#9BFF43]/20'
                  : 'bg-[#2A2A2A] text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              Últimos 30 días
            </button>
          </div>
        </div>

        {/* KPI Cards - Simplified with clear context */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Contactos recibidos - PRIORITY */}
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/20 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white/60 text-sm">Contactos recibidos</p>
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-white/30" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#2A2A2A] border-white/10 max-w-xs">
                      <p className="text-sm">Personas que solicitaron información en este periodo.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <p className="text-3xl font-bold text-white">{totalContacts}</p>
                {approvedBookings > 0 && (
                  <p className="text-sm text-blue-400 mt-1">
                    {approvedBookings} confirmados
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </Card>

          {/* 2. Vistas estimadas del periodo */}
          <Card className="bg-[#1E1E1E] border-white/10 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white/60 text-sm">Vistas estimadas del periodo</p>
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-white/30" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#2A2A2A] border-white/10 max-w-xs">
                      <p className="text-sm">Estimación basada en ubicación y tráfico. No es un dato exacto.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <p className="text-3xl font-bold text-white">
                  {totalImpressions >= 1000000 
                    ? `${(totalImpressions / 1000000).toFixed(1)}M` 
                    : totalImpressions >= 1000 
                      ? `${(totalImpressions / 1000).toFixed(0)}K` 
                      : totalImpressions}
                </p>
                <p className="text-sm text-white/40 mt-1">en {periodDays} días</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                <Eye className="w-6 h-6 text-white/60" />
              </div>
            </div>
          </Card>

          {/* 3. Ingresos del periodo */}
          <Card className="bg-gradient-to-br from-[#9BFF43]/20 to-[#9BFF43]/5 border-[#9BFF43]/20 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-white/60 text-sm">Ingresos del periodo</p>
                  <UITooltip>
                    <TooltipTrigger>
                      <Info className="w-3.5 h-3.5 text-white/30" />
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#2A2A2A] border-white/10 max-w-xs">
                      <p className="text-sm">Ingresos generados en el periodo seleccionado.</p>
                    </TooltipContent>
                  </UITooltip>
                </div>
                <p className="text-3xl font-bold text-white">${totalEarnings.toLocaleString()}</p>
                {earningsChange !== 0 && (
                  <div className={`flex items-center gap-1 text-sm mt-1 ${earningsChange >= 0 ? 'text-[#9BFF43]' : 'text-red-400'}`}>
                    {earningsChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {earningsChange >= 0 ? 'Sube' : 'Baja'} {Math.abs(earningsChange).toFixed(0)}% vs periodo anterior
                  </div>
                )}
              </div>
              <div className="w-12 h-12 rounded-full bg-[#9BFF43]/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#9BFF43]" />
              </div>
            </div>
          </Card>

          {/* 4. Espectacular más visto */}
          {mostViewedBillboard && (
            <Card className="bg-[#1E1E1E] border-white/10 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white/60 text-sm">Espectacular más visto</p>
                    <UITooltip>
                      <TooltipTrigger>
                        <Info className="w-3.5 h-3.5 text-white/30" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-[#2A2A2A] border-white/10 max-w-xs">
                        <p className="text-sm">El espacio con mayor número de vistas en este periodo.</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <p className="text-lg font-bold text-white truncate">{mostViewedBillboard.title}</p>
                  <p className="text-sm text-white/40 mt-1">
                    ~{((mostViewedBillboard.daily_impressions || 0) / 1000).toFixed(0)}K vistas/día
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-white/60" />
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Earnings Chart */}
          <Card className="bg-[#1E1E1E] border-white/10 p-6 lg:col-span-2">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">Evolución de Ingresos</h3>
              <p className="text-white/50 text-sm mt-1">
                Ingresos generados durante el periodo seleccionado
              </p>
            </div>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={earningsChartData}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9BFF43" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#9BFF43" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#666" 
                    tick={{ fill: '#888', fontSize: 11 }} 
                    interval={0}
                    angle={timePeriod === '30d' ? -20 : 0}
                    textAnchor={timePeriod === '30d' ? 'end' : 'middle'}
                    height={50}
                  />
                  <YAxis 
                    stroke="#666" 
                    tick={{ fill: '#888', fontSize: 12 }} 
                    tickFormatter={(value) => value === 0 ? '$0' : `$${value >= 1000 ? `${value/1000}k` : value}`} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#2A2A2A', border: '1px solid #444', borderRadius: '8px' }} 
                    labelStyle={{ color: '#fff' }} 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="earnings" 
                    stroke="#9BFF43" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorEarnings)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Booking Status Chart */}
          <Card className="bg-[#1E1E1E] border-white/10 p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white">Estado de Reservas</h3>
              <p className="text-white/50 text-sm mt-1">
                Solicitudes de reserva en este periodo
              </p>
            </div>
            {bookingsByStatus.length > 0 ? (
              <div className="h-[240px] flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="70%">
                  <PieChart>
                    <Pie 
                      data={bookingsByStatus} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={50} 
                      outerRadius={70} 
                      paddingAngle={5} 
                      dataKey="value"
                    >
                      {bookingsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#2A2A2A', border: '1px solid #444', borderRadius: '8px' }} 
                      formatter={(value: number, name: string) => [value, name]} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-2 flex-wrap justify-center">
                  {bookingsByStatus.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-white/60 text-sm">{item.name} ({item.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-white/40">
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>Sin reservas en este periodo</p>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Summary Table */}
        {billboards.length > 0 && (
          <Card className="bg-[#1E1E1E] border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Resumen por Espectacular</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Propiedad</th>
                    <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">Ubicación</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium text-sm">Precio/Mes</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium text-sm">Contactos</th>
                    <th className="text-right py-3 px-4 text-white/60 font-medium text-sm">Ingresos del periodo</th>
                  </tr>
                </thead>
                <tbody>
                  {billboards.map((billboard) => {
                    const billboardBookings = filteredBookings.filter(b => b.billboard_id === billboard.id);
                    const contactCount = billboardBookings.length;
                    const revenue = billboardBookings
                      .filter(b => b.status === 'approved')
                      .reduce((acc, b) => acc + b.total_price, 0);
                    
                    return (
                      <tr key={billboard.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#2A2A2A] overflow-hidden flex-shrink-0">
                              {billboard.image_url ? (
                                <img src={billboard.image_url} alt={billboard.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <MapPin className="w-4 h-4 text-white/40" />
                                </div>
                              )}
                            </div>
                            <span className="text-white font-medium">{billboard.title}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-white/60">{billboard.city}, {billboard.state}</td>
                        <td className="py-4 px-4 text-right text-white">${billboard.price_per_month.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right text-white">{contactCount}</td>
                        <td className="py-4 px-4 text-right text-[#9BFF43] font-medium">${revenue.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

export default AnalyticsDashboard;
