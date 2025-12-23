import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Eye, Users, Clock, Maximize, Phone, Building2, User } from 'lucide-react';

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
  };
  isSelected: boolean;
  onClick: () => void;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({ property, isSelected, onClick }) => {
  const navigate = useNavigate();

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!property.id.startsWith('mock-')) {
      navigate(`/billboard/${property.id}`);
    }
  };

  return (
    <article
      onClick={onClick}
      className={`bg-[#1A1A1A] rounded-2xl p-5 cursor-pointer transition-all duration-300 border-2 ${
        isSelected
          ? 'border-[#9BFF43] shadow-[0_0_20px_rgba(155,255,67,0.2)]'
          : 'border-transparent hover:border-[#9BFF43] hover:shadow-[0_0_15px_rgba(155,255,67,0.15)]'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-white font-bold text-lg">{property.name}</h3>
          <div className="flex items-center gap-1 text-white/50 text-sm mt-1">
            <MapPin className="w-4 h-4" />
            <span className="line-clamp-1">{property.address}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#9BFF43] animate-pulse" />
          <span className="text-[#9BFF43] text-xs">{property.availability}</span>
        </div>
      </div>

      {/* Owner Info */}
      {property.owner && (
        <div className="bg-[#2A2A2A] rounded-lg p-3 mb-4">
          <p className="text-white/50 text-xs mb-2">Propietario</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#3A3A3A] flex items-center justify-center overflow-hidden">
              {property.owner.avatar_url ? (
                <img src={property.owner.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-white/50" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{property.owner.full_name}</p>
              {property.owner.company_name && (
                <div className="flex items-center gap-1 text-white/50 text-xs">
                  <Building2 className="w-3 h-3" />
                  <span className="truncate">{property.owner.company_name}</span>
                </div>
              )}
            </div>
            {property.owner.phone && (
              <a 
                href={`tel:${property.owner.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[#9BFF43] text-xs hover:underline"
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
        <div className="bg-[#2A2A2A] rounded-lg p-2 text-center">
          <Eye className="w-4 h-4 text-[#9BFF43] mx-auto mb-1" />
          <p className="text-white font-bold text-xs">{property.viewsPerDay}</p>
        </div>
        <div className="bg-[#2A2A2A] rounded-lg p-2 text-center">
          <Users className="w-4 h-4 text-[#9BFF43] mx-auto mb-1" />
          <p className="text-white font-bold text-xs">{property.pointsOfInterest}</p>
        </div>
        <div className="bg-[#2A2A2A] rounded-lg p-2 text-center">
          <Clock className="w-4 h-4 text-[#9BFF43] mx-auto mb-1" />
          <p className="text-white font-bold text-xs">{property.peakHours}</p>
        </div>
        <div className="bg-[#2A2A2A] rounded-lg p-2 text-center">
          <Maximize className="w-4 h-4 text-[#9BFF43] mx-auto mb-1" />
          <p className="text-white font-bold text-xs">{property.size}</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-white text-xl font-bold">{property.price}</span>
          <span className="text-white/50 text-sm">/mes</span>
        </div>
        <button 
          onClick={handleViewDetails}
          className="px-6 py-2 rounded-full bg-[#9BFF43] text-[#1A1A1A] font-semibold text-sm hover:bg-[#8AE63A] transition-colors"
        >
          Ver Detalles
        </button>
      </div>
    </article>
  );
};

export default SearchResultCard;
