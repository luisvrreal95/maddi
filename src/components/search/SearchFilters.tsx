import React, { useState } from 'react';
import { ChevronDown, X, DollarSign, Lightbulb, LayoutGrid } from 'lucide-react';

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
    size: [],
    priceRange: [],
    illumination: [],
    billboardType: [],
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
      {/* Price Range Filter */}
      <FilterDropdown
        label="Precio"
        options={[
          { label: 'Económico (-$10,000)', value: 'budget' },
          { label: 'Estándar ($10,000-$25,000)', value: 'standard' },
          { label: 'Premium ($25,000-$50,000)', value: 'premium' },
          { label: 'Exclusivo (+$50,000)', value: 'exclusive' },
        ]}
        selectedValues={filters.priceRange}
        onSelect={(values) => updateFilter('priceRange', values)}
        multiSelect
      />

      <FilterDropdown
        label="Tráfico"
        options={[
          { label: 'Alto (+30,000 vistas/día)', value: 'high' },
          { label: 'Medio (15,000-30,000)', value: 'medium' },
          { label: 'Bajo (-15,000)', value: 'low' },
        ]}
        selectedValues={filters.traffic}
        onSelect={(values) => updateFilter('traffic', values)}
        multiSelect
      />

      <FilterDropdown
        label="Tamaño"
        options={[
          { label: 'Pequeño (-20m²)', value: 'small' },
          { label: 'Mediano (20-50m²)', value: 'medium' },
          { label: 'Grande (+50m²)', value: 'large' },
        ]}
        selectedValues={filters.size}
        onSelect={(values) => updateFilter('size', values)}
        multiSelect
      />

      {/* Billboard Type Filter */}
      <FilterDropdown
        label="Tipo"
        options={[
          { label: 'Espectacular', value: 'spectacular' },
          { label: 'Mural', value: 'mural' },
          { label: 'Puente', value: 'bridge' },
          { label: 'Digital', value: 'digital' },
        ]}
        selectedValues={filters.billboardType}
        onSelect={(values) => updateFilter('billboardType', values)}
        multiSelect
      />

      {/* Illumination Filter */}
      <FilterDropdown
        label="Iluminación"
        options={[
          { label: 'LED', value: 'led' },
          { label: 'Tradicional', value: 'traditional' },
          { label: 'Sin iluminación', value: 'none' },
        ]}
        selectedValues={filters.illumination}
        onSelect={(values) => updateFilter('illumination', values)}
        multiSelect
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
