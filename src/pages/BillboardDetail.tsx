import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Maximize2, Sun, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import BookingDialog from '@/components/booking/BookingDialog';
import AvailabilityCalendar from '@/components/booking/AvailabilityCalendar';
import FavoriteButton from '@/components/favorites/FavoriteButton';
import StartChatButton from '@/components/chat/StartChatButton';
import BillboardReviewsSection from '@/components/reviews/BillboardReviewsSection';
import BillboardAnalytics from '@/components/billboard/BillboardAnalytics';
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

  // Get all images
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
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => {
              // Navigate back preserving search params
              const savedSearch = sessionStorage.getItem('lastSearchUrl');
              if (savedSearch) {
                navigate(savedSearch);
              } else {
                navigate('/search');
              }
            }}
            className="flex items-center gap-3 text-foreground hover:text-primary transition-colors w-fit"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Volver a búsqueda</span>
          </button>
          <ShareDialog
            title={billboard.title}
            subtitle={`${billboard.city}, ${billboard.state} · $${billboard.price_per_month.toLocaleString()}/mes`}
            imageUrl={billboard.image_url}
            shareUrl={`/billboard/${billboard.id}`}
          />
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Image Carousel */}
          <div className="lg:col-span-2 space-y-3">
            <div className="relative">
              {allImages.length > 0 ? (
                <>
                  <img
                    src={allImages[currentImageIndex]}
                    alt={billboard.title}
                    className="w-full h-64 md:h-80 lg:h-96 object-cover rounded-2xl"
                  />
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                        {allImages.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentImageIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              idx === currentImageIndex ? 'bg-primary' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-64 md:h-80 lg:h-96 bg-secondary rounded-2xl flex items-center justify-center">
                  <MapPin className="w-24 h-24 text-muted-foreground" />
                </div>
              )}
            </div>
            
            {/* Action buttons below image */}
            <div className="flex items-center gap-3">
              <StartChatButton 
                billboardId={billboard.id} 
                ownerId={billboard.owner_id}
              />
              <FavoriteButton billboardId={billboard.id} variant="button" />
            </div>
          </div>

          {/* Sidebar - Price & CTA */}
          <div className="space-y-4">
            <Card className="bg-card border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-foreground text-xl font-bold line-clamp-2">{billboard.title}</h1>
                <Badge variant={billboard.is_available ? 'default' : 'destructive'} className="flex-shrink-0">
                  {billboard.is_available ? 'Disponible' : 'Ocupado'}
                </Badge>
              </div>
              
              <p className="text-muted-foreground text-sm flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                {billboard.city}, {billboard.state}
              </p>

              <div className="border-t border-border pt-4 mb-4">
                <p className="text-muted-foreground text-sm mb-1">Precio mensual</p>
                <p className="text-primary text-3xl font-bold">
                  ${billboard.price_per_month.toLocaleString()} <span className="text-base font-normal">MXN</span>
                </p>
              </div>
              
              {billboard.is_available ? (
                <Button
                  onClick={handleBookingClick}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-5 text-base font-bold"
                >
                  Solicitar Reserva
                </Button>
              ) : (
                <Button disabled className="w-full py-5 text-base">
                  No Disponible
                </Button>
              )}

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <Maximize2 className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-foreground text-sm font-bold">{billboard.width_m}m × {billboard.height_m}m</p>
                  <p className="text-muted-foreground text-xs">Dimensiones</p>
                </div>
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <Sun className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-foreground text-sm font-bold capitalize">{billboard.illumination}</p>
                  <p className="text-muted-foreground text-xs">Iluminación</p>
                </div>
              </div>

              {/* Billboard Type */}
              <div className="mt-3 p-3 bg-secondary rounded-lg text-center">
                <p className="text-foreground text-sm font-bold capitalize">{billboard.billboard_type}</p>
                <p className="text-muted-foreground text-xs">{billboard.faces} cara{billboard.faces > 1 ? 's' : ''}</p>
              </div>
            </Card>

            {/* Availability Calendar Preview */}
            <Card className="bg-card border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Disponibilidad</h3>
              </div>
              <AvailabilityCalendar billboardId={billboard.id} />
            </Card>
          </div>
        </div>

        {/* Mini Map */}
        {mapboxToken && (
          <div className="mb-6 rounded-xl overflow-hidden h-40">
            <img
              src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-l+9BFF43(${billboard.longitude},${billboard.latitude})/${billboard.longitude},${billboard.latitude},14,0/1200x160@2x?access_token=${mapboxToken}`}
              alt="Ubicación"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Consolidated Analytics Section */}
        <div className="mb-6">
          <BillboardAnalytics
            billboardId={billboard.id}
            latitude={billboard.latitude}
            longitude={billboard.longitude}
            dailyImpressions={billboard.daily_impressions}
            city={billboard.city}
          />
        </div>

        {/* Description (if exists) */}
        {billboard.description && (
          <Card className="bg-card border-border p-6 mb-6">
            <h3 className="text-foreground font-semibold mb-3">Descripción</h3>
            <p className="text-muted-foreground text-sm">{billboard.description}</p>
          </Card>
        )}

        {/* Full Address */}
        <Card className="bg-card border-border p-6 mb-6">
          <h3 className="text-foreground font-semibold mb-2">Ubicación</h3>
          <p className="text-muted-foreground text-sm">{billboard.address}</p>
          <p className="text-muted-foreground text-xs mt-1">
            Coordenadas: {billboard.latitude.toFixed(6)}, {billboard.longitude.toFixed(6)}
          </p>
        </Card>

        {/* Owner Section */}
        <OwnerSection ownerId={billboard.owner_id} />

        {/* Reviews Section */}
        <div className="mt-6">
          <BillboardReviewsSection billboardId={billboard.id} />
        </div>
      </main>

      {/* Booking Dialog */}
      <BookingDialog
        open={showBookingDialog}
        onOpenChange={setShowBookingDialog}
        billboard={billboard}
      />
      
      {/* Mobile Navigation Bar */}
      <MobileNavBar />
    </div>
  );
};

export default BillboardDetail;