import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { FACINGS, getFacing } from '@/lib/billboardFaces';
import { cn } from '@/lib/utils';

interface FacingPickerProps {
  latitude: number;
  longitude: number;
  mapboxToken: string;
  value: string | null;
  onChange: (key: string) => void;
  /** Cara ya existente (se muestra en gris como referencia) */
  otherFace?: { label: string; facing: string | null };
  currentLabel: string;
}

const R = 118; // radio de los botones (px)

const FacingPicker: React.FC<FacingPickerProps> = ({ latitude, longitude, mapboxToken, value, onChange, otherFace, currentLabel }) => {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!el.current || !mapboxToken || !isFinite(latitude) || !isFinite(longitude)) return;
    mapboxgl.accessToken = mapboxToken;
    const m = new mapboxgl.Map({
      container: el.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [longitude, latitude],
      zoom: 17,
      interactive: false,
      attributionControl: false,
    });
    map.current = m;
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(el.current);
    const t = setTimeout(() => m.resize(), 350);
    return () => { clearTimeout(t); ro.disconnect(); m.remove(); map.current = null; };
  }, [latitude, longitude, mapboxToken]);

  const other = getFacing(otherFace?.facing);
  const cur = getFacing(value);

  // cono SVG centrado en (0,0) apuntando al rumbo
  const cone = (bearing: number, fill: string, stroke: string, dashed?: boolean) => (
    <g transform={`rotate(${bearing})`}>
      <path d="M0 0 L-34 -92 L34 -92 Z" fill={fill} stroke={stroke} strokeWidth={dashed ? 1.5 : 2} strokeDasharray={dashed ? '4 4' : undefined} />
    </g>
  );

  return (
    <div className="relative w-full h-[300px] rounded-2xl overflow-hidden border border-border bg-secondary select-none">
      <div className="absolute inset-0"><div ref={el} className="w-full h-full" /></div>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="-210 -150 420 300" preserveAspectRatio="xMidYMid meet">
        {other && cone(other.bearing, 'rgba(51,65,58,0.22)', 'rgba(51,65,58,0.5)', true)}
        {cur && cone(cur.bearing, 'rgba(155,255,67,0.55)', '#4FA800')}
        <circle r="9" fill="#111" />
        <circle r="3.5" fill="#9BFF43" />
      </svg>
      <div className="absolute right-3 bottom-3 flex flex-col rounded-xl overflow-hidden border border-[#CBD6CF] bg-white shadow-sm">
        <button type="button" aria-label="Acercar" onClick={() => map.current?.zoomIn({ duration: 250 })} className="w-9 h-9 text-lg font-semibold text-[#111] hover:bg-[#EEF3F0]">+</button>
        <button type="button" aria-label="Alejar" onClick={() => map.current?.zoomOut({ duration: 250 })} className="w-9 h-9 text-lg font-semibold text-[#111] border-t border-[#CBD6CF] hover:bg-[#EEF3F0]">−</button>
      </div>
      {FACINGS.map((f) => {
        const rad = (f.bearing * Math.PI) / 180;
        const x = Math.sin(rad) * R;
        const y = -Math.cos(rad) * R * 0.95;
        const selected = value === f.key;
        const isOther = other?.key === f.key;
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onChange(f.key)}
            aria-label={`Mira al ${f.label}`}
            aria-pressed={selected}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 font-bold flex items-center justify-center transition-all shadow-sm',
              selected
                ? 'w-10 h-10 text-xs bg-[#9BFF43] border-[#111] text-[#111] ring-4 ring-[#9BFF43]/40'
                : isOther
                  ? 'w-8 h-8 text-[11px] bg-[#33413a] border-[#33413a] text-white'
                  : 'w-8 h-8 text-[11px] bg-white border-[#CBD6CF] text-[#111] hover:border-[#111]'
            )}
            style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)` }}
          >
            {selected ? currentLabel.replace('Cara ', '') : isOther ? (otherFace?.label || '').replace('Cara ', '') : f.short}
          </button>
        );
      })}
    </div>
  );
};

export default FacingPicker;
