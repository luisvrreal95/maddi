import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Calendar, Clock, Check, X, DollarSign, Eye, MapPin } from 'lucide-react';
import { toast } from 'sonner';

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
  };
}

const BusinessDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || userRole !== 'business')) {
      toast.error('Acceso denegado. Solo negocios pueden acceder.');
      navigate('/');
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchBookings();

      // Subscribe to realtime booking updates
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
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              const updated = payload.new as any;
              setBookings(prev => 
                prev.map(b => b.id === updated.id ? { ...b, status: updated.status } : b)
              );
              
              // Show toast notification for status changes
              if (updated.status === 'approved') {
                toast.success('¡Tu reserva ha sido aprobada!');
              } else if (updated.status === 'rejected') {
                toast.error('Tu reserva ha sido rechazada');
              }
            } else {
              fetchBookings();
            }
          }
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

      // Enrich with billboard data
      const enrichedBookings = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          const { data: billboard } = await supabase
            .from('billboards')
            .select('title, address, city, image_url')
            .eq('id', booking.billboard_id)
            .maybeSingle();

          return {
            ...booking,
            billboard: billboard || undefined,
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 text-sm font-medium">
            <Clock className="w-4 h-4" /> Pendiente
          </span>
        );
      case 'approved':
        return (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#9BFF43]/20 text-[#9BFF43] text-sm font-medium">
            <Check className="w-4 h-4" /> Aprobada
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 text-sm font-medium">
            <X className="w-4 h-4" /> Rechazada
          </span>
        );
      default:
        return null;
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#202020] flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#202020]">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 text-white hover:text-[#9BFF43] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <div className="flex items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="8" fill="#9BFF43"/>
                <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#202020" fontSize="14" fontWeight="bold" fontFamily="system-ui">M</text>
              </svg>
              <span className="text-xl font-bold">Maddi</span>
            </div>
          </Link>
          <h1 className="text-white text-xl font-bold">Mis Reservas</h1>
          <Link
            to="/search"
            className="px-4 py-2 bg-[#9BFF43] text-[#202020] rounded-full font-semibold hover:bg-[#8AE63A] transition-colors"
          >
            Buscar Espacios
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="p-6 max-w-4xl mx-auto">
        {isLoading ? (
          <div className="text-white/50 text-center py-12">Cargando reservas...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-[#9BFF43] mx-auto mb-4" />
            <h2 className="text-white text-2xl font-bold mb-2">Sin reservas</h2>
            <p className="text-white/60 mb-6">Aún no has realizado ninguna reserva</p>
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#9BFF43] text-[#202020] rounded-full font-semibold hover:bg-[#8AE63A] transition-colors"
            >
              <MapPin className="w-5 h-5" />
              Explorar Espectaculares
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-white text-lg font-semibold">
              {bookings.length} {bookings.length === 1 ? 'reserva' : 'reservas'}
            </h2>
            
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-[#2A2A2A] rounded-2xl overflow-hidden border border-white/10"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Image */}
                  <div className="w-full md:w-48 h-40 md:h-auto flex-shrink-0">
                    {booking.billboard?.image_url ? (
                      <img
                        src={booking.billboard.image_url}
                        alt={booking.billboard?.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center">
                        <MapPin className="w-10 h-10 text-white/20" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-white font-bold text-lg">
                          {booking.billboard?.title || 'Espectacular'}
                        </h3>
                        <p className="text-white/50 text-sm">
                          {booking.billboard?.address}, {booking.billboard?.city}
                        </p>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-white/50 text-xs mb-1">Fecha Inicio</p>
                        <p className="text-white text-sm font-medium">
                          {new Date(booking.start_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/50 text-xs mb-1">Fecha Fin</p>
                        <p className="text-white text-sm font-medium">
                          {new Date(booking.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/50 text-xs mb-1">Precio Total</p>
                        <p className="text-[#9BFF43] text-sm font-bold flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          ${booking.total_price.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {booking.notes && (
                      <div className="mb-4 p-3 bg-[#1A1A1A] rounded-lg">
                        <p className="text-white/50 text-xs mb-1">Notas</p>
                        <p className="text-white text-sm">{booking.notes}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      {booking.ad_design_url && (
                        <a
                          href={booking.ad_design_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-[#9BFF43] text-sm hover:underline"
                        >
                          <Eye className="w-4 h-4" /> Ver diseño
                        </a>
                      )}
                      <Link
                        to={`/billboard/${booking.billboard_id}`}
                        className="text-white/50 text-sm hover:text-white transition-colors"
                      >
                        Ver espectacular →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default BusinessDashboard;
