import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, X, Heart, MapPin, Star, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import FavoriteButton from '@/components/favorites/FavoriteButton';
import FiltersDialog from '@/components/search/FiltersDialog';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
  averageRating?: number;
  totalReviews?: number;
}

interface INEGICardData {
  socioeconomicLevel?: string;
  nearbyBusinessesCount?: number;
}

interface MobileSearchViewProps {
  properties: MapProperty[];
  selectedPropertyId: string | null;
  onPropertySelect: (id: string | null) => void;
  onFiltersChange: (filters: Record<string, any>) => void;
  resultsCount: number;
  isLoading: boolean;
  inegiDataMap: Record<string, INEGICardData>;
  onReserveClick: (property: MapProperty) => void;
  mapComponent: React.ReactNode;
}

type ListingState = 'collapsed' | 'expanded';

const MobileSearchView: React.FC<MobileSearchViewProps> = ({
  properties,
  selectedPropertyId,
  onPropertySelect,
  onFiltersChange,
  resultsCount,
  isLoading,
  inegiDataMap,
  onReserveClick,
  mapComponent,
}) => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [listingState, setListingState] = useState<ListingState>('collapsed');
  const [detailProperty, setDetailProperty] = useState<MapProperty | null>(null);

  // Find selected property for detail view
  useEffect(() => {
    if (selectedPropertyId) {
      const prop = properties.find(p => p.id === selectedPropertyId);
      if (prop) {
        setDetailProperty(prop);
        setListingState('collapsed');
      }
    }
  }, [selectedPropertyId, properties]);

  const handlePropertyClick = (property: MapProperty) => {
    setDetailProperty(property);
    onPropertySelect(property.id);
  };

  const handleCloseDetail = () => {
    setDetailProperty(null);
    onPropertySelect(null);
  };

  const handleMapTap = () => {
    if (detailProperty) {
      handleCloseDetail();
    } else if (listingState === 'expanded') {
      setListingState('collapsed');
    }
  };

  const handleViewDetails = (property: MapProperty) => {
    navigate(`/billboard/${property.id}`);
  };

  const handleReserve = (property: MapProperty) => {
    if (!user) {
      toast.error('Debes iniciar sesión para reservar');
      navigate('/auth');
      return;
    }
    if (userRole !== 'business') {
      toast.error('Solo los negocios pueden reservar espectaculares');
      return;
    }
    onReserveClick(property);
  };

  const listingHeight = listingState === 'collapsed' ? 'h-[25vh]' : 'h-[85vh]';

  return (
    <div className="h-screen w-full relative overflow-hidden">
      {/* Map Layer - Full screen background */}
      <div className="absolute inset-0 z-0" onClick={handleMapTap}>
        {mapComponent}
      </div>

      {/* Floating Filter Button */}
      <div className="absolute top-4 right-4 z-30">
        <FiltersDialog 
          onFiltersChange={onFiltersChange}
          resultsCount={resultsCount}
        />
      </div>

      {/* Results Badge */}
      <div className="absolute top-4 left-4 z-30">
        <Badge variant="secondary" className="bg-card/95 backdrop-blur-sm shadow-lg">
          {isLoading ? '...' : resultsCount} resultados
        </Badge>
      </div>

      {/* Bottom Sheet Listing */}
      <div 
        className={`absolute bottom-0 left-0 right-0 z-20 bg-card rounded-t-3xl shadow-2xl transition-all duration-300 ease-out ${listingHeight}`}
        style={{ maxHeight: '85vh' }}
      >
        {/* Handle */}
        <div 
          className="flex justify-center py-3 cursor-pointer"
          onClick={() => setListingState(prev => prev === 'collapsed' ? 'expanded' : 'collapsed')}
        >
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 flex items-center justify-between border-b border-border">
          <h3 className="font-semibold text-foreground">
            {resultsCount} espectaculares
          </h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setListingState(prev => prev === 'collapsed' ? 'expanded' : 'collapsed')}
          >
            {listingState === 'collapsed' ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </Button>
        </div>

        {/* Scrollable List */}
        <div 
          className={`overflow-y-auto px-4 py-3 space-y-3 ${listingState === 'collapsed' ? 'overflow-hidden' : ''}`}
          style={{ height: listingState === 'collapsed' ? '100px' : 'calc(85vh - 100px)' }}
        >
          {properties.slice(0, listingState === 'collapsed' ? 2 : undefined).map((property) => (
            <div
              key={property.id}
              onClick={() => handlePropertyClick(property)}
              className="flex gap-3 p-3 bg-secondary/50 rounded-xl cursor-pointer hover:bg-secondary transition-colors"
            >
              {/* Image */}
              <div className="w-24 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                {property.imageUrl ? (
                  <img 
                    src={property.imageUrl} 
                    alt={property.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{property.name}</p>
                <p className="text-sm text-muted-foreground truncate">{property.address}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-primary font-bold">{property.price}/mes</span>
                  {property.averageRating && property.averageRating > 0 && (
                    <span className="flex items-center gap-1 text-sm">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {property.averageRating.toFixed(1)}
                    </span>
                  )}
                </div>
                {inegiDataMap[property.id]?.socioeconomicLevel && (
                  <Badge variant="outline" className="mt-1 text-xs">
                    NSE: {inegiDataMap[property.id].socioeconomicLevel}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Popup / Bottom Sheet */}
      <Sheet open={!!detailProperty} onOpenChange={(open) => !open && handleCloseDetail()}>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl p-0">
          {detailProperty && (
            <>
              {/* Image */}
              <div className="relative h-48 bg-muted">
                {detailProperty.imageUrl ? (
                  <img 
                    src={detailProperty.imageUrl}
                    alt={detailProperty.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                
                {/* Action buttons on image */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <FavoriteButton billboardId={detailProperty.id} variant="icon" />
                </div>
                
                <button
                  onClick={handleCloseDetail}
                  className="absolute top-4 left-4 w-8 h-8 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{detailProperty.name}</h3>
                  <p className="text-muted-foreground text-sm">{detailProperty.address}</p>
                </div>

                <div className="text-2xl font-bold text-primary">
                  {detailProperty.price}/mes
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-secondary rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground">Impresiones</p>
                    <p className="font-semibold text-foreground text-sm">{detailProperty.viewsPerDay}/día</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-2 text-center">
                    <p className="text-xs text-muted-foreground">Tamaño</p>
                    <p className="font-semibold text-foreground text-sm">{detailProperty.size}</p>
                  </div>
                  {inegiDataMap[detailProperty.id]?.socioeconomicLevel && (
                    <div className="bg-secondary rounded-lg p-2 text-center">
                      <p className="text-xs text-muted-foreground">NSE</p>
                      <p className="font-semibold text-foreground text-sm">
                        {inegiDataMap[detailProperty.id].socioeconomicLevel}
                      </p>
                    </div>
                  )}
                </div>

                {/* CTAs */}
                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleViewDetails(detailProperty)}
                  >
                    Ver detalles
                  </Button>
                  <Button 
                    className="flex-1 bg-primary text-primary-foreground"
                    onClick={() => handleReserve(detailProperty)}
                  >
                    Cotizar
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileSearchView;
