import React from 'react';
import { MapPin, Eye, Users, Clock, Maximize } from 'lucide-react';

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
  };
  isSelected: boolean;
  onClick: () => void;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({ property, isSelected, onClick }) => {
  return (
    <article
      onClick={onClick}
      className={`bg-[#1A1A1A] rounded-2xl p-5 cursor-pointer transition-all duration-300 border-2 ${
        isSelected
          ? 'border-[#9BFF43] shadow-[0_0_20px_rgba(155,255,67,0.2)]'
          : 'border-transparent hover:border-white/10'
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
        <button className="px-6 py-2 rounded-full bg-[#9BFF43] text-[#1A1A1A] font-semibold text-sm hover:bg-[#8AE63A] transition-colors">
          Ver Detalles
        </button>
      </div>
    </article>
  );
};

export default SearchResultCard;
