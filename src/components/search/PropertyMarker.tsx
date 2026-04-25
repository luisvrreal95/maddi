import React from 'react';

interface PropertyMarkerProps {
  viewsPerDay: string;
  isSelected: boolean;
  onClick: () => void;
}

const PropertyMarker: React.FC<PropertyMarkerProps> = ({ viewsPerDay, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center transition-transform duration-200 ${
        isSelected ? 'scale-110 z-10' : 'hover:scale-105'
      }`}
    >
      <div
        className={`relative flex flex-col items-center justify-center rounded-full transition-all duration-300 ${
          isSelected
            ? 'w-20 h-20 bg-primary shadow-[0_0_30px_rgba(155,255,67,0.5)]'
            : 'w-16 h-16 bg-muted border-2 border-primary/50 hover:border-primary'
        }`}
      >
        <span className={`text-xs font-bold ${isSelected ? 'text-[#202020]' : 'text-white'}`}>
          {viewsPerDay}
        </span>
        <span className={`text-[8px] ${isSelected ? 'text-[#202020]/70' : 'text-white/50'}`}>
          VISTAS/DÍA
        </span>
      </div>
    </button>
  );
};

export default PropertyMarker;
