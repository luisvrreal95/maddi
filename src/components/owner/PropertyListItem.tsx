import React from 'react';
import { Billboard } from '@/hooks/useBillboards';

interface PropertyListItemProps {
  billboard: Billboard;
  onClick?: () => void;
}

const PropertyListItem: React.FC<PropertyListItemProps> = ({ billboard, onClick }) => {
  return (
    <div 
      className="bg-[#1E1E1E] rounded-xl border border-[#9BFF43]/30 p-4 cursor-pointer hover:border-[#9BFF43]/60 hover:shadow-[0_0_20px_rgba(155,255,67,0.1)] transition-all"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-bold text-white">{billboard.title}</h4>
        <span className="flex items-center gap-1 text-[#9BFF43] text-sm">
          <span className="w-2 h-2 rounded-full bg-[#9BFF43]"></span>
          {billboard.is_available ? 'Inmediata' : 'Ocupado'}
        </span>
      </div>
      <p className="text-white/50 text-sm mb-3">
        {billboard.address}, {billboard.city}, {billboard.state}
      </p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-white">
            ${billboard.price_per_month.toLocaleString()}
          </span>
          <span className="text-white/50 text-sm">/mes</span>
        </div>
        <span className="text-[#9BFF43] text-sm font-medium">0.39% ↑</span>
      </div>
    </div>
  );
};

export default PropertyListItem;