import React, { useState, useEffect } from 'react';
import { Billboard } from '@/hooks/useBillboards';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  MapPin, 
  Sparkles, 
  Loader2, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Building2,
  Store,
  Fuel,
  UtensilsCrossed,
  Hotel,
  Landmark,
  Hospital,
  GraduationCap,
  Film,
  Dumbbell,
  Car,
  Plane,
  Church,
  Trees,
  ShoppingBag,
  Coffee,
  Banknote,
  Pill,
  Stethoscope,
  PawPrint,
  PartyPopper,
  Music,
  Trophy,
  Waves,
  Mountain,
  BookOpen,
  Mail,
  Building,
  Shield,
  Tent,
  Wine,
  Users,
  Zap,
  Database,
  Navigation
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NearbyPlacesProps {
  billboard: Billboard | null;
}

interface POICategory {
  name: string;
  icon: React.ReactNode;
  count: number;
  items: Array<{
    name: string;
    distance: number;
    address?: string;
  }>;
}

interface POIAnalysisResult {
  categories: POICategory[];
  aiAnalysis: string;
  totalPOIs: number;
}

interface DENUECategory {
  label: string;
  percentage: number;
  count: number;
}

interface DENUEResult {
  distribution: DENUECategory[];
  totalBusinesses: number;
  knownBrands: string[];
  urbanZone?: {
    type: string;
    confidence: number;
    signals: string[];
  };
}

// Map category IDs to icons
const categoryIcons: Record<string, React.ReactNode> = {
  'Gasolineras': <Fuel className="w-4 h-4" />,
  'Concesionarios': <Car className="w-4 h-4" />,
  'Talleres': <Car className="w-4 h-4" />,
  'Lavado de autos': <Car className="w-4 h-4" />,
  'Carga eléctrica': <Zap className="w-4 h-4" />,
  'Renta de autos': <Car className="w-4 h-4" />,
  'Restaurantes': <UtensilsCrossed className="w-4 h-4" />,
  'Cafés y bares': <Coffee className="w-4 h-4" />,
  'Supermercados': <ShoppingBag className="w-4 h-4" />,
  'Centros comerciales': <Building2 className="w-4 h-4" />,
  'Tiendas': <Store className="w-4 h-4" />,
  'Tiendas departamentales': <Building2 className="w-4 h-4" />,
  'Bancos': <Landmark className="w-4 h-4" />,
  'Cajeros': <Banknote className="w-4 h-4" />,
  'Casas de cambio': <Banknote className="w-4 h-4" />,
  'Hospitales': <Hospital className="w-4 h-4" />,
  'Farmacias': <Pill className="w-4 h-4" />,
  'Dentistas': <Stethoscope className="w-4 h-4" />,
  'Doctores': <Stethoscope className="w-4 h-4" />,
  'Servicios médicos': <Hospital className="w-4 h-4" />,
  'Veterinarias': <PawPrint className="w-4 h-4" />,
  'Hoteles': <Hotel className="w-4 h-4" />,
  'Rentas vacacionales': <Hotel className="w-4 h-4" />,
  'Escuelas': <GraduationCap className="w-4 h-4" />,
  'Universidades': <GraduationCap className="w-4 h-4" />,
  'Cines': <Film className="w-4 h-4" />,
  'Casinos': <PartyPopper className="w-4 h-4" />,
  'Parques de diversiones': <PartyPopper className="w-4 h-4" />,
  'Vida nocturna': <Music className="w-4 h-4" />,
  'Teatros': <Film className="w-4 h-4" />,
  'Gimnasios': <Dumbbell className="w-4 h-4" />,
  'Centros deportivos': <Trophy className="w-4 h-4" />,
  'Golf': <Trophy className="w-4 h-4" />,
  'Estadios': <Trophy className="w-4 h-4" />,
  'Albercas': <Waves className="w-4 h-4" />,
  'Tenis': <Trophy className="w-4 h-4" />,
  'Pista de hielo': <Trophy className="w-4 h-4" />,
  'Atracciones turísticas': <Mountain className="w-4 h-4" />,
  'Museos': <BookOpen className="w-4 h-4" />,
  'Parques': <Trees className="w-4 h-4" />,
  'Zoológicos': <PawPrint className="w-4 h-4" />,
  'Info turística': <MapPin className="w-4 h-4" />,
  'Aeropuertos': <Plane className="w-4 h-4" />,
  'Estaciones de tren': <Building className="w-4 h-4" />,
  'Paradas de transporte': <Building className="w-4 h-4" />,
  'Terminales': <Building className="w-4 h-4" />,
  'Correos': <Mail className="w-4 h-4" />,
  'Gobierno': <Building className="w-4 h-4" />,
  'Tribunales': <Building className="w-4 h-4" />,
  'Policía': <Shield className="w-4 h-4" />,
  'Iglesias': <Church className="w-4 h-4" />,
  'Camping': <Tent className="w-4 h-4" />,
  'Bodegas': <Wine className="w-4 h-4" />,
  'Centros comunitarios': <Users className="w-4 h-4" />,
  'Bibliotecas': <BookOpen className="w-4 h-4" />,
  'Embajadas': <Building className="w-4 h-4" />,
  // DENUE Categories
  'Alimentos y Bebidas': <UtensilsCrossed className="w-4 h-4" />,
  'Comercio Minorista': <Store className="w-4 h-4" />,
  'Servicios Financieros': <Landmark className="w-4 h-4" />,
  'Servicios Personales': <Users className="w-4 h-4" />,
  'Salud': <Hospital className="w-4 h-4" />,
  'Educación': <GraduationCap className="w-4 h-4" />,
  'Servicios Profesionales': <Building2 className="w-4 h-4" />,
  'Entretenimiento': <Film className="w-4 h-4" />,
  'Automotriz y Transporte': <Car className="w-4 h-4" />,
  'Industria y Manufactura': <Building className="w-4 h-4" />,
};

