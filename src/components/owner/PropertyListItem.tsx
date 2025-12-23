import React from 'react';
import { Billboard } from '@/hooks/useBillboards';

interface PropertyListItemProps {
  billboard: Billboard;
  onClick?: () => void;
}

const PropertyListItem: React.FC<PropertyListItemProps> = ({ billboard, onClick }) => {
  return (
    <div 
      className="bg-background rounded-xl border border-border p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <h4 className="font-bold text-foreground">{billboard.title}</h4>
      <p className="text-muted-foreground text-sm mb-3">
        {billboard.address}, {billboard.city}, {billboard.state}
      </p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-foreground">
            {billboard.price_per_month.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-sm">/mes</span>
        </div>
        <span className="text-[hsl(142,76%,36%)] text-sm font-medium">0.39% ↑</span>
      </div>
    </div>
  );
};

export default PropertyListItem;
