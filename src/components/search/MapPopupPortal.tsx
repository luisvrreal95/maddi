import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import mapboxgl from 'mapbox-gl';
import MaddiScorePopup from './MaddiScorePopup';

interface Property {
  id: string;
  name: string;
  address: string;
  price: string;
  viewsPerDay: string;
  pointsOfInterest: string;
  peakHours: string;
  size: string;
  status: string;
  availability: string;
  lat: number;
  lng: number;
  imageUrl?: string | null;
}

interface CategoryDistribution {
  label: string;
  percentage: number;
  count: number;
}

interface INEGIData {
  socioeconomicLevel?: string;
  nearbyBusinessesCount?: number;
  dominantSector?: string;
  audienceProfile?: string;
  commercialEnvironment?: string;
  businessSectors?: Record<string, number>;
  rawDenueData?: {
    distribution?: CategoryDistribution[];
    known_brands?: string[];
    interpretation?: string;
    zone_type?: 'mixed' | 'specialized' | 'limited';
  };
}

interface TrafficData {
  currentSpeed?: number;
  freeFlowSpeed?: number;
  confidence?: number;
}

interface MapPopupPortalProps {
  map: mapboxgl.Map;
  coordinates: [number, number];
  property: Property;
  nearbyPOIs: Array<{ name: string; category: string; distance: number }>;
  inegiData?: INEGIData | null;
  isLoadingInegi?: boolean;
  trafficData?: TrafficData | null;
  isLoadingTraffic?: boolean;
  onClose: () => void;
  onReserve: () => void;
  onViewDetails: () => void;
  onAddToCompare: () => void;
  isInCompare: boolean;
}

const MapPopupPortal: React.FC<MapPopupPortalProps> = ({
  map,
  coordinates,
  property,
  nearbyPOIs,
  inegiData,
  isLoadingInegi,
  trafficData,
  isLoadingTraffic,
  onClose,
  onReserve,
  onViewDetails,
  onAddToCompare,
  isInCompare
}) => {
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Transform Property to MaddiScorePopup format
  const transformedProperty = {
    id: property.id,
    title: property.name,
    address: property.address,
    city: '', // Extracted from address if needed
    price_per_month: parseInt(property.price.replace(/[^0-9]/g, '')) || 0,
    image_url: property.imageUrl || undefined,
    daily_impressions: parseInt(property.viewsPerDay.replace(/[^0-9]/g, '')) || 0,
    billboard_type: 'Espectacular',
  };

  useEffect(() => {
    // Create container for React content immediately
    const container = document.createElement('div');
    container.className = 'mapbox-popup-react-content';
    containerRef.current = container;

    // Create popup immediately with proper settings
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: [20, 0],
      maxWidth: '360px',
      className: 'custom-mapbox-popup',
      anchor: 'left'
    })
      .setLngLat(coordinates)
      .setDOMContent(container)
      .addTo(map);

    popupRef.current = popup;

    // Force popup to be visible immediately
    const popupElement = popup.getElement();
    if (popupElement) {
      popupElement.style.zIndex = '100';
      popupElement.style.pointerEvents = 'auto';
      popupElement.style.opacity = '1';
    }

    // Mark as ready to render React content
    setIsReady(true);

    return () => {
      popup.remove();
      containerRef.current = null;
      setIsReady(false);
    };
  }, [map, coordinates]);

  // Update popup position when coordinates change
  useEffect(() => {
    if (popupRef.current) {
      popupRef.current.setLngLat(coordinates);
    }
  }, [coordinates]);

  if (!isReady || !containerRef.current) return null;

  return createPortal(
    <MaddiScorePopup
      property={transformedProperty}
      trafficData={trafficData || undefined}
      inegiData={inegiData ? {
        socioeconomicLevel: inegiData.socioeconomicLevel,
        nearbyBusinessesCount: inegiData.nearbyBusinessesCount,
        dominantSector: inegiData.dominantSector,
        audienceProfile: inegiData.audienceProfile,
        commercialEnvironment: inegiData.commercialEnvironment,
        rawDenueData: inegiData.rawDenueData,
      } : undefined}
      isLoadingTraffic={isLoadingTraffic}
      isLoadingInegi={isLoadingInegi}
      onClose={onClose}
      onCompare={onAddToCompare}
      isSelected={isInCompare}
    />,
    containerRef.current
  );
};

export default MapPopupPortal;
