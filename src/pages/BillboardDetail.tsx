import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Maximize2, Sun, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import BookingDialog from '@/components/booking/BookingDialog';
import AvailabilityCalendar from '@/components/booking/AvailabilityCalendar';
import ZoneIndicator from '@/components/billboard/ZoneIndicator';
import FavoriteButton from '@/components/favorites/FavoriteButton';
import StartChatButton from '@/components/chat/StartChatButton';
import BillboardReviewsSection from '@/components/reviews/BillboardReviewsSection';
import LocationMetrics from '@/components/billboard/LocationMetrics';
import NearbyBrands from '@/components/billboard/NearbyBrands';
import { INEGIInsights } from '@/components/billboard/INEGIInsights';
import { TrafficAnalyticsPublic } from '@/components/billboard/TrafficAnalyticsPublic';
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
  points_of_interest: string[] | null;
  created_at: string;
  updated_at: string;
}

interface INEGIData {
  nearby_businesses_count: number | null;
  socioeconomic_level: string | null;
  dominant_sector: string | null;
  commercial_environment: string | null;
  raw_denue_data?: {
    known_brands?: string[];
    shopping_centers?: string[];
    top_businesses?: Array<{ name: string; category: string; size?: string }>;
  };
}

const BillboardDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [billboard, setBillboard] = useState<Billboard | null>(null);
  const [inegiData, setInegiData] = useState<INEGIData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInegi, setIsLoadingInegi] = useState(true);
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

        // Fetch INEGI data
        const { data: inegi } = await supabase
          .from('inegi_demographics')
          .select('nearby_businesses_count, socioeconomic_level, dominant_sector, commercial_environment, raw_denue_data')
          .eq('billboard_id', id)
          .maybeSingle();

        if (inegi) {
          setInegiData(inegi as INEGIData);
        } else {
          // Trigger analysis if no cached data
          const { data: result } = await supabase.functions.invoke('analyze-inegi-data', {
            body: {
              billboard_id: id,
              latitude: data.latitude,
              longitude: data.longitude,
            },
          });
          if (result?.data) {
            setInegiData(result.data as INEGIData);
          }
        }
        setIsLoadingInegi(false);
      } catch (error) {
        console.error('Error fetching billboard:', error);
        toast.error('Error al cargar el espectacular');
      } finally {
        setIsLoading(false);
        setIsLoadingInegi(false);
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

  // Extract enriched data from raw_denue_data
  const knownBrands = inegiData?.raw_denue_data?.known_brands || [];
  const shoppingCenters = inegiData?.raw_denue_data?.shopping_centers || [];
  const topBusinesses = inegiData?.raw_denue_data?.top_businesses || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/search" className="flex items-center gap-3 text-foreground hover:text-primary transition-colors w-fit">
            <ArrowLeft className="w-5 h-5" />
            <span>Volver a búsqueda</span>
          </Link>
          <ShareDialog
            title={billboard.title}
            subtitle={`${billboard.city}, ${billboard.state} · $${billboard.price_per_month.toLocaleString()}/mes`}
            imageUrl={billboard.image_url}
            shareUrl={`/billboard/${billboard.id}`}
          />
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Image */}
          <div className="lg:col-span-2 space-y-3">
            {billboard.image_url ? (
              <img
                src={billboard.image_url}
                alt={billboard.title}
                className="w-full h-80 lg:h-96 object-cover rounded-2xl"
              />
            ) : (
              <div className="w-full h-80 lg:h-96 bg-secondary rounded-2xl flex items-center justify-center">
                <MapPin className="w-24 h-24 text-muted-foreground" />
              </div>
            )}
            
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
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-foreground text-xl font-bold line-clamp-2">{billboard.title}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                  billboard.is_available 
                    ? 'bg-primary/20 text-primary' 
                    : 'bg-destructive/20 text-destructive'
                }`}>
                  {billboard.is_available ? 'Disponible' : 'Ocupado'}
                </span>
              </div>
              
              <p className="text-muted-foreground text-sm flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                {billboard.address}, {billboard.city}
              </p>

              <div className="border-t border-border pt-4 mb-4">
                <p className="text-muted-foreground text-sm mb-1">Precio mensual</p>
                <p className="text-primary text-3xl font-bold">
                  ${billboard.price_per_month.toLocaleString()} <span className="text-base">MXN</span>
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
                <Button
                  disabled
                  className="w-full bg-muted text-muted-foreground py-5 text-base"
                >
                  No Disponible
                </Button>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <Maximize2 className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-foreground text-sm font-bold">{billboard.width_m}m x {billboard.height_m}m</p>
                  <p className="text-muted-foreground text-xs">Dimensiones</p>
                </div>
                <div className="bg-secondary rounded-lg p-3 text-center">
                  <Sun className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="text-foreground text-sm font-bold capitalize">{billboard.illumination}</p>
                  <p className="text-muted-foreground text-xs">Iluminación</p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="text-muted-foreground text-xs space-y-1 mt-4 pt-4 border-t border-border">
                <p>• {billboard.faces} cara{billboard.faces > 1 ? 's' : ''} · {billboard.billboard_type}</p>
                <p>• Reserva mínima: 1 mes</p>
                <p>• Instalación incluida</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mini Map */}
        {mapboxToken && (
          <div className="mb-8 rounded-xl overflow-hidden h-48">
            <img
              src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-l+9BFF43(${billboard.longitude},${billboard.latitude})/${billboard.longitude},${billboard.latitude},14,0/1200x200@2x?access_token=${mapboxToken}`}
              alt="Ubicación"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Location Metrics */}
        <div className="mb-8">
          <LocationMetrics
            dailyImpressions={billboard.daily_impressions}
            nearbyBusinessesCount={inegiData?.nearby_businesses_count}
            socioeconomicLevel={inegiData?.socioeconomic_level}
            dominantSector={inegiData?.dominant_sector}
            commercialEnvironment={inegiData?.commercial_environment}
            isLoadingInegi={isLoadingInegi}
          />
        </div>

        {/* INEGI Insights - Commercial Categories */}
        <div className="mb-8">
          <INEGIInsights billboard={{ id: billboard.id, latitude: billboard.latitude, longitude: billboard.longitude }} />
        </div>

        {/* Traffic Analytics */}
        <div className="mb-8">
          <TrafficAnalyticsPublic 
            billboardId={billboard.id} 
            dailyImpressions={billboard.daily_impressions}
            city={billboard.city}
          />
        </div>

        {/* Nearby Brands */}
        {(knownBrands.length > 0 || shoppingCenters.length > 0 || topBusinesses.length > 0) && (
          <div className="mb-8">
            <NearbyBrands
              knownBrands={knownBrands}
              shoppingCenters={shoppingCenters}
              topBusinesses={topBusinesses}
              totalBusinesses={inegiData?.nearby_businesses_count || 0}
            />
          </div>
        )}

        {/* Zone Indicator */}
        {billboard.points_of_interest && billboard.points_of_interest.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 mb-8">
            <h3 className="text-foreground font-semibold mb-3">Tipo de Zona</h3>
            <ZoneIndicator pointsOfInterest={billboard.points_of_interest} />
          </div>
        )}

        {/* Availability Calendar */}
        <div className="mb-8">
          <h3 className="text-foreground font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Disponibilidad
          </h3>
          <AvailabilityCalendar billboardId={billboard.id} />
        </div>

        {/* Owner Section */}
        <OwnerSection ownerId={billboard.owner_id} />

        {billboard.description && (
          <div className="bg-card border border-border rounded-xl p-6 mb-8">
            <h3 className="text-foreground font-semibold mb-2">Descripción</h3>
            <p className="text-muted-foreground">{billboard.description}</p>
          </div>
        )}

        {/* Reviews Section */}
        <div className="mt-8">
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
