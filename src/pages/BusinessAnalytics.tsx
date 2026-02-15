import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Users, DollarSign, Calendar, MapPin, BarChart3, Loader2, RefreshCw, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import BusinessHeader from '@/components/navigation/BusinessHeader';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface BookingWithBillboard {
  id: string;
  billboard_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  billboard?: {
    title: string;
    address: string;
    city: string;
    daily_impressions: number | null;
    latitude: number;
    longitude: number;
    image_url: string | null;
  };
}

const CHART_COLORS = ['#9BFF43', '#43FF9B', '#43B5FF', '#FF9B43', '#FF4393'];

const BusinessAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<BookingWithBillboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || userRole !== 'business')) {
      toast.error('Acceso denegado');
      navigate('/');
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: bookingsData, error } = await supabase
        .from('bookings').select('*').eq('business_id', user?.id).eq('status', 'approved').order('start_date', { ascending: false });
      if (error) throw error;
      const enriched = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          const { data: billboard } = await supabase
            .from('billboards').select('title, address, city, daily_impressions, latitude, longitude, image_url').eq('id', booking.billboard_id).maybeSingle();
          return { ...booking, billboard: billboard || undefined };
        })
      );
      setBookings(enriched);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally { setIsLoading(false); }
  };

  const refreshTrafficData = async () => {
    setIsRefreshing(true);
    try {
      let updated = 0;
      for (const booking of bookings) {
        if (booking.billboard?.latitude && booking.billboard?.longitude) {
          const { data, error } = await supabase.functions.invoke('get-traffic-data', {
            body: { billboard_id: booking.billboard_id, latitude: booking.billboard.latitude, longitude: booking.billboard.longitude },
          });
          if (!error && data?.source === 'tomtom') updated++;
        }
      }
      if (updated > 0) toast.success(`${updated} espectacular(es) actualizados`);
      else toast.info('Los datos están actualizados');
      await fetchData();
    } catch { toast.error('Error al actualizar'); }
    finally { setIsRefreshing(false); }
  };

  const approvedBookings = bookings.filter(b => b.status === 'approved');
  const totalSpent = approvedBookings.reduce((sum, b) => sum + b.total_price, 0);
  const totalImpressions = approvedBookings.reduce((sum, b) => {
    const days = Math.max(1, differenceInDays(new Date(b.end_date), new Date(b.start_date)));
    return sum + (b.billboard?.daily_impressions || 0) * days;
  }, 0);
  const costPerImpression = totalImpressions > 0 ? totalSpent / totalImpressions : 0;
  const totalDays = approvedBookings.reduce((sum, b) => sum + Math.max(1, differenceInDays(new Date(b.end_date), new Date(b.start_date))), 0);

  const campaignPerformance = approvedBookings.map(b => {
    const days = Math.max(1, differenceInDays(new Date(b.end_date), new Date(b.start_date)));
    const impressions = (b.billboard?.daily_impressions || 0) * days;
    return {
      name: b.billboard?.title?.substring(0, 12) || 'Espectacular',
      impressions,
      cost: b.total_price,
    };
  });

  const spendingByCity = approvedBookings.reduce((acc, b) => {
    const city = b.billboard?.city || 'Otro';
    acc[city] = (acc[city] || 0) + b.total_price;
    return acc;
  }, {} as Record<string, number>);
  const cityChartData = Object.entries(spendingByCity).map(([name, value], i) => ({ name, value, color: CHART_COLORS[i % CHART_COLORS.length] }));

  const chartConfig = { impressions: { label: 'Impresiones', color: '#9BFF43' }, cost: { label: 'Costo', color: '#43B5FF' } };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111]">
      <BusinessHeader title="Analytics" />

      <main className="p-4 md:p-6 max-w-6xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#9BFF43]" />
          </div>
        ) : approvedBookings.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-10 h-10 text-white/20" />
            </div>
            <h2 className="text-white text-2xl font-bold mb-2">Sin datos aún</h2>
            <p className="text-white/50 mb-8 max-w-sm mx-auto">
              Necesitas campañas aprobadas para ver tus analytics. ¡Busca espacios publicitarios y comienza!
            </p>
            <Link to="/search" className="inline-flex items-center gap-2 px-6 py-3 bg-[#9BFF43] text-[#111] rounded-full font-semibold hover:bg-[#8AE63A] transition-colors">
              <MapPin className="w-5 h-5" /> Explorar espacios
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-white text-2xl font-bold">Resumen</h1>
                <p className="text-white/40 text-sm mt-0.5">{approvedBookings.length} campaña{approvedBookings.length !== 1 ? 's' : ''} aprobada{approvedBookings.length !== 1 ? 's' : ''}</p>
              </div>
              <Button onClick={refreshTrafficData} disabled={isRefreshing} variant="outline" size="sm" className="border-white/10 text-white/60 hover:text-white hover:bg-white/5">
                {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="ml-2 hidden sm:inline">Actualizar</span>
              </Button>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Tráfico estimado', value: `~${totalImpressions.toLocaleString()}`, sub: 'vehículos durante campaña', icon: Users, accent: '#9BFF43' },
                { label: 'Inversión total', value: `$${totalSpent.toLocaleString()}`, sub: 'MXN', icon: DollarSign, accent: '#43B5FF' },
                { label: 'Costo/impresión', value: `$${costPerImpression.toFixed(4)}`, sub: 'MXN por vehículo', icon: TrendingUp, accent: '#FF9B43' },
                { label: 'Días activos', value: totalDays.toString(), sub: 'de publicidad', icon: Calendar, accent: '#FF4393' },
              ].map((kpi, i) => (
                <div key={i} className="bg-[#1A1A1A] rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.accent}15` }}>
                      <kpi.icon className="w-4 h-4" style={{ color: kpi.accent }} />
                    </div>
                    <span className="text-white/40 text-xs">{kpi.label}</span>
                  </div>
                  <p className="text-white text-2xl font-bold">{kpi.value}</p>
                  <p className="text-white/30 text-xs mt-0.5">{kpi.sub}</p>
                </div>
              ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Performance Chart */}
              <div className="lg:col-span-3 bg-[#1A1A1A] rounded-2xl p-5 border border-white/5">
                <h3 className="text-white font-semibold mb-1">Tráfico por espectacular</h3>
                <p className="text-white/40 text-xs mb-5">Estimado de vehículos durante cada campaña</p>
                <div className="h-[280px]">
                  <ChartContainer config={chartConfig}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={campaignPerformance} barCategoryGap="25%">
                        <XAxis dataKey="name" stroke="#444" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#444" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="impressions" fill="#9BFF43" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </div>

              {/* City Distribution */}
              <div className="lg:col-span-2 bg-[#1A1A1A] rounded-2xl p-5 border border-white/5">
                <h3 className="text-white font-semibold mb-1">Inversión por ciudad</h3>
                <p className="text-white/40 text-xs mb-5">Distribución de gasto publicitario</p>
                {cityChartData.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={cityChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45} strokeWidth={0}>
                          {cityChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-4 w-full">
                      {cityChartData.map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-white/70 text-sm">{item.name}</span>
                          </div>
                          <span className="text-white/50 text-sm">${item.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-white/30 text-sm text-center py-8">Sin datos</p>
                )}
              </div>
            </div>

            {/* Campaigns List */}
            <div className="bg-[#1A1A1A] rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-5 border-b border-white/5">
                <h3 className="text-white font-semibold">Tus campañas</h3>
                <p className="text-white/40 text-xs mt-0.5">Detalle de cada espacio contratado</p>
              </div>
              <div className="divide-y divide-white/5">
                {approvedBookings.map((booking) => {
                  const days = Math.max(1, differenceInDays(new Date(booking.end_date), new Date(booking.start_date)));
                  const impressions = (booking.billboard?.daily_impressions || 0) * days;
                  const cpi = impressions > 0 ? booking.total_price / impressions : 0;
                  const isActive = new Date() >= new Date(booking.start_date) && new Date() <= new Date(booking.end_date);

                  return (
                    <div key={booking.id} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                      {booking.billboard?.image_url ? (
                        <img src={booking.billboard.image_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-[#222] flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-5 h-5 text-white/20" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-medium text-sm truncate">{booking.billboard?.title}</h4>
                          {isActive && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Activa
                            </span>
                          )}
                        </div>
                        <p className="text-white/40 text-xs mt-0.5">
                          {booking.billboard?.city} · {format(new Date(booking.start_date), "d MMM", { locale: es })} — {format(new Date(booking.end_date), "d MMM yyyy", { locale: es })}
                        </p>
                      </div>
                      <div className="hidden md:flex items-center gap-6 text-right">
                        <div>
                          <p className="text-white/40 text-[10px]">Tráfico est.</p>
                          <p className="text-white text-sm font-medium">~{impressions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-white/40 text-[10px]">Inversión</p>
                          <p className="text-white text-sm font-medium">${booking.total_price.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-white/40 text-[10px]">CPI</p>
                          <p className="text-white text-sm font-medium">${cpi.toFixed(4)}</p>
                        </div>
                      </div>
                      <Link to={`/billboard/${booking.billboard_id}`} className="text-white/30 hover:text-[#9BFF43] transition-colors">
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* TomTom attribution */}
            <p className="text-white/20 text-[10px] text-center">
              📊 Tráfico vehicular estimado — Fuente: TomTom | Datos actualizados semanalmente
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default BusinessAnalytics;
