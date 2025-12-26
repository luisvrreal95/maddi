import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface PropertyFiltersProps {
  cities: string[];
  selectedCity: string;
  onCityChange: (city: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const PropertyFilters: React.FC<PropertyFiltersProps> = ({
  cities,
  selectedCity,
  onCityChange,
  selectedStatus,
  onStatusChange,
  onClearFilters,
  hasActiveFilters
}) => {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Select value={selectedCity} onValueChange={onCityChange}>
        <SelectTrigger className="w-[180px] bg-[#2A2A2A] border-white/10 text-white">
          <SelectValue placeholder="Todas las ciudades" />
        </SelectTrigger>
        <SelectContent className="bg-[#2A2A2A] border-white/10">
          <SelectItem value="all" className="text-white">Todas las ciudades</SelectItem>
          {cities.map((city) => (
            <SelectItem key={city} value={city} className="text-white">
              {city}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[180px] bg-[#2A2A2A] border-white/10 text-white">
          <SelectValue placeholder="Todos los estados" />
        </SelectTrigger>
        <SelectContent className="bg-[#2A2A2A] border-white/10">
          <SelectItem value="all" className="text-white">Todos los estados</SelectItem>
          <SelectItem value="available" className="text-white">Disponibles</SelectItem>
          <SelectItem value="unavailable" className="text-white">No disponibles</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-white/50 hover:text-white"
        >
          <X className="w-4 h-4 mr-1" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
};

export default PropertyFilters;
