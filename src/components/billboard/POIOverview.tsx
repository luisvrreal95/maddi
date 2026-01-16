import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  Loader2, 
  RefreshCw,
  GraduationCap,
  Hotel,
  Car,
  Hospital,
  Store,
  UtensilsCrossed,
  Building,
  Landmark,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface POIOverviewProps {
  billboardId: string;
  latitude: number;
  longitude: number;
}

interface CategoryData {
  count: number;
  topItems: Array<{
    name: string;
    category: string;
    distance: number;
  }>;
}

interface POIOverviewData {
  categories: Record<string, CategoryData>;
  top5: Array<{
    name: string;
    category: string;
    distance: number;
  }>;
  totalPOIs: number;
  radius: number;
  computed_at: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Educación': <GraduationCap className="w-4 h-4" />,
  'Hoteles': <Hotel className="w-4 h-4" />,
  'Autos': <Car className="w-4 h-4" />,
  'Salud': <Hospital className="w-4 h-4" />,
  'Retail / Plazas': <Store className="w-4 h-4" />,
  'Alimentos y bebidas': <UtensilsCrossed className="w-4 h-4" />,
  'Gobierno / Servicios públicos': <Building className="w-4 h-4" />,
  'Servicios profesionales': <Landmark className="w-4 h-4" />,
};

const POIOverview: React.FC<POIOverviewProps> = ({ billboardId, latitude, longitude }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<POIOverviewData | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [isCached, setIsCached] = useState(false);

  const fetchPOIOverview = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('get-poi-overview', {
        body: {
          billboard_id: billboardId,
          latitude,
          longitude,
          force_refresh: forceRefresh,
        }
      });

      if (error) throw error;

      if (result.success) {
        setData(result);
        setIsCached(result.cached || false);
      } else {
        throw new Error(result.error || 'Error al obtener POIs');
      }
    } catch (error) {
      console.error('Error fetching POI overview:', error);
      toast.error('Error al cargar lugares cercanos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (billboardId && latitude && longitude) {
      fetchPOIOverview();
    }
  }, [billboardId, latitude, longitude]);

  if (loading) {
    return (
      <Card className="bg-card border-border p-6 text-center">
        <Loader2 className="w-8 h-8 mx-auto text-primary mb-3 animate-spin" />
        <p className="text-muted-foreground text-sm">Cargando lugares cercanos...</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="bg-card border-border p-6 text-center">
        <MapPin className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-sm">No se pudieron cargar los lugares cercanos</p>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => fetchPOIOverview(true)}
          className="mt-3"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </Card>
    );
  }

  const sortedCategories = Object.entries(data.categories)
    .sort(([, a], [, b]) => b.count - a.count);
  
  const displayCategories = showAllCategories ? sortedCategories : sortedCategories.slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Lugares cercanos</h3>
          <Badge variant="secondary" className="text-xs">
            {data.totalPOIs} en {data.radius}m
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => fetchPOIOverview(true)}
          className="text-xs"
          disabled={loading}
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {isCached ? 'Actualizar' : 'Refrescar'}
        </Button>
      </div>

      {/* Top 5 Places */}
      {data.top5 && data.top5.length > 0 && (
        <Card className="bg-primary/5 border-primary/20 p-4">
          <h4 className="text-sm font-medium text-foreground mb-3">Top 5 lugares más cercanos</h4>
          <div className="space-y-2">
            {data.top5.map((place, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-medium">
                    {idx + 1}
                  </span>
                  <span className="text-foreground truncate max-w-[200px]">{place.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{place.category}</Badge>
                  <span className="text-muted-foreground text-xs">{place.distance}m</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-2 gap-3">
        {displayCategories.map(([categoryName, categoryData]) => (
          <Card 
            key={categoryName}
            className="bg-secondary/30 border-border p-3 hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                {categoryIcons[categoryName] || <Store className="w-3.5 h-3.5" />}
              </div>
              <span className="text-foreground font-medium text-sm flex-1 truncate">{categoryName}</span>
              <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                {categoryData.count}
              </Badge>
            </div>
            {categoryData.topItems.length > 0 && (
              <p className="text-muted-foreground text-xs truncate">
                {categoryData.topItems[0].name}
                {categoryData.count > 1 && ` +${categoryData.count - 1} más`}
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Show More/Less */}
      {sortedCategories.length > 4 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAllCategories(!showAllCategories)}
          className="w-full text-muted-foreground hover:text-foreground"
        >
          {showAllCategories ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Ver menos categorías
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Ver todas las categorías ({sortedCategories.length})
            </>
          )}
        </Button>
      )}

      {/* Cache indicator */}
      {isCached && data.computed_at && (
        <p className="text-xs text-muted-foreground text-center">
          Datos actualizados el {new Date(data.computed_at).toLocaleDateString('es-MX')}
        </p>
      )}
    </div>
  );
};

export default POIOverview;
