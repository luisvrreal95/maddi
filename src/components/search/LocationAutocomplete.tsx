import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, Navigation } from 'lucide-react';

interface LocationSuggestion {
  id: string;
  place_name: string;
  text: string;
  place_type: string[];
  center: [number, number];
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (location: LocationSuggestion) => void;
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
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

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

  // Fetch suggestions from Mapbox with proximity bias
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
        // Build URL with proximity bias if user location is available
        // Prioritize cities and regions over neighborhoods for better zoom
        let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?access_token=${mapboxToken}&country=mx&types=country,region,place,district,locality&limit=8&language=es`;
        
        if (userLocation) {
          url += `&proximity=${userLocation.lng},${userLocation.lat}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.features) {
          setSuggestions(data.features);
          // Only show dropdown if input is focused
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
  }, [value, mapboxToken, userLocation, isFocused]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        // Submit current value even without selection
        if (value.trim()) {
          setIsOpen(false);
          onSelect({
            id: 'manual',
            place_name: value,
            text: value,
            place_type: ['place'],
            center: [0, 0],
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
          onSelect({
            id: 'manual',
            place_name: value,
            text: value,
            place_type: ['place'],
            center: [0, 0],
          });
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSelect = (suggestion: LocationSuggestion) => {
    onChange(suggestion.place_name);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelect(suggestion);
  };

  const getPlaceTypeLabel = (types: string[]) => {
    const type = types[0];
    const labels: Record<string, string> = {
      country: 'País',
      region: 'Estado',
      place: 'Ciudad',
      district: 'Zona',
      locality: 'Localidad',
      neighborhood: 'Colonia',
      address: 'Dirección',
      poi: 'Punto de interés',
      postcode: 'Código postal',
    };
    return labels[type] || 'Ubicación';
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
          placeholder={placeholder}
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
                  onSelect({
                    id: 'manual',
                    place_name: value,
                    text: value,
                    place_type: ['place'],
                    center: [0, 0],
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
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors ${
                index === selectedIndex
                  ? 'bg-[#9BFF43]/20'
                  : 'hover:bg-white/5'
              }`}
            >
              <MapPin
                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  index === selectedIndex ? 'text-[#9BFF43]' : 'text-white/40'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium truncate ${
                    index === selectedIndex ? 'text-[#9BFF43]' : 'text-white'
                  }`}
                >
                  {suggestion.text}
                </p>
                <p className="text-sm text-white/50 truncate">
                  {suggestion.place_name}
                </p>
              </div>
              <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded-full flex-shrink-0">
                {getPlaceTypeLabel(suggestion.place_type)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
