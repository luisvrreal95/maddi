import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Eye, Users, Clock, Maximize, Phone, Building2, User, Check, Star } from 'lucide-react';
import FavoriteHeartButton from './FavoriteHeartButton';

interface OwnerInfo {
  full_name: string;
  company_name: string | null;
  phone: string | null;
  avatar_url: string | null;
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
  };
  isSelected: boolean;
  onClick: () => void;
  isInCompare?: boolean;
  onToggleCompare?: (id: string) => void;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({ 
  property, 
  isSelected, 
  onClick,
  isInCompare = false,
  onToggleCompare
}) => {
  const navigate = useNavigate();

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

  return (
    <article
      onClick={onClick}
      className={`bg-card rounded-2xl p-5 cursor-pointer transition-all duration-300 border-2 ${
        isSelected
          ? 'border-primary shadow-[0_0_20px_rgba(155,255,67,0.2)]'
          : 'border-transparent hover:border-primary hover:shadow-[0_0_15px_rgba(155,255,67,0.15)]'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
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
          <FavoriteHeartButton billboardId={property.id} />
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-xs">{property.availability}</span>
          </div>
        </div>
      </div>

      {/* Owner Info */}
      {property.owner && (
        <div className="bg-secondary rounded-lg p-3 mb-4">
          <p className="text-muted-foreground text-xs mb-2">Propietario</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {property.owner.avatar_url ? (
                <img src={property.owner.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium text-sm truncate">{property.owner.full_name}</p>
              {property.owner.company_name && (
                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Building2 className="w-3 h-3" />
                  <span className="truncate">{property.owner.company_name}</span>
                </div>
              )}
            </div>
            {property.owner.phone && (
              <a 
                href={`tel:${property.owner.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-primary text-xs hover:underline"
              >
                <Phone className="w-3 h-3" />
                <span>{property.owner.phone}</span>
              </a>
            )}
          </div>
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
    </article>
  );
};

export default SearchResultCard;
