import React from 'react';
import { Car, AlertTriangle, MapPin, Gauge, Layers } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export interface MapLayers {
  traffic: boolean;
  incidents: boolean;
  pois: boolean;
  flow: boolean;
}

export interface POICategories {
  restaurants: boolean;
  shopping: boolean;
  gasStations: boolean;
  entertainment: boolean;
}

interface MapLayerControlsProps {
  layers: MapLayers;
  poiCategories: POICategories;
  onLayerChange: (layer: keyof MapLayers, enabled: boolean) => void;
  onPOICategoryChange: (category: keyof POICategories, enabled: boolean) => void;
  isLoading?: boolean;
}

const MapLayerControls: React.FC<MapLayerControlsProps> = ({
  layers,
  poiCategories,
  onLayerChange,
  onPOICategoryChange,
  isLoading = false,
}) => {
  const activeLayersCount = Object.values(layers).filter(Boolean).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg
            bg-[#2A2A2A] border border-white/10 
            hover:border-[#9BFF43]/50 transition-all duration-200
            ${activeLayersCount > 0 ? 'border-[#9BFF43]/30' : ''}
          `}
        >
          <Layers className="w-4 h-4 text-[#9BFF43]" />
          <span className="text-white text-sm font-medium">Capas</span>
          {activeLayersCount > 0 && (
            <span className="bg-[#9BFF43] text-[#202020] text-xs font-bold px-1.5 py-0.5 rounded-full">
              {activeLayersCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 bg-[#2A2A2A] border-white/10 p-0" 
        align="start"
        sideOffset={8}
      >
        <div className="p-4">
          <h4 className="text-white font-semibold mb-1">Capas del Mapa</h4>
          <p className="text-white/50 text-xs mb-4">Visualiza datos de TomTom en tiempo real</p>
          
          {/* Traffic Layer */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Car className="w-4 h-4 text-red-400" />
                </div>
                <div>
                  <Label className="text-white text-sm font-medium">Tráfico</Label>
                  <p className="text-white/50 text-xs">Tiempo real e histórico</p>
                </div>
              </div>
              <Switch
                checked={layers.traffic}
                onCheckedChange={(checked) => onLayerChange('traffic', checked)}
                disabled={isLoading}
              />
            </div>

            {/* Incidents Layer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <Label className="text-white text-sm font-medium">Incidentes</Label>
                  <p className="text-white/50 text-xs">Accidentes y cierres</p>
                </div>
              </div>
              <Switch
                checked={layers.incidents}
                onCheckedChange={(checked) => onLayerChange('incidents', checked)}
                disabled={isLoading}
              />
            </div>

            {/* Flow Layer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Gauge className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <Label className="text-white text-sm font-medium">Flujo vehicular</Label>
                  <p className="text-white/50 text-xs">Velocidad del tránsito</p>
                </div>
              </div>
              <Switch
                checked={layers.flow}
                onCheckedChange={(checked) => onLayerChange('flow', checked)}
                disabled={isLoading}
              />
            </div>

            {/* POIs Layer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#9BFF43]/20 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-[#9BFF43]" />
                </div>
                <div>
                  <Label className="text-white text-sm font-medium">Puntos de interés</Label>
                  <p className="text-white/50 text-xs">Comercios y servicios</p>
                </div>
              </div>
              <Switch
                checked={layers.pois}
                onCheckedChange={(checked) => onLayerChange('pois', checked)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* POI Categories - Only show when POIs are enabled */}
          {layers.pois && (
            <>
              <Separator className="my-4 bg-white/10" />
              <div className="space-y-3">
                <h5 className="text-white/70 text-xs font-medium uppercase tracking-wide">
                  Categorías de POIs
                </h5>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onPOICategoryChange('restaurants', !poiCategories.restaurants)}
                    className={`
                      px-3 py-2 rounded-lg text-xs font-medium transition-all
                      ${poiCategories.restaurants 
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                        : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    🍽️ Restaurantes
                  </button>
                  
                  <button
                    onClick={() => onPOICategoryChange('shopping', !poiCategories.shopping)}
                    className={`
                      px-3 py-2 rounded-lg text-xs font-medium transition-all
                      ${poiCategories.shopping 
                        ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' 
                        : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    🛍️ Comercio
                  </button>
                  
                  <button
                    onClick={() => onPOICategoryChange('gasStations', !poiCategories.gasStations)}
                    className={`
                      px-3 py-2 rounded-lg text-xs font-medium transition-all
                      ${poiCategories.gasStations 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    ⛽ Gasolineras
                  </button>
                  
                  <button
                    onClick={() => onPOICategoryChange('entertainment', !poiCategories.entertainment)}
                    className={`
                      px-3 py-2 rounded-lg text-xs font-medium transition-all
                      ${poiCategories.entertainment 
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                        : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/20'
                      }
                    `}
                  >
                    🎬 Entretenimiento
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {isLoading && (
          <div className="px-4 py-2 bg-[#9BFF43]/10 border-t border-white/10">
            <p className="text-[#9BFF43] text-xs flex items-center gap-2">
              <span className="w-2 h-2 bg-[#9BFF43] rounded-full animate-pulse" />
              Cargando datos...
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default MapLayerControls;
