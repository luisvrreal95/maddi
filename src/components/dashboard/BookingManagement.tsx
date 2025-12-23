import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Check, X, Clock, Calendar, DollarSign, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface Booking {
  id: string;
  billboard_id: string;
  business_id: string;
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
  };
  profile?: {
    full_name: string;
    company_name: string | null;
  };
}

const BookingManagement: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBookings();

      // Subscribe to realtime booking updates for owner's billboards
      const setupRealtimeSubscription = async () => {
        const { data: billboards } = await supabase
          .from('billboards')
          .select('id')
          .eq('owner_id', user.id);

        if (billboards && billboards.length > 0) {
          const billboardIds = billboards.map(b => b.id);
          
          const channel = supabase
            .channel(`owner-bookings-${user.id}`)
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'bookings',
              },
              async (payload) => {
                const newBooking = payload.new as any;
                if (billboardIds.includes(newBooking.billboard_id)) {
                  toast.success('¡Nueva solicitud de reserva recibida!');
                  fetchBookings();
                }
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'bookings',
              },
              (payload) => {
                const updated = payload.new as any;
                if (billboardIds.includes(updated.billboard_id)) {
                  setBookings(prev => 
                    prev.map(b => b.id === updated.id ? { ...b, status: updated.status } : b)
                  );
                }
              }
            )
            .subscribe();

          return () => {
            supabase.removeChannel(channel);
          };
        }
      };

      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      // First get all billboards owned by the user
      const { data: billboards, error: billboardsError } = await supabase
        .from('billboards')
        .select('id')
        .eq('owner_id', user?.id);

      if (billboardsError) throw billboardsError;

      if (!billboards || billboards.length === 0) {
        setBookings([]);
        setIsLoading(false);
        return;
      }

      const billboardIds = billboards.map(b => b.id);

      // Get all bookings for these billboards
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .in('billboard_id', billboardIds)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Get billboard details for each booking
      const enrichedBookings = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          const { data: billboard } = await supabase
            .from('billboards')
            .select('title, address, city')
            .eq('id', booking.billboard_id)
            .maybeSingle();

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_name')
            .eq('user_id', booking.business_id)
            .maybeSingle();

          return {
            ...booking,
            billboard: billboard || undefined,
            profile: profile || undefined,
          };
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

  const updateBookingStatus = async (bookingId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;

      setBookings(prev =>
        prev.map(b => (b.id === bookingId ? { ...b, status } : b))
      );

      toast.success(status === 'approved' ? 'Reserva aprobada' : 'Reserva rechazada');
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Error al actualizar reserva');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
            <Clock className="w-3 h-3" /> Pendiente
          </span>
        );
      case 'approved':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#9BFF43]/20 text-[#9BFF43] text-xs">
            <Check className="w-3 h-3" /> Aprobada
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
            <X className="w-3 h-3" /> Rechazada
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return <div className="text-white/50 text-center py-8">Cargando reservas...</div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-white/30 mx-auto mb-3" />
        <p className="text-white/50">No tienes reservas pendientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => (
        <div
          key={booking.id}
          className="bg-[#2A2A2A] rounded-xl p-4 border border-white/10"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-white font-semibold">
                {booking.billboard?.title || 'Espectacular'}
              </h4>
              <p className="text-white/50 text-sm">
                {booking.billboard?.address}, {booking.billboard?.city}
              </p>
            </div>
            {getStatusBadge(booking.status)}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <p className="text-white/50">Solicitante</p>
              <p className="text-white">
                {booking.profile?.company_name || booking.profile?.full_name || 'Negocio'}
              </p>
            </div>
            <div>
              <p className="text-white/50">Precio Total</p>
              <p className="text-[#9BFF43] font-semibold flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                ${booking.total_price.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-white/50">Fecha Inicio</p>
              <p className="text-white">{new Date(booking.start_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-white/50">Fecha Fin</p>
              <p className="text-white">{new Date(booking.end_date).toLocaleDateString()}</p>
            </div>
          </div>

          {booking.notes && (
            <div className="mb-4 p-3 bg-[#1A1A1A] rounded-lg">
              <p className="text-white/50 text-xs mb-1">Notas</p>
              <p className="text-white text-sm">{booking.notes}</p>
            </div>
          )}

          {booking.ad_design_url && (
            <a
              href={booking.ad_design_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#9BFF43] text-sm hover:underline mb-4"
            >
              <Eye className="w-4 h-4" /> Ver diseño del anuncio
            </a>
          )}

          {booking.status === 'pending' && (
            <div className="flex gap-2 pt-3 border-t border-white/10">
              <Button
                onClick={() => updateBookingStatus(booking.id, 'approved')}
                className="flex-1 bg-[#9BFF43] text-[#202020] hover:bg-[#8AE63A]"
              >
                <Check className="w-4 h-4 mr-2" /> Aprobar
              </Button>
              <Button
                onClick={() => updateBookingStatus(booking.id, 'rejected')}
                variant="outline"
                className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <X className="w-4 h-4 mr-2" /> Rechazar
              </Button>
            </div>
          )}

          <Link
            to={`/billboard/${booking.billboard_id}`}
            className="block mt-3 text-center text-white/50 text-sm hover:text-white transition-colors"
          >
            Ver espectacular →
          </Link>
        </div>
      ))}
    </div>
  );
};

export default BookingManagement;
