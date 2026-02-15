import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Calendar, MapPin, ExternalLink, Eye, Clock, Check, X, Info, Ban, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import CampaignMetrics from './CampaignMetrics';
import CampaignZoneProfile from './CampaignZoneProfile';
import CampaignTrendChart from './CampaignTrendChart';
import { Link } from 'react-router-dom';
import { parseDateOnlyStart, parseDateOnlyEnd, getTodayStart } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { parseDesignPaths, resolveDesignImageUrls } from '@/lib/designImageUtils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Billboard {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  image_url: string | null;
  daily_impressions: number | null;
  latitude: number;
  longitude: number;
}

interface INEGIData {
  socioeconomic_level: string | null;
  commercial_environment: string | null;
  nearby_businesses_count: number | null;
}

interface CampaignDetailProps {
  booking: {
    id: string;
    billboard_id: string;
    start_date: string;
    end_date: string;
    total_price: number;
    status: string;
    ad_design_url?: string | null;
    notes?: string | null;
  };
  onBack: () => void;
  onRefresh?: () => void;
}

const CampaignDetail: React.FC<CampaignDetailProps> = ({ booking, onBack, onRefresh }) => {
  const { user } = useAuth();
  const [billboard, setBillboard] = useState<Billboard | null>(null);
  const [inegiData, setInegiData] = useState<INEGIData | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const startDate = parseDateOnlyStart(booking.start_date);
  const endDate = parseDateOnlyEnd(booking.end_date);
  const today = getTodayStart();
  
  const isOngoing = booking.status === 'approved' && startDate <= today && endDate >= today;
  const isScheduled = booking.status === 'approved' && startDate > today;
  const isPast = booking.status === 'approved' && endDate < today;
  const isPending = booking.status === 'pending';
  const isRejected = booking.status === 'rejected';
  const isCancelled = booking.status === 'cancelled';

  const totalDays = differenceInDays(endDate, startDate) + 1;
  const activeDays = isOngoing 
    ? differenceInDays(today, startDate) + 1 
    : isPast 
      ? totalDays 
      : 0;

  // Resolve design images (handles both legacy public URLs and private paths)
  const [designImages, setDesignImages] = useState<string[]>([]);

  useEffect(() => {
    const paths = parseDesignPaths(booking.ad_design_url);
    if (paths.length > 0) {
      resolveDesignImageUrls(paths).then(setDesignImages);
    }
  }, [booking.ad_design_url]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: billboardData } = await supabase
        .from('billboards')
        .select('*')
        .eq('id', booking.billboard_id)
        .single();
      
      if (billboardData) setBillboard(billboardData);

      const { data: inegiDataResult } = await supabase
        .from('inegi_demographics')
        .select('socioeconomic_level, commercial_environment, nearby_businesses_count')
        .eq('billboard_id', booking.billboard_id)
        .single();
      
      if (inegiDataResult) setInegiData(inegiDataResult);

      const { data: tokenData } = await supabase.functions.invoke('get-mapbox-token');
      if (tokenData?.token) setMapboxToken(tokenData.token);
    };

    fetchData();
  }, [booking.billboard_id]);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !billboard) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [billboard.longitude, billboard.latitude],
      zoom: 15,
      interactive: false,
    });

    new mapboxgl.Marker({ color: 'hsl(var(--primary))' })
      .setLngLat([billboard.longitude, billboard.latitude])
      .addTo(map.current);

    return () => { map.current?.remove(); };
  }, [mapboxToken, billboard]);

  const handleCancelBooking = async () => {
    setCancelling(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);

      if (error) throw error;

      // Notify owner via in-app + email
      if (billboard) {
        const { data: ownerBillboard } = await supabase
          .from('billboards')
          .select('owner_id')
          .eq('id', booking.billboard_id)
          .single();

        if (ownerBillboard) {
          await supabase.from('notifications').insert({
            user_id: ownerBillboard.owner_id,
            title: 'Solicitud cancelada',
            message: `El negocio canceló su solicitud para "${billboard.title}"`,
            type: 'booking_cancelled',
            related_booking_id: booking.id,
            related_billboard_id: booking.billboard_id,
          });

          // Send cancellation email to owner
          try {
            const { data: ownerProfile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', ownerBillboard.owner_id)
              .maybeSingle();

            await supabase.functions.invoke('send-notification-email', {
              body: {
                type: 'booking_cancelled',
                recipientName: ownerProfile?.full_name || 'Propietario',
                userId: ownerBillboard.owner_id,
                entityId: booking.id,
                data: {
                  billboardTitle: billboard.title,
                  startDate: new Date(booking.start_date).toLocaleDateString('es-MX'),
                  endDate: new Date(booking.end_date).toLocaleDateString('es-MX'),
                  cancelledBy: 'el negocio',
                  recipientRole: 'owner',
                }
              }
            });
          } catch (emailErr) {
            console.error('Error sending cancellation email:', emailErr);
          }
        }
      }

      toast.success('Solicitud cancelada exitosamente');
      setShowCancelDialog(false);
      onRefresh?.();
      onBack();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Error al cancelar la solicitud');
    } finally {
      setCancelling(false);
    }
  };

  const dailyImpressions = billboard?.daily_impressions || 1000;
  const totalImpressions = dailyImpressions * activeDays;

  const getStatusBadge = () => {
    if (isOngoing) {
      return (
        <Badge className="bg-primary text-primary-foreground gap-1 text-sm">
          <span className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />
          Activa
        </Badge>
      );
    }
    if (isScheduled) {
      return (
        <Badge variant="secondary" className="gap-1 text-sm">
          <Calendar className="w-3.5 h-3.5" />
          Programada
        </Badge>
      );
    }
    if (isPending) {
      return (
        <Badge variant="outline" className="border-warning text-warning gap-1 text-sm">
          <Clock className="w-3.5 h-3.5" />
          Pendiente
        </Badge>
      );
    }
    if (isRejected) {
      return (
        <Badge variant="outline" className="border-destructive text-destructive gap-1 text-sm">
          <X className="w-3.5 h-3.5" />
          Rechazada
        </Badge>
      );
    }
    if (isCancelled) {
      return (
        <Badge variant="outline" className="border-muted-foreground text-muted-foreground gap-1 text-sm">
          <Ban className="w-3.5 h-3.5" />
          Cancelada
        </Badge>
      );
    }
    if (isPast) {
      return (
        <Badge variant="outline" className="gap-1 text-sm">
          <Check className="w-3.5 h-3.5" />
          Finalizada
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Volver a campañas
      </Button>

      {/* Header with image */}
      <Card className="overflow-hidden">
        <div className="relative h-64 md:h-80">
          {billboard?.image_url ? (
            <img
              src={billboard.image_url}
              alt={billboard?.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <MapPin className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute top-4 left-4">
            {getStatusBadge()}
          </div>
        </div>

        <div className="p-5">
          <h1 className="text-xl font-bold text-foreground mb-1">
            {billboard?.title || 'Cargando...'}
          </h1>
          <p className="text-muted-foreground mb-3">
            {billboard?.address}, {billboard?.city}, {billboard?.state}
          </p>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {format(startDate, "d MMMM yyyy", { locale: es })} → {format(endDate, "d MMMM yyyy", { locale: es })}
            </span>
            <span className="text-foreground font-medium">({totalDays} días)</span>
          </div>
        </div>
      </Card>

      {/* Design images section */}
      {designImages.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            Diseño de campaña ({designImages.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {designImages.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                <img 
                  src={url} 
                  alt={`Diseño ${i + 1}`} 
                  className="w-full aspect-video object-cover rounded-lg border border-border hover:border-primary/50 transition-colors" 
                />
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* Cancel button for pending bookings */}
      {isPending && (
        <Button
          variant="outline"
          onClick={() => setShowCancelDialog(true)}
          className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 gap-2"
        >
          <Ban className="w-4 h-4" />
          Cancelar solicitud
        </Button>
      )}

      {/* Mini Map */}
      <Card className="overflow-hidden">
        <div ref={mapContainer} className="h-48 w-full" />
        <div className="p-3 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Ubicación del espectacular</span>
          <Button variant="outline" size="sm" asChild className="gap-1">
            <Link to={`/billboard/${billboard?.id}`}>
              Ver mapa grande
              <ExternalLink className="w-3 h-3" />
            </Link>
          </Button>
        </div>
      </Card>

      {/* Trend Chart */}
      {(isOngoing || isPast) && billboard && (
        <CampaignTrendChart
          startDate={booking.start_date}
          endDate={booking.end_date}
          dailyImpressions={dailyImpressions}
          isActive={isOngoing}
        />
      )}

      {(isScheduled || isPending) && (
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-muted">
              <Info className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Campaña aún no iniciada</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Los datos de impresiones y métricas estarán disponibles cuando la campaña esté activa.
              </p>
              <div className="text-sm">
                <span className="text-muted-foreground">Inicia el </span>
                <span className="font-medium text-foreground">{format(startDate, "d 'de' MMMM yyyy", { locale: es })}</span>
                <span className="text-muted-foreground"> · Duración: </span>
                <span className="font-medium text-foreground">{totalDays} días</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {(isOngoing || isPast) && (
        <div>
          <h2 className="font-semibold text-foreground mb-3">Métricas de Impacto</h2>
          <CampaignMetrics
            totalImpressions={totalImpressions}
            averageDaily={dailyImpressions}
            activeDays={activeDays}
            totalDays={totalDays}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Estimaciones basadas en datos de movilidad · Fuente: TomTom
          </p>
        </div>
      )}

      {inegiData && (
        <div>
          <h2 className="font-semibold text-foreground mb-3">Perfil de la Zona</h2>
          <CampaignZoneProfile
            socioeconomicLevel={inegiData.socioeconomic_level}
            commercialEnvironment={inegiData.commercial_environment}
            nearbyBusinessesCount={inegiData.nearby_businesses_count}
          />
        </div>
      )}

      <div className="pt-4 border-t border-border">
        <Button variant="outline" asChild className="w-full gap-2">
          <Link to={`/billboard/${billboard?.id}`}>
            Ver detalles del espectacular
            <ExternalLink className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">¿Cancelar solicitud?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Se cancelará tu solicitud de campaña para "{billboard?.title}". El propietario será notificado. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelBooking}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? 'Cancelando...' : 'Cancelar solicitud'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CampaignDetail;
