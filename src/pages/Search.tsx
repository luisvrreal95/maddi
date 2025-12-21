import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Search as SearchIcon, MapPin, List, Map } from 'lucide-react';
import SearchFilters from '@/components/search/SearchFilters';
import SearchMap from '@/components/search/SearchMap';
import SearchResultCard from '@/components/search/SearchResultCard';
import { supabase } from '@/integrations/supabase/client';

// Mock data for properties
const mockProperties = [
  {
    id: '1',
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
  },
  {
    id: '2',
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
  },
  {
    id: '3',
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
  },
  {
    id: '4',
    name: 'Galerías del Valle',
    address: 'Blvd. Adolfo López Mateos 2500, Nueva Mexicali, 21399 Mexicali, B.C.',
    price: '$2,200',
    viewsPerDay: '+50,000',
    pointsOfInterest: '+60',
    peakHours: '4pm-8pm',
    size: '100m x 200m',
    status: 'Alto',
    availability: 'Inmediata',
    lat: 32.6420,
    lng: -115.4250,
  },
  {
    id: '5',
    name: 'Plaza Fiesta',
    address: 'Calz. Independencia 1234, Centro, 21100 Mexicali, B.C.',
    price: '$1,100',
    viewsPerDay: '+25,000',
    pointsOfInterest: '+30',
    peakHours: '11am-3pm',
    size: '70m x 140m',
    status: 'Medio',
    availability: 'Este mes',
    lat: 32.6290,
    lng: -115.4580,
  },
];

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = searchParams.get('location') || 'Mexicali, B.C.';
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'map'>('split');
  const [searchQuery, setSearchQuery] = useState(location);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [isLoadingToken, setIsLoadingToken] = useState(true);

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

  const handleFiltersChange = (filters: Record<string, string[]>) => {
    console.log('Filters changed:', filters);
    // TODO: Filter properties based on selected filters
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

            {/* Search Bar */}
            <div className="flex-1 max-w-xl mx-8">
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9BFF43]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-[#2A2A2A] border border-white/10 rounded-full text-white placeholder-white/50 focus:outline-none focus:border-[#9BFF43]/50"
                  placeholder="Buscar ubicación..."
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#9BFF43] rounded-full flex items-center justify-center hover:bg-[#8AE63A] transition-colors">
                  <SearchIcon className="w-5 h-5 text-[#202020]" />
                </button>
              </div>
            </div>

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
          <h1 className="text-white text-2xl font-bold mb-2">{searchQuery}</h1>
          <p className="text-white/50 text-sm">{mockProperties.length} espectaculares disponibles</p>
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
              {mockProperties.map((property) => (
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
                properties={mockProperties}
                selectedPropertyId={selectedPropertyId}
                onPropertySelect={setSelectedPropertyId}
                mapboxToken={mapboxToken}
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
    </div>
  );
};

export default SearchPage;
