import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import PropertyDetailPanel from './PropertyDetailPanel';
import MapPopupPortal from './MapPopupPortal';
import { createMarkerElement } from './EnhancedPropertyMarker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface INEGIData {
  socioeconomicLevel: 'bajo' | 'medio' | 'medio-alto' | 'alto';
  nearbyBusinessesCount: number;
  dominantSector: string;
  audienceProfile?: string;
}

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
  layers: MapLayers;
  poiCategories: POICategories;
  trafficHour: number;
  onLoadingChange?: (loading: boolean) => void;
  compareIds: string[];
  onToggleCompare: (id: string) => void;
  isCompareMode: boolean;
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
  compareIds,
  onToggleCompare,
  isCompareMode,
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const poiMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const incidentMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const [popupProperty, setPopupProperty] = useState<Property | null>(null);
  const [popupCoords, setPopupCoords] = useState<[number, number] | null>(null);
  const [detailProperty, setDetailProperty] = useState<Property | null>(null);
  const [flowData, setFlowData] = useState<FlowData | null>(null);
  const [nearbyPOIs, setNearbyPOIs] = useState<Array<{ name: string; category: string; distance: number }>>([]);
  const [inegiData, setInegiData] = useState<INEGIData | null>(null);
  const [isLoadingInegi, setIsLoadingInegi] = useState(false);

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

    // Always use dark style
    const mapStyle = 'mapbox://styles/mapbox/dark-v11';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
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

  // Map style is fixed to dark mode

  // Geocode search location and fly to it
  useEffect(() => {
    if (!map.current || !mapboxToken || !searchLocation) return;

    const geocodeLocation = async () => {
      try {
        // Request types that provide bbox for proper zoom (cities, regions, not neighborhoods)
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchLocation)}.json?access_token=${mapboxToken}&country=mx&types=country,region,place,locality&limit=1`
        );
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          const [lng, lat] = feature.center;
          const bbox = feature.bbox;
          const placeType = feature.place_type?.[0];
          
          if (bbox) {
            // Use bounding box for proper city/region view
            map.current?.fitBounds(
              [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
              { padding: 50, duration: 1500 }
            );
          } else {
            // Determine zoom based on place type
            let zoom = 12; // default
            if (placeType === 'country') zoom = 5;
            else if (placeType === 'region') zoom = 8;
            else if (placeType === 'place') zoom = 11; // City level - show whole city
            else if (placeType === 'locality') zoom = 12;
            
            map.current?.flyTo({
              center: [lng, lat],
              zoom,
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

  // Fetch INEGI data for a property
  const fetchINEGIData = useCallback(async (billboardId: string, lat: number, lng: number) => {
    setIsLoadingInegi(true);
    setInegiData(null);
    
    try {
      // First check cache
      const { data: cached } = await supabase
        .from('inegi_demographics')
        .select('*')
        .eq('billboard_id', billboardId)
        .single();

      if (cached) {
        setInegiData({
          socioeconomicLevel: cached.socioeconomic_level as INEGIData['socioeconomicLevel'],
          nearbyBusinessesCount: cached.nearby_businesses_count || 0,
          dominantSector: cached.dominant_sector || 'Sin datos',
          audienceProfile: cached.audience_profile || undefined,
        });
        setIsLoadingInegi(false);
        return;
      }

      // Fetch from edge function if not cached
      const { data, error } = await supabase.functions.invoke('analyze-inegi-data', {
        body: {
          billboard_id: billboardId,
          latitude: lat,
          longitude: lng,
        },
      });

      if (error) throw error;

      if (data?.data) {
        setInegiData({
          socioeconomicLevel: data.data.socioeconomic_level,
          nearbyBusinessesCount: data.data.nearby_businesses_count || 0,
          dominantSector: data.data.dominant_sector || 'Sin datos',
          audienceProfile: data.data.audience_profile || undefined,
        });
      }
    } catch (error) {
      console.error('Error fetching INEGI data:', error);
    } finally {
      setIsLoadingInegi(false);
    }
  }, []);

  // Property markers with enhanced visuals
  useEffect(() => {
    if (!map.current) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    properties.forEach((property) => {
      const isSelected = property.id === selectedPropertyId;
      const isInCompare = compareIds.includes(property.id);
      const viewsNum = parseInt(property.viewsPerDay.replace(/[^0-9]/g, '')) || 0;
      
      const el = createMarkerElement(viewsNum, isSelected, isCompareMode, isInCompare);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onPropertySelect(property.id);
        setPopupProperty(property);
        setPopupCoords([property.lng, property.lat]);
        // Fetch INEGI data for this property
        fetchINEGIData(property.id, property.lat, property.lng);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([property.lng, property.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [properties, selectedPropertyId, onPropertySelect, compareIds, isCompareMode, fetchINEGIData]);

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
    setInegiData(null);
    onPropertySelect(null);
  };

  const handleReserve = () => {
    if (popupProperty) {
      onReserveClick(popupProperty);
    }
  };

  const handleViewDetails = () => {
    if (popupProperty) {
      setDetailProperty(popupProperty);
      setPopupProperty(null);
    }
  };

  const handleAddToCompare = () => {
    if (popupProperty) {
      onToggleCompare(popupProperty.id);
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
      
      {/* Popup attached to map coordinates */}
      {popupProperty && popupCoords && map.current && (
        <MapPopupPortal
          map={map.current}
          coordinates={popupCoords}
          property={popupProperty}
          nearbyPOIs={nearbyPOIs}
          inegiData={inegiData}
          isLoadingInegi={isLoadingInegi}
          onClose={handleClosePopup}
          onReserve={handleReserve}
          onViewDetails={handleViewDetails}
          onAddToCompare={handleAddToCompare}
          isInCompare={compareIds.includes(popupProperty.id)}
        />
      )}

      {/* Property Detail Panel */}
      {detailProperty && (
        <PropertyDetailPanel
          property={detailProperty}
          onClose={() => setDetailProperty(null)}
          onReserve={() => {
            onReserveClick(detailProperty);
            setDetailProperty(null);
          }}
        />
      )}
    </div>
  );
});

SearchMap.displayName = 'SearchMap';

export default SearchMap;
