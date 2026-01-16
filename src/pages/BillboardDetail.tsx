import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Maximize2, Sun, Calendar, ChevronDown, ChevronUp, BarChart3, Users, Building2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import BookingDialog from '@/components/booking/BookingDialog';
import AvailabilityCalendar from '@/components/booking/AvailabilityCalendar';
import FavoriteButton from '@/components/favorites/FavoriteButton';
import StartChatButton from '@/components/chat/StartChatButton';
import BillboardReviewsSection from '@/components/reviews/BillboardReviewsSection';
import POIOverview from '@/components/billboard/POIOverview';
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
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
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
          .select('nearby_businesses_count, socioeconomic_level, dominant_sector, commercial_environment')
          .eq('billboard_id', id)
          .maybeSingle();

        if (inegi) {
          setInegiData(inegi as INEGIData);
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

  // Format daily impressions
  const formatImpressions = (impressions: number | null) => {
    if (!impressions) return 'Calculando...';
    if (impressions >= 1000) return `${(impressions / 1000).toFixed(0)}K`;
    return impressions.toString();
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/search" className="flex items-center gap-3 text-foreground hover:text-primary transition-colors w-fit">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Volver a búsqueda</span>
          </Link>
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
          {/* Image */}
          <div className="lg:col-span-2 space-y-3">
            {billboard.image_url ? (
              <img
                src={billboard.image_url}
                alt={billboard.title}
                className="w-full h-64 md:h-80 lg:h-96 object-cover rounded-2xl"
              />
            ) : (
              <div className="w-full h-64 md:h-80 lg:h-96 bg-secondary rounded-2xl flex items-center justify-center">
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
            </Card>
          </div>
        </div>

        {/* Quick Summary Card - New consolidated section */}
        <Card className="bg-card border-border p-6 mb-6">
          <h2 className="text-foreground font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Resumen de ubicación
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {/* Daily Impressions */}
            <div className="bg-secondary/50 rounded-xl p-4 text-center">
              <Users className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{formatImpressions(billboard.daily_impressions)}</p>
              <p className="text-xs text-muted-foreground">Impresiones/día</p>
            </div>
            
            {/* Nearby Businesses */}
            <div className="bg-secondary/50 rounded-xl p-4 text-center">
              <Building2 className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">
                {isLoadingInegi ? '...' : (inegiData?.nearby_businesses_count || 'N/A')}
              </p>
              <p className="text-xs text-muted-foreground">Negocios cercanos</p>
            </div>
            
            {/* Socioeconomic Level */}
            <div className="bg-secondary/50 rounded-xl p-4 text-center">
              <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground capitalize">
                {isLoadingInegi ? '...' : (inegiData?.socioeconomic_level || 'N/A')}
              </p>
              <p className="text-xs text-muted-foreground">Nivel socioeconómico</p>
            </div>
            
            {/* Billboard Type */}
            <div className="bg-secondary/50 rounded-xl p-4 text-center">
              <MapPin className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground capitalize">{billboard.billboard_type}</p>
              <p className="text-xs text-muted-foreground">{billboard.faces} cara{billboard.faces > 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Dominant Sector & Commercial Environment */}
          {!isLoadingInegi && (inegiData?.dominant_sector || inegiData?.commercial_environment) && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
              {inegiData?.dominant_sector && (
                <Badge variant="outline" className="text-xs">
                  Sector: {inegiData.dominant_sector}
                </Badge>
              )}
              {inegiData?.commercial_environment && (
                <Badge variant="outline" className="text-xs">
                  Entorno: {inegiData.commercial_environment}
                </Badge>
              )}
            </div>
          )}
        </Card>

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

        {/* POI Overview - Cached, compact */}
        <div className="mb-6">
          <POIOverview 
            billboardId={billboard.id} 
            latitude={billboard.latitude} 
            longitude={billboard.longitude} 
          />
        </div>

        {/* Expandable Full Analysis Section */}
        <Card className="bg-card border-border mb-6">
          <button 
            onClick={() => setShowFullAnalysis(!showFullAnalysis)}
            className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">Ver análisis completo</span>
            </div>
            {showFullAnalysis ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          
          {showFullAnalysis && (
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
              {/* Availability Calendar */}
              <div>
                <h3 className="text-foreground font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Disponibilidad
                </h3>
                <AvailabilityCalendar billboardId={billboard.id} />
              </div>

              {/* Description */}
              {billboard.description && (
                <div className="pt-4 border-t border-border">
                  <h3 className="text-foreground font-semibold mb-2">Descripción</h3>
                  <p className="text-muted-foreground text-sm">{billboard.description}</p>
                </div>
              )}

              {/* Full Address */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-foreground font-semibold mb-2">Dirección completa</h3>
                <p className="text-muted-foreground text-sm">{billboard.address}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Coordenadas: {billboard.latitude.toFixed(6)}, {billboard.longitude.toFixed(6)}
                </p>
              </div>

              {/* Booking Terms */}
              <div className="pt-4 border-t border-border">
                <h3 className="text-foreground font-semibold mb-2">Términos de reserva</h3>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• {billboard.faces} cara{billboard.faces > 1 ? 's' : ''} · {billboard.billboard_type}</li>
                  <li>• Reserva mínima: 1 mes</li>
                  <li>• Instalación incluida</li>
                </ul>
              </div>
            </div>
          )}
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
