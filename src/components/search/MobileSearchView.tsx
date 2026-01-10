import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronUp, ChevronDown, X, MapPin, Star, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent } from '@/components/ui/sheet';
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
  mapComponent: React.ReactNode | null;
}

type ListingState = 'collapsed' | 'expanded';

// Image Carousel Component for Mobile
const ImageCarousel: React.FC<{ 
  images: string[]; 
  name: string;
  onClose?: () => void;
}> = ({ images, name, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };
  
  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };

  if (images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <MapPin className="w-12 h-12 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <img 
        src={images[currentIndex]}
        alt={`${name} - ${currentIndex + 1}`}
        className="w-full h-full object-cover"
      />
      
      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          {/* Dots indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  idx === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

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
  
  // Swipe gesture handling
  const startY = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

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

  // Swipe handlers for bottom sheet
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null) return;
    currentY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (startY.current === null || currentY.current === null) {
      startY.current = null;
      currentY.current = null;
      return;
    }

    const deltaY = currentY.current - startY.current;
    const threshold = 50; // minimum swipe distance

    if (deltaY < -threshold) {
      // Swiped up - expand
      setListingState('expanded');
    } else if (deltaY > threshold) {
      // Swiped down - collapse
      setListingState('collapsed');
    }

    startY.current = null;
    currentY.current = null;
  }, []);

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

  const listingHeight = listingState === 'collapsed' ? 'h-[28vh]' : 'h-[85vh]';

  // Get images for carousel (for now just the main image, but structure allows multiple)
  const getPropertyImages = (property: MapProperty): string[] => {
    if (property.imageUrl) {
      return [property.imageUrl];
    }
    return [];
  };

  return (
    <div className="h-screen w-full relative overflow-hidden bg-muted">
      {/* Map Layer - Full screen background */}
      <div className="absolute inset-0 z-0" onClick={handleMapTap}>
        {mapComponent || (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-12 h-12 text-muted-foreground animate-pulse" />
          </div>
        )}
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
        <Badge variant="secondary" className="bg-card/95 backdrop-blur-sm shadow-lg px-3 py-1.5">
          {isLoading ? '...' : resultsCount} resultados
        </Badge>
      </div>

      {/* Bottom Sheet Listing with Swipe Gestures */}
      <div 
        ref={sheetRef}
        className={`absolute bottom-0 left-0 right-0 z-20 bg-card rounded-t-3xl shadow-2xl transition-all duration-300 ease-out ${listingHeight}`}
        style={{ maxHeight: '85vh' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe Handle */}
        <div 
          className="flex justify-center py-3 cursor-pointer touch-none"
          onClick={() => setListingState(prev => prev === 'collapsed' ? 'expanded' : 'collapsed')}
        >
          <div className="w-12 h-1.5 bg-muted-foreground/40 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 pb-3 flex items-center justify-between border-b border-border">
          <h3 className="font-semibold text-foreground text-base">
            {resultsCount} espectaculares
          </h3>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-8 px-2"
            onClick={() => setListingState(prev => prev === 'collapsed' ? 'expanded' : 'collapsed')}
          >
            {listingState === 'collapsed' ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                <span className="text-xs">Ver más</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                <span className="text-xs">Colapsar</span>
              </>
            )}
          </Button>
        </div>

        {/* Scrollable List */}
        <div 
          className={`overflow-y-auto px-4 py-3 space-y-3 ${listingState === 'collapsed' ? 'overflow-hidden' : ''}`}
          style={{ height: listingState === 'collapsed' ? '120px' : 'calc(85vh - 80px)' }}
        >
          {properties.slice(0, listingState === 'collapsed' ? 2 : undefined).map((property) => (
            <div
              key={property.id}
              onClick={() => handlePropertyClick(property)}
              className="flex gap-3 p-3 bg-secondary/50 rounded-xl cursor-pointer hover:bg-secondary active:bg-secondary/80 transition-colors"
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
                <p className="font-semibold text-foreground truncate text-sm">{property.name}</p>
                <p className="text-xs text-muted-foreground truncate">{property.address}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-primary font-bold text-sm">{property.price}/mes</span>
                  {property.averageRating && property.averageRating > 0 && (
                    <span className="flex items-center gap-1 text-xs">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {property.averageRating.toFixed(1)}
                    </span>
                  )}
                </div>
                {inegiDataMap[property.id]?.socioeconomicLevel && (
                  <Badge variant="outline" className="mt-1 text-xs py-0 px-1.5">
                    NSE: {inegiDataMap[property.id].socioeconomicLevel}
                  </Badge>
                )}
              </div>
            </div>
          ))}
          
          {/* Show more indicator when collapsed */}
          {listingState === 'collapsed' && properties.length > 2 && (
            <div className="text-center py-2">
              <span className="text-xs text-muted-foreground">
                +{properties.length - 2} más • Desliza hacia arriba
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Detail Popup / Bottom Sheet - Optimized */}
      <Sheet open={!!detailProperty} onOpenChange={(open) => !open && handleCloseDetail()}>
        <SheetContent 
          side="bottom" 
          className="h-[70vh] rounded-t-3xl p-0 overflow-hidden"
        >
          {detailProperty && (
            <div className="h-full flex flex-col">
              {/* Image Carousel */}
              <div className="relative h-44 flex-shrink-0">
                <ImageCarousel 
                  images={getPropertyImages(detailProperty)} 
                  name={detailProperty.name}
                />
                
                {/* Action buttons on image */}
                <div className="absolute top-3 right-3 flex gap-2">
                  <FavoriteButton billboardId={detailProperty.id} variant="icon" />
                </div>
                
                <button
                  onClick={handleCloseDetail}
                  className="absolute top-3 left-3 w-8 h-8 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground leading-tight">{detailProperty.name}</h3>
                  <p className="text-muted-foreground text-sm mt-0.5">{detailProperty.address}</p>
                </div>

                <div className="text-2xl font-bold text-primary">
                  {detailProperty.price}/mes
                </div>

                {/* Quick stats - Optimized for mobile */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-secondary rounded-lg p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Impresiones</p>
                    <p className="font-semibold text-foreground text-sm">{detailProperty.viewsPerDay}/día</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-2.5 text-center">
                    <p className="text-xs text-muted-foreground">Tamaño</p>
                    <p className="font-semibold text-foreground text-sm">{detailProperty.size}</p>
                  </div>
                  {inegiDataMap[detailProperty.id]?.socioeconomicLevel ? (
                    <div className="bg-secondary rounded-lg p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">NSE</p>
                      <p className="font-semibold text-foreground text-sm">
                        {inegiDataMap[detailProperty.id].socioeconomicLevel}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-secondary rounded-lg p-2.5 text-center">
                      <p className="text-xs text-muted-foreground">Rating</p>
                      <p className="font-semibold text-foreground text-sm flex items-center justify-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {detailProperty.averageRating?.toFixed(1) || 'N/A'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Additional info */}
                {detailProperty.pointsOfInterestArray && detailProperty.pointsOfInterestArray.length > 0 && (
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1.5">Puntos de interés cercanos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detailProperty.pointsOfInterestArray.slice(0, 4).map((poi, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs py-0.5">
                          {poi}
                        </Badge>
                      ))}
                      {detailProperty.pointsOfInterestArray.length > 4 && (
                        <Badge variant="outline" className="text-xs py-0.5">
                          +{detailProperty.pointsOfInterestArray.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Fixed CTAs at bottom */}
              <div className="flex-shrink-0 p-4 border-t border-border bg-card">
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-11"
                    onClick={() => handleViewDetails(detailProperty)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver detalles
                  </Button>
                  <Button 
                    className="flex-1 h-11 bg-primary text-primary-foreground"
                    onClick={() => handleReserve(detailProperty)}
                  >
                    Cotizar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileSearchView;
