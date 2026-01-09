import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, List, Map, BarChart2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MapLayers, POICategories } from '@/components/search/SearchFilters';
import FiltersDialog from '@/components/search/FiltersDialog';
import SearchMap, { SearchMapRef } from '@/components/search/SearchMap';
import SearchResultCard from '@/components/search/SearchResultCard';
import LocationAutocomplete, { SelectedLocation } from '@/components/search/LocationAutocomplete';
import BookingDialog from '@/components/booking/BookingDialog';
import ComparisonPanel from '@/components/search/ComparisonPanel';
import BusinessHeader from '@/components/navigation/BusinessHeader';
import { supabase } from '@/integrations/supabase/client';
import { useBillboards, Billboard } from '@/hooks/useBillboards';
import { useBillboardReviewStats } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// INEGI data type for cards
interface INEGICardData {
  socioeconomicLevel?: string;
  nearbyBusinessesCount?: number;
}

// Property type used in map components
interface MapProperty {
  id: string;
  name: string;
  address: string;
  price: string;
  viewsPerDay: string;
  pointsOfInterest: string;
  pointsOfInterestArray: string[] | null;
  peakHours: string;
  size: string;
  status: string;
  availability: string;
  lat: number;
  lng: number;
  imageUrl: string | null;
  owner?: {
    full_name: string;
    company_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
  averageRating?: number;
  totalReviews?: number;
}

// Transform billboard to property format for existing components
const transformBillboardToProperty = (billboard: Billboard, reviewStats?: { averageRating: number; totalReviews: number }): MapProperty => ({
  id: billboard.id,
  name: billboard.title,
  address: `${billboard.address}, ${billboard.city}, ${billboard.state}`,
  price: `$${billboard.price_per_month.toLocaleString()}`,
  viewsPerDay: billboard.daily_impressions ? `+${billboard.daily_impressions.toLocaleString()}` : 'N/A',
  pointsOfInterest: billboard.points_of_interest?.length ? `+${billboard.points_of_interest.length}` : 'N/A',
  pointsOfInterestArray: billboard.points_of_interest || null,
  peakHours: '8am-8pm',
  size: `${billboard.width_m}m x ${billboard.height_m}m`,
  status: billboard.illumination !== 'ninguna' ? 'Alto' : 'Medio',
  availability: 'Inmediata',
  lat: Number(billboard.latitude),
  lng: Number(billboard.longitude),
  imageUrl: billboard.image_url || null,
  owner: billboard.owner,
  averageRating: reviewStats?.averageRating || 0,
  totalReviews: reviewStats?.totalReviews || 0,
});

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const location = searchParams.get('location') || 'Mexicali, B.C.';
  const mapRef = useRef<SearchMapRef>(null);
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'map'>('split');
  const [searchQuery, setSearchQuery] = useState(location);
  const [confirmedLocation, setConfirmedLocation] = useState(location);
  const [selectedLocationData, setSelectedLocationData] = useState<SelectedLocation | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string } | undefined>();
  const [unavailableBillboardIds, setUnavailableBillboardIds] = useState<Set<string>>(new Set());
  
  // Compare mode state
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const isCompareMode = compareIds.length > 0;
  
  // Map layers state
  const [mapLayers, setMapLayers] = useState<MapLayers>({
    traffic: false,
    trafficHistory: false,
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
  
  const [trafficHour, setTrafficHour] = useState(8);
  const [isLoadingLayers, setIsLoadingLayers] = useState(false);
  
  // Booking state
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedBillboard, setSelectedBillboard] = useState<Billboard | null>(null);
  
  // INEGI data for search cards
  const [inegiDataMap, setInegiDataMap] = useState<Record<string, INEGICardData>>({});

  const handleToggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 4) {
        toast.error('Máximo 4 espectaculares para comparar');
        return prev;
      }
      return [...prev, id];
    });
  };

  // Fetch billboards from database using confirmed location and structured data
  const { billboards, isLoading: isLoadingBillboards } = useBillboards({
    location: confirmedLocation,
    city: selectedLocationData?.city,
    bbox: selectedLocationData?.bbox,
  });

  // Fetch review stats for all billboards
  const { statsMap: reviewStatsMap } = useBillboardReviewStats();

  // Fetch INEGI data for all billboards (cached data only for performance)
  useEffect(() => {
    const fetchINEGIDataForBillboards = async () => {
      if (billboards.length === 0) return;
      
      const billboardIds = billboards.map(b => b.id);
      
      const { data, error } = await supabase
        .from('inegi_demographics')
        .select('billboard_id, socioeconomic_level, nearby_businesses_count')
        .in('billboard_id', billboardIds);
      
      if (data && !error) {
        const map: Record<string, INEGICardData> = {};
        data.forEach(d => {
          map[d.billboard_id] = {
            socioeconomicLevel: d.socioeconomic_level || undefined,
            nearbyBusinessesCount: d.nearby_businesses_count || undefined,
          };
        });
        setInegiDataMap(map);
      }
    };
    
    fetchINEGIDataForBillboards();
  }, [billboards]);

  // Check availability when date filter changes
  useEffect(() => {
    const checkAvailability = async () => {
      if (!dateFilter?.from || !dateFilter?.to || billboards.length === 0) {
        setUnavailableBillboardIds(new Set());
        return;
      }

      const billboardIds = billboards.map(b => b.id);
      
      // Check bookings that overlap with the selected date range
      const { data: conflictingBookings } = await supabase
        .from('bookings')
        .select('billboard_id')
        .in('billboard_id', billboardIds)
        .in('status', ['approved', 'pending'])
        .lte('start_date', dateFilter.to)
        .gte('end_date', dateFilter.from);
      
      // Check blocked dates that overlap
      const { data: conflictingBlocked } = await supabase
        .from('blocked_dates')
        .select('billboard_id')
        .in('billboard_id', billboardIds)
        .lte('start_date', dateFilter.to)
        .gte('end_date', dateFilter.from);
      
      const conflictIds = new Set([
        ...(conflictingBookings?.map(b => b.billboard_id) || []),
        ...(conflictingBlocked?.map(b => b.billboard_id) || []),
      ]);
      
      setUnavailableBillboardIds(conflictIds);
    };

    checkAvailability();
  }, [dateFilter, billboards]);

  // Transform billboards to property format - only real data, no mocks
  const allProperties = useMemo(() => 
    billboards.map(b => transformBillboardToProperty(b, reviewStatsMap[b.id])),
    [billboards, reviewStatsMap]
  );

  // Apply filters to properties
  const properties = useMemo(() => {
    let filtered = [...allProperties];

    // Filter by availability
    if (filters.availability?.length > 0) {
      // For now, all billboards are considered available
      // This could be enhanced with actual availability data
    }

    // Filter by traffic level (views per day)
    if (filters.traffic?.length > 0) {
      filtered = filtered.filter(p => {
        const views = parseInt(p.viewsPerDay.replace(/[^0-9]/g, '')) || 0;
        if (filters.traffic.includes('high') && views >= 30000) return true;
        if (filters.traffic.includes('medium') && views >= 15000 && views < 30000) return true;
        if (filters.traffic.includes('low') && views < 15000) return true;
        return false;
      });
    }

    // Filter by size
    if (filters.size?.length > 0) {
      filtered = filtered.filter(p => {
        const sizeParts = p.size.match(/(\d+\.?\d*)/g);
        if (!sizeParts || sizeParts.length < 2) return false;
        const area = parseFloat(sizeParts[0]) * parseFloat(sizeParts[1]);
        if (filters.size.includes('small') && area < 20) return true;
        if (filters.size.includes('medium') && area >= 20 && area < 50) return true;
        if (filters.size.includes('large') && area >= 50) return true;
        return false;
      });
    }

    // Filter by price range
    if (filters.priceRange?.length > 0) {
      filtered = filtered.filter(p => {
        const price = parseInt(p.price.replace(/[^0-9]/g, '')) || 0;
        if (filters.priceRange.includes('budget') && price < 10000) return true;
        if (filters.priceRange.includes('standard') && price >= 10000 && price < 25000) return true;
        if (filters.priceRange.includes('premium') && price >= 25000 && price < 50000) return true;
        if (filters.priceRange.includes('exclusive') && price >= 50000) return true;
        return false;
      });
    }

    // Filter by illumination
    if (filters.illumination?.length > 0) {
      filtered = filtered.filter(p => {
        const billboard = billboards.find(b => b.id === p.id);
        if (!billboard) return false;
        if (filters.illumination.includes('led') && billboard.illumination === 'led') return true;
        if (filters.illumination.includes('traditional') && billboard.illumination === 'tradicional') return true;
        if (filters.illumination.includes('none') && billboard.illumination === 'ninguna') return true;
        return false;
      });
    }

    // Filter by billboard type
    if (filters.billboardType?.length > 0) {
      filtered = filtered.filter(p => {
        const billboard = billboards.find(b => b.id === p.id);
        if (!billboard) return false;
        if (filters.billboardType.includes('spectacular') && billboard.billboard_type === 'espectacular') return true;
        if (filters.billboardType.includes('mural') && billboard.billboard_type === 'mural') return true;
        if (filters.billboardType.includes('bridge') && billboard.billboard_type === 'puente') return true;
        if (filters.billboardType.includes('digital') && billboard.billboard_type === 'digital') return true;
        return false;
      });
    }

    // Filter by socioeconomic level (NSE)
    if (filters.socioeconomicLevel?.length > 0) {
      filtered = filtered.filter(p => {
        const inegiData = inegiDataMap[p.id];
        if (!inegiData?.socioeconomicLevel) return false;
        
        const nse = inegiData.socioeconomicLevel.toLowerCase();
        
        for (const filterValue of filters.socioeconomicLevel) {
          if (filterValue === 'alto' && nse.includes('alto') && !nse.includes('medio')) return true;
          if (filterValue === 'medio-alto' && (nse.includes('medio-alto') || nse.includes('medio alto'))) return true;
          if (filterValue === 'medio' && nse === 'medio') return true;
          if (filterValue === 'bajo' && nse.includes('bajo')) return true;
        }
        return false;
      });
    }

    // Filter by date availability
    if (dateFilter?.from && dateFilter?.to) {
      filtered = filtered.filter(p => !unavailableBillboardIds.has(p.id));
    }

    // Sort results
    if (filters.order?.length > 0) {
      const order = filters.order[0];
      if (order === 'price_asc') {
        filtered.sort((a, b) => {
          const priceA = parseInt(a.price.replace(/[^0-9]/g, '')) || 0;
          const priceB = parseInt(b.price.replace(/[^0-9]/g, '')) || 0;
          return priceA - priceB;
        });
      } else if (order === 'price_desc') {
        filtered.sort((a, b) => {
          const priceA = parseInt(a.price.replace(/[^0-9]/g, '')) || 0;
          const priceB = parseInt(b.price.replace(/[^0-9]/g, '')) || 0;
          return priceB - priceA;
        });
      } else if (order === 'views_desc') {
        filtered.sort((a, b) => {
          const viewsA = parseInt(a.viewsPerDay.replace(/[^0-9]/g, '')) || 0;
          const viewsB = parseInt(b.viewsPerDay.replace(/[^0-9]/g, '')) || 0;
          return viewsB - viewsA;
        });
      }
    }

    return filtered;
  }, [allProperties, filters, billboards, inegiDataMap, dateFilter, unavailableBillboardIds]);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        if (data?.token) {
          setMapboxToken(data.token);
        }
      } catch (error) {
        console.error('Error fetching Mapbox token:', error);
      } finally {
        setIsLoadingToken(false);
      }
    };

    fetchToken();
  }, []);

  const handleFiltersChange = (newFilters: Record<string, any>) => {
    // Extract date range and set separately
    if (newFilters.dateRange) {
      setDateFilter(newFilters.dateRange);
    } else {
      setDateFilter(undefined);
    }
    setFilters(newFilters);
  };

  const handleMapLayerChange = (layer: keyof MapLayers, enabled: boolean) => {
    setMapLayers(prev => ({ ...prev, [layer]: enabled }));
    
    // If enabling traffic history, disable live traffic and vice versa
    if (layer === 'trafficHistory' && enabled) {
      setMapLayers(prev => ({ ...prev, traffic: false, trafficHistory: true }));
    } else if (layer === 'traffic' && enabled) {
      setMapLayers(prev => ({ ...prev, traffic: true, trafficHistory: false }));
    }
  };

  const handlePOICategoryChange = (category: keyof POICategories, enabled: boolean) => {
    setPoiCategories(prev => ({ ...prev, [category]: enabled }));
  };

  const handleTrafficHourChange = (hour: number) => {
    setTrafficHour(hour);
  };

  const handleReserveClick = (property: MapProperty) => {
    // Check if user is authenticated
    if (!user) {
      toast.error('Debes iniciar sesión para reservar');
      navigate('/auth');
      return;
    }

    // Check if user has business role
    if (userRole !== 'business') {
      toast.error('Solo los negocios pueden reservar espectaculares');
      return;
    }

    // Find the billboard from the original data
    const billboard = billboards.find(b => b.id === property.id);
    
    if (billboard) {
      setSelectedBillboard(billboard);
      setBookingDialogOpen(true);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <BusinessHeader />

      {/* Search Controls - Compact single row */}
      <div className="bg-card border-b border-border flex-shrink-0 px-4 py-2">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-foreground hover:text-primary transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>

          {/* Search Bar with Autocomplete */}
          <LocationAutocomplete
            value={searchQuery}
            onChange={setSearchQuery}
            onSelect={(location, structured) => {
              setSearchQuery(location.place_name);
              setConfirmedLocation(location.place_name);
              setSelectedLocationData(structured);
            }}
            mapboxToken={mapboxToken}
            placeholder="Buscar ubicación..."
            className="flex-1 max-w-md"
          />
          
          {/* Results count badge */}
          <Badge variant="secondary" className="hidden sm:flex flex-shrink-0">
            {isLoadingBillboards ? '...' : properties.length} resultados
          </Badge>

          {/* Filters Button - Airbnb style */}
          <FiltersDialog 
            onFiltersChange={handleFiltersChange}
            resultsCount={properties.length}
          />

        </div>
      </div>

      {/* Main Content - Fills remaining height */}
      <main className="flex-1 flex min-h-0 relative">
        {/* Results List - Scrollable */}
        <div className="w-[480px] flex-shrink-0 h-full overflow-y-auto p-4">
          {properties.length === 0 && !isLoadingBillboards ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <MapPin className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-foreground text-lg font-semibold mb-2">No hay espectaculares disponibles</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                No encontramos espectaculares en esta ubicación. Intenta buscar en otra zona o con diferentes filtros.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {properties.map((property) => (
                <SearchResultCard
                  key={property.id}
                  property={property}
                  isSelected={property.id === selectedPropertyId}
                  onClick={() => setSelectedPropertyId(property.id)}
                  isInCompare={compareIds.includes(property.id)}
                  onToggleCompare={handleToggleCompare}
                  inegiData={inegiDataMap[property.id]}
                />
              ))}
            </div>
          )}
        </div>

        {/* Map - Fills remaining space completely */}
        <div className="flex-1 h-full relative">
          {isLoadingToken ? (
            <div className="absolute inset-0 flex items-center justify-center bg-card">
              <div className="text-muted-foreground">Cargando mapa...</div>
            </div>
          ) : mapboxToken ? (
            <SearchMap
              ref={mapRef}
              properties={properties}
              selectedPropertyId={selectedPropertyId}
              onPropertySelect={setSelectedPropertyId}
              mapboxToken={mapboxToken}
              searchLocation={confirmedLocation}
              selectedBounds={selectedLocationData?.bbox}
              selectedCenter={selectedLocationData?.center}
              selectedPlaceType={selectedLocationData?.placeType}
              onReserveClick={handleReserveClick}
              layers={mapLayers}
              poiCategories={poiCategories}
              trafficHour={trafficHour}
              onLoadingChange={setIsLoadingLayers}
              compareIds={compareIds}
              onToggleCompare={handleToggleCompare}
              isCompareMode={isCompareMode}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-card">
              <div className="text-center p-8">
                <MapPin className="w-12 h-12 text-primary mx-auto mb-4" />
                <p className="text-foreground mb-2">Token de Mapbox no configurado</p>
                <p className="text-muted-foreground text-sm">
                  Configura tu token de Mapbox en las variables de entorno
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Compare Button */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={() => setShowComparison(true)}
            className="flex items-center gap-3 px-6 py-3 bg-primary text-primary-foreground rounded-full font-bold shadow-lg hover:bg-primary/90 transition-colors"
          >
            <BarChart2 className="w-5 h-5" />
            Comparar {compareIds.length} espectacular{compareIds.length > 1 ? 'es' : ''}
          </button>
          <button
            onClick={() => setCompareIds([])}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Comparison Panel */}
      {showComparison && (
        <ComparisonPanel
          properties={properties.filter(p => compareIds.includes(p.id)).map(p => ({ ...p, inegiData: inegiDataMap[p.id] }))}
          onClose={() => setShowComparison(false)}
          onRemove={(id) => setCompareIds(prev => prev.filter(i => i !== id))}
          onReserve={(property) => {
            const billboard = billboards.find(b => b.id === property.id);
            if (billboard) {
              setSelectedBillboard(billboard);
              setBookingDialogOpen(true);
              setShowComparison(false);
            }
          }}
        />
      )}

      {/* Booking Dialog */}
      {selectedBillboard && (
        <BookingDialog
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
          billboard={selectedBillboard}
        />
      )}
    </div>
  );
};

export default SearchPage;
