import React, { useState } from 'react';
import { Store, ChevronDown, ChevronUp, Building, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface NearbyBrandsProps {
  knownBrands?: string[];
  shoppingCenters?: string[];
  topBusinesses?: Array<{ name: string; category: string; size?: string }>;
  totalBusinesses?: number;
}

// Brand icon colors for visual distinction
const BRAND_COLORS: Record<string, string> = {
  'OXXO': 'bg-red-500/10 text-red-600 border-red-200',
  'STARBUCKS': 'bg-green-600/10 text-green-700 border-green-200',
  '7-ELEVEN': 'bg-green-500/10 text-green-600 border-green-200',
  'MCDONALDS': 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  'WALMART': 'bg-blue-500/10 text-blue-600 border-blue-200',
  'COSTCO': 'bg-red-600/10 text-red-700 border-red-200',
  'BBVA': 'bg-blue-600/10 text-blue-700 border-blue-200',
  'SANTANDER': 'bg-red-500/10 text-red-600 border-red-200',
  'CINEPOLIS': 'bg-purple-500/10 text-purple-600 border-purple-200',
  'LIVERPOOL': 'bg-pink-500/10 text-pink-600 border-pink-200',
  'SORIANA': 'bg-orange-500/10 text-orange-600 border-orange-200',
  'HEB': 'bg-red-500/10 text-red-600 border-red-200',
  'PEMEX': 'bg-green-700/10 text-green-800 border-green-200',
};

const NearbyBrands: React.FC<NearbyBrandsProps> = ({
  knownBrands = [],
  shoppingCenters = [],
  topBusinesses = [],
  totalBusinesses = 0,
}) => {
  const [showAll, setShowAll] = useState(false);

  const displayedBrands = showAll ? knownBrands : knownBrands.slice(0, 8);
  const hiddenCount = knownBrands.length - 8;

  if (knownBrands.length === 0 && shoppingCenters.length === 0 && topBusinesses.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <Store className="w-4 h-4 text-primary" />
        Marcas y Negocios Cercanos
      </h3>

      {/* Shopping Centers */}
      {shoppingCenters.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Building className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Centro Comercial</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {shoppingCenters.map((center, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {center}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Known Brands */}
      {knownBrands.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Marcas reconocidas en la zona:
          </p>
          <div className="flex flex-wrap gap-2">
            {displayedBrands.map((brand, idx) => (
              <Badge 
                key={idx} 
                variant="outline"
                className={`text-xs ${BRAND_COLORS[brand.toUpperCase()] || 'bg-muted/50'}`}
              >
                {brand}
              </Badge>
            ))}
            {!showAll && hiddenCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(true)}
                className="h-6 text-xs px-2 text-muted-foreground"
              >
                +{hiddenCount} más
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            )}
            {showAll && hiddenCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(false)}
                className="h-6 text-xs px-2 text-muted-foreground"
              >
                Ver menos
                <ChevronUp className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Top Businesses (if no known brands) */}
      {knownBrands.length === 0 && topBusinesses.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Negocios destacados:
          </p>
          <div className="space-y-1.5">
            {topBusinesses.slice(0, 5).map((business, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground truncate">{business.name}</span>
                <span className="text-xs text-muted-foreground">({business.category})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {totalBusinesses > 0 && (
        <p className="text-xs text-muted-foreground">
          {totalBusinesses} negocios en total en un radio de 500m · Fuente: INEGI (DENUE)
        </p>
      )}
    </div>
  );
};

export default NearbyBrands;
