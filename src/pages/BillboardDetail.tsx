import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Billboard } from '@/hooks/useBillboards';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Maximize2, Sun, Eye, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import BookingDialog from '@/components/booking/BookingDialog';

const BillboardDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [billboard, setBillboard] = useState<Billboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [mapboxToken, setMapboxToken] = useState('');

  useEffect(() => {
    const fetchBillboard = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('billboards')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          toast.error('Espectacular no encontrado');
          navigate('/search');
          return;
        }
        setBillboard(data);
      } catch (error) {
        console.error('Error fetching billboard:', error);
        toast.error('Error al cargar el espectacular');
      } finally {
        setIsLoading(false);
      }
    };

    const fetchToken = async () => {
      try {
        const { data } = await supabase.functions.invoke('get-mapbox-token');
        if (data?.token) setMapboxToken(data.token);
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      }
    };

    fetchBillboard();
    fetchToken();
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#202020] flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  if (!billboard) return null;

  const handleBookingClick = () => {
    if (!user) {
      toast.error('Inicia sesión para solicitar una reserva');
      navigate('/auth');
      return;
    }
    if (userRole !== 'business') {
      toast.error('Solo negocios pueden solicitar reservas');
      return;
    }
    setShowBookingDialog(true);
  };

  return (
    <div className="min-h-screen bg-[#202020]">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-white/10 px-6 py-4">
        <Link to="/search" className="flex items-center gap-3 text-white hover:text-[#9BFF43] transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span>Volver a búsqueda</span>
        </Link>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Section */}
          <div>
            {billboard.image_url ? (
              <img
                src={billboard.image_url}
                alt={billboard.title}
                className="w-full h-96 object-cover rounded-2xl"
              />
            ) : (
              <div className="w-full h-96 bg-[#2A2A2A] rounded-2xl flex items-center justify-center">
                <MapPin className="w-24 h-24 text-white/20" />
              </div>
            )}

            {/* Mini Map */}
            {mapboxToken && (
              <div className="mt-4 h-48 rounded-xl overflow-hidden">
                <img
                  src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-l+9BFF43(${billboard.longitude},${billboard.latitude})/${billboard.longitude},${billboard.latitude},14,0/600x200@2x?access_token=${mapboxToken}`}
                  alt="Ubicación"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Info Section */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-white text-3xl font-bold mb-2">{billboard.title}</h1>
                <p className="text-white/60 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {billboard.address}, {billboard.city}, {billboard.state}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${
                billboard.is_available 
                  ? 'bg-[#9BFF43]/20 text-[#9BFF43]' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {billboard.is_available ? 'Disponible' : 'Ocupado'}
              </span>
            </div>

            {billboard.description && (
              <p className="text-white/70 mb-6">{billboard.description}</p>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-[#2A2A2A] rounded-xl p-4">
                <Maximize2 className="w-5 h-5 text-[#9BFF43] mb-2" />
                <p className="text-white/50 text-sm">Dimensiones</p>
                <p className="text-white font-bold">{billboard.width_m}m x {billboard.height_m}m</p>
              </div>
              <div className="bg-[#2A2A2A] rounded-xl p-4">
                <Sun className="w-5 h-5 text-[#9BFF43] mb-2" />
                <p className="text-white/50 text-sm">Iluminación</p>
                <p className="text-white font-bold capitalize">{billboard.illumination}</p>
              </div>
              <div className="bg-[#2A2A2A] rounded-xl p-4">
                <Eye className="w-5 h-5 text-[#9BFF43] mb-2" />
                <p className="text-white/50 text-sm">Impresiones/día</p>
                <p className="text-white font-bold">
                  {billboard.daily_impressions 
                    ? `+${billboard.daily_impressions.toLocaleString()}`
                    : 'N/A'}
                </p>
              </div>
              <div className="bg-[#2A2A2A] rounded-xl p-4">
                <Calendar className="w-5 h-5 text-[#9BFF43] mb-2" />
                <p className="text-white/50 text-sm">Tipo</p>
                <p className="text-white font-bold capitalize">{billboard.billboard_type}</p>
              </div>
            </div>

            {/* Price & CTA */}
            <div className="bg-gradient-to-r from-[#9BFF43]/20 to-transparent rounded-2xl p-6 mb-6">
              <p className="text-white/60 text-sm mb-1">Precio mensual</p>
              <p className="text-[#9BFF43] text-4xl font-bold mb-4">
                ${billboard.price_per_month.toLocaleString()} <span className="text-lg">MXN</span>
              </p>
              
              {billboard.is_available ? (
                <Button
                  onClick={handleBookingClick}
                  className="w-full bg-[#9BFF43] text-[#202020] hover:bg-[#8AE63A] py-6 text-lg font-bold"
                >
                  Solicitar Reserva
                </Button>
              ) : (
                <Button
                  disabled
                  className="w-full bg-white/10 text-white/50 py-6 text-lg"
                >
                  No Disponible
                </Button>
              )}
            </div>

            {/* Additional Info */}
            <div className="text-white/50 text-sm space-y-2">
              <p>• {billboard.faces} cara{billboard.faces > 1 ? 's' : ''}</p>
              <p>• Reserva mínima: 1 mes</p>
              <p>• Instalación incluida</p>
            </div>
          </div>
        </div>
      </main>

      {/* Booking Dialog */}
      <BookingDialog
        open={showBookingDialog}
        onOpenChange={setShowBookingDialog}
        billboard={billboard}
      />
    </div>
  );
};

export default BillboardDetail;
