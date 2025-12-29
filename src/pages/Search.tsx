import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, List, Map, BarChart2, X } from 'lucide-react';
import SearchFilters, { MapLayers, POICategories } from '@/components/search/SearchFilters';
import SearchMap, { SearchMapRef } from '@/components/search/SearchMap';
import SearchResultCard from '@/components/search/SearchResultCard';
import LocationAutocomplete from '@/components/search/LocationAutocomplete';
import BookingDialog from '@/components/booking/BookingDialog';
import ComparisonPanel from '@/components/search/ComparisonPanel';
import BusinessHeader from '@/components/navigation/BusinessHeader';
import { supabase } from '@/integrations/supabase/client';
import { useBillboards, Billboard } from '@/hooks/useBillboards';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Property type used in map components
interface MapProperty {
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
  imageUrl: string | null;
  owner?: {
    full_name: string;
    company_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
}

// Transform billboard to property format for existing components
const transformBillboardToProperty = (billboard: Billboard): MapProperty => ({
  id: billboard.id,
  name: billboard.title,
  address: `${billboard.address}, ${billboard.city}, ${billboard.state}`,
  price: `$${billboard.price_per_month.toLocaleString()}`,
  viewsPerDay: billboard.daily_impressions ? `+${billboard.daily_impressions.toLocaleString()}` : 'N/A',
  pointsOfInterest: '+15',
  peakHours: '8am-8pm',
  size: `${billboard.width_m}m x ${billboard.height_m}m`,
  status: billboard.illumination !== 'ninguna' ? 'Alto' : 'Medio',
  availability: 'Inmediata',
  lat: Number(billboard.latitude),
  lng: Number(billboard.longitude),
  imageUrl: billboard.image_url || null,
  owner: billboard.owner,
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
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  
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

  // Fetch billboards from database using confirmed location
  const { billboards, isLoading: isLoadingBillboards } = useBillboards({
    location: confirmedLocation,
  });

  // Transform billboards to property format - only real data, no mocks
  const properties = billboards.map(transformBillboardToProperty);

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

  const handleFiltersChange = (newFilters: Record<string, string[]>) => {
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
    <div className="min-h-screen bg-[#202020] flex flex-col">
      {/* Header */}
      <BusinessHeader />

      {/* Search Controls */}
      <div className="bg-[#1A1A1A] border-b border-white/10">
        <div className="px-6 py-4">
          {/* Search Row */}
          <div className="flex items-center gap-4 mb-4">
            <Link to="/" className="text-white hover:text-[#9BFF43] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>

            {/* Search Bar with Autocomplete */}
            <LocationAutocomplete
              value={searchQuery}
              onChange={setSearchQuery}
              onSelect={(location) => {
                setSearchQuery(location.place_name);
                setConfirmedLocation(location.place_name);
              }}
              mapboxToken={mapboxToken}
              placeholder="Buscar ubicación..."
              className="flex-1 max-w-xl"
            />

            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-[#2A2A2A] rounded-full p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-full transition-colors ${
                  viewMode === 'list' ? 'bg-[#9BFF43] text-[#202020]' : 'text-white/50 hover:text-white'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`p-2 rounded-full transition-colors ${
                  viewMode === 'split' ? 'bg-[#9BFF43] text-[#202020]' : 'text-white/50 hover:text-white'
                }`}
              >
                <div className="flex gap-0.5">
                  <div className="w-2 h-4 bg-current rounded-sm" />
                  <div className="w-2 h-4 bg-current rounded-sm" />
                </div>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 rounded-full transition-colors ${
                  viewMode === 'map' ? 'bg-[#9BFF43] text-[#202020]' : 'text-white/50 hover:text-white'
                }`}
              >
                <Map className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Location Title */}
          <h1 className="text-white text-2xl font-bold mb-2">{confirmedLocation}</h1>
          <p className="text-white/50 text-sm">
            {isLoadingBillboards ? 'Cargando...' : `${properties.length} espectaculares disponibles`}
          </p>
        </div>

        {/* Filters - now includes map layer controls */}
        <div className="px-6 border-t border-white/5">
          <SearchFilters 
            onFiltersChange={handleFiltersChange}
            mapLayers={viewMode !== 'list' ? mapLayers : undefined}
            poiCategories={viewMode !== 'list' ? poiCategories : undefined}
            trafficHour={trafficHour}
            onMapLayerChange={viewMode !== 'list' ? handleMapLayerChange : undefined}
            onPOICategoryChange={viewMode !== 'list' ? handlePOICategoryChange : undefined}
            onTrafficHourChange={viewMode !== 'list' ? handleTrafficHourChange : undefined}
            isLoadingLayers={isLoadingLayers}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Results List */}
        {(viewMode === 'split' || viewMode === 'list') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} overflow-y-auto p-6`}>
            {properties.length === 0 && !isLoadingBillboards ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <MapPin className="w-12 h-12 text-[#9BFF43] mb-4" />
                <h3 className="text-white text-lg font-semibold mb-2">No hay espectaculares disponibles</h3>
                <p className="text-white/50 text-sm max-w-md">
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
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Map */}
        {(viewMode === 'split' || viewMode === 'map') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} relative`}>
            {isLoadingToken ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A]">
                <div className="text-white/50">Cargando mapa...</div>
              </div>
            ) : mapboxToken ? (
              <SearchMap
                ref={mapRef}
                properties={properties}
                selectedPropertyId={selectedPropertyId}
                onPropertySelect={setSelectedPropertyId}
                mapboxToken={mapboxToken}
                searchLocation={confirmedLocation}
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
              <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A]">
                <div className="text-center p-8">
                  <MapPin className="w-12 h-12 text-[#9BFF43] mx-auto mb-4" />
                  <p className="text-white mb-2">Token de Mapbox no configurado</p>
                  <p className="text-white/50 text-sm">
                    Configura tu token de Mapbox en las variables de entorno
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Compare Button */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={() => setShowComparison(true)}
            className="flex items-center gap-3 px-6 py-3 bg-[#9BFF43] text-[#1A1A1A] rounded-full font-bold shadow-lg hover:bg-[#8AE63A] transition-colors"
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
          properties={properties.filter(p => compareIds.includes(p.id))}
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
