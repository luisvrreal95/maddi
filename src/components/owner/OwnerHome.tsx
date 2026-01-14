import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Billboard } from '@/hooks/useBillboards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, AlertCircle, CheckCircle, TrendingUp, Bell, ChevronRight, DollarSign, Plus, User, MessageSquare } from 'lucide-react';
import { format, differenceInDays, addDays, isToday, isBefore, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import PendingActionsBlock from './PendingActionsBlock';

interface Booking {
  id: string;
  billboard_id: string;
  business_id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
  created_at: string;
  billboard?: Billboard;
  profile?: {
    full_name: string;
    company_name?: string;
  };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_booking_id: string | null;
  related_billboard_id: string | null;
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
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (billboards.length > 0) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [userId, billboards]);

  const fetchData = async () => {
    try {
      // Get billboard IDs for this owner
      const billboardIds = billboards.map(b => b.id);
      
      if (billboardIds.length === 0) {
        setBookings([]);
        setIsLoading(false);
        return;
      }
      
      // Fetch bookings only for this owner's billboards
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          billboards (*)
        `)
        .in('billboard_id', billboardIds)
        .order('start_date', { ascending: true });

      if (bookingsError) throw bookingsError;

      // Fetch profiles for business users in bookings
      const bookingsWithProfiles = await Promise.all(
        (bookingsData || []).map(async (b) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_name')
            .eq('user_id', b.business_id)
            .single();
          
          return {
            ...b,
            billboard: b.billboards as Billboard,
            profile: profile || undefined
          };
        })
      );

      setBookings(bookingsWithProfiles);

      // Fetch recent notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (notificationsError) throw notificationsError;
      setNotifications(notificationsData || []);
      
      // Fetch unread messages count
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('owner_id', userId);
      
      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id);
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', conversationIds)
          .eq('is_read', false)
          .neq('sender_id', userId);
        
        setUnreadMessages(count || 0);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Categorize bookings - set today to start of day for accurate comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const categorizedBookings = bookings.reduce((acc, booking) => {
    const startDate = new Date(booking.start_date);
    const endDate = new Date(booking.end_date);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    const daysUntilEnd = differenceInDays(endDate, today);
    const daysUntilStart = differenceInDays(startDate, today);

    // Filter by billboard if selected
    if (selectedBillboardId !== 'all' && booking.billboard_id !== selectedBillboardId) {
      return acc;
    }

    // Today: active campaigns that include today (not just starts/ends today)
    if (isBefore(startDate, new Date()) && isAfter(endDate, new Date()) && booking.status === 'approved') {
      acc.today.push(booking);
    }
    
    // Upcoming: ALL approved bookings that haven't started yet (start_date > today)
    if (daysUntilStart > 0 && booking.status === 'approved') {
      acc.upcoming.push(booking);
    }
    
    // Expiring: ends in ≤14 days (and is still active, i.e. has started)
    if (daysUntilEnd > 0 && daysUntilEnd <= 14 && booking.status === 'approved' && isBefore(startDate, new Date())) {
      acc.expiring.push(booking);
    }
    
    // Pending: waiting for approval
    if (booking.status === 'pending') {
      acc.pending.push(booking);
    }

    // Active: currently running (started before now and ends after now)
    if (isBefore(startDate, new Date()) && isAfter(endDate, new Date()) && booking.status === 'approved') {
      acc.active.push(booking);
    }
    
    // Concluded: already ended
    if (isBefore(endDate, new Date()) && booking.status === 'approved') {
      acc.concluded.push(booking);
    }

    return acc;
  }, { today: [], upcoming: [], expiring: [], pending: [], active: [], concluded: [] } as Record<string, Booking[]>);

  // Calculate stats - count unique billboards with active bookings
  const billboardsWithActiveBookings = new Set(categorizedBookings.active.map(b => b.billboard_id));
  const occupancyRate = billboards.length > 0 
    ? Math.round((billboardsWithActiveBookings.size / billboards.length) * 100) 
    : 0;
  
  // Count billboards rented today (with active campaigns)
  const rentedTodayCount = billboardsWithActiveBookings.size;

  const getFilteredBookings = (): Booking[] => {
    // Apply billboard filter first
    const billboardFiltered = selectedBillboardId === 'all' 
      ? bookings 
      : bookings.filter(b => b.billboard_id === selectedBillboardId);
    
    switch (filter) {
      case 'today':
        return categorizedBookings.today;
      case 'upcoming':
        return categorizedBookings.upcoming;
      case 'expiring':
        return categorizedBookings.expiring;
      case 'pending':
        return categorizedBookings.pending;
      case 'all':
      default:
        // Return ALL bookings (filtered by billboard if applicable), sorted by start_date descending (most recent first)
        return billboardFiltered
          .filter(b => b.status === 'approved' || b.status === 'pending')
          .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    }
  };

  const getStatusBadge = (booking: Booking) => {
    const endDate = new Date(booking.end_date);
    const startDate = new Date(booking.start_date);
    const now = new Date();
    const daysUntilEnd = differenceInDays(endDate, now);

    if (booking.status === 'pending') {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pendiente</Badge>;
    }
    if (booking.status === 'rejected') {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rechazado</Badge>;
    }
    // Concluded: end date has passed
    if (isBefore(endDate, now)) {
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Concluida</Badge>;
    }
    // Por vencer: ends in ≤14 days and has started
    if (daysUntilEnd <= 14 && daysUntilEnd > 0 && isBefore(startDate, now)) {
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Por vencer</Badge>;
    }
    if (isToday(startDate)) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Inicia hoy</Badge>;
    }
    if (isToday(endDate)) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Termina hoy</Badge>;
    }
    // Not started yet
    if (isAfter(startDate, now)) {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Próxima</Badge>;
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

  // Get unread notifications
  const unreadNotifications = notifications.filter(n => !n.is_read);

  return (
    <div className="space-y-8">
      {/* Unread Notifications Banner - Shows at top until resolved */}
      {unreadNotifications.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#9BFF43]" />
            Notificaciones pendientes
          </h2>
          <div className="space-y-2">
            {unreadNotifications.slice(0, 5).map((notif) => (
              <div 
                key={notif.id}
                className="bg-[#9BFF43]/10 border border-[#9BFF43]/20 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#9BFF43]/20 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-[#9BFF43]" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{notif.title}</p>
                    <p className="text-white/60 text-sm">{notif.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {notif.related_booking_id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[#9BFF43] hover:bg-[#9BFF43]/10"
                      onClick={() => navigate('/owner?tab=reservas')}
                    >
                      Ver reserva
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white/60 hover:text-white hover:bg-white/10"
                    onClick={async () => {
                      await supabase
                        .from('notifications')
                        .update({ is_read: true })
                        .eq('id', notif.id);
                      // Refresh notifications
                      const { data } = await supabase
                        .from('notifications')
                        .select('*')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false })
                        .limit(5);
                      if (data) setNotifications(data);
                    }}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Pending Actions Block - Shows only if there are pending actions */}
      <PendingActionsBlock
        pendingBookings={categorizedBookings.pending}
        expiringBookings={categorizedBookings.expiring}
        unreadMessages={unreadMessages}
      />
      
      {/* Quick Stats Bar - Updated: Total billboards, Reserved today, Occupancy */}
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
              <p className="text-white/50 text-sm">Rentados hoy</p>
              <p className="text-white text-xl font-bold">{rentedTodayCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-[#1E1E1E] rounded-xl p-4 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-white/50 text-sm">Total espectaculares</p>
              <p className="text-white text-xl font-bold">{billboards.length}</p>
            </div>
          </div>
        </div>
      </div>

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
                    {/* Show renter info for approved and pending bookings */}
                    {(booking.status === 'approved' || booking.status === 'pending') && booking.profile && (
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <User className="w-3.5 h-3.5 text-white/40" />
                        <span className="text-white/60">
                          {booking.profile.company_name || booking.profile.full_name}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[#9BFF43] hover:text-[#9BFF43] hover:bg-[#9BFF43]/10"
                          onClick={async (e) => {
                            e.stopPropagation();
                            // Try to find existing conversation
                            const { data: existingConv } = await supabase
                              .from('conversations')
                              .select('id')
                              .eq('billboard_id', booking.billboard_id)
                              .eq('business_id', booking.business_id)
                              .eq('owner_id', userId)
                              .single();
                            
                            if (existingConv) {
                              navigate(`/messages?conversation=${existingConv.id}`);
                            } else {
                              navigate(`/messages?billboard=${booking.billboard_id}`);
                            }
                          }}
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1" />
                          Contactar
                        </Button>
                      </div>
                    )}
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
    </div>
  );
};

export default OwnerHome;
