import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Maximize2, Sun, Calendar, Layers, Eye } from 'lucide-react';
import ImageGallery from '@/components/billboard/ImageGallery';
import { toast } from 'sonner';
import BookingDialog from '@/components/booking/BookingDialog';
import AvailabilityCalendar from '@/components/booking/AvailabilityCalendar';
import FavoriteButton from '@/components/favorites/FavoriteButton';
import StartChatButton from '@/components/chat/StartChatButton';
import BillboardAnalytics from '@/components/billboard/BillboardAnalytics';
import TrafficEstimate from '@/components/billboard/TrafficEstimate';
import ShareDialog from '@/components/share/ShareDialog';
import OwnerSection from '@/components/billboard/OwnerSection';
import MobileNavBar from '@/components/navigation/MobileNavBar';

interface Billboard {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  width_m: number;
  height_m: number;
  billboard_type: string;
  illumination: string;
  faces: number;
  daily_impressions: number | null;
  price_per_month: number;
  image_url: string | null;
  image_urls: string[] | null;
  is_available: boolean;
  pause_reason: string | null;
  points_of_interest: string[] | null;
  min_campaign_days: number | null;
  min_advance_booking_days: number | null;
  is_digital: boolean;
  created_at: string;
  updated_at: string;
}

const BillboardDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [billboard, setBillboard] = useState<Billboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [mapboxToken, setMapboxToken] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Cargando...</div>
      </div>
    );
  }

  if (!billboard) return null;

  // Block business users from seeing admin-paused billboards
  const isOwner = user && billboard.owner_id === user.id;
  const isPausedByAdmin = billboard.pause_reason === 'admin';
  
  if (isPausedByAdmin && !isOwner && userRole !== 'owner') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Espectacular no disponible</h2>
          <p className="text-muted-foreground mb-4">Este espectacular no está disponible en este momento.</p>
          <Button onClick={() => navigate('/search')}>Volver a búsqueda</Button>
        </div>
      </div>
    );
  }

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
    if (!billboard.is_available || billboard.pause_reason) {
      toast.error('Este espectacular no está disponible actualmente');
      return;
    }
    setShowBookingDialog(true);
  };

  const allImages = billboard.image_urls && billboard.image_urls.length > 0
    ? billboard.image_urls
    : billboard.image_url
      ? [billboard.image_url]
      : [];

  const nextImage = () => {
    if (allImages.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    }
  };

  const prevImage = () => {
    if (allImages.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-md border-b border-border px-6 max-sm:px-4 py-3 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              const savedSearch = sessionStorage.getItem('lastSearchUrl');
              navigate(savedSearch || '/search');
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm">Volver a búsqueda</span>
          </button>
          <div className="flex items-center gap-2">
            <FavoriteButton billboardId={billboard.id} variant="button" />
            <StartChatButton
              billboardId={billboard.id}
              ownerId={billboard.owner_id}
            />
            <ShareDialog
              title={billboard.title}
              subtitle={`${billboard.city}, ${billboard.state} · $${billboard.price_per_month.toLocaleString()}/mes`}
              imageUrl={billboard.image_url}
              shareUrl={`/billboard/${billboard.id}`}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* Airbnb-style image gallery */}
        <div className="px-4 md:px-6 pt-4">
          <ImageGallery images={allImages} title={billboard.title} />
        </div>

        {/* Content */}
        <div className="px-4 md:px-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title & Location */}
              <div>
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">{billboard.title}</h1>
                  <Badge
                    variant={billboard.is_available ? 'default' : 'destructive'}
                    className="flex-shrink-0 mt-1"
                  >
                    {billboard.is_available ? 'Disponible' : 'No disponible'}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  {billboard.address} · {billboard.city}, {billboard.state}
                </p>
                {isPausedByAdmin && isOwner && (
                  <div className="mt-3 bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-orange-400 text-sm font-medium">⚠️ Pausada por el equipo de Maddi</p>
                      <p className="text-orange-400/60 text-xs mt-0.5">No es visible para anunciantes. Contacta a soporte para más información.</p>
                    </div>
                    <a 
                      href="mailto:soporte@maddi.com.mx?subject=Consulta sobre propiedad pausada"
                      className="text-xs text-orange-400 border border-orange-500/30 rounded-lg px-3 py-1.5 hover:bg-orange-500/10 transition-colors whitespace-nowrap ml-3"
                    >
                      Contactar soporte
                    </a>
                  </div>
                )}
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-sm:gap-2">
                <div className="bg-card border border-border rounded-xl p-4 max-sm:p-3 text-center hover:border-white/20 transition-colors">
                  <Maximize2 className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-foreground text-sm font-bold">{billboard.width_m}m × {billboard.height_m}m</p>
                  <p className="text-muted-foreground text-xs">Dimensiones</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center hover:border-white/20 transition-colors">
                  <Sun className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-foreground text-sm font-bold capitalize">{billboard.illumination}</p>
                  <p className="text-muted-foreground text-xs">Iluminación</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center hover:border-white/20 transition-colors">
                  <Layers className="w-5 h-5 text-primary mx-auto mb-2" />
                  <p className="text-foreground text-sm font-bold capitalize">{billboard.billboard_type}</p>
                  <p className="text-muted-foreground text-xs">{billboard.faces} cara{billboard.faces > 1 ? 's' : ''}</p>
                </div>
                {billboard.daily_impressions && (
                  <div className="bg-card border border-border rounded-xl p-4 text-center hover:border-white/20 transition-colors">
                    <Eye className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-foreground text-sm font-bold">{(billboard.daily_impressions / 1000).toFixed(0)}K</p>
                    <p className="text-muted-foreground text-xs">Impresiones/día</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {billboard.description && (
                <Card className="bg-card border-border p-5">
                  <h3 className="text-foreground font-semibold mb-2">Descripción</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{billboard.description}</p>
                </Card>
              )}

              {/* Mini Map */}
              {mapboxToken && (
                <div className="relative rounded-xl overflow-hidden border border-border group cursor-pointer"
                  onClick={() => {
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                    const url = isIOS
                      ? `maps://maps.apple.com/?q=${billboard.latitude},${billboard.longitude}`
                      : `https://www.google.com/maps/search/?api=1&query=${billboard.latitude},${billboard.longitude}`;
                    window.open(url, '_blank');
                  }}
                >
                  <img
                    src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-l+9BFF43(${billboard.longitude},${billboard.latitude})/${billboard.longitude},${billboard.latitude},14,0/1200x200@2x?access_token=${mapboxToken}`}
                    alt="Ubicación"
                    className="w-full h-[200px] object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium bg-black/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" /> Abrir en mapas
                    </span>
                  </div>
                </div>
              )}

              {/* Traffic Estimate */}
              <TrafficEstimate
                billboardId={billboard.id}
                latitude={billboard.latitude}
                longitude={billboard.longitude}
                city={billboard.city}
              />

              {/* Analytics */}
              <BillboardAnalytics
                billboardId={billboard.id}
                latitude={billboard.latitude}
                longitude={billboard.longitude}
                dailyImpressions={billboard.daily_impressions}
                city={billboard.city}
              />

              {/* Owner Section */}
              <OwnerSection ownerId={billboard.owner_id} />
            </div>

            {/* Right Column - Sticky Sidebar (hidden on mobile, shown as sticky bottom CTA) */}
            <div className="hidden lg:block lg:sticky lg:top-20 lg:self-start space-y-4">
              {/* Price & CTA Card */}
              <Card className="bg-card border-border p-6">
                <p className="text-muted-foreground text-sm mb-1">Precio mensual</p>
                <p className="text-primary text-3xl font-bold mb-4">
                  ${billboard.price_per_month.toLocaleString()} <span className="text-base font-normal text-muted-foreground">MXN</span>
                </p>

                {billboard.is_available && !billboard.pause_reason ? (
                  <Button
                    onClick={handleBookingClick}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-5 text-base font-bold"
                  >
                    Solicitar Reserva
                  </Button>
                ) : (
                  <div>
                    <Button disabled className="w-full py-5 text-base">
                      No Disponible
                    </Button>
                    {billboard.pause_reason && (
                      <p className="text-muted-foreground text-xs text-center mt-2">No disponible temporalmente</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <StartChatButton
                    billboardId={billboard.id}
                    ownerId={billboard.owner_id}
                    className="flex-1"
                  />
                  <FavoriteButton billboardId={billboard.id} variant="button" />
                </div>
              </Card>

              {/* Availability Calendar */}
              <Card className="bg-card border-border p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">Disponibilidad</h3>
                </div>
                <AvailabilityCalendar billboardId={billboard.id} isDigital={billboard.is_digital} />
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Bottom CTA */}
      <div className="fixed bottom-16 left-0 right-0 z-20 lg:hidden bg-card/95 backdrop-blur-md border-t border-border px-4 py-3 safe-area-bottom">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-primary text-xl font-bold">
              ${billboard.price_per_month.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">MXN/mes</span>
            </p>
          </div>
          {billboard.is_available && !billboard.pause_reason ? (
            <Button
              onClick={handleBookingClick}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2.5 font-bold rounded-xl"
            >
              Solicitar Reserva
            </Button>
          ) : (
            <Button disabled className="px-6 py-2.5 rounded-xl">
              No Disponible
            </Button>
          )}
        </div>
      </div>

      {/* Booking Dialog */}
      <BookingDialog
        open={showBookingDialog}
        onOpenChange={setShowBookingDialog}
        billboard={billboard}
      />

      <MobileNavBar />
    </div>
  );
};

export default BillboardDetail;
