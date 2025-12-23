import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, TrendingUp, Users, DollarSign, Calendar, MapPin, BarChart3, Loader2, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/notifications/NotificationBell';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

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
  };
}

interface TrafficData {
  billboard_id: string;
  estimated_daily_impressions: number;
  recorded_at: string;
}

const CHART_COLORS = ['#9BFF43', '#43FF9B', '#43B5FF', '#FF9B43', '#FF4393'];

const BusinessAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<BookingWithBillboard[]>([]);
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || userRole !== 'business')) {
      toast.error('Acceso denegado. Solo negocios pueden acceder.');
      navigate('/');
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch approved bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('business_id', user?.id)
        .eq('status', 'approved')
        .order('start_date', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Enrich with billboard data
      const enrichedBookings = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          const { data: billboard } = await supabase
            .from('billboards')
            .select('title, address, city, daily_impressions, latitude, longitude')
            .eq('id', booking.billboard_id)
            .maybeSingle();

          return { ...booking, billboard: billboard || undefined };
        })
      );

      setBookings(enrichedBookings);

      // Fetch traffic data for billboards with approved bookings
      const billboardIds = enrichedBookings.map(b => b.billboard_id);
      if (billboardIds.length > 0) {
        const { data: traffic, error: trafficError } = await supabase
          .from('traffic_data')
          .select('*')
          .in('billboard_id', billboardIds)
          .order('recorded_at', { ascending: false })
          .limit(100);

        if (!trafficError && traffic) {
          setTrafficData(traffic as TrafficData[]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTrafficData = async () => {
    setIsRefreshing(true);
    try {
      let updatedCount = 0;
      
      // Call edge function to fetch traffic data (respects weekly cache)
      for (const booking of bookings) {
        if (booking.billboard?.latitude && booking.billboard?.longitude) {
          const { data, error } = await supabase.functions.invoke('get-traffic-data', {
            body: {
              billboard_id: booking.billboard_id,
              latitude: booking.billboard.latitude,
              longitude: booking.billboard.longitude,
            },
          });
          
          if (!error && data?.source === 'tomtom') {
            updatedCount++;
          }
        }
      }
      
      if (updatedCount > 0) {
        toast.success(`Datos de ${updatedCount} espectacular(es) actualizados desde TomTom`);
      } else {
        toast.info('Los datos están actualizados (se actualizan semanalmente)');
      }
      await fetchData();
    } catch (error) {
      console.error('Error refreshing traffic:', error);
      toast.error('Error al actualizar datos de tráfico');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculate metrics
  const approvedBookings = bookings.filter(b => b.status === 'approved');
  const totalSpent = approvedBookings.reduce((sum, b) => sum + b.total_price, 0);
  
  const totalImpressions = approvedBookings.reduce((sum, b) => {
    const days = Math.ceil(
      (new Date(b.end_date).getTime() - new Date(b.start_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return sum + (b.billboard?.daily_impressions || 0) * days;
  }, 0);

  const costPerImpression = totalImpressions > 0 ? totalSpent / totalImpressions : 0;

  const totalDays = approvedBookings.reduce((sum, b) => {
    const days = Math.ceil(
      (new Date(b.end_date).getTime() - new Date(b.start_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return sum + days;
  }, 0);

  // Chart data
  const campaignPerformance = approvedBookings.map(b => {
    const days = Math.ceil(
      (new Date(b.end_date).getTime() - new Date(b.start_date).getTime()) / (1000 * 60 * 60 * 24)
    );
    const impressions = (b.billboard?.daily_impressions || 0) * days;
    return {
      name: b.billboard?.title?.substring(0, 15) || 'Espectacular',
      impressions,
      cost: b.total_price,
      cpi: impressions > 0 ? (b.total_price / impressions).toFixed(4) : 0,
    };
  });

  const spendingByCity = approvedBookings.reduce((acc, b) => {
    const city = b.billboard?.city || 'Otro';
    acc[city] = (acc[city] || 0) + b.total_price;
    return acc;
  }, {} as Record<string, number>);

  const cityChartData = Object.entries(spendingByCity).map(([name, value], index) => ({
    name,
    value,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  const chartConfig = {
    impressions: { label: 'Impresiones', color: '#9BFF43' },
    cost: { label: 'Costo', color: '#43B5FF' },
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link to="/business" className="flex items-center gap-3 text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Volver a Reservas</span>
          </Link>
          <h1 className="text-foreground text-xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Analytics
          </h1>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Button
              onClick={refreshTrafficData}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="ml-2">Actualizar</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : approvedBookings.length === 0 ? (
          <div className="text-center py-16">
            <BarChart3 className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-foreground text-2xl font-bold mb-2">Sin datos aún</h2>
            <p className="text-muted-foreground mb-6">
              Necesitas tener reservas aprobadas para ver analytics
            </p>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-semibold hover:bg-primary/90 transition-colors"
            >
              <MapPin className="w-5 h-5" />
              Buscar Espectaculares
            </Link>
          </div>
        ) : (
          <>
            {/* TomTom Attribution */}
            <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-muted-foreground text-xs text-center">
                📊 Tráfico vehicular estimado – Fuente: TomTom | Los datos se actualizan semanalmente
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-card rounded-2xl p-6 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-muted-foreground text-sm">Tráfico Vehicular Estimado</span>
                </div>
                <p className="text-foreground text-3xl font-bold">
                  ~{totalImpressions.toLocaleString()}
                </p>
                <p className="text-muted-foreground/50 text-xs mt-1">vehículos durante campaña</p>
              </div>

              <div className="bg-card rounded-2xl p-6 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <span className="text-muted-foreground text-sm">Inversión Total</span>
                </div>
                <p className="text-foreground text-3xl font-bold">
                  ${totalSpent.toLocaleString()}
                </p>
              </div>

              <div className="bg-card rounded-2xl p-6 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <span className="text-muted-foreground text-sm">Costo por Impresión</span>
                </div>
                <p className="text-foreground text-3xl font-bold">
                  ${costPerImpression.toFixed(4)}
                </p>
              </div>

              <div className="bg-card rounded-2xl p-6 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-destructive" />
                  </div>
                  <span className="text-muted-foreground text-sm">Días Activos</span>
                </div>
                <p className="text-foreground text-3xl font-bold">{totalDays}</p>
              </div>
            </div>

            {/* Charts */}
            <Tabs defaultValue="performance" className="w-full">
              <TabsList className="bg-muted mb-6">
                <TabsTrigger value="performance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Rendimiento por Campaña
                </TabsTrigger>
                <TabsTrigger value="distribution" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Distribución por Ciudad
                </TabsTrigger>
                <TabsTrigger value="campaigns" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Detalle Campañas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="performance">
                <div className="bg-card rounded-2xl p-6 border border-border">
                  <h3 className="text-foreground font-bold mb-6">Impresiones por Espectacular</h3>
                  <div className="h-[400px]">
                    <ChartContainer config={chartConfig}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={campaignPerformance}>
                          <XAxis 
                            dataKey="name" 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12}
                            tickLine={false}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))" 
                            fontSize={12}
                            tickLine={false}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar 
                            dataKey="impressions" 
                            fill="hsl(var(--primary))" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="distribution">
                <div className="bg-card rounded-2xl p-6 border border-border">
                  <h3 className="text-foreground font-bold mb-6">Inversión por Ciudad</h3>
                  <div className="h-[400px] flex items-center justify-center">
                    {cityChartData.length > 0 ? (
                      <div className="flex items-center gap-8">
                        <ResponsiveContainer width={300} height={300}>
                          <PieChart>
                            <Pie
                              data={cityChartData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={({ name, percent }) => 
                                `${name}: ${(percent * 100).toFixed(0)}%`
                              }
                            >
                              {cityChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-3">
                          {cityChartData.map((item, index) => (
                            <div key={index} className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-foreground">{item.name}</span>
                              <span className="text-muted-foreground">
                                ${item.value.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Sin datos de ciudades</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="campaigns">
                <div className="bg-card rounded-2xl p-6 border border-border">
                  <h3 className="text-foreground font-bold mb-6">Detalle de Campañas</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-muted-foreground text-sm py-3 px-4">Espectacular</th>
                          <th className="text-left text-muted-foreground text-sm py-3 px-4">Ciudad</th>
                          <th className="text-left text-muted-foreground text-sm py-3 px-4">Período</th>
                          <th className="text-right text-muted-foreground text-sm py-3 px-4">Impresiones</th>
                          <th className="text-right text-muted-foreground text-sm py-3 px-4">Inversión</th>
                          <th className="text-right text-muted-foreground text-sm py-3 px-4">CPI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {approvedBookings.map((booking) => {
                          const days = Math.ceil(
                            (new Date(booking.end_date).getTime() - new Date(booking.start_date).getTime()) / (1000 * 60 * 60 * 24)
                          );
                          const impressions = (booking.billboard?.daily_impressions || 0) * days;
                          const cpi = impressions > 0 ? booking.total_price / impressions : 0;

                          return (
                            <tr key={booking.id} className="border-b border-border/50 hover:bg-muted/50">
                              <td className="py-4 px-4">
                                <Link 
                                  to={`/billboard/${booking.billboard_id}`}
                                  className="text-foreground hover:text-primary transition-colors"
                                >
                                  {booking.billboard?.title || 'Espectacular'}
                                </Link>
                              </td>
                              <td className="py-4 px-4 text-muted-foreground">
                                {booking.billboard?.city || '-'}
                              </td>
                              <td className="py-4 px-4 text-muted-foreground">
                                {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                              </td>
                              <td className="py-4 px-4 text-right text-primary font-semibold">
                                {impressions.toLocaleString()}
                              </td>
                              <td className="py-4 px-4 text-right text-foreground font-semibold">
                                ${booking.total_price.toLocaleString()}
                              </td>
                              <td className="py-4 px-4 text-right text-muted-foreground">
                                ${cpi.toFixed(4)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
};

export default BusinessAnalytics;
