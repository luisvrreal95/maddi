import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Billboard } from '@/hooks/useBillboards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, AlertCircle, CheckCircle, TrendingUp, Bell, ChevronRight, DollarSign } from 'lucide-react';
import { format, differenceInDays, addDays, isToday, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Booking {
  id: string;
  billboard_id: string;
  business_id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
  billboard?: Billboard;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface OwnerHomeProps {
  billboards: Billboard[];
  userId: string;
}

type FilterType = 'all' | 'today' | 'upcoming' | 'expiring' | 'pending';

const OwnerHome: React.FC<OwnerHomeProps> = ({ billboards, userId }) => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedBillboardId, setSelectedBillboardId] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      // Fetch bookings with billboard info
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          billboards (*)
        `)
        .order('start_date', { ascending: true });

      if (bookingsError) throw bookingsError;

      // Map bookings with billboard data
      const mappedBookings = (bookingsData || []).map(b => ({
        ...b,
        billboard: b.billboards as Billboard
      }));

      setBookings(mappedBookings);

      // Fetch recent notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (notificationsError) throw notificationsError;
      setNotifications(notificationsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Categorize bookings
  const today = new Date();
  
  const categorizedBookings = bookings.reduce((acc, booking) => {
    const startDate = new Date(booking.start_date);
    const endDate = new Date(booking.end_date);
    const daysUntilEnd = differenceInDays(endDate, today);
    const daysUntilStart = differenceInDays(startDate, today);

    // Filter by billboard if selected
    if (selectedBillboardId !== 'all' && booking.billboard_id !== selectedBillboardId) {
      return acc;
    }

    // Today: starts or ends today
    if (isToday(startDate) || isToday(endDate)) {
      acc.today.push(booking);
    }
    
    // Upcoming: starts in next 30 days
    if (daysUntilStart > 0 && daysUntilStart <= 30 && booking.status === 'approved') {
      acc.upcoming.push(booking);
    }
    
    // Expiring: ends in next 14 days
    if (daysUntilEnd > 0 && daysUntilEnd <= 14 && booking.status === 'approved') {
      acc.expiring.push(booking);
    }
    
    // Pending: waiting for approval
    if (booking.status === 'pending') {
      acc.pending.push(booking);
    }

    // Active: currently running
    if (isBefore(startDate, today) && isAfter(endDate, today) && booking.status === 'approved') {
      acc.active.push(booking);
    }

    return acc;
  }, { today: [], upcoming: [], expiring: [], pending: [], active: [] } as Record<string, Booking[]>);

  // Calculate stats
  const totalActiveBookings = categorizedBookings.active.length;
  const monthlyRevenue = categorizedBookings.active.reduce((sum, b) => sum + Number(b.total_price), 0);
  const occupancyRate = billboards.length > 0 
    ? Math.round((totalActiveBookings / billboards.length) * 100) 
    : 0;

  const getFilteredBookings = (): Booking[] => {
    switch (filter) {
      case 'today':
        return categorizedBookings.today;
      case 'upcoming':
        return categorizedBookings.upcoming;
      case 'expiring':
        return categorizedBookings.expiring;
      case 'pending':
        return categorizedBookings.pending;
      default:
        return [...categorizedBookings.active, ...categorizedBookings.upcoming].slice(0, 10);
    }
  };

  const getStatusBadge = (booking: Booking) => {
    const endDate = new Date(booking.end_date);
    const daysUntilEnd = differenceInDays(endDate, today);

    if (booking.status === 'pending') {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendiente</Badge>;
    }
    if (booking.status === 'rejected') {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rechazado</Badge>;
    }
    if (daysUntilEnd <= 7 && daysUntilEnd > 0) {
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Por vencer</Badge>;
    }
    if (isToday(new Date(booking.start_date))) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Inicia hoy</Badge>;
    }
    if (isToday(endDate)) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Termina hoy</Badge>;
    }
    return <Badge className="bg-[#9BFF43]/20 text-[#9BFF43] border-[#9BFF43]/30">Activo</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/60">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Quick Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1E1E1E] rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#9BFF43]/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[#9BFF43]" />
            </div>
            <div>
              <p className="text-white/50 text-sm">Ocupación</p>
              <p className="text-white text-xl font-bold">{occupancyRate}%</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1E1E1E] rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white/50 text-sm">Activos</p>
              <p className="text-white text-xl font-bold">{totalActiveBookings}</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1E1E1E] rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-white/50 text-sm">Ingresos</p>
              <p className="text-white text-xl font-bold">${monthlyRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Actions Alert */}
      {categorizedBookings.pending.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <div className="flex-1">
              <p className="text-yellow-400 font-medium">
                Tienes {categorizedBookings.pending.length} reserva(s) pendiente(s) de aprobación
              </p>
            </div>
            <Button 
              size="sm"
              variant="outline"
              className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
              onClick={() => setFilter('pending')}
            >
              Ver pendientes
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'today', label: 'Hoy', count: categorizedBookings.today.length },
            { id: 'upcoming', label: 'Próximos', count: categorizedBookings.upcoming.length },
            { id: 'expiring', label: 'Por vencer', count: categorizedBookings.expiring.length },
            { id: 'pending', label: 'Pendientes', count: categorizedBookings.pending.length },
          ].map((f) => (
            <Button
              key={f.id}
              variant={filter === f.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.id as FilterType)}
              className={filter === f.id 
                ? 'bg-white text-[#121212]' 
                : 'border-white/20 text-white/70 hover:text-white hover:bg-white/10'
              }
            >
              {f.label}
              {f.count !== undefined && f.count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-white/20">
                  {f.count}
                </span>
              )}
            </Button>
          ))}
        </div>
        
        <Select value={selectedBillboardId} onValueChange={setSelectedBillboardId}>
          <SelectTrigger className="w-[200px] bg-[#2A2A2A] border-white/10 text-white">
            <SelectValue placeholder="Filtrar por propiedad" />
          </SelectTrigger>
          <SelectContent className="bg-[#2A2A2A] border-white/10">
            <SelectItem value="all" className="text-white">Todas las propiedades</SelectItem>
            {billboards.map((b) => (
              <SelectItem key={b.id} value={b.id} className="text-white">
                {b.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        <h2 className="text-white text-lg font-semibold">
          {filter === 'all' ? 'Reservas activas y próximas' : 
           filter === 'today' ? 'Actividad de hoy' :
           filter === 'upcoming' ? 'Próximas reservas' :
           filter === 'expiring' ? 'Reservas por vencer' :
           'Reservas pendientes de aprobación'}
        </h2>
        
        {getFilteredBookings().length === 0 ? (
          <div className="bg-[#1E1E1E] rounded-xl p-8 text-center border border-white/5">
            <Calendar className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40">No hay reservas en esta categoría</p>
          </div>
        ) : (
          <div className="space-y-2">
            {getFilteredBookings().map((booking) => (
              <div 
                key={booking.id}
                className="bg-[#1E1E1E] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group"
                onClick={() => navigate(`/owner?tab=reservas`)}
              >
                <div className="flex items-center gap-4">
                  {/* Billboard Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={booking.billboard?.image_url || '/placeholder.svg'} 
                      alt={booking.billboard?.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-medium truncate">
                        {booking.billboard?.title}
                      </h3>
                      {getStatusBadge(booking)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-white/50">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(booking.start_date), 'dd MMM', { locale: es })} - {format(new Date(booking.end_date), 'dd MMM yyyy', { locale: es })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {differenceInDays(new Date(booking.end_date), new Date(booking.start_date))} días
                      </span>
                    </div>
                  </div>
                  
                  {/* Price */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-[#9BFF43] font-bold">
                      ${Number(booking.total_price).toLocaleString()}
                    </p>
                    <p className="text-white/40 text-sm">MXN</p>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-white text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificaciones recientes
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-white/50 hover:text-white"
              onClick={() => navigate('/settings?tab=notifications')}
            >
              Ver todas
            </Button>
          </div>
          
          <div className="space-y-2">
            {notifications.slice(0, 3).map((notification) => (
              <div 
                key={notification.id}
                className={`bg-[#1E1E1E] rounded-xl p-4 border transition-colors ${
                  notification.is_read ? 'border-white/5' : 'border-[#9BFF43]/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    notification.is_read ? 'bg-white/20' : 'bg-[#9BFF43]'
                  }`} />
                  <div className="flex-1">
                    <p className="text-white font-medium">{notification.title}</p>
                    <p className="text-white/50 text-sm">{notification.message}</p>
                    <p className="text-white/30 text-xs mt-1">
                      {format(new Date(notification.created_at), 'dd MMM, HH:mm', { locale: es })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerHome;
