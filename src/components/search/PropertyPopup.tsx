import React from 'react';
import { X, MapPin, Eye, Users, Clock } from 'lucide-react';

interface PropertyPopupProps {
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
  onClose: () => void;
  onReserve: () => void;
}

const PropertyPopup: React.FC<PropertyPopupProps> = ({ property, onClose, onReserve }) => {
  return (
    <div className="bg-[#1A1A1A] rounded-2xl overflow-hidden shadow-2xl w-[350px] border border-white/10">
      {/* Header */}
      <div className="relative h-32 bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-[#9BFF43]/20 rounded-full flex items-center justify-center mx-auto mb-2">
            <MapPin className="w-6 h-6 text-[#9BFF43]" />
          </div>
          <h3 className="text-white font-bold text-lg">{property.name}</h3>
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Location */}
        <div className="mb-4">
          <p className="text-[#9BFF43] font-semibold text-sm mb-1">Ubicación</p>
          <p className="text-white/60 text-sm">{property.address}</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#2A2A2A] rounded-xl p-3 text-center">
            <Eye className="w-5 h-5 text-[#9BFF43] mx-auto mb-1" />
            <p className="text-white font-bold text-sm">{property.viewsPerDay}</p>
            <p className="text-white/50 text-[10px]">Vistas/Día</p>
          </div>
          <div className="bg-[#2A2A2A] rounded-xl p-3 text-center">
            <Users className="w-5 h-5 text-[#9BFF43] mx-auto mb-1" />
            <p className="text-white font-bold text-sm">{property.pointsOfInterest}</p>
            <p className="text-white/50 text-[10px]">P. Interés</p>
          </div>
          <div className="bg-[#2A2A2A] rounded-xl p-3 text-center">
            <Clock className="w-5 h-5 text-[#9BFF43] mx-auto mb-1" />
            <p className="text-white font-bold text-sm">{property.peakHours}</p>
            <p className="text-white/50 text-[10px]">Horas Pico</p>
          </div>
        </div>

        {/* Details */}
        <div className="flex justify-between items-center mb-4 text-sm">
          <div>
            <span className="text-white/50">Tamaño:</span>
            <span className="text-white ml-2">{property.size}</span>
          </div>
          <div>
            <span className="text-white/50">Status:</span>
            <span className="text-[#9BFF43] ml-2">{property.status}</span>
          </div>
        </div>

        {/* Price */}
        <div className="bg-[#2A2A2A] rounded-xl py-3 px-4 text-center mb-4">
          <span className="text-white text-2xl font-bold">{property.price}</span>
          <span className="text-white/50 text-sm">/mes</span>
        </div>

        {/* Availability Badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-[#9BFF43] animate-pulse" />
          <span className="text-[#9BFF43] text-sm">Disponibilidad: {property.availability}</span>
        </div>

        {/* Reserve Button */}
        <button
          onClick={onReserve}
          className="w-full py-4 rounded-full bg-[#9BFF43] text-[#1A1A1A] font-bold text-base hover:bg-[#8AE63A] transition-colors"
        >
          Reservar
        </button>
      </div>
    </div>
  );
};

export default PropertyPopup;
