import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import mapboxgl from 'mapbox-gl';
import EnhancedPropertyPopup from './EnhancedPropertyPopup';

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

interface INEGIData {
  socioeconomicLevel: 'bajo' | 'medio' | 'medio-alto' | 'alto';
  nearbyBusinessesCount: number;
  dominantSector: string;
  audienceProfile?: string;
}

interface MapPopupPortalProps {
  map: mapboxgl.Map;
  coordinates: [number, number];
  property: Property;
  nearbyPOIs: Array<{ name: string; category: string; distance: number }>;
  inegiData?: INEGIData | null;
  isLoadingInegi?: boolean;
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
  onClose,
  onReserve,
  onViewDetails,
  onAddToCompare,
  isInCompare
}) => {
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);

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
      maxWidth: '420px',
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
    <EnhancedPropertyPopup
      property={property}
      nearbyPOIs={nearbyPOIs}
      inegiData={inegiData}
      isLoadingInegi={isLoadingInegi}
      onClose={onClose}
      onReserve={onReserve}
      onViewDetails={onViewDetails}
      onAddToCompare={onAddToCompare}
      isInCompare={isInCompare}
    />,
    containerRef.current
  );
};

export default MapPopupPortal;
