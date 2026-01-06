import React, { useState } from 'react';
import { SlidersHorizontal, X, Zap, Sun, Monitor, LayoutGrid } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

interface FiltersDialogProps {
  onFiltersChange: (filters: Record<string, string[]>) => void;
  resultsCount: number;
}

const FiltersDialog: React.FC<FiltersDialogProps> = ({ onFiltersChange, resultsCount }) => {
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, string[]>>({
    priceRange: [],
    traffic: [],
    size: [],
    billboardType: [],
    illumination: [],
    order: [],
  });

  // Price range slider state
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => {
      const current = prev[key] || [];
      if (current.includes(value)) {
        return { ...prev, [key]: current.filter(v => v !== value) };
      }
      return { ...prev, [key]: [...current, value] };
    });
  };

  const clearFilters = () => {
    const clearedFilters = {
      priceRange: [],
      traffic: [],
      size: [],
      billboardType: [],
      illumination: [],
      order: [],
    };
    setFilters(clearedFilters);
    setPriceRange([0, 100000]);
  };

  const applyFilters = () => {
    // Convert price slider to filter values
    const priceFilters: string[] = [];
    if (priceRange[0] <= 10000 && priceRange[1] >= 0) priceFilters.push('budget');
    if (priceRange[0] <= 25000 && priceRange[1] >= 10000) priceFilters.push('standard');
    if (priceRange[0] <= 50000 && priceRange[1] >= 25000) priceFilters.push('premium');
    if (priceRange[1] >= 50000) priceFilters.push('exclusive');

    const finalFilters = {
      ...filters,
      priceRange: priceFilters,
    };
    onFiltersChange(finalFilters);
    setOpen(false);
  };

  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0) || priceRange[0] > 0 || priceRange[1] < 100000;
  const activeFiltersCount = Object.values(filters).reduce((acc, arr) => acc + arr.length, 0) + (priceRange[0] > 0 || priceRange[1] < 100000 ? 1 : 0);

  const ToggleButton = ({ label, value, filterKey, icon: Icon }: { label: string; value: string; filterKey: string; icon?: React.ElementType }) => {
    const isSelected = filters[filterKey]?.includes(value);
    return (
      <button
        onClick={() => updateFilter(filterKey, value)}
        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all min-w-[100px] ${
          isSelected 
            ? 'border-primary bg-primary/10 text-primary' 
            : 'border-border hover:border-muted-foreground/50 text-foreground'
        }`}
      >
        {Icon && <Icon className="w-6 h-6 mb-2" />}
        <span className="text-sm font-medium">{label}</span>
      </button>
    );
  };

  const ChipButton = ({ label, value, filterKey }: { label: string; value: string; filterKey: string }) => {
    const isSelected = filters[filterKey]?.includes(value);
    return (
      <button
        onClick={() => updateFilter(filterKey, value)}
        className={`px-4 py-2 rounded-full border text-sm font-medium transition-all ${
          isSelected 
            ? 'border-primary bg-primary text-primary-foreground' 
            : 'border-border hover:border-muted-foreground/50 text-foreground'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-full px-4 border-border">
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filtros</span>
          {activeFiltersCount > 0 && (
            <Badge variant="default" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-center text-lg font-semibold">Filtros</DialogTitle>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* Quick Filters - Recommended */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Recomendados para ti</h3>
            <div className="flex flex-wrap gap-3">
              <ToggleButton 
                label="Disponible" 
                value="available" 
                filterKey="availability" 
                icon={Zap} 
              />
              <ToggleButton 
                label="Alto tráfico" 
                value="high" 
                filterKey="traffic" 
                icon={LayoutGrid} 
              />
              <ToggleButton 
                label="Iluminado" 
                value="led" 
                filterKey="illumination" 
                icon={Sun} 
              />
              <ToggleButton 
                label="Digital" 
                value="digital" 
                filterKey="billboardType" 
                icon={Monitor} 
              />
            </div>
          </div>

          {/* Billboard Type */}
          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-semibold mb-4">Tipo de espectacular</h3>
            <div className="flex rounded-xl border border-border overflow-hidden">
              {[
                { label: 'Cualquiera', value: '' },
                { label: 'Espectacular', value: 'spectacular' },
                { label: 'Mural', value: 'mural' },
                { label: 'Digital', value: 'digital' },
              ].map((option, idx) => {
                const isSelected = option.value === '' 
                  ? filters.billboardType.length === 0 
                  : filters.billboardType.includes(option.value);
                return (
                  <button
                    key={option.value || 'any'}
                    onClick={() => {
                      if (option.value === '') {
                        setFilters(prev => ({ ...prev, billboardType: [] }));
                      } else {
                        updateFilter('billboardType', option.value);
                      }
                    }}
                    className={`flex-1 py-3 px-4 text-sm font-medium border-r last:border-r-0 border-border transition-colors ${
                      isSelected 
                        ? 'bg-foreground text-background' 
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range */}
          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-semibold mb-2">Rango de precio</h3>
            <p className="text-muted-foreground text-sm mb-6">Precio mensual de renta</p>
            
            {/* Price Histogram Placeholder */}
            <div className="h-16 mb-4 flex items-end gap-0.5">
              {Array.from({ length: 40 }).map((_, i) => {
                const height = Math.random() * 100;
                const inRange = (i / 40) * 100000 >= priceRange[0] && (i / 40) * 100000 <= priceRange[1];
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t transition-colors ${inRange ? 'bg-primary' : 'bg-muted'}`}
                    style={{ height: `${Math.max(height, 10)}%` }}
                  />
                );
              })}
            </div>

            <Slider
              value={priceRange}
              onValueChange={(value) => setPriceRange(value as [number, number])}
              min={0}
              max={100000}
              step={1000}
              className="mb-4"
            />
            
            <div className="flex justify-between gap-4">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Mínimo</label>
                <div className="border border-border rounded-lg px-3 py-2 mt-1">
                  <span className="text-foreground">${priceRange[0].toLocaleString()}</span>
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Máximo</label>
                <div className="border border-border rounded-lg px-3 py-2 mt-1">
                  <span className="text-foreground">${priceRange[1].toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Traffic */}
          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-semibold mb-4">Nivel de tráfico</h3>
            <div className="flex flex-wrap gap-2">
              <ChipButton label="Alto (+30,000/día)" value="high" filterKey="traffic" />
              <ChipButton label="Medio (15,000-30,000)" value="medium" filterKey="traffic" />
              <ChipButton label="Bajo (-15,000)" value="low" filterKey="traffic" />
            </div>
          </div>

          {/* Size */}
          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-semibold mb-4">Tamaño</h3>
            <div className="flex flex-wrap gap-2">
              <ChipButton label="Pequeño (-20m²)" value="small" filterKey="size" />
              <ChipButton label="Mediano (20-50m²)" value="medium" filterKey="size" />
              <ChipButton label="Grande (+50m²)" value="large" filterKey="size" />
            </div>
          </div>

          {/* Illumination */}
          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-semibold mb-4">Iluminación</h3>
            <div className="flex flex-wrap gap-2">
              <ChipButton label="LED" value="led" filterKey="illumination" />
              <ChipButton label="Tradicional" value="traditional" filterKey="illumination" />
              <ChipButton label="Sin iluminación" value="none" filterKey="illumination" />
            </div>
          </div>

          {/* Sort */}
          <div className="border-t border-border pt-6">
            <h3 className="text-lg font-semibold mb-4">Ordenar por</h3>
            <div className="flex flex-wrap gap-2">
              <ChipButton label="Precio: Menor a Mayor" value="price_asc" filterKey="order" />
              <ChipButton label="Precio: Mayor a Menor" value="price_desc" filterKey="order" />
              <ChipButton label="Más visitas" value="views_desc" filterKey="order" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border sticky bottom-0 bg-background">
          <Button 
            variant="ghost" 
            onClick={clearFilters}
            className="text-foreground underline underline-offset-4"
          >
            Limpiar todo
          </Button>
          <Button onClick={applyFilters} className="px-8">
            Mostrar {resultsCount} resultado{resultsCount !== 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FiltersDialog;
