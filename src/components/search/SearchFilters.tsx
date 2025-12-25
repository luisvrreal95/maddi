import React, { useState } from 'react';
import { ChevronDown, X, Layers, Car, AlertTriangle, MapPin, Gauge, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterProps {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onSelect: (values: string[]) => void;
  multiSelect?: boolean;
}

const FilterDropdown: React.FC<FilterProps> = ({
  label,
  options,
  selectedValues,
  onSelect,
  multiSelect = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (value: string) => {
    if (multiSelect) {
      if (selectedValues.includes(value)) {
        onSelect(selectedValues.filter(v => v !== value));
      } else {
        onSelect([...selectedValues, value]);
      }
    } else {
      onSelect([value]);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 ${
          selectedValues.length > 0
            ? 'bg-[#9BFF43] border-[#9BFF43] text-[#202020]'
            : 'bg-transparent border-white/20 text-white hover:border-white/40'
        }`}
      >
        <span className="text-sm font-medium">{label}</span>
        {selectedValues.length > 0 && (
          <span className="text-xs bg-[#202020] text-white px-1.5 py-0.5 rounded-full">
            {selectedValues.length}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-[#2A2A2A] rounded-xl border border-white/10 shadow-xl z-50 min-w-[200px] overflow-hidden">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                selectedValues.includes(option.value)
                  ? 'bg-[#9BFF43]/20 text-[#9BFF43]'
                  : 'text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded border ${
                  selectedValues.includes(option.value)
                    ? 'bg-[#9BFF43] border-[#9BFF43]'
                    : 'border-white/30'
                }`}>
                  {selectedValues.includes(option.value) && (
                    <svg className="w-4 h-4 text-[#202020]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {option.label}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Map Layer Types
export interface MapLayers {
  traffic: boolean;
  trafficHistory: boolean;
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

interface SearchFiltersProps {
  onFiltersChange: (filters: Record<string, string[]>) => void;
  // Map layer props
  mapLayers?: MapLayers;
  poiCategories?: POICategories;
  trafficHour?: number;
  onMapLayerChange?: (layer: keyof MapLayers, enabled: boolean) => void;
  onPOICategoryChange?: (category: keyof POICategories, enabled: boolean) => void;
  onTrafficHourChange?: (hour: number) => void;
  isLoadingLayers?: boolean;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({ 
  onFiltersChange,
  mapLayers,
  poiCategories,
  trafficHour = 8,
  onMapLayerChange,
  onPOICategoryChange,
  onTrafficHourChange,
  isLoadingLayers = false,
}) => {
  const [filters, setFilters] = useState<Record<string, string[]>>({
    availability: [],
    pointsOfInterest: [],
    traffic: [],
    peakHours: [],
    status: [],
    size: [],
    order: [],
  });

  const updateFilter = (key: string, values: string[]) => {
    const newFilters = { ...filters, [key]: values };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = Object.keys(filters).reduce((acc, key) => {
      acc[key] = [];
      return acc;
    }, {} as Record<string, string[]>);
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);
  const activeLayersCount = mapLayers ? Object.values(mapLayers).filter(Boolean).length : 0;

  const formatHour = (hour: number) => {
    if (hour === 0) return '12:00 AM';
    if (hour === 12) return '12:00 PM';
    if (hour < 12) return `${hour}:00 AM`;
    return `${hour - 12}:00 PM`;
  };

  return (
    <div className="flex flex-wrap items-center gap-3 py-4">
      {/* Map Layers Control - Only show if map layer props are provided */}
      {mapLayers && onMapLayerChange && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200 ${
                activeLayersCount > 0
                  ? 'bg-[#9BFF43] border-[#9BFF43] text-[#202020]'
                  : 'bg-transparent border-white/20 text-white hover:border-white/40'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="text-sm font-medium">Capas del Mapa</span>
              {activeLayersCount > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeLayersCount > 0 ? 'bg-[#202020] text-white' : 'bg-white/20'
                }`}>
                  {activeLayersCount}
                </span>
              )}
              <ChevronDown className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-80 bg-[#2A2A2A] border-white/10 p-0" 
            align="start"
            sideOffset={8}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-white font-semibold">Capas del Mapa</h4>
                  <p className="text-white/50 text-xs">Visualiza datos de TomTom</p>
                </div>
                {isLoadingLayers && (
                  <span className="w-2 h-2 bg-[#9BFF43] rounded-full animate-pulse" />
                )}
              </div>
              
              {/* Traffic Layer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <Car className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Tráfico en vivo</p>
                      <p className="text-white/50 text-xs">Tiempo real</p>
                    </div>
                  </div>
                  <Switch
                    checked={mapLayers.traffic}
                    onCheckedChange={(checked) => onMapLayerChange('traffic', checked)}
                    disabled={isLoadingLayers}
                  />
                </div>

                {/* Traffic History Layer */}
                <div className="py-2 border-t border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">Tráfico histórico</p>
                        <p className="text-white/50 text-xs">Patrones por hora</p>
                      </div>
                    </div>
                    <Switch
                      checked={mapLayers.trafficHistory}
                      onCheckedChange={(checked) => onMapLayerChange('trafficHistory', checked)}
                      disabled={isLoadingLayers}
                    />
                  </div>
                  
                  {/* Hour Selector - Only show when traffic history is enabled */}
                  {mapLayers.trafficHistory && onTrafficHourChange && (
                    <div className="mt-3 pl-11">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/70 text-xs">Hora del día</span>
                        <span className="text-[#9BFF43] text-xs font-medium">{formatHour(trafficHour)}</span>
                      </div>
                      <Slider
                        value={[trafficHour]}
                        onValueChange={(value) => onTrafficHourChange(value[0])}
                        min={0}
                        max={23}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-[10px] text-white/40 mt-1">
                        <span>12AM</span>
                        <span>6AM</span>
                        <span>12PM</span>
                        <span>6PM</span>
                        <span>11PM</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Incidents Layer */}
                <div className="flex items-center justify-between py-2 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Incidentes</p>
                      <p className="text-white/50 text-xs">Accidentes y cierres</p>
                    </div>
                  </div>
                  <Switch
                    checked={mapLayers.incidents}
                    onCheckedChange={(checked) => onMapLayerChange('incidents', checked)}
                    disabled={isLoadingLayers}
                  />
                </div>

                {/* Flow Layer */}
                <div className="flex items-center justify-between py-2 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Gauge className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">Flujo vehicular</p>
                      <p className="text-white/50 text-xs">Velocidad del tránsito</p>
                    </div>
                  </div>
                  <Switch
                    checked={mapLayers.flow}
                    onCheckedChange={(checked) => onMapLayerChange('flow', checked)}
                    disabled={isLoadingLayers}
                  />
                </div>

                {/* POIs Layer */}
                <div className="py-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#9BFF43]/20 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-[#9BFF43]" />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">Puntos de interés</p>
                        <p className="text-white/50 text-xs">Comercios cercanos</p>
                      </div>
                    </div>
                    <Switch
                      checked={mapLayers.pois}
                      onCheckedChange={(checked) => onMapLayerChange('pois', checked)}
                      disabled={isLoadingLayers}
                    />
                  </div>
                  
                  {/* POI Categories - Only show when POIs are enabled */}
                  {mapLayers.pois && poiCategories && onPOICategoryChange && (
                    <div className="mt-3 pl-11 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onPOICategoryChange('restaurants', !poiCategories.restaurants)}
                        className={`
                          px-3 py-1.5 rounded-lg text-xs font-medium transition-all
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
                          px-3 py-1.5 rounded-lg text-xs font-medium transition-all
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
                          px-3 py-1.5 rounded-lg text-xs font-medium transition-all
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
                          px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                          ${poiCategories.entertainment 
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                            : 'bg-white/5 text-white/50 border border-white/10 hover:border-white/20'
                          }
                        `}
                      >
                        🎬 Ocio
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Legend */}
            {(mapLayers.traffic || mapLayers.trafficHistory || mapLayers.flow) && (
              <div className="px-4 py-3 bg-white/5 border-t border-white/10">
                <p className="text-white/50 text-xs mb-2">Leyenda de tráfico</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 via-orange-500 to-red-600" />
                </div>
                <div className="flex justify-between text-[10px] text-white/40 mt-1">
                  <span>Fluido</span>
                  <span>Moderado</span>
                  <span>Lento</span>
                  <span>Detenido</span>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}

      <FilterDropdown
        label="Disponibilidad"
        options={[
          { label: 'Inmediata', value: 'immediate' },
          { label: 'Esta semana', value: 'this_week' },
          { label: 'Este mes', value: 'this_month' },
        ]}
        selectedValues={filters.availability}
        onSelect={(values) => updateFilter('availability', values)}
      />

      <FilterDropdown
        label="Puntos de Interés"
        options={[
          { label: 'Plazas comerciales', value: 'malls' },
          { label: 'Bancos', value: 'banks' },
          { label: 'Parques', value: 'parks' },
          { label: 'Escuelas', value: 'schools' },
          { label: 'Hospitales', value: 'hospitals' },
        ]}
        selectedValues={filters.pointsOfInterest}
        onSelect={(values) => updateFilter('pointsOfInterest', values)}
        multiSelect
      />

      <FilterDropdown
        label="Tráfico"
        options={[
          { label: 'Alto (+30,000)', value: 'high' },
          { label: 'Medio (15,000-30,000)', value: 'medium' },
          { label: 'Bajo (-15,000)', value: 'low' },
        ]}
        selectedValues={filters.traffic}
        onSelect={(values) => updateFilter('traffic', values)}
      />

      <FilterDropdown
        label="Horas Pico"
        options={[
          { label: '6am-9am', value: 'morning' },
          { label: '12pm-3pm', value: 'afternoon' },
          { label: '5pm-8pm', value: 'evening' },
        ]}
        selectedValues={filters.peakHours}
        onSelect={(values) => updateFilter('peakHours', values)}
      />

      <FilterDropdown
        label="Tamaño"
        options={[
          { label: 'Pequeño', value: 'small' },
          { label: 'Mediano', value: 'medium' },
          { label: 'Grande', value: 'large' },
        ]}
        selectedValues={filters.size}
        onSelect={(values) => updateFilter('size', values)}
      />

      <FilterDropdown
        label="Ordenar"
        options={[
          { label: 'Precio: Menor a Mayor', value: 'price_asc' },
          { label: 'Precio: Mayor a Menor', value: 'price_desc' },
          { label: 'Más visitas', value: 'views_desc' },
        ]}
        selectedValues={filters.order}
        onSelect={(values) => updateFilter('order', values)}
      />

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <X className="w-4 h-4" />
          <span className="text-sm">Limpiar</span>
        </button>
      )}
    </div>
  );
};

export default SearchFilters;
