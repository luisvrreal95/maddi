import React, { useEffect, useRef } from 'react';
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

interface MapPopupPortalProps {
  map: mapboxgl.Map;
  coordinates: [number, number];
  property: Property;
  nearbyPOIs: Array<{ name: string; category: string; distance: number }>;
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
  onClose,
  onReserve,
  onViewDetails,
  onAddToCompare,
  isInCompare
}) => {
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create container for React content
    containerRef.current = document.createElement('div');
    containerRef.current.className = 'mapbox-popup-react-content';

    // Create popup with offset to position next to marker
    popupRef.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: [0, -10],
      maxWidth: 'none',
      className: 'custom-mapbox-popup'
    })
      .setLngLat(coordinates)
      .setDOMContent(containerRef.current)
      .addTo(map);

    return () => {
      popupRef.current?.remove();
    };
  }, [map, coordinates]);

  if (!containerRef.current) return null;

  return createPortal(
    <EnhancedPropertyPopup
      property={property}
      nearbyPOIs={nearbyPOIs}
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