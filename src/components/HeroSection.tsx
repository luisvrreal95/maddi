import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CalendarDays, Search, Loader2, Store, Building2, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Header from './Header';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface SearchResult {
  id: string;
  name: string;
  type: string;
  address: string;
  lat: number;
  lon: number;
  distance: number | null;
  displayName: string;
  displayContext: string;
}

const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setUserLocation({ lat: 32.6245, lng: -115.4523 }) // Default Mexicali
      );
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current && !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!location || location.length < 2) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('search-poi', {
          body: { query: location, lat: userLocation?.lat, lon: userLocation?.lng, limit: 6 }
        });
        if (!error && data?.success && data?.results) {
          setSuggestions(data.results);
          setShowSuggestions(true);
        }
      } catch { /* ignore */ } finally { setIsLoading(false); }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [location, userLocation]);

  const handleSelectSuggestion = (s: SearchResult) => {
    setLocation(s.displayName || s.name);
    setSelectedCoords({ lat: s.lat, lng: s.lon });
    setShowSuggestions(false);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (selectedCoords) {
      params.set('lat', String(selectedCoords.lat));
      params.set('lng', String(selectedCoords.lng));
    }
    if (dateRange?.from) params.set('from', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) params.set('to', format(dateRange.to, 'yyyy-MM-dd'));
    navigate(`/search?${params.toString()}`);
  };

  const getTypeIcon = (type: string) => {
    if (type === 'POI') return <Store className="w-4 h-4 text-primary" />;
    if (type === 'Geography' || type === 'Street') return <Building2 className="w-4 h-4 text-primary" />;
    return <MapPin className="w-4 h-4 text-primary" />;
  };

  return (
    <section className="relative flex flex-col items-center bg-[hsl(0,0%,12.5%)] pt-0 pb-32 max-md:pb-24 max-sm:pb-16 overflow-visible">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[hsl(0,0%,8%)] pointer-events-none" />
      
      {/* Decorative accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[hsl(88,100%,63%)] opacity-[0.03] blur-[120px] pointer-events-none" />

      <div className="w-full relative z-10">
        <Header />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-10 w-full max-w-4xl px-6 pt-16 max-md:pt-12 max-sm:pt-8">
        {/* Title */}
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-white text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight max-sm:text-3xl">
            Encuentra el espectacular{' '}
            <span className="text-primary">perfecto</span>{' '}
            para tu marca
          </h1>
          <p className="text-white/50 text-lg md:text-xl max-w-2xl max-sm:text-base">
            Explora ubicaciones estratégicas con datos reales de tráfico y perfil comercial
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-3xl">
          <div className="flex items-stretch bg-[hsl(0,0%,16%)] rounded-2xl border border-white/10 overflow-visible shadow-2xl max-md:flex-col max-md:rounded-xl">
            {/* Location field */}
            <div className="flex-1 relative">
              <div className="flex items-center gap-3 px-5 py-4 max-md:border-b max-md:border-white/10">
                <MapPin className="w-5 h-5 text-white/40 flex-shrink-0" />
                <div className="flex-1">
                  <label className="text-white/40 text-xs font-medium uppercase tracking-wider">Ubicación</label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={location}
                    onChange={(e) => { setLocation(e.target.value); setSelectedCoords(null); }}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    placeholder="Plaza, colonia o dirección"
                    className="w-full bg-transparent text-white text-sm outline-none placeholder:text-white/25 mt-0.5"
                  />
                </div>
                {isLoading && <Loader2 className="w-4 h-4 text-white/30 animate-spin" />}
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 mt-2 bg-[hsl(0,0%,13%)] border border-white/10 rounded-xl shadow-2xl z-[100] max-h-[320px] overflow-y-auto"
                  style={{ minWidth: '340px', width: 'max-content', maxWidth: '500px' }}
                >
                  {userLocation && (
                    <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 text-xs text-white/30">
                      <Navigation className="w-3 h-3" />
                      <span>Resultados cercanos</span>
                    </div>
                  )}
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/5 transition-colors"
                    >
                      {getTypeIcon(s.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">{s.displayName || s.name}</p>
                        <p className="text-white/40 text-xs truncate">{s.displayContext || s.address}</p>
                      </div>
                      {s.distance && (
                        <span className="text-white/30 text-xs">{(s.distance / 1000).toFixed(1)} km</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px bg-white/10 my-3" />

            {/* Date field */}
            <div className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center gap-3 px-5 py-4 text-left max-md:border-b max-md:border-white/10">
                    <CalendarDays className="w-5 h-5 text-white/40 flex-shrink-0" />
                    <div className="flex-1">
                      <label className="text-white/40 text-xs font-medium uppercase tracking-wider">Fechas</label>
                      <p className={cn("text-sm mt-0.5", dateRange?.from ? "text-white" : "text-white/25")}>
                        {dateRange?.from ? (
                          dateRange.to ? (
                            `${format(dateRange.from, 'd MMM', { locale: es })} — ${format(dateRange.to, 'd MMM', { locale: es })}`
                          ) : format(dateRange.from, 'd MMM yyyy', { locale: es })
                        ) : 'Inicio — Fin'}
                      </p>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[hsl(0,0%,14%)] border-white/10" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    disabled={(date) => date < new Date()}
                    className={cn("p-3 pointer-events-auto text-white")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Search button */}
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-8 py-4 hover:bg-primary/90 transition-colors max-md:rounded-b-xl md:rounded-r-2xl"
            >
              <Search className="w-5 h-5" />
              <span className="max-md:block">Buscar espacios</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
