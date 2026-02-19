import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Eye, Users, Clock, Maximize, Check, Star, Store, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import FavoriteHeartButton from './FavoriteHeartButton';

interface OwnerInfo {
  full_name: string;
  company_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface INEGIData {
  socioeconomicLevel?: string;
  nearbyBusinessesCount?: number;
}

interface SearchResultCardProps {
  property: {
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
    owner?: OwnerInfo;
    averageRating?: number;
    totalReviews?: number;
    imageUrl?: string | null;
    imageUrls?: string[] | null;
  };
  isSelected: boolean;
  onClick: () => void;
  isInCompare?: boolean;
  onToggleCompare?: (id: string) => void;
  inegiData?: INEGIData;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({ 
  property, 
  isSelected, 
  onClick,
  isInCompare = false,
  onToggleCompare,
  inegiData
}) => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Collect all available images
  const allImages: string[] = [];
  if (property.imageUrls && property.imageUrls.length > 0) {
    allImages.push(...property.imageUrls.filter(Boolean));
  } else if (property.imageUrl) {
    allImages.push(property.imageUrl);
  }

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!property.id.startsWith('mock-')) {
      navigate(`/billboard/${property.id}`);
    }
  };

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCompare?.(property.id);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => (prev - 1 + allImages.length) % allImages.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => (prev + 1) % allImages.length);
  };

  return (
    <article
      onClick={onClick}
      className={`bg-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border-2 ${
        isSelected
          ? 'border-primary shadow-[0_0_20px_rgba(155,255,67,0.2)]'
          : 'border-transparent hover:border-primary hover:shadow-[0_0_15px_rgba(155,255,67,0.15)]'
      }`}
    >
      {/* Image Carousel */}
      {allImages.length > 0 && (
        <div className="relative w-full h-48 group">
          <img 
            src={allImages[currentImageIndex]} 
            alt={property.name}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
          
          {/* Nav arrows - show on hover when multiple images */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card"
              >
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-card"
              >
                <ChevronRight className="w-4 h-4 text-foreground" />
              </button>
              {/* Dot indicators */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {allImages.slice(0, 5).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === currentImageIndex ? 'bg-white' : 'bg-white/50'
                    }`} 
                  />
                ))}
                {allImages.length > 5 && <div className="w-1.5 h-1.5 rounded-full bg-white/30" />}
              </div>
            </>
          )}

          {/* Favorite button on image */}
          <div className="absolute top-2 right-2">
            <FavoriteHeartButton billboardId={property.id} />
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          {/* Compare Checkbox */}
          {onToggleCompare && (
            <button
              onClick={handleCompareToggle}
              className={`flex-shrink-0 w-6 h-6 rounded border-2 mr-3 flex items-center justify-center transition-all ${
                isInCompare 
                  ? 'bg-primary border-primary' 
                  : 'border-muted-foreground/30 hover:border-primary'
              }`}
              title={isInCompare ? 'Quitar del comparador' : 'Agregar al comparador'}
            >
              {isInCompare && <Check className="w-4 h-4 text-primary-foreground" />}
            </button>
          )}
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-foreground font-bold text-lg">{property.name}</h3>
            <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="line-clamp-1">{property.address}</span>
            </div>
            {/* Rating Badge */}
            {property.totalReviews && property.totalReviews > 0 ? (
              <div className="flex items-center gap-1 mt-2">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span className="text-foreground font-medium text-sm">
                  {property.averageRating?.toFixed(1)}
                </span>
                <span className="text-muted-foreground text-sm">
                  ({property.totalReviews} {property.totalReviews === 1 ? 'reseña' : 'reseñas'})
                </span>
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {allImages.length === 0 && <FavoriteHeartButton billboardId={property.id} />}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-primary text-xs">{property.availability}</span>
            </div>
          </div>
        </div>

        {/* INEGI Data Badges */}
        {inegiData && inegiData.nearbyBusinessesCount !== undefined && inegiData.nearbyBusinessesCount > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="outline" className="gap-1.5 bg-muted/50 text-muted-foreground border-0">
              <Store className="w-3 h-3" />
              {inegiData.nearbyBusinessesCount} negocios cercanos
            </Badge>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-secondary rounded-lg p-2 text-center">
            <Eye className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-foreground font-bold text-xs">{property.viewsPerDay}</p>
          </div>
          <div className="bg-secondary rounded-lg p-2 text-center">
            <Users className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-foreground font-bold text-xs">{property.pointsOfInterest}</p>
          </div>
          <div className="bg-secondary rounded-lg p-2 text-center">
            <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-foreground font-bold text-xs">{property.peakHours}</p>
          </div>
          <div className="bg-secondary rounded-lg p-2 text-center">
            <Maximize className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-foreground font-bold text-xs">{property.size}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center">
          <div>
            <span className="text-foreground text-xl font-bold">{property.price}</span>
            <span className="text-muted-foreground text-sm">/mes</span>
          </div>
          <button 
            onClick={handleViewDetails}
            className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Ver Detalles
          </button>
        </div>
      </div>
    </article>
  );
};

export default SearchResultCard;
