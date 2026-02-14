import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isBefore, isAfter } from 'date-fns';
import BusinessHeader from '@/components/navigation/BusinessHeader';
import EmptyCampaigns from '@/components/campaigns/EmptyCampaigns';
import CampaignCard from '@/components/campaigns/CampaignCard';
import CampaignDetail from '@/components/campaigns/CampaignDetail';
import { Button } from '@/components/ui/button';

type StatusFilter = 'all' | 'scheduled' | 'pending' | 'cancelled' | 'finished';

interface Booking {
  id: string;
  billboard_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  notes: string | null;
  ad_design_url: string | null;
  created_at: string;
  billboard?: {
    title: string;
    address: string;
    city: string;
    image_url: string | null;
    daily_impressions: number | null;
  };
}

const BusinessDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    if (!authLoading && (!user || userRole !== 'business')) {
      toast.error('Acceso denegado. Solo negocios pueden acceder.');
      navigate('/');
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchBookings();

      const channel = supabase
        .channel(`business-bookings-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `business_id=eq.${user.id}`,
          },
          () => fetchBookings()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('business_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedBookings = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          const { data: billboard } = await supabase
            .from('billboards')
            .select('title, address, city, image_url, daily_impressions')
            .eq('id', booking.billboard_id)
            .maybeSingle();

          return { ...booking, billboard: billboard || undefined };
        })
      );

      setBookings(enrichedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Error al cargar reservas');
    } finally {
      setIsLoading(false);
    }
  };

  // Categorize campaigns
  const categorized = useMemo(() => {
    const now = new Date();
    const active: Booking[] = [];
    const scheduled: Booking[] = [];
    const pending: Booking[] = [];
    const cancelled: Booking[] = [];
    const finished: Booking[] = [];

    bookings.forEach(booking => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);

      if (booking.status === 'pending') {
        pending.push(booking);
      } else if (booking.status === 'cancelled') {
        cancelled.push(booking);
      } else if (booking.status === 'rejected') {
        finished.push(booking);
      } else if (booking.status === 'approved') {
        if (isBefore(start, now) && isAfter(end, now)) {
          active.push(booking);
        } else if (isAfter(start, now)) {
          scheduled.push(booking);
        } else {
          finished.push(booking);
        }
      }
    });

    return { active, scheduled, pending, cancelled, finished };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    switch (statusFilter) {
      case 'scheduled': return [...categorized.active, ...categorized.scheduled];
      case 'pending': return categorized.pending;
      case 'cancelled': return categorized.cancelled;
      case 'finished': return categorized.finished;
      case 'all':
      default:
        return bookings;
    }
  }, [statusFilter, categorized, bookings]);

  const selectedBooking = bookings.find(b => b.id === selectedBookingId);

  const handleCancelBooking = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) throw error;

      // Notify owner
      const { data: billboardData } = await supabase
        .from('billboards')
        .select('owner_id, title')
        .eq('id', booking.billboard_id)
        .single();

      if (billboardData) {
        await supabase.from('notifications').insert({
          user_id: billboardData.owner_id,
          title: 'Solicitud cancelada',
          message: `El negocio canceló su solicitud para "${billboardData.title}"`,
          type: 'booking_cancelled',
          related_booking_id: bookingId,
          related_billboard_id: booking.billboard_id,
        });
      }

      toast.success('Solicitud cancelada exitosamente');
      fetchBookings();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Error al cancelar la solicitud');
    }
  };

  const filters: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'Todas', count: bookings.length },
    { id: 'scheduled', label: 'Programadas', count: categorized.active.length + categorized.scheduled.length },
    { id: 'pending', label: 'Pendientes', count: categorized.pending.length },
    { id: 'cancelled', label: 'Canceladas', count: categorized.cancelled.length },
    { id: 'finished', label: 'Finalizadas', count: categorized.finished.length },
  ];

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <BusinessHeader title="Mis Campañas" />

      <main className="p-6 max-w-3xl mx-auto">
        {isLoading ? (
          <div className="text-muted-foreground text-center py-12">Cargando campañas...</div>
        ) : selectedBooking ? (
          <CampaignDetail 
            booking={selectedBooking} 
            onBack={() => setSelectedBookingId(null)}
            onRefresh={fetchBookings}
          />
        ) : bookings.length === 0 ? (
          <EmptyCampaigns />
        ) : (
          <div className="space-y-6">
            {/* Status Filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {filters.map((f) => (
                <Button
                  key={f.id}
                  variant={statusFilter === f.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(f.id)}
                  className="whitespace-nowrap gap-1.5"
                >
                  {f.label}
                  {f.count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      statusFilter === f.id
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {f.count}
                    </span>
                  )}
                </Button>
              ))}
            </div>

            {/* Campaign List */}
            {filteredBookings.length > 0 ? (
              <div className="space-y-3">
                {filteredBookings.map(booking => (
                  <CampaignCard
                    key={booking.id}
                    booking={booking}
                    onSelect={setSelectedBookingId}
                    isActive={categorized.active.some(a => a.id === booking.id)}
                    onCancel={booking.status === 'pending' ? handleCancelBooking : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No hay campañas con este filtro
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default BusinessDashboard;
