import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

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

interface SearchFiltersProps {
  onFiltersChange: (filters: Record<string, string[]>) => void;
}

const SearchFilters: React.FC<SearchFiltersProps> = ({ onFiltersChange }) => {
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

  return (
    <div className="flex flex-wrap items-center gap-3 py-4">
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
        label="Status"
        options={[
          { label: 'Alto', value: 'high' },
          { label: 'Medio', value: 'medium' },
          { label: 'Bajo', value: 'low' },
        ]}
        selectedValues={filters.status}
        onSelect={(values) => updateFilter('status', values)}
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
