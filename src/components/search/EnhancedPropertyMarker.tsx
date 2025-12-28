import React from 'react';

interface EnhancedPropertyMarkerProps {
  viewsPerDay: number;
  isSelected: boolean;
  isCompareMode?: boolean;
  isInCompare?: boolean;
}

// Get traffic level based on views per day
const getTrafficLevel = (views: number): { level: string; color: string; bgColor: string; glowColor: string } => {
  if (views >= 50000) {
    return { 
      level: 'alto', 
      color: '#10B981', // green
      bgColor: 'bg-emerald-500',
      glowColor: 'rgba(16, 185, 129, 0.5)'
    };
  } else if (views >= 25000) {
    return { 
      level: 'medio-alto', 
      color: '#9BFF43', // lime
      bgColor: 'bg-[#9BFF43]',
      glowColor: 'rgba(155, 255, 67, 0.5)'
    };
  } else if (views >= 10000) {
    return { 
      level: 'medio', 
      color: '#FBBF24', // yellow
      bgColor: 'bg-amber-400',
      glowColor: 'rgba(251, 191, 36, 0.5)'
    };
  } else {
    return { 
      level: 'bajo', 
      color: '#F97316', // orange
      bgColor: 'bg-orange-500',
      glowColor: 'rgba(249, 115, 22, 0.5)'
    };
  }
};

const formatViews = (views: number): string => {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(0)}K`;
  }
  return views.toString();
};

export const createMarkerElement = (
  viewsPerDay: number,
  isSelected: boolean,
  isCompareMode: boolean = false,
  isInCompare: boolean = false
): HTMLDivElement => {
  const traffic = getTrafficLevel(viewsPerDay);
  const el = document.createElement('div');
  el.className = 'custom-marker';
  
  const compareRing = isCompareMode && isInCompare 
    ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-[#202020]' 
    : '';
  
  const checkmark = isInCompare 
    ? `<div class="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
         <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
         </svg>
       </div>`
    : '';

  el.innerHTML = `
    <div class="flex flex-col items-center cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-110' : 'hover:scale-105'}">
      <div class="relative flex flex-col items-center justify-center rounded-full transition-all duration-300 ${compareRing} ${
        isSelected
          ? `w-20 h-20 shadow-[0_0_30px_${traffic.glowColor}]`
          : 'w-16 h-16 border-2'
      }" style="background-color: ${isSelected ? traffic.color : '#2A2A2A'}; border-color: ${traffic.color}80;">
        ${checkmark}
        <span class="text-xs font-bold ${isSelected ? 'text-[#202020]' : 'text-white'}">${formatViews(viewsPerDay)}</span>
        <span class="text-[8px] ${isSelected ? 'text-[#202020]/70' : 'text-white/50'}">VISTAS/DÍA</span>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[6px] font-bold uppercase" style="background-color: ${traffic.color}; color: #202020;">
          ${traffic.level}
        </div>
      </div>
    </div>
  `;
  
  return el;
};

const EnhancedPropertyMarker: React.FC<EnhancedPropertyMarkerProps> = ({ 
  viewsPerDay, 
  isSelected,
  isCompareMode = false,
  isInCompare = false
}) => {
  const traffic = getTrafficLevel(viewsPerDay);
  
  return (
    <div className={`flex flex-col items-center cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-110' : 'hover:scale-105'}`}>
      <div
        className={`relative flex flex-col items-center justify-center rounded-full transition-all duration-300 ${
          isCompareMode && isInCompare ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-[#202020]' : ''
        } ${
          isSelected
            ? 'w-20 h-20'
            : 'w-16 h-16 border-2'
        }`}
        style={{
          backgroundColor: isSelected ? traffic.color : '#2A2A2A',
          borderColor: `${traffic.color}80`,
          boxShadow: isSelected ? `0 0 30px ${traffic.glowColor}` : undefined
        }}
      >
        {isInCompare && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        <span className={`text-xs font-bold ${isSelected ? 'text-[#202020]' : 'text-white'}`}>
          {formatViews(viewsPerDay)}
        </span>
        <span className={`text-[8px] ${isSelected ? 'text-[#202020]/70' : 'text-white/50'}`}>
          VISTAS/DÍA
        </span>
        <div 
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[6px] font-bold uppercase"
          style={{ backgroundColor: traffic.color, color: '#202020' }}
        >
          {traffic.level}
        </div>
      </div>
    </div>
  );
};

export { getTrafficLevel, formatViews };
export default EnhancedPropertyMarker;
