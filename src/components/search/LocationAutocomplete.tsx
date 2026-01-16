import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, Navigation, Building2, ShoppingBag } from 'lucide-react';

// Mapbox Search Box API response types
export interface SearchBoxSuggestion {
  id: string;
  mapbox_id: string;
  name: string;
  name_preferred?: string;
  place_formatted?: string;
  full_address?: string;
  feature_type: string;
  poi_category?: string[];
  poi_category_ids?: string[];
  context?: {
    country?: { name: string; country_code: string };
    region?: { name: string };
    place?: { name: string };
    locality?: { name: string };
    neighborhood?: { name: string };
  };
}

export interface SearchBoxFeature {
  type: 'Feature';
  geometry: {
    coordinates: [number, number];
    type: 'Point';
  };
  properties: {
    mapbox_id: string;
    name: string;
    name_preferred?: string;
    full_address?: string;
    place_formatted?: string;
    feature_type: string;
    poi_category?: string[];
    context?: {
      country?: { name: string; country_code: string };
      region?: { name: string };
      place?: { name: string };
      locality?: { name: string };
      neighborhood?: { name: string };
    };
  };
}

// Legacy interface for backward compatibility
export interface LocationSuggestion {
  id: string;
  place_name: string;
  text: string;
  place_type: string[];
  center: [number, number];
  bbox?: [number, number, number, number];
  context?: Array<{ id: string; text: string; short_code?: string }>;
}

export interface SelectedLocation {
  placeName: string;
  center: [number, number];
  bbox?: [number, number, number, number];
  city?: string;
  state?: string;
  placeType: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: LocationSuggestion, structured: SelectedLocation) => void;
  mapboxToken: string;
  placeholder?: string;
  className?: string;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  mapboxToken,
  placeholder = 'Buscar ubicación...',
  className = '',
}) => {
  const [suggestions, setSuggestions] = useState<SearchBoxSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sessionToken, setSessionToken] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Generate a session token for the Search Box API
  useEffect(() => {
    setSessionToken(crypto.randomUUID());
  }, []);

  // Get user's location for proximity bias
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Location access denied or unavailable:', error);
          // Default to Mexicali if location denied
          setUserLocation({ lat: 32.6245, lng: -115.4523 });
        }
      );
    }
  }, []);

  // Fetch suggestions from Mapbox Search Box API
  useEffect(() => {
    if (!value || value.length < 2 || !mapboxToken) {
      setSuggestions([]);
      return;
    }

    // Debounce requests
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const proximityLng = userLocation?.lng ?? -115.4523;
        const proximityLat = userLocation?.lat ?? 32.6245;
        
        // Use Mapbox Search Box API for better POI results
        const types = 'poi,place,neighborhood,locality,address';
        const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(value)}&access_token=${mapboxToken}&session_token=${sessionToken}&language=es&country=MX&types=${types}&limit=8&proximity=${proximityLng},${proximityLat}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.suggestions) {
          setSuggestions(data.suggestions);
          if (isFocused) {
            setIsOpen(true);
          }
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, mapboxToken, userLocation, isFocused, sessionToken]);

  // Retrieve full feature details for a suggestion
  const retrieveFeature = async (mapboxId: string): Promise<SearchBoxFeature | null> => {
    try {
      const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${mapboxId}?access_token=${mapboxToken}&session_token=${sessionToken}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        return data.features[0];
      }
      return null;
    } catch (error) {
      console.error('Error retrieving feature:', error);
      return null;
    }
  };

  // Convert SearchBox result to legacy LocationSuggestion format
  const convertToLegacyFormat = (suggestion: SearchBoxSuggestion, feature: SearchBoxFeature): LocationSuggestion => {
    const coordinates = feature.geometry.coordinates;
    
    return {
      id: suggestion.mapbox_id,
      place_name: suggestion.full_address || suggestion.place_formatted || suggestion.name,
      text: suggestion.name,
      place_type: [suggestion.feature_type],
      center: coordinates,
      // Search Box API doesn't return bbox, so we won't include it
    };
  };

  // Extract structured location info
  const extractLocationInfo = (suggestion: SearchBoxSuggestion, feature: SearchBoxFeature): SelectedLocation => {
    let city: string | undefined;
    let state: string | undefined;
    const placeType = suggestion.feature_type || 'place';
    
    // If the suggestion itself is a place, use its name as city
    if (placeType === 'place') {
      city = suggestion.name;
    }
    
    // Extract from context
    if (suggestion.context) {
      city = city || suggestion.context.place?.name || suggestion.context.locality?.name;
      state = suggestion.context.region?.name;
    }
    
    return {
      placeName: suggestion.full_address || suggestion.place_formatted || suggestion.name,
      center: feature.geometry.coordinates,
      city,
      state,
      placeType,
    };
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (value.trim()) {
          setIsOpen(false);
          const manualSuggestion: LocationSuggestion = {
            id: 'manual',
            place_name: value,
            text: value,
            place_type: ['place'],
            center: [0, 0],
          };
          onSelect(manualSuggestion, {
            placeName: value,
            center: [0, 0],
            placeType: 'place',
          });
        }
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        } else if (value.trim()) {
          setIsOpen(false);
          const manualSuggestion: LocationSuggestion = {
            id: 'manual',
            place_name: value,
            text: value,
            place_type: ['place'],
            center: [0, 0],
          };
          onSelect(manualSuggestion, {
            placeName: value,
            center: [0, 0],
            placeType: 'place',
          });
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelect = async (suggestion: SearchBoxSuggestion) => {
    setIsLoading(true);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    // Retrieve full feature details to get coordinates
    const feature = await retrieveFeature(suggestion.mapbox_id);
    
    if (feature) {
      const legacySuggestion = convertToLegacyFormat(suggestion, feature);
      const structured = extractLocationInfo(suggestion, feature);
      
      onChange(legacySuggestion.place_name);
      onSelect(legacySuggestion, structured);
    } else {
      // Fallback if retrieve fails
      onChange(suggestion.name);
    }
    
    setIsLoading(false);
    // Generate new session token after selection
    setSessionToken(crypto.randomUUID());
  };

  const getFeatureTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      country: 'País',
      region: 'Estado',
      place: 'Ciudad',
      district: 'Zona',
      locality: 'Localidad',
      neighborhood: 'Colonia',
      address: 'Dirección',
      poi: 'Lugar',
      postcode: 'Código postal',
    };
    return labels[type] || 'Ubicación';
  };

  const getFeatureIcon = (type: string, poiCategories?: string[]) => {
    // Check for specific POI categories
    if (poiCategories?.some(c => c.includes('shopping') || c.includes('store') || c.includes('mall'))) {
      return <ShoppingBag className="w-5 h-5" />;
    }
    if (type === 'poi') {
      return <Building2 className="w-5 h-5" />;
    }
    return <MapPin className="w-5 h-5" />;
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9BFF43]" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onBlur={() => {
            // Delay to allow click on dropdown items
            setTimeout(() => setIsFocused(false), 200);
          }}
          className="w-full pl-12 pr-12 py-3 bg-[#2A2A2A] border border-white/10 rounded-full text-white placeholder-white/50 focus:outline-none focus:border-[#9BFF43]/50"
          placeholder={placeholder || 'Busca una plaza o negocio (ej. Costco, Plaza Centenario)'}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <div className="w-10 h-10 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (value.trim()) {
                  const manualSuggestion: LocationSuggestion = {
                    id: 'manual',
                    place_name: value,
                    text: value,
                    place_type: ['place'],
                    center: [0, 0],
                  };
                  onSelect(manualSuggestion, {
                    placeName: value,
                    center: [0, 0],
                    placeType: 'place',
                  });
                }
              }}
              className="w-10 h-10 bg-[#9BFF43] rounded-full flex items-center justify-center hover:bg-[#8AE63A] transition-colors"
            >
              <Search className="w-5 h-5 text-[#202020]" />
            </button>
          )}
        </div>
      </div>

      {/* Suggestions Dropdown - Only show when focused */}
      {isOpen && isFocused && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-[#2A2A2A] border border-white/10 rounded-xl overflow-hidden shadow-xl z-50"
        >
          {userLocation && (
            <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 text-xs text-white/40">
              <Navigation className="w-3 h-3" />
              <span>Mostrando resultados cerca de ti</span>
            </div>
          )}
          {suggestions.map((suggestion, index) => {
            // Display: "Name — City/State"
            const locationContext = suggestion.place_formatted || 
              (suggestion.context?.place?.name ? `${suggestion.context.place.name}, ${suggestion.context.region?.name || ''}` : '');
            
            return (
              <button
                key={suggestion.mapbox_id}
                type="button"
                onClick={() => handleSelect(suggestion)}
                className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-[#9BFF43]/20'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className={`mt-0.5 flex-shrink-0 ${index === selectedIndex ? 'text-[#9BFF43]' : 'text-white/40'}`}>
                  {getFeatureIcon(suggestion.feature_type, suggestion.poi_category)}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-medium truncate ${
                      index === selectedIndex ? 'text-[#9BFF43]' : 'text-white'
                    }`}
                  >
                    {suggestion.name}
                    {locationContext && <span className="text-white/50 font-normal"> — {locationContext}</span>}
                  </p>
                  {suggestion.poi_category && suggestion.poi_category.length > 0 && (
                    <p className="text-xs text-white/40 truncate mt-0.5">
                      {suggestion.poi_category.slice(0, 2).join(', ')}
                    </p>
                  )}
                </div>
                <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded-full flex-shrink-0">
                  {getFeatureTypeLabel(suggestion.feature_type)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
