import React from 'react';
import type { MapLayers } from './MapLayerControls';

interface MapLegendProps {
  layers: MapLayers;
}

const MapLegend: React.FC<MapLegendProps> = ({ layers }) => {
  const hasActiveLayers = Object.values(layers).some(Boolean);
  
  if (!hasActiveLayers) return null;

  return (
    <div className="bg-[#2A2A2A]/95 backdrop-blur-sm rounded-lg border border-white/10 p-3 space-y-2">
      <h5 className="text-white/70 text-xs font-medium uppercase tracking-wide mb-2">
        Leyenda
      </h5>
      
      {layers.traffic && (
        <div className="space-y-1.5">
          <p className="text-white/50 text-xs">Tráfico</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-600" />
          </div>
          <div className="flex justify-between text-[10px] text-white/40">
            <span>Fluido</span>
            <span>Lento</span>
            <span>Detenido</span>
          </div>
        </div>
      )}

      {layers.flow && (
        <div className="space-y-1">
          <p className="text-white/50 text-xs">Velocidad</p>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-green-500" /> &gt;60 km/h
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-yellow-500" /> 30-60
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-red-500" /> &lt;30
            </span>
          </div>
        </div>
      )}

      {layers.incidents && (
        <div className="flex items-center gap-2 text-[10px] text-white/50">
          <span className="w-3 h-3 bg-amber-500 rounded-full flex items-center justify-center text-[8px]">⚠</span>
          <span>Incidentes de tráfico</span>
        </div>
      )}

      {layers.pois && (
        <div className="flex flex-wrap gap-2 text-[10px] text-white/50">
          <span>🍽️ Restaurantes</span>
          <span>🛍️ Comercio</span>
          <span>⛽ Gas</span>
          <span>🎬 Ocio</span>
        </div>
      )}
    </div>
  );
};

export default MapLegend;
