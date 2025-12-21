import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import PropertyPopup from './PropertyPopup';

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
}

interface SearchMapProps {
  properties: Property[];
  selectedPropertyId: string | null;
  onPropertySelect: (id: string | null) => void;
  mapboxToken: string;
}

const SearchMap: React.FC<SearchMapProps> = ({
  properties,
  selectedPropertyId,
  onPropertySelect,
  mapboxToken,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [popupProperty, setPopupProperty] = useState<Property | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-115.4523, 32.6245], // Mexicali, B.C.
      zoom: 12,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    properties.forEach((property) => {
      const isSelected = property.id === selectedPropertyId;
      
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = `
        <div class="flex flex-col items-center cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-110' : 'hover:scale-105'}">
          <div class="relative flex flex-col items-center justify-center rounded-full transition-all duration-300 ${
            isSelected
              ? 'w-20 h-20 bg-[#9BFF43] shadow-[0_0_30px_rgba(155,255,67,0.5)]'
              : 'w-16 h-16 bg-[#2A2A2A] border-2 border-[#9BFF43]/50'
          }">
            <span class="text-xs font-bold ${isSelected ? 'text-[#202020]' : 'text-white'}">${property.viewsPerDay}</span>
            <span class="text-[8px] ${isSelected ? 'text-[#202020]/70' : 'text-white/50'}">VISTAS/DÍA</span>
          </div>
        </div>
      `;

      el.addEventListener('click', () => {
        onPropertySelect(property.id);
        setPopupProperty(property);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([property.lng, property.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [properties, selectedPropertyId, onPropertySelect]);

  // Fly to selected property
  useEffect(() => {
    if (selectedPropertyId && map.current) {
      const property = properties.find(p => p.id === selectedPropertyId);
      if (property) {
        map.current.flyTo({
          center: [property.lng, property.lat],
          zoom: 14,
          duration: 1000,
        });
      }
    }
  }, [selectedPropertyId, properties]);

  const handleClosePopup = () => {
    setPopupProperty(null);
    onPropertySelect(null);
  };

  const handleReserve = () => {
    console.log('Reserve property:', popupProperty?.id);
    // TODO: Implement reservation flow
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Property Popup */}
      {popupProperty && (
        <div className="absolute top-4 left-4 z-10">
          <PropertyPopup
            property={popupProperty}
            onClose={handleClosePopup}
            onReserve={handleReserve}
          />
        </div>
      )}
    </div>
  );
};

export default SearchMap;
