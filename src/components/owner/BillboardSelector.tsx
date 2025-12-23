import React from 'react';
import { Billboard } from '@/hooks/useBillboards';
import { Card } from '@/components/ui/card';
import { MapPin, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-[#1E1E1E] border-white/10 p-4 animate-pulse">
            <div className="h-24 bg-white/10 rounded-lg mb-3" />
            <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
            <div className="h-3 bg-white/10 rounded w-1/2" />
          </Card>
        ))}
      </div>
    );
  }

  if (billboards.length === 0) {
    return (
      <Card className="bg-[#1E1E1E] border-white/10 p-8 text-center">
        <p className="text-white/60">No tienes espectaculares registrados</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {billboards.map((billboard) => {
        const isSelected = selectedId === billboard.id;
        const imageUrl = billboard.image_url || '/placeholder.svg';

        return (
          <Card
            key={billboard.id}
            onClick={() => onSelect(billboard)}
            className={cn(
              "relative bg-[#1E1E1E] border-2 p-3 cursor-pointer transition-all duration-200 hover:border-[#9BFF43]/50",
              isSelected 
                ? "border-[#9BFF43] ring-2 ring-[#9BFF43]/30" 
                : "border-white/10"
            )}
          >
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-[#9BFF43] rounded-full flex items-center justify-center z-10">
                <Check className="w-4 h-4 text-[#121212]" />
              </div>
            )}

            {/* Image */}
            <div className="relative h-20 rounded-lg overflow-hidden mb-3">
              <img
                src={imageUrl}
                alt={billboard.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            {/* Info */}
            <h3 className="text-white font-medium text-sm truncate mb-1">
              {billboard.title}
            </h3>
            <div className="flex items-center gap-1 text-white/50 text-xs">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{billboard.city}</span>
            </div>

            {/* Price */}
            <div className="mt-2 text-[#9BFF43] font-semibold text-sm">
              ${billboard.price_per_month.toLocaleString()}/mes
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default BillboardSelector;
