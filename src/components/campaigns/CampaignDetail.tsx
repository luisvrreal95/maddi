import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Calendar, MapPin, ExternalLink, Eye, Clock, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import CampaignMetrics from './CampaignMetrics';
import CampaignZoneProfile from './CampaignZoneProfile';
import CampaignTrendChart from './CampaignTrendChart';
import { Link } from 'react-router-dom';

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
}

const CampaignDetail: React.FC<CampaignDetailProps> = ({ booking, onBack }) => {
  const [billboard, setBillboard] = useState<Billboard | null>(null);
  const [inegiData, setInegiData] = useState<INEGIData | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const startDate = new Date(booking.start_date);
  const endDate = new Date(booking.end_date);
  const now = new Date();
  
  const isOngoing = booking.status === 'approved' && isBefore(startDate, now) && isAfter(endDate, now);
  const isScheduled = booking.status === 'approved' && isAfter(startDate, now);
  const isPast = booking.status === 'approved' && isBefore(endDate, now);
  const isPending = booking.status === 'pending';
  const isRejected = booking.status === 'rejected';

  const totalDays = differenceInDays(endDate, startDate) + 1;
  const activeDays = isOngoing 
    ? differenceInDays(now, startDate) + 1 
    : isPast 
      ? totalDays 
      : 0;

  useEffect(() => {
    const fetchData = async () => {
      // Fetch billboard
      const { data: billboardData } = await supabase
        .from('billboards')
        .select('*')
        .eq('id', booking.billboard_id)
        .single();
      
      if (billboardData) {
        setBillboard(billboardData);
      }

      // Fetch INEGI data
      const { data: inegiDataResult } = await supabase
        .from('inegi_demographics')
        .select('socioeconomic_level, commercial_environment, nearby_businesses_count')
        .eq('billboard_id', booking.billboard_id)
        .single();
      
      if (inegiDataResult) {
        setInegiData(inegiDataResult);
      }

      // Fetch mapbox token
      const { data: tokenData } = await supabase.functions.invoke('get-mapbox-token');
      if (tokenData?.token) {
        setMapboxToken(tokenData.token);
      }
    };

    fetchData();
  }, [booking.billboard_id]);

  // Initialize mini-map
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

    // Add marker
    new mapboxgl.Marker({ color: 'hsl(var(--primary))' })
      .setLngLat([billboard.longitude, billboard.latitude])
      .addTo(map.current);

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, billboard]);

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
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="gap-2 -ml-2">
        <ArrowLeft className="w-4 h-4" />
        Volver a campañas
      </Button>

      {/* Header with image */}
      <Card className="overflow-hidden">
        <div className="relative h-64 md:h-80">
          {booking.ad_design_url ? (
            <img
              src={booking.ad_design_url}
              alt="Diseño del anuncio"
              className="w-full h-full object-cover"
            />
          ) : billboard?.image_url ? (
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
          
          {/* Status badge overlay */}
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

          {booking.ad_design_url && (
            <a
              href={booking.ad_design_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 text-sm text-primary hover:underline"
            >
              <Eye className="w-4 h-4" />
              Ver diseño del anuncio
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </Card>

      {/* Mini Map */}
      <Card className="overflow-hidden">
        <div 
          ref={mapContainer} 
          className="h-48 w-full"
        />
        <div className="p-3 flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            Ubicación del espectacular
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            asChild
            className="gap-1"
          >
            <Link to={`/billboard/${billboard?.id}`}>
              Ver mapa grande
              <ExternalLink className="w-3 h-3" />
            </Link>
          </Button>
        </div>
      </Card>

      {/* Trend Chart - Show for active, scheduled, pending, and past campaigns */}
      {(isOngoing || isPast || isScheduled || isPending) && billboard && (
        <CampaignTrendChart
          startDate={booking.start_date}
          endDate={booking.end_date}
          dailyImpressions={dailyImpressions}
          isActive={isOngoing}
        />
      )}

      {/* Metrics - Show for active, scheduled, pending, and past campaigns */}
      {(isOngoing || isPast || isScheduled || isPending) && (
        <div>
          <h2 className="font-semibold text-foreground mb-3">Métricas de Impacto {isScheduled || isPending ? '(Estimadas)' : ''}</h2>
          <CampaignMetrics
            totalImpressions={isScheduled || isPending ? dailyImpressions * totalDays : totalImpressions}
            averageDaily={dailyImpressions}
            activeDays={isScheduled || isPending ? 0 : activeDays}
            totalDays={totalDays}
          />
          <p className="text-xs text-muted-foreground mt-2">
            {isScheduled || isPending ? 'Proyección basada en' : 'Estimaciones basadas en'} datos de movilidad · Fuente: TomTom
          </p>
        </div>
      )}

      {/* Zone Profile */}
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

      {/* View billboard link */}
      <div className="pt-4 border-t border-border">
        <Button variant="outline" asChild className="w-full gap-2">
          <Link to={`/billboard/${billboard?.id}`}>
            Ver detalles del espectacular
            <ExternalLink className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default CampaignDetail;
