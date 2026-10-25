import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getFacing, facingText } from '@/lib/billboardFaces';
import { cn } from '@/lib/utils';

export interface FaceOption {
  id: string;
  label: string;
  facing: string | null;
  price: number;
  image_url?: string | null;
  available: boolean;
}

interface Props {
  latitude: number;
  longitude: number;
  mapboxToken: string;
  faces: FaceOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}

/** Mapa arrastable con zoom + una tarjeta por cara para elegir cuál reservar. */
const FaceSelector: React.FC<Props> = ({ latitude, longitude, mapboxToken, faces, selectedId, onSelect }) => {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!el.current || !mapboxToken || !isFinite(latitude) || !isFinite(longitude)) return;
    mapboxgl.accessToken = mapboxToken;
    const m = new mapboxgl.Map({
      container: el.current, style: 'mapbox://styles/mapbox/light-v11',
      center: [longitude, latitude], zoom: 17, attributionControl: false,
      dragRotate: false, pitchWithRotate: false, touchPitch: false,
    });
    m.touchZoomRotate.disableRotation();
    map.current = m;
    const ro = new ResizeObserver(() => m.resize());
    ro.observe(el.current);
    const t = setTimeout(() => m.resize(), 350);
    return () => { clearTimeout(t); ro.disconnect(); markers.current.forEach(x => x.remove()); markers.current = []; m.remove(); map.current = null; };
  }, [latitude, longitude, mapboxToken]);

  // Dibuja el punto del espectacular y un cono por cara
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach(x => x.remove());
    markers.current = [];
    const add = (node: HTMLElement) => {
      markers.current.push(new mapboxgl.Marker({ element: node, anchor: 'center' }).setLngLat([longitude, latitude]).addTo(m));
    };
    faces.forEach(f => {
      const fc = getFacing(f.facing);
      if (!fc) return;
      const sel = f.id === selectedId;
      const wrap = document.createElement('div');
      wrap.style.cssText = 'width:0;height:0;position:relative;pointer-events:none;';
      const cone = document.createElement('div');
      cone.style.cssText = `position:absolute;left:-40px;top:-96px;width:80px;height:96px;transform-origin:40px 96px;transform:rotate(${fc.bearing}deg);pointer-events:none;`;
      cone.innerHTML = `<svg width="80" height="96" viewBox="0 0 80 96"><path d="M40 96 L2 4 L78 4 Z" fill="${sel ? 'rgba(155,255,67,0.55)' : 'rgba(51,65,58,0.2)'}" stroke="${sel ? '#4FA800' : 'rgba(51,65,58,0.5)'}" stroke-width="${sel ? 2 : 1.5}" ${sel ? '' : 'stroke-dasharray="4 4"'}/></svg>`;
      wrap.appendChild(cone);
      const rad = (fc.bearing * Math.PI) / 180;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = f.label.replace(/^Cara\s*/i, '');
      btn.style.cssText = `position:absolute;left:${Math.sin(rad) * 80 - 15}px;top:${-Math.cos(rad) * 80 - 15}px;width:30px;height:30px;border-radius:999px;font:700 12px Poppins,sans-serif;cursor:pointer;pointer-events:auto;border:2px solid ${sel ? '#111' : '#CBD6CF'};background:${sel ? '#9BFF43' : '#fff'};color:#111;box-shadow:${sel ? '0 0 0 4px rgba(155,255,67,0.35)' : 'none'};`;
      btn.onclick = (e) => { e.stopPropagation(); onSelectRef.current(f.id); };
      wrap.appendChild(btn);
      add(wrap);
    });
    const dot = document.createElement('div');
    dot.style.cssText = 'width:16px;height:16px;border-radius:999px;background:#111;border:4px solid #9BFF43;box-sizing:border-box;pointer-events:none;';
    add(dot);
  }, [faces, selectedId, latitude, longitude]);

  return (
    <div className="space-y-3">
      <div className="relative h-[240px] rounded-2xl overflow-hidden border border-white/10 bg-secondary">
        <div className="absolute inset-0"><div ref={el} className="w-full h-full" /></div>
        <div className="absolute right-3 bottom-3 flex flex-col rounded-xl overflow-hidden border border-[#CBD6CF] bg-white shadow-sm">
          <button type="button" aria-label="Acercar" onClick={() => map.current?.zoomIn({ duration: 250 })} className="w-9 h-9 text-lg font-semibold text-[#111] hover:bg-[#EEF3F0]">+</button>
          <button type="button" aria-label="Alejar" onClick={() => map.current?.zoomOut({ duration: 250 })} className="w-9 h-9 text-lg font-semibold text-[#111] border-t border-[#CBD6CF] hover:bg-[#EEF3F0]">−</button>
        </div>
      </div>
      <div className={cn('grid gap-2', faces.length > 2 ? 'grid-cols-3' : 'grid-cols-2')}>
        {faces.map(f => {
          const sel = f.id === selectedId;
          return (
            <button key={f.id} type="button" onClick={() => onSelect(f.id)}
              className={cn('rounded-xl border p-2.5 text-left transition-colors', sel ? 'border-primary bg-primary/10' : 'border-white/10 hover:bg-white/5')}>
              <div className="flex items-center gap-2">
                {f.image_url ? <img src={f.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" /> : null}
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{f.label}</p>
                  <p className="text-white/50 text-[11px] truncate">{facingText(f.facing) || 'Orientación por confirmar'}</p>
                </div>
              </div>
              <p className="text-white text-xs font-medium mt-1.5">${Number(f.price).toLocaleString()}/mes</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FaceSelector;
