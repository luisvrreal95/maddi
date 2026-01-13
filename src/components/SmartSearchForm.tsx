import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Loader2, Sparkles, Navigation } from 'lucide-react';

interface LocationSuggestion {
  id: string;
  place_name: string;
  text: string;
  place_type: string[];
  center: [number, number];
}

interface SmartSearchFormProps {
  onSearch?: (query: string, isAISearch?: boolean) => void;
}

const SmartSearchForm: React.FC<SmartSearchFormProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const placeholderText = 'Buscar en Mexicali, Ensenada...';

  // Get user's location
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

  // Fetch mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (error) {
        console.error('Error fetching mapbox token:', error);
      }
    };
    fetchToken();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch address suggestions with proximity bias
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2 || !mapboxToken) {
      setSuggestions([]);
      return;
    }

    // Check if this looks like a natural language query (AI search)
    const isNaturalLanguage = /quiero|busco|cerca|necesito|muestra|encuentra/i.test(searchQuery);
    if (isNaturalLanguage) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Build URL with proximity bias if user location is available
        let url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${mapboxToken}&country=mx&types=country,region,place,district,locality,neighborhood,address&limit=5&language=es`;
        
        if (userLocation) {
          url += `&proximity=${userLocation.lng},${userLocation.lat}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.features) {
          setSuggestions(data.features);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, mapboxToken, userLocation]);

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setSearchQuery(suggestion.place_name);
    setShowSuggestions(false);
    onSearch?.(suggestion.place_name, false);
    navigate(`/search?location=${encodeURIComponent(suggestion.place_name)}&lat=${suggestion.center[1]}&lng=${suggestion.center[0]}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery || 'Mexicali, B.C.';
    
    // Check if this is a natural language / AI search
    const isNaturalLanguage = /quiero|busco|cerca|necesito|muestra|encuentra/i.test(query);
    
    onSearch?.(query, isNaturalLanguage);
    navigate(`/search?location=${encodeURIComponent(query)}${isNaturalLanguage ? '&ai=true' : ''}`);
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    setHasInteracted(true);
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const displayText = hasInteracted ? searchQuery : placeholderText;
  const isNaturalLanguageQuery = /quiero|busco|cerca|necesito|muestra|encuentra/i.test(searchQuery);

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
    };
    return labels[type] || 'Ubicación';
  };

  return (
    <div className="flex w-full max-w-[650px] flex-col items-center gap-4 relative mx-auto max-md:max-w-[580px] max-sm:max-w-[95%]">
      <p className="self-stretch text-white text-center text-base font-normal">
        ¡El espacio perfecto para tu marca!
      </p>

      <form
        onSubmit={handleSubmit}
        className="flex justify-between items-center gap-3 self-stretch border relative bg-[rgba(255,255,255,0.03)] px-8 py-5 rounded-[100px] border-solid border-[rgba(255,255,255,0.25)] max-sm:gap-2 max-sm:px-6 max-sm:py-4"
        style={{
          boxShadow: '8px 8px 20px rgba(0, 0, 0, 0.4), 4px 4px 10px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="flex flex-col items-start flex-[1_0_0] relative">
          <label htmlFor="search-input" className="sr-only">
            Buscar espacios publicitarios
          </label>
          <div className="relative w-full flex items-center gap-2">
            {isNaturalLanguageQuery ? (
              <Sparkles className="w-5 h-5 text-[#9BFF43] flex-shrink-0" />
            ) : (
              <MapPin className="w-5 h-5 text-white/50 flex-shrink-0" />
            )}
            <input
              ref={inputRef}
              id="search-input"
              type="text"
              value={displayText}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={handleFocus}
              className="w-full text-white text-xl leading-[1.4] bg-transparent border-none outline-none max-md:text-lg max-sm:text-base placeholder:text-white/70"
              placeholder={placeholderText}
            />
            {isLoading && (
              <Loader2 className="w-5 h-5 text-white/50 animate-spin flex-shrink-0" />
            )}
          </div>
        </div>

        <button
          type="submit"
          className="flex w-12 h-12 justify-center items-center shrink-0 relative bg-[rgba(255,255,255,0.08)] rounded-full max-sm:w-10 max-sm:h-10 hover:bg-[rgba(255,255,255,0.15)] transition-colors"
          aria-label="Buscar"
        >
          {isNaturalLanguageQuery ? (
            <Sparkles className="w-5 h-5 text-[#9BFF43]" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_search)">
                <path
                  d="M14.4244 13.2936L17.8508 16.7192L16.7188 17.8512L13.2932 14.4248C12.0186 15.4466 10.4332 16.0023 8.79961 16C4.82521 16 1.59961 12.7744 1.59961 8.79998C1.59961 4.82558 4.82521 1.59998 8.79961 1.59998C12.774 1.59998 15.9996 4.82558 15.9996 8.79998C16.0019 10.4336 15.4462 12.019 14.4244 13.2936ZM12.8196 12.7C13.8349 11.6559 14.4019 10.2563 14.3996 8.79998C14.3996 5.70558 11.8932 3.19998 8.79961 3.19998C5.70521 3.19998 3.19961 5.70558 3.19961 8.79998C3.19961 11.8936 5.70521 14.4 8.79961 14.4C10.256 14.4023 11.6555 13.8353 12.6996 12.82L12.8196 12.7Z"
                  fill="white"
                />
              </g>
              <defs>
                <clipPath id="clip0_search">
                  <rect width="19.2" height="19.2" rx="4.8" fill="white" />
                </clipPath>
              </defs>
            </svg>
          )}
        </button>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-[#2A2A2A] border border-white/10 rounded-2xl overflow-hidden shadow-xl z-50"
        >
          {userLocation && (
            <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 text-xs text-white/40">
              <Navigation className="w-3 h-3" />
              <span>Mostrando resultados cerca de ti</span>
            </div>
          )}
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full px-5 py-4 flex items-start gap-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0"
            >
              <MapPin className="w-5 h-5 mt-0.5 text-[#9BFF43] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{suggestion.text}</p>
                <p className="text-sm text-white/50 truncate">{suggestion.place_name}</p>
              </div>
              <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded-full flex-shrink-0">
                {getPlaceTypeLabel(suggestion.place_type)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* AI search hint */}
      {isNaturalLanguageQuery && (
        <div className="flex items-center gap-2 text-[#9BFF43] text-sm">
          <Sparkles className="w-4 h-4" />
          <span>Búsqueda con IA activada</span>
        </div>
      )}
    </div>
  );
};

export default SmartSearchForm;
