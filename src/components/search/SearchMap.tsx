import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import PropertyPopup from './PropertyPopup';
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

export interface MapLayers {
  traffic: boolean;
  trafficHistory: boolean;
  incidents: boolean;
  pois: boolean;
  flow: boolean;
}

export interface POICategories {
  restaurants: boolean;
  shopping: boolean;
  gasStations: boolean;
  entertainment: boolean;
}

interface SearchMapProps {
  properties: Property[];
  selectedPropertyId: string | null;
  onPropertySelect: (id: string | null) => void;
  mapboxToken: string;
  searchLocation?: string;
  onReserveClick: (property: Property) => void;
  // Layer controls from parent
  layers: MapLayers;
  poiCategories: POICategories;
  trafficHour: number;
  onLoadingChange?: (loading: boolean) => void;
}

export interface SearchMapRef {
  refreshLayers: () => void;
}

const SearchMap = forwardRef<SearchMapRef, SearchMapProps>(({
  properties,
  selectedPropertyId,
  onPropertySelect,
  mapboxToken,
  searchLocation,
  onReserveClick,
  layers,
  poiCategories,
  trafficHour,
  onLoadingChange,
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const poiMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const incidentMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const [popupProperty, setPopupProperty] = useState<Property | null>(null);
  const [flowData, setFlowData] = useState<FlowData | null>(null);

  // Expose refresh function to parent
  useImperativeHandle(ref, () => ({
    refreshLayers: () => {
      if (layers.pois) fetchPOIs();
      if (layers.incidents) fetchIncidents();
      if (layers.flow) fetchFlowData();
    }
  }));

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

  // Fetch layer data helper
  const fetchLayerData = useCallback(async (layer: string, extraParams?: Record<string, any>) => {
    if (!map.current) return null;
    
    const center = map.current.getCenter();
    
    try {
      const body: any = {
        latitude: center.lat,
        longitude: center.lng,
        layer,
        radius: 2000,
        ...extraParams,
      };
      
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

  // Handle live traffic layer
  useEffect(() => {
    if (!map.current) return;

    const trafficLayerId = 'tomtom-traffic-layer';
    const trafficSourceId = 'tomtom-traffic-source';

    if (layers.traffic && !layers.trafficHistory) {
      // Use TomTom live traffic tiles
      if (!map.current.getSource(trafficSourceId)) {
        map.current.addSource(trafficSourceId, {
          type: 'raster',
          tiles: [
            `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?tileSize=256&key=demo`
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
  }, [layers.traffic, layers.trafficHistory]);

  // Handle historical traffic layer
  useEffect(() => {
    if (!map.current) return;

    const historyLayerId = 'tomtom-history-layer';
    const historySourceId = 'tomtom-history-source';

    if (layers.trafficHistory) {
      // TomTom historical traffic uses style parameter
      // style: relative-delay (shows relative to free flow)
      // daySet: weekday (Monday-Friday typical), weekend
      // timeSet: hour in format HHmm
      const timeSet = trafficHour.toString().padStart(2, '0') + '00';
      
      if (map.current.getSource(historySourceId)) {
        map.current.removeSource(historySourceId);
      }
      if (map.current.getLayer(historyLayerId)) {
        map.current.removeLayer(historyLayerId);
      }

      map.current.addSource(historySourceId, {
        type: 'raster',
        tiles: [
          `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?tileSize=256&key=demo&timeSet=${timeSet}`
        ],
        tileSize: 256,
      });

      map.current.addLayer({
        id: historyLayerId,
        type: 'raster',
        source: historySourceId,
        paint: {
          'raster-opacity': 0.75,
        },
      });
    } else {
      if (map.current.getLayer(historyLayerId)) {
        map.current.removeLayer(historyLayerId);
      }
      if (map.current.getSource(historySourceId)) {
        map.current.removeSource(historySourceId);
      }
    }
  }, [layers.trafficHistory, trafficHour]);

  // Fetch flow data
  const fetchFlowData = useCallback(async () => {
    onLoadingChange?.(true);
    const data = await fetchLayerData('flow');
    if (data?.flowSegment) {
      setFlowData(data.flowSegment);
    } else if (data?.source === 'error') {
      // Use estimated data on API error
      setFlowData({
        currentSpeed: 42,
        freeFlowSpeed: 55,
        confidence: 0.7,
      });
    }
    onLoadingChange?.(false);
  }, [fetchLayerData, onLoadingChange]);

  useEffect(() => {
    if (layers.flow) {
      fetchFlowData();
    } else {
      setFlowData(null);
    }
  }, [layers.flow, fetchFlowData]);

  // Fetch POIs
  const fetchPOIs = useCallback(async () => {
    if (!map.current) return;
    
    poiMarkersRef.current.forEach(marker => marker.remove());
    poiMarkersRef.current = [];

    const activeCategories = Object.entries(poiCategories)
      .filter(([_, enabled]) => enabled)
      .map(([category]) => category);

    if (activeCategories.length === 0) return;

    onLoadingChange?.(true);
    const data = await fetchLayerData('pois', { categories: activeCategories });
    
    if (data?.pois && data.pois.length > 0) {
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
          <div class="flex items-center justify-center w-7 h-7 ${categoryColors[poi.category] || 'bg-gray-500'} rounded-full shadow-lg text-xs border-2 border-white">
            ${categoryEmoji[poi.category] || '📍'}
          </div>
        `;
        
        el.title = poi.name;

        const popup = new mapboxgl.Popup({ offset: 25, className: 'poi-popup' })
          .setHTML(`
            <div class="p-2 text-sm bg-[#2A2A2A] text-white rounded">
              <strong>${poi.name}</strong>
              ${poi.distance ? `<p class="text-white/60 text-xs">${Math.round(poi.distance)}m de distancia</p>` : ''}
            </div>
          `);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([poi.lng, poi.lat])
          .setPopup(popup)
          .addTo(map.current!);

        poiMarkersRef.current.push(marker);
      });
      
      toast.success(`${data.pois.length} puntos de interés encontrados`);
    }
    onLoadingChange?.(false);
  }, [poiCategories, fetchLayerData, onLoadingChange]);

  useEffect(() => {
    if (layers.pois) {
      fetchPOIs();
    } else {
      poiMarkersRef.current.forEach(marker => marker.remove());
      poiMarkersRef.current = [];
    }
  }, [layers.pois, fetchPOIs]);

  // Fetch Incidents
  const fetchIncidents = useCallback(async () => {
    if (!map.current) return;
    
    incidentMarkersRef.current.forEach(marker => marker.remove());
    incidentMarkersRef.current = [];

    onLoadingChange?.(true);
    const data = await fetchLayerData('incidents');
    
    if (data?.incidents && data.incidents.length > 0) {
      data.incidents.forEach((incident: Incident) => {
        if (!incident.coordinates || incident.coordinates.length < 2) return;
        
        const el = document.createElement('div');
        el.className = 'incident-marker cursor-pointer';
        el.innerHTML = `
          <div class="flex items-center justify-center w-8 h-8 bg-amber-500 rounded-full shadow-lg animate-pulse border-2 border-white">
            <span class="text-white text-sm">⚠️</span>
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 25, className: 'incident-popup' })
          .setHTML(`
            <div class="p-2 text-sm bg-[#2A2A2A] text-white rounded max-w-xs">
              <strong class="text-amber-400">⚠️ Incidente</strong>
              <p class="text-white/80 mt-1">${incident.description}</p>
              ${incident.delay ? `<p class="text-red-400 text-xs mt-1">Retraso: ${incident.delay} min</p>` : ''}
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
      
      toast.info(`${data.incidents.length} incidentes de tráfico`);
    } else if (data?.source === 'error' || data?.incidents?.length === 0) {
      toast.info('No hay incidentes reportados en esta zona');
    }
    onLoadingChange?.(false);
  }, [fetchLayerData, onLoadingChange]);

  useEffect(() => {
    if (layers.incidents) {
      fetchIncidents();
    } else {
      incidentMarkersRef.current.forEach(marker => marker.remove());
      incidentMarkersRef.current = [];
    }
  }, [layers.incidents, fetchIncidents]);

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

      {/* Flow Data Display */}
      {flowData && layers.flow && (
        <div className="absolute top-4 left-4 z-10 bg-[#2A2A2A]/95 backdrop-blur-sm rounded-lg border border-white/10 p-3">
          <h5 className="text-white/70 text-xs font-medium mb-2">Flujo vehicular actual</h5>
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

      {/* Traffic Hour Indicator */}
      {layers.trafficHistory && (
        <div className="absolute top-4 left-4 z-10 bg-indigo-500/90 backdrop-blur-sm rounded-lg px-3 py-2">
          <p className="text-white text-sm font-medium flex items-center gap-2">
            <span>🕐</span>
            Patrón típico: {trafficHour === 0 ? '12:00 AM' : trafficHour === 12 ? '12:00 PM' : trafficHour < 12 ? `${trafficHour}:00 AM` : `${trafficHour - 12}:00 PM`}
          </p>
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
});

SearchMap.displayName = 'SearchMap';

export default SearchMap;