const radiusOptions = [
  { value: '250', label: '250m' },
  { value: '500', label: '500m' },
  { value: '1000', label: '1 km' },
  { value: '2000', label: '2 km' },
];

const NearbyPlaces: React.FC<NearbyPlacesProps> = ({ billboard }) => {
  const [activeTab, setActiveTab] = useState<'poi' | 'denue'>('poi');
  const [radius, setRadius] = useState('500');
  
  // POI State
  const [poiLoading, setPoiLoading] = useState(false);
  const [poiResult, setPoiResult] = useState<POIAnalysisResult | null>(null);
  const [poiExpandedCategories, setPoiExpandedCategories] = useState<Set<string>>(new Set());
  
  // DENUE State
  const [denueLoading, setDenueLoading] = useState(false);
  const [denueResult, setDenueResult] = useState<DENUEResult | null>(null);
  
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  const fetchPOIAnalysis = async () => {
    if (!billboard || !billboard.latitude || !billboard.longitude) {
      toast.error('Este espectacular no tiene coordenadas válidas');
      return;
    }

    setPoiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-nearby-poi', {
        body: {
          latitude: billboard.latitude,
          longitude: billboard.longitude,
          billboard_title: billboard.title,
          city: billboard.city,
          radius: parseInt(radius)
        }
      });

      if (error) throw error;

      if (data.success) {
        setPoiResult(data);
      } else {
        throw new Error(data.error || 'Error al analizar ubicación');
      }
    } catch (error) {
      console.error('Error fetching POI analysis:', error);
      toast.error('Error al analizar los comercios cercanos');
    } finally {
      setPoiLoading(false);
    }
  };

  const fetchDENUEData = async () => {
    if (!billboard) return;

    setDenueLoading(true);
    try {
      // First check if we have cached INEGI data
      const { data: cached } = await supabase
        .from('inegi_demographics')
        .select('*')
        .eq('billboard_id', billboard.id)
        .maybeSingle();

      if (cached) {
        // Parse existing data
        const businessSectors = Array.isArray(cached.business_sectors) 
          ? (cached.business_sectors as unknown as DENUECategory[])
          : [];
        const rawData = cached.raw_denue_data as Record<string, unknown> | null;
        setDenueResult({
          distribution: businessSectors,
          totalBusinesses: cached.nearby_businesses_count || 0,
          knownBrands: (rawData?.known_brands as string[]) || [],
          urbanZone: undefined
        });
      } else {
        // Fetch fresh data
        const { data, error } = await supabase.functions.invoke('analyze-inegi-data', {
          body: {
            billboard_id: billboard.id,
            latitude: billboard.latitude,
            longitude: billboard.longitude,
            force_refresh: true
          }
        });

        if (error) throw error;

        if (data?.data) {
          setDenueResult({
            distribution: data.data.business_sectors || [],
            totalBusinesses: data.data.nearby_businesses_count || 0,
            knownBrands: data.data.raw_denue_data?.known_brands || [],
            urbanZone: data.data.urban_zone
          });
        }
      }
    } catch (error) {
      console.error('Error fetching DENUE data:', error);
      toast.error('Error al cargar datos del INEGI');
    } finally {
      setDenueLoading(false);
    }
  };

  // Reset when billboard changes
  useEffect(() => {
    if (billboard?.id) {
      setPoiResult(null);
      setDenueResult(null);
      setPoiExpandedCategories(new Set());
      setShowFullAnalysis(false);
    }
  }, [billboard?.id]);

  // Auto-fetch when radius changes (if we already have results)
  useEffect(() => {
    if (poiResult && activeTab === 'poi') {
      fetchPOIAnalysis();
    }
  }, [radius]);

  const togglePoiCategory = (categoryName: string) => {
    const newExpanded = new Set(poiExpandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setPoiExpandedCategories(newExpanded);
  };

  if (!billboard) {
    return (
      <Card className="bg-card border-border p-8 text-center">
        <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Selecciona un espectacular para ver qué hay alrededor</p>
      </Card>
    );
  }

  const renderInitialState = (type: 'poi' | 'denue') => (
    <Card className="bg-card border-border p-8 text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-4">
        {type === 'poi' ? (
          <Navigation className="w-6 h-6 text-primary" />
        ) : (
          <Database className="w-6 h-6 text-primary" />
        )}
      </div>
      <h3 className="text-foreground font-semibold mb-2">
        {type === 'poi' ? 'Puntos de Interés (POI)' : 'Datos INEGI (DENUE)'}
      </h3>
      <p className="text-muted-foreground text-sm mb-6">
        {type === 'poi' 
          ? `Descubre restaurantes, tiendas, servicios y más en un radio de ${radiusOptions.find(r => r.value === radius)?.label}`
          : 'Explora el censo de negocios del INEGI con clasificación por sector económico'
        }
      </p>
      <Button
        onClick={type === 'poi' ? fetchPOIAnalysis : fetchDENUEData}
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Analizar {type === 'poi' ? 'POIs' : 'DENUE'}
      </Button>
    </Card>
  );

  const renderLoading = () => (
    <Card className="bg-card border-border p-8 text-center">
      <Loader2 className="w-12 h-12 mx-auto text-primary mb-4 animate-spin" />
      <h3 className="text-foreground font-semibold mb-2">Analizando ubicación...</h3>
      <p className="text-muted-foreground text-sm">
        Buscando comercios cercanos
      </p>
    </Card>
  );

  const renderPOIResults = () => (
    <div className="space-y-4">
      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {poiResult?.categories
          .filter(cat => cat.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 12)
          .map((category) => (
            <Card 
              key={category.name}
              className="bg-secondary/50 border-border overflow-hidden"
            >
              <button
                onClick={() => togglePoiCategory(category.name)}
                className="w-full p-3 flex items-center justify-between hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                    {categoryIcons[category.name] || <Store className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-foreground font-medium text-sm">{category.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-primary/20 text-primary">
                    {category.count}
                  </Badge>
                  {poiExpandedCategories.has(category.name) ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>
              
              {poiExpandedCategories.has(category.name) && (
                <div className="px-3 pb-3 space-y-1.5">
                  {category.items.slice(0, 5).map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between py-1.5 border-t border-border"
                    >
                      <span className="text-foreground/80 text-xs truncate flex-1">
                        {item.name}
                      </span>
                      <span className="text-muted-foreground text-xs ml-2">
                        {item.distance}m
                      </span>
                    </div>
                  ))}
                  {category.count > 5 && (
                    <p className="text-muted-foreground text-xs text-center pt-1">
                      +{category.count - 5} más
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
      </div>

      {/* AI Analysis */}
      {poiResult?.aiAnalysis && (
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-foreground font-semibold text-sm">Análisis con IA</h3>
          </div>
          <div className="text-foreground/80 text-sm leading-relaxed whitespace-pre-line">
            {showFullAnalysis 
              ? poiResult.aiAnalysis 
              : poiResult.aiAnalysis.slice(0, 400) + (poiResult.aiAnalysis.length > 400 ? '...' : '')
            }
          </div>
          {poiResult.aiAnalysis.length > 400 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullAnalysis(!showFullAnalysis)}
              className="mt-3 text-primary hover:text-primary/80 hover:bg-primary/10"
            >
              {showFullAnalysis ? 'Ver menos' : 'Ver análisis completo'}
            </Button>
          )}
        </Card>
      )}
    </div>
  );

  const renderDENUEResults = () => (
    <div className="space-y-4">
      {/* Distribution Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {denueResult?.distribution
          .filter(cat => cat.percentage > 0)
          .sort((a, b) => b.percentage - a.percentage)
          .map((category) => (
            <div 
              key={category.label}
              className="bg-secondary/50 rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  {categoryIcons[category.label] || <Store className="w-3.5 h-3.5" />}
                </div>
                <span className="text-foreground font-medium text-sm flex-1">{category.label}</span>
                <span className="text-muted-foreground text-xs">{category.count}</span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(category.percentage, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{category.percentage.toFixed(1)}%</p>
            </div>
          ))}
      </div>

      {/* Known Brands */}
      {denueResult?.knownBrands && denueResult.knownBrands.length > 0 && (
        <Card className="bg-secondary/50 border-border p-4">
          <h4 className="text-foreground font-medium text-sm mb-3 flex items-center gap-2">
            <Store className="w-4 h-4 text-primary" />
            Marcas Reconocidas
          </h4>
          <div className="flex flex-wrap gap-2">
            {denueResult.knownBrands.map((brand, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {brand}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Urban Zone Classification */}
      {denueResult?.urbanZone && (
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h4 className="text-foreground font-medium text-sm">Tipo de Zona</h4>
          </div>
          <Badge className="bg-primary text-primary-foreground capitalize mb-2">
            {denueResult.urbanZone.type}
          </Badge>
          <p className="text-xs text-muted-foreground">
            Confianza: {(denueResult.urbanZone.confidence * 100).toFixed(0)}%
          </p>
        </Card>
      )}

      {/* Summary */}
      <p className="text-xs text-muted-foreground text-center">
        {denueResult?.totalBusinesses || 0} negocios en un radio de 500m · Fuente: INEGI (DENUE)
      </p>
    </div>
  );

  return (
    <Card className="bg-card border-border p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-foreground font-semibold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Lugares y Negocios Cercanos
        </h3>
        
        <div className="flex items-center gap-2">
          {/* Radius Selector (only for POI) */}
          {activeTab === 'poi' && (
            <Select value={radius} onValueChange={setRadius}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {radiusOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Refresh Button */}
          {((activeTab === 'poi' && poiResult) || (activeTab === 'denue' && denueResult)) && (
            <Button
              variant="outline"
              size="sm"
              onClick={activeTab === 'poi' ? fetchPOIAnalysis : fetchDENUEData}
              className="h-8"
              disabled={poiLoading || denueLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${(poiLoading || denueLoading) ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'poi' | 'denue')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="poi" className="text-sm">
            <Navigation className="w-4 h-4 mr-1.5" />
            POI (TomTom)
            {poiResult && (
              <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary text-xs">
                {poiResult.totalPOIs}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="denue" className="text-sm">
            <Database className="w-4 h-4 mr-1.5" />
            DENUE (INEGI)
            {denueResult && (
              <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary text-xs">
                {denueResult.totalBusinesses}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="poi" className="mt-0">
          {poiLoading ? renderLoading() : 
           poiResult ? renderPOIResults() : 
           renderInitialState('poi')}
        </TabsContent>

        <TabsContent value="denue" className="mt-0">
          {denueLoading ? renderLoading() : 
           denueResult ? renderDENUEResults() : 
           renderInitialState('denue')}
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default NearbyPlaces;
