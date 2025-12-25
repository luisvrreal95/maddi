import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import PropertyPopup from './PropertyPopup';
import MapLayerControls, { MapLayers, POICategories } from './MapLayerControls';
import MapLegend from './MapLegend';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

interface POI {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  distance?: number;
}

interface Incident {
  type: string;
  category: string;
  description: string;
  coordinates: number[];
  delay?: number;
}

interface FlowData {
  currentSpeed: number;
  freeFlowSpeed: number;
  confidence: number;
}

interface SearchMapProps {
  properties: Property[];
  selectedPropertyId: string | null;
  onPropertySelect: (id: string | null) => void;
  mapboxToken: string;
  searchLocation?: string;
  onReserveClick: (property: Property) => void;
}

const SearchMap: React.FC<SearchMapProps> = ({
  properties,
  selectedPropertyId,
  onPropertySelect,
  mapboxToken,
  searchLocation,
  onReserveClick,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const poiMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const incidentMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const [popupProperty, setPopupProperty] = useState<Property | null>(null);
  const [isLoadingLayers, setIsLoadingLayers] = useState(false);
  
  // Map layers state
  const [layers, setLayers] = useState<MapLayers>({
    traffic: false,
    incidents: false,
    pois: false,
    flow: false,
  });
  
  const [poiCategories, setPoiCategories] = useState<POICategories>({
    restaurants: true,
    shopping: true,
    gasStations: true,
    entertainment: true,
  });

  // Store fetched data
  const [pois, setPois] = useState<POI[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [flowData, setFlowData] = useState<FlowData | null>(null);

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

  // Geocode search location and fly to it
  useEffect(() => {
    if (!map.current || !mapboxToken || !searchLocation) return;

    const geocodeLocation = async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchLocation)}.json?access_token=${mapboxToken}&country=mx&limit=1`
        );
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          const bbox = data.features[0].bbox;
          
          if (bbox) {
            map.current?.fitBounds(
              [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
              { padding: 50, duration: 1500 }
            );
          } else {
            map.current?.flyTo({
              center: [lng, lat],
              zoom: 11,
              duration: 1500,
            });
          }
        }
      } catch (error) {
        console.error('Error geocoding location:', error);
      }
    };

    geocodeLocation();
  }, [searchLocation, mapboxToken]);

  // Property markers
  useEffect(() => {
    if (!map.current) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    properties.forEach((property) => {
      const isSelected = property.id === selectedPropertyId;
      
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

  // Fetch TomTom layer data
  const fetchLayerData = useCallback(async (layer: string, categories?: string[]) => {
    if (!map.current) return null;
    
    const center = map.current.getCenter();
    
    try {
      const body: any = {
        latitude: center.lat,
        longitude: center.lng,
        layer,
        radius: 2000,
      };
      
      if (categories) {
        body.categories = categories;
      }
      
      const { data, error } = await supabase.functions.invoke('get-tomtom-layers', {
        body,
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching ${layer} data:`, error);
      return null;
    }
  }, []);

  // Handle traffic layer
  useEffect(() => {
    if (!map.current) return;

    const trafficLayerId = 'tomtom-traffic-layer';
    const trafficSourceId = 'tomtom-traffic-source';

    if (layers.traffic) {
      // Add TomTom traffic tiles
      if (!map.current.getSource(trafficSourceId)) {
        map.current.addSource(trafficSourceId, {
          type: 'raster',
          tiles: [
            `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${import.meta.env.VITE_TOMTOM_API_KEY || 'demo'}&tileSize=256`
          ],
          tileSize: 256,
        });
      }

      if (!map.current.getLayer(trafficLayerId)) {
        map.current.addLayer({
          id: trafficLayerId,
          type: 'raster',
          source: trafficSourceId,
          paint: {
            'raster-opacity': 0.7,
          },
        });
      }
    } else {
      if (map.current.getLayer(trafficLayerId)) {
        map.current.removeLayer(trafficLayerId);
      }
      if (map.current.getSource(trafficSourceId)) {
        map.current.removeSource(trafficSourceId);
      }
    }
  }, [layers.traffic]);

  // Handle flow layer (fetch flow data)
  useEffect(() => {
    if (layers.flow && map.current) {
      setIsLoadingLayers(true);
      fetchLayerData('flow').then((data) => {
        if (data?.flowSegment) {
          setFlowData(data.flowSegment);
        }
        setIsLoadingLayers(false);
      });
    } else {
      setFlowData(null);
    }
  }, [layers.flow, fetchLayerData]);

  // Handle POI markers
  useEffect(() => {
    // Clear existing POI markers
    poiMarkersRef.current.forEach(marker => marker.remove());
    poiMarkersRef.current = [];

    if (layers.pois && map.current) {
      const activeCategories = Object.entries(poiCategories)
        .filter(([_, enabled]) => enabled)
        .map(([category]) => category);

      if (activeCategories.length > 0) {
        setIsLoadingLayers(true);
        fetchLayerData('pois', activeCategories).then((data) => {
          if (data?.pois) {
            setPois(data.pois);
            
            // Add POI markers
            data.pois.forEach((poi: POI) => {
              const categoryEmoji: Record<string, string> = {
                restaurants: '🍽️',
                shopping: '🛍️',
                gasStations: '⛽',
                entertainment: '🎬',
              };

              const categoryColors: Record<string, string> = {
                restaurants: 'bg-orange-500',
                shopping: 'bg-pink-500',
                gasStations: 'bg-green-500',
                entertainment: 'bg-purple-500',
              };

              const el = document.createElement('div');
              el.className = 'poi-marker cursor-pointer';
              el.innerHTML = `
                <div class="flex items-center justify-center w-8 h-8 ${categoryColors[poi.category] || 'bg-gray-500'} rounded-full shadow-lg text-sm border-2 border-white">
                  ${categoryEmoji[poi.category] || '📍'}
                </div>
              `;
              
              el.title = poi.name;

              const popup = new mapboxgl.Popup({ offset: 25 })
                .setHTML(`
                  <div class="p-2 text-sm">
                    <strong>${poi.name}</strong>
                    <p class="text-gray-600 text-xs">${poi.distance ? `${Math.round(poi.distance)}m` : ''}</p>
                  </div>
                `);

              const marker = new mapboxgl.Marker({ element: el })
                .setLngLat([poi.lng, poi.lat])
                .setPopup(popup)
                .addTo(map.current!);

              poiMarkersRef.current.push(marker);
            });
          }
          setIsLoadingLayers(false);
        });
      }
    }
  }, [layers.pois, poiCategories, fetchLayerData]);

  // Handle incident markers
  useEffect(() => {
    // Clear existing incident markers
    incidentMarkersRef.current.forEach(marker => marker.remove());
    incidentMarkersRef.current = [];

    if (layers.incidents && map.current) {
      setIsLoadingLayers(true);
      fetchLayerData('incidents').then((data) => {
        if (data?.incidents) {
          setIncidents(data.incidents);
          
          data.incidents.forEach((incident: Incident) => {
            if (!incident.coordinates || incident.coordinates.length < 2) return;
            
            const el = document.createElement('div');
            el.className = 'incident-marker cursor-pointer';
            el.innerHTML = `
              <div class="flex items-center justify-center w-8 h-8 bg-amber-500 rounded-full shadow-lg animate-pulse border-2 border-white">
                <span class="text-white text-xs font-bold">⚠</span>
              </div>
            `;

            const popup = new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                <div class="p-2 text-sm max-w-xs">
                  <strong class="text-amber-600">Incidente</strong>
                  <p class="text-gray-700">${incident.description}</p>
                  ${incident.delay ? `<p class="text-red-500 text-xs">Retraso: ${incident.delay} min</p>` : ''}
                </div>
              `);

            const coords = Array.isArray(incident.coordinates[0]) 
              ? incident.coordinates[0] 
              : incident.coordinates;

            const marker = new mapboxgl.Marker({ element: el })
              .setLngLat([coords[0], coords[1]])
              .setPopup(popup)
              .addTo(map.current!);

            incidentMarkersRef.current.push(marker);
          });
        }
        setIsLoadingLayers(false);
      });
    }
  }, [layers.incidents, fetchLayerData]);

  const handleLayerChange = (layer: keyof MapLayers, enabled: boolean) => {
    setLayers(prev => ({ ...prev, [layer]: enabled }));
    
    if (enabled) {
      toast.success(`Capa "${getLayerName(layer)}" activada`);
    }
  };

  const handlePOICategoryChange = (category: keyof POICategories, enabled: boolean) => {
    setPoiCategories(prev => ({ ...prev, [category]: enabled }));
  };

  const getLayerName = (layer: string): string => {
    const names: Record<string, string> = {
      traffic: 'Tráfico',
      incidents: 'Incidentes',
      pois: 'Puntos de interés',
      flow: 'Flujo vehicular',
    };
    return names[layer] || layer;
  };

  const handleClosePopup = () => {
    setPopupProperty(null);
    onPropertySelect(null);
  };

  const handleReserve = () => {
    if (popupProperty) {
      onReserveClick(popupProperty);
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Layer Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
        <MapLayerControls
          layers={layers}
          poiCategories={poiCategories}
          onLayerChange={handleLayerChange}
          onPOICategoryChange={handlePOICategoryChange}
          isLoading={isLoadingLayers}
        />
        
        {/* Map Legend */}
        <MapLegend layers={layers} />
      </div>

      {/* Flow Data Display */}
      {flowData && layers.flow && (
        <div className="absolute top-4 right-16 z-10 bg-[#2A2A2A]/95 backdrop-blur-sm rounded-lg border border-white/10 p-3">
          <h5 className="text-white/70 text-xs font-medium mb-2">Flujo actual</h5>
          <div className="flex items-center gap-4">
            <div>
              <p className="text-2xl font-bold text-white">{flowData.currentSpeed}<span className="text-xs text-white/50"> km/h</span></p>
              <p className="text-xs text-white/50">Velocidad actual</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div>
              <p className="text-lg font-medium text-[#9BFF43]">{flowData.freeFlowSpeed}<span className="text-xs text-white/50"> km/h</span></p>
              <p className="text-xs text-white/50">Flujo libre</p>
            </div>
          </div>
          {flowData.confidence && (
            <p className="text-xs text-white/40 mt-2">
              Confianza: {Math.round(flowData.confidence * 100)}%
            </p>
          )}
        </div>
      )}
      
      {/* Property Popup */}
      {popupProperty && (
        <div className="absolute bottom-4 left-4 z-10">
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
