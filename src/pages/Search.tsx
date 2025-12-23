import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, List, Map, LogOut, User } from 'lucide-react';
import SearchFilters from '@/components/search/SearchFilters';
import SearchMap from '@/components/search/SearchMap';
import SearchResultCard from '@/components/search/SearchResultCard';
import LocationAutocomplete from '@/components/search/LocationAutocomplete';
import BookingDialog from '@/components/booking/BookingDialog';
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
});

// Mock data as fallback when no real data exists
const mockProperties: MapProperty[] = [
  {
    id: 'mock-1',
    name: 'Plaza Juárez',
    address: 'Blvd. Benito Juárez 2151, Centro Cívico, 21000 Mexicali, B.C.',
    price: '$990',
    viewsPerDay: '+20,000',
    pointsOfInterest: '+20',
    peakHours: '8am-12pm',
    size: '60m x 120m',
    status: 'Medio',
    availability: 'Inmediata',
    lat: 32.6245,
    lng: -115.4523,
    imageUrl: null,
  },
  {
    id: 'mock-2',
    name: 'Centro Comercial La Cachanilla',
    address: 'Blvd. Lázaro Cárdenas 1000, Centro, 21100 Mexicali, B.C.',
    price: '$1,500',
    viewsPerDay: '+35,000',
    pointsOfInterest: '+45',
    peakHours: '5pm-9pm',
    size: '80m x 150m',
    status: 'Alto',
    availability: 'Inmediata',
    lat: 32.6350,
    lng: -115.4680,
    imageUrl: null,
  },
  {
    id: 'mock-3',
    name: 'Plaza San Pedro',
    address: 'Av. Reforma 1500, Zona Centro, 21000 Mexicali, B.C.',
    price: '$850',
    viewsPerDay: '+15,000',
    pointsOfInterest: '+15',
    peakHours: '9am-1pm',
    size: '40m x 80m',
    status: 'Bajo',
    availability: 'Esta semana',
    lat: 32.6180,
    lng: -115.4400,
    imageUrl: null,
  },
];

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, userRole, signOut } = useAuth();
  const location = searchParams.get('location') || 'Mexicali, B.C.';
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'map'>('split');
  const [searchQuery, setSearchQuery] = useState(location);
  const [confirmedLocation, setConfirmedLocation] = useState(location);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  
  // Booking state
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedBillboard, setSelectedBillboard] = useState<Billboard | null>(null);

  // Fetch billboards from database using confirmed location
  const { billboards, isLoading: isLoadingBillboards } = useBillboards({
    location: confirmedLocation,
  });

  // Transform billboards or use mock data
  const properties = billboards.length > 0 
    ? billboards.map(transformBillboardToProperty)
    : mockProperties;

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
    } else {
      // If it's mock data, show a message
      toast.info('Esta es una demostración. Regístrate para ver espectaculares reales.');
    }
  };

  return (
    <div className="min-h-screen bg-[#202020] flex flex-col">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-white/10">
        <div className="px-6 py-4">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="flex items-center gap-3 text-white hover:text-[#9BFF43] transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <div className="flex items-center gap-2">
                <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="40" height="40" rx="8" fill="#9BFF43"/>
                  <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#202020" fontSize="14" fontWeight="bold" fontFamily="system-ui">
                    M
                  </text>
                </svg>
                <span className="text-xl font-bold">Maddi</span>
              </div>
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
              className="flex-1 max-w-xl mx-8"
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

            {/* User Actions */}
            <div className="flex items-center gap-3 ml-4">
              {user ? (
                <>
                  <div className="flex items-center gap-2 text-white/70">
                    <User className="w-4 h-4" />
                    <span className="text-sm">{userRole === 'business' ? 'Negocio' : 'Usuario'}</span>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-full transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Salir</span>
                  </button>
                </>
              ) : (
                <Link to="/auth" className="text-[#9BFF43] text-sm font-medium hover:underline">
                  Iniciar sesión
                </Link>
              )}
            </div>
          </div>

          {/* Location Title */}
          <h1 className="text-white text-2xl font-bold mb-2">{confirmedLocation}</h1>
          <p className="text-white/50 text-sm">
            {isLoadingBillboards ? 'Cargando...' : `${properties.length} espectaculares disponibles`}
            {billboards.length === 0 && !isLoadingBillboards && ' (datos de ejemplo)'}
          </p>
        </div>

        {/* Filters */}
        <div className="px-6 border-t border-white/5">
          <SearchFilters onFiltersChange={handleFiltersChange} />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Results List */}
        {(viewMode === 'split' || viewMode === 'list') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} overflow-y-auto p-6`}>
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
                properties={properties}
                selectedPropertyId={selectedPropertyId}
                onPropertySelect={setSelectedPropertyId}
                mapboxToken={mapboxToken}
                searchLocation={confirmedLocation}
                onReserveClick={handleReserveClick}
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
