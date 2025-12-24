import React from 'react';
import { Billboard } from '@/hooks/useBillboards';
import { MapPin, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface BillboardSelectorProps {
  billboards: Billboard[];
  selectedId: string | null;
  onSelect: (billboard: Billboard) => void;
  isLoading?: boolean;
}

const BillboardSelector: React.FC<BillboardSelectorProps> = ({
  billboards,
  selectedId,
  onSelect,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Card className="bg-[#1E1E1E] border-white/10 p-4">
        <Skeleton className="h-10 w-full bg-white/10" />
      </Card>
    );
  }

  if (billboards.length === 0) {
    return (
      <Card className="bg-[#1E1E1E] border-white/10 p-6 text-center">
        <p className="text-white/60">No tienes espectaculares registrados</p>
      </Card>
    );
  }

  const selectedBillboard = billboards.find(b => b.id === selectedId);

  return (
    <div className="mb-6">
      <label className="text-white/70 text-sm mb-2 block">Seleccionar propiedad</label>
      <Select
        value={selectedId || undefined}
        onValueChange={(value) => {
          const billboard = billboards.find(b => b.id === value);
          if (billboard) onSelect(billboard);
        }}
      >
        <SelectTrigger className="w-full md:w-80 bg-[#1E1E1E] border-white/10 text-white h-12">
          <SelectValue placeholder="Selecciona un espectacular">
            {selectedBillboard && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0">
                  <img
                    src={selectedBillboard.image_url || '/placeholder.svg'}
                    alt={selectedBillboard.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">{selectedBillboard.title}</span>
                  <span className="text-xs text-white/50">{selectedBillboard.city}</span>
                </div>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-[#2A2A2A] border-white/10">
          {billboards.map((billboard) => (
            <SelectItem 
              key={billboard.id} 
              value={billboard.id}
              className="text-white hover:bg-white/10 cursor-pointer focus:bg-white/10 focus:text-white"
            >
              <div className="flex items-center gap-3 py-1">
                <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
                  <img
                    src={billboard.image_url || '/placeholder.svg'}
                    alt={billboard.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">{billboard.title}</span>
                  <div className="flex items-center gap-1 text-white/50 text-xs">
                    <MapPin className="w-3 h-3" />
                    <span>{billboard.city}</span>
                    <span className="mx-1">•</span>
                    <span className="text-[#9BFF43]">${billboard.price_per_month.toLocaleString()}/mes</span>
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default BillboardSelector;
