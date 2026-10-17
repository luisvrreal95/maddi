import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, CalendarDays, Search, Loader2, Store, Building2, Navigation } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Header from './Header';
import type { Billboard } from '@/hooks/useBillboards';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface SearchResult {
  id: string;
  name: string;
  type: string;
  category: string;
  address: string;
  municipality: string;
  lat: number;
  lon: number;
  distance: number | null;
  displayName: string;
  displayContext: string;
}

const HeroSection: React.FC<{ available?: Billboard[] }> = ({ available = [] }) => {
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const geoRequestedRef = useRef(false);

  const requestGeolocation = () => {
    if (geoRequestedRef.current || !navigator.geolocation) return;
    geoRequestedRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation({ lat: 32.6245, lng: -115.4523 }) // Default Mexicali
    );
  };

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
          body: { query: location, limit: 8 }
        });
        if (!error && data?.success && data?.results) {
          // Sort: Geography (cities) first, then POIs
          const sorted = [...data.results].sort((a: SearchResult, b: SearchResult) => {
            if (a.type === 'Geography' && b.type !== 'Geography') return -1;
            if (a.type !== 'Geography' && b.type === 'Geography') return 1;
            return 0;
          });
          setSuggestions(sorted);
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
    // If user selected a suggestion, use its coordinates; otherwise search by text only
    if (selectedCoords) {
      params.set('lat', String(selectedCoords.lat));
      params.set('lng', String(selectedCoords.lng));
    } else if (location) {
      // No coordinates selected — do NOT pass lat/lng so the search page
      // will geocode based on the text or show all results
    }
    if (dateRange?.from) params.set('from', format(dateRange.from, 'yyyy-MM-dd'));
    if (dateRange?.to) params.set('to', format(dateRange.to, 'yyyy-MM-dd'));
    navigate(`/search?${params.toString()}`);
  };

  const getTypeIcon = (type: string, suggestion?: SearchResult) => {
    if (type === 'POI') return <Store className="w-4 h-4 text-primary" />;
    if (type === 'Geography') {
      const name = suggestion?.displayName || suggestion?.name || '';
      const municipality = suggestion?.municipality || '';
      if (municipality && name.toLowerCase().includes(municipality.toLowerCase())) {
        return <MapPin className="w-4 h-4 text-primary" />;
      }
      return <Building2 className="w-4 h-4 text-primary" />;
    }
    if (type === 'Street') return <Building2 className="w-4 h-4 text-primary" />;
    return <MapPin className="w-4 h-4 text-primary" />;
  };

  const getTypeLabel = (type: string, suggestion?: SearchResult) => {
    if (type === 'Geography') {
      const name = suggestion?.displayName || suggestion?.name || '';
      const municipality = suggestion?.municipality || '';
      if (municipality && name.toLowerCase().includes(municipality.toLowerCase())) {
        return 'Ciudad';
      }
      return 'Zona';
    }
    const labels: Record<string, string> = {
      POI: 'Lugar',
      Street: 'Calle',
      Address: 'Dirección',
      'Cross Street': 'Intersección',
    };
    return labels[type] || 'Ubicación';
  };

  const topImpressions = available
    .filter(b => (b.daily_impressions || 0) > 0)
    .sort((a, b) => (b.daily_impressions || 0) - (a.daily_impressions || 0))[0];
  const minPrice = available.length
    ? Math.min(...available.map(b => Number(b.price_per_month)).filter(n => n > 0))
    : null;

  return (
    <section className="relative flex flex-col items-center bg-background pb-36 max-md:pb-28 overflow-hidden">
      {/* Decorative layers */}
      <div className="hero-glow pointer-events-none absolute left-1/2 top-[-200px] h-[700px] w-[1040px] -translate-x-1/2 animate-glow-pulse" />
      <div className="hero-grid pointer-events-none absolute inset-0" />

      <div className="w-full relative z-20">
        <Header transparent />
      </div>

      <div data-lift-hero className="relative z-10 flex flex-col items-center gap-10 max-sm:gap-6 w-full max-w-5xl px-6 max-sm:px-4 pt-12 max-md:pt-10 max-sm:pt-6">
        {/* Floating cards (≥1180px) */}
        {topImpressions && (
          <div className="pointer-events-none absolute -left-16 top-10 hidden w-48 rounded-2xl border border-primary/30 bg-background/85 p-4 float-card-shadow backdrop-blur animate-float min-[1180px]:block">
            <p className="text-xs text-muted-foreground">Impresiones al día</p>
            <p className="mt-1 text-[28px] font-semibold leading-none text-primary tabular-nums">
              {(topImpressions.daily_impressions || 0).toLocaleString()}
            </p>
            <p className="mt-2 truncate text-xs text-muted-foreground">{topImpressions.title}</p>
          </div>
        )}
        {minPrice && isFinite(minPrice) && (
          <div className="pointer-events-none absolute -right-16 top-40 hidden w-48 rounded-2xl border border-white/15 bg-background/85 p-4 float-card-shadow backdrop-blur animate-float [animation-delay:-3s] min-[1180px]:block">
            <p className="text-xs text-muted-foreground">Desde</p>
            <p className="mt-1 text-[28px] font-semibold leading-none text-foreground tabular-nums">
              ${minPrice.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/mes</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Precio mensual más bajo</p>
          </div>
        )}

        {/* Title */}
        <div className="flex flex-col items-center gap-5 max-sm:gap-3 text-center max-w-3xl">
          <h1 className="text-foreground text-5xl lg:text-6xl font-bold leading-[1.1] tracking-[-0.035em] max-sm:text-[30px]">
            Encuentra el espectacular{' '}
            <span className="text-primary">perfecto</span>{' '}
            para tu marca
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl max-sm:text-base">
            Explora ubicaciones estratégicas con datos reales de tráfico y perfil comercial
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full max-w-4xl">
          <div className="search-shell relative rounded-3xl border border-primary/30 bg-white/5 p-2 backdrop-blur">
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute top-0 left-0 h-px w-[30%] bg-gradient-to-r from-transparent via-primary to-transparent animate-scan" />
            </div>
          <div className="relative flex items-stretch max-md:flex-col">
            {/* Location field */}
            <div className="flex-1 relative">
              <div className="flex items-center gap-3 px-5 py-4 max-sm:px-4 max-sm:py-3 ">
                <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1">
                  <label className="text-muted-foreground text-xs font-medium">Ubicación</label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={location}
                    onChange={(e) => { setLocation(e.target.value); setSelectedCoords(null); }}
                    onFocus={() => { requestGeolocation(); if (suggestions.length > 0) setShowSuggestions(true); }}
                    placeholder="Plaza, colonia o dirección"
                    className="w-full bg-transparent text-foreground text-base outline-none placeholder:text-muted-foreground mt-0.5"
                  />
                </div>
                {isLoading && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />}
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute top-full left-0 mt-2 bg-card border border-border rounded-xl shadow-2xl z-[100] max-h-[320px] overflow-y-auto"
                  style={{ minWidth: 'min(340px, calc(100vw - 2rem))', width: 'max-content', maxWidth: 'min(500px, calc(100vw - 2rem))' }}
                >
                  {userLocation && (
                    <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 text-xs text-muted-foreground">
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
                      {getTypeIcon(s.type, s)}
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground text-sm truncate">{s.displayName || s.name}</p>
                        <p className="text-muted-foreground text-xs truncate">{s.displayContext || s.address}</p>
                      </div>
                      <span className="text-muted-foreground text-xs bg-white/5 px-2 py-0.5 rounded-full flex-shrink-0">
                        {getTypeLabel(s.type, s)}
                      </span>
                      {s.distance && (
                        <span className="text-muted-foreground text-xs">{(s.distance / 1000).toFixed(1)} km</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px bg-white/10 my-3" />
            <div className="md:hidden h-px bg-white/10 mx-4" />

            {/* Date field */}
            <div className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center gap-3 px-5 py-4 text-left ">
                    <CalendarDays className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <label className="text-muted-foreground text-xs font-medium">Fechas</label>
                      <p className={cn("text-base mt-0.5", dateRange?.from ? "text-foreground" : "text-muted-foreground")}>
                        {dateRange?.from ? (
                          dateRange.to ? (
                            `${format(dateRange.from, 'd MMM', { locale: es })} — ${format(dateRange.to, 'd MMM', { locale: es })}`
                          ) : format(dateRange.from, 'd MMM yyyy', { locale: es })
                        ) : 'Inicio — Fin'}
                      </p>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    disabled={(date) => date < new Date()}
                    className={cn("p-3 pointer-events-auto text-foreground")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Search button */}
            <button
              onClick={handleSearch}
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-semibold px-7 py-4 hover:bg-primary-hover transition-colors max-md:mt-2"
            >
              <Search className="w-5 h-5" />
              <span className="max-md:block">Buscar espacios</span>
            </button>
          </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/valor-espectacular')}
          className="text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
        >
          ¿Tienes un espectacular? Valúalo gratis →
        </button>
      </div>
    </section>
  );
};

export default HeroSection;
