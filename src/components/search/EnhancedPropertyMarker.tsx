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
      color: '#7BD61A', // lime (darker for light map)
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
  isInCompare: boolean = false,
  faceCount: number = 1
): HTMLDivElement => {
  const traffic = getTrafficLevel(viewsPerDay);
  const el = document.createElement('div');
  el.className = 'custom-marker';
  el.style.zIndex = isSelected ? '10' : '1';

  const bg = isSelected ? '#0B120E' : '#FFFFFF';
  const fg = isSelected ? '#FFFFFF' : '#111111';
  const border = isInCompare ? '#4FA800' : isSelected ? '#0B120E' : '#CBD6CF';
  const dot = isSelected ? '#9BFF43' : traffic.color;
  const glow = isSelected || isInCompare ? '0 0 0 5px rgba(155,255,67,0.45), 0 8px 24px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.18)';
  const check = isInCompare
    ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:9999px;background:#9BFF43;color:#07110B;font-size:9px;line-height:1;font-weight:800;">✓</span>`
    : '';

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:9999px;cursor:pointer;font-family:Poppins,system-ui,sans-serif;font-size:12px;font-weight:600;white-space:nowrap;background:${bg};color:${fg};border:1.5px solid ${border};box-shadow:${glow};transform:scale(${isSelected ? 1.12 : 1});transition:transform .2s ease, box-shadow .2s ease;">
      <span style="width:8px;height:8px;border-radius:9999px;background:${dot};flex:none;"></span>
      <span>${formatViews(viewsPerDay)}</span>
      ${check}
      ${faceCount > 1 ? `<span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:9999px;background:${isSelected ? '#9BFF43' : '#EEF3F0'};color:#07110B;">${faceCount} caras</span>` : ''}
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
        background: isSelected ? '#0B120E' : '#FFFFFF',
        color: isSelected ? '#FFFFFF' : '#111111',
        borderColor: isSelected ? '#0B120E' : isCompareMode && isInCompare ? '#4FA800' : '#CBD6CF',
      }}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: isSelected ? '#9BFF43' : traffic.color }} />
      {formatViews(viewsPerDay)}
    </div>
  );
};

export { getTrafficLevel, formatViews };
export default EnhancedPropertyMarker;
