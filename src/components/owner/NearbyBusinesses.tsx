import React, { useState, useEffect } from 'react';
import { Billboard } from '@/hooks/useBillboards';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NearbyBusinessesProps {
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

interface AnalysisResult {
  categories: POICategory[];
  aiAnalysis: string;
  totalPOIs: number;
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
};

const NearbyBusinesses: React.FC<NearbyBusinessesProps> = ({ billboard }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  const fetchAnalysis = async () => {
    if (!billboard || !billboard.latitude || !billboard.longitude) {
      toast.error('Este espectacular no tiene coordenadas válidas');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-nearby-poi', {
        body: {
          latitude: billboard.latitude,
          longitude: billboard.longitude,
          billboard_title: billboard.title,
          city: billboard.city
        }
      });

      if (error) throw error;

      if (data.success) {
        setResult(data);
      } else {
        throw new Error(data.error || 'Error al analizar ubicación');
      }
    } catch (error) {
      console.error('Error fetching POI analysis:', error);
      toast.error('Error al analizar los comercios cercanos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (billboard?.id) {
      setResult(null);
      setExpandedCategories(new Set());
    }
  }, [billboard?.id]);

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  if (!billboard) {
    return (
      <Card className="bg-[#1E1E1E] border-white/10 p-8 text-center">
        <MapPin className="w-12 h-12 mx-auto text-white/30 mb-4" />
        <p className="text-white/60">Selecciona un espectacular para ver qué hay alrededor</p>
      </Card>
    );
  }

  if (!result && !isLoading) {
    return (
      <Card className="bg-[#1E1E1E] border-white/10 p-8 text-center">
        <Sparkles className="w-12 h-12 mx-auto text-[#9BFF43]/50 mb-4" />
        <h3 className="text-white font-semibold mb-2">Análisis de Ubicación con IA</h3>
        <p className="text-white/60 text-sm mb-6">
          Descubre qué comercios hay alrededor de "{billboard.title}" y recibe recomendaciones personalizadas
        </p>
        <Button
          onClick={fetchAnalysis}
          className="bg-[#9BFF43] hover:bg-[#8AE63A] text-[#121212] font-medium"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Analizar Ubicación
        </Button>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-[#1E1E1E] border-white/10 p-8 text-center">
        <Loader2 className="w-12 h-12 mx-auto text-[#9BFF43] mb-4 animate-spin" />
        <h3 className="text-white font-semibold mb-2">Analizando ubicación...</h3>
        <p className="text-white/60 text-sm">
          Buscando comercios cercanos y generando recomendaciones con IA
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#9BFF43]" />
          <h3 className="text-white font-semibold">Comercios Cercanos</h3>
          <Badge variant="secondary" className="bg-[#9BFF43]/20 text-[#9BFF43]">
            {result?.totalPOIs || 0} encontrados
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAnalysis}
          className="border-white/20 text-white hover:bg-white/10"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {result?.categories
          .filter(cat => cat.count > 0)
          .sort((a, b) => b.count - a.count)
          .map((category) => (
            <Card 
              key={category.name}
              className="bg-[#1E1E1E] border-white/10 overflow-hidden"
            >
              <button
                onClick={() => toggleCategory(category.name)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#9BFF43]">
                    {categoryIcons[category.name] || <Store className="w-4 h-4" />}
                  </div>
                  <span className="text-white font-medium">{category.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/10 text-white">
                    {category.count}
                  </Badge>
                  {expandedCategories.has(category.name) ? (
                    <ChevronUp className="w-4 h-4 text-white/60" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-white/60" />
                  )}
                </div>
              </button>
              
              {expandedCategories.has(category.name) && (
                <div className="px-4 pb-4 space-y-2">
                  {category.items.slice(0, 5).map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between py-2 border-t border-white/5"
                    >
                      <span className="text-white/80 text-sm truncate flex-1">
                        {item.name}
                      </span>
                      <span className="text-white/50 text-xs ml-2">
                        {item.distance}m
                      </span>
                    </div>
                  ))}
                  {category.count > 5 && (
                    <p className="text-white/40 text-xs text-center pt-2">
                      +{category.count - 5} más
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
      </div>

      {/* AI Analysis */}
      {result?.aiAnalysis && (
        <Card className="bg-gradient-to-br from-[#9BFF43]/10 to-transparent border-[#9BFF43]/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[#9BFF43]" />
            <h3 className="text-white font-semibold">Análisis con IA</h3>
          </div>
          <div className="text-white/80 text-sm leading-relaxed whitespace-pre-line">
            {showFullAnalysis 
              ? result.aiAnalysis 
              : result.aiAnalysis.slice(0, 500) + (result.aiAnalysis.length > 500 ? '...' : '')
            }
          </div>
          {result.aiAnalysis.length > 500 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFullAnalysis(!showFullAnalysis)}
              className="mt-4 text-[#9BFF43] hover:text-[#9BFF43]/80 hover:bg-[#9BFF43]/10"
            >
              {showFullAnalysis ? 'Ver menos' : 'Ver análisis completo'}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};

export default NearbyBusinesses;
