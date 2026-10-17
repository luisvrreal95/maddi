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
      bgColor: 'bg-primary',
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
  el.style.zIndex = isSelected ? '10' : '1';

  const bg = isSelected ? '#9BFF43' : 'rgba(5,11,8,0.92)';
  const fg = isSelected ? '#07110B' : '#F2F7F3';
  const border = isInCompare ? '#9BFF43' : isSelected ? '#9BFF43' : 'rgba(255,255,255,0.18)';
  const dot = isSelected ? '#07110B' : traffic.color;
  const glow = isSelected || isInCompare ? '0 0 0 4px rgba(155,255,67,0.22), 0 6px 20px rgba(155,255,67,0.35)' : '0 4px 14px rgba(0,0,0,0.5)';
  const check = isInCompare
    ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:9999px;background:${isSelected ? '#07110B' : '#9BFF43'};color:${isSelected ? '#9BFF43' : '#07110B'};font-size:9px;line-height:1;font-weight:800;">✓</span>`
    : '';

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:9999px;cursor:pointer;font-family:Poppins,system-ui,sans-serif;font-size:12px;font-weight:600;white-space:nowrap;background:${bg};color:${fg};border:1.5px solid ${border};box-shadow:${glow};backdrop-filter:blur(6px);transform:scale(${isSelected ? 1.12 : 1});transition:transform .2s ease, box-shadow .2s ease;">
      <span style="width:8px;height:8px;border-radius:9999px;background:${dot};flex:none;"></span>
      <span>${formatViews(viewsPerDay)}</span>
      ${check}
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
    <div
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-1.5 text-xs font-semibold"
      style={{
        background: isSelected ? '#9BFF43' : 'rgba(5,11,8,0.92)',
        color: isSelected ? '#07110B' : '#F2F7F3',
        borderColor: isSelected || (isCompareMode && isInCompare) ? '#9BFF43' : 'rgba(255,255,255,0.18)',
      }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: isSelected ? '#07110B' : traffic.color }} />
      {formatViews(viewsPerDay)}
    </div>
  );
};

export { getTrafficLevel, formatViews };
export default EnhancedPropertyMarker;
