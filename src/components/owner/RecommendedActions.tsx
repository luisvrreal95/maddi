import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Billboard } from '@/hooks/useBillboards';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Clock, 
  Megaphone, 
  AlertCircle,
  Sparkles,
  DollarSign,
  Eye,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface RecommendedActionsProps {
  billboards: Billboard[];
  userId: string;
}

interface Recommendation {
  id: string;
  type: 'price' | 'opportunity' | 'promote' | 'review';
  title: string;
  description: string;
  billboardId?: string;
  billboardTitle?: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  priority: number;
}

const RecommendedActions: React.FC<RecommendedActionsProps> = ({ billboards, userId }) => {
  const [bookingsData, setBookingsData] = useState<any[]>([]);
  const [cityAveragePrice, setCityAveragePrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [userId, billboards]);

  const fetchData = async () => {
    if (!userId || billboards.length === 0) {
      setIsLoading(false);
      return;
    }

    try {
      const billboardIds = billboards.map(b => b.id);
      
      // Fetch bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .in('billboard_id', billboardIds);
      
      setBookingsData(bookings || []);

      // Calculate city average price
      if (billboards.length > 0) {
        const city = billboards[0].city;
        const { data: cityBillboards } = await supabase
          .from('billboards')
          .select('price_per_month')
          .eq('city', city)
          .eq('is_available', true);
        
        if (cityBillboards && cityBillboards.length > 0) {
          const avg = cityBillboards.reduce((sum, b) => sum + Number(b.price_per_month), 0) / cityBillboards.length;
          setCityAveragePrice(avg);
        }
      }
    } catch (error) {
      console.error('Error fetching recommendations data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshTrafficData = async () => {
    if (billboards.length === 0) return;
    
    setIsRefreshing(true);
    try {
      let successCount = 0;
      
      for (const billboard of billboards) {
        try {
          const { data, error } = await supabase.functions.invoke('get-traffic-data', {
            body: {
              billboard_id: billboard.id,
              latitude: billboard.latitude,
              longitude: billboard.longitude,
              force_refresh: true
            }
          });
          
          if (!error && data) {
            successCount++;
          }
        } catch (err) {
          console.error(`Error updating traffic for ${billboard.title}:`, err);
        }
      }
      
      toast.success(`Datos de tráfico actualizados para ${successCount} de ${billboards.length} propiedades`);
    } catch (error) {
      console.error('Error refreshing traffic data:', error);
      toast.error('Error al actualizar datos de tráfico');
    } finally {
      setIsRefreshing(false);
    }
  };

  const recommendations = useMemo((): Recommendation[] => {
    const recs: Recommendation[] = [];

    billboards.forEach(billboard => {
      const dailyImpressions = billboard.daily_impressions || 0;

      // High traffic = Peak opportunity (context-focused)
      if (dailyImpressions > 30000) {
        recs.push({
          id: `opportunity-${billboard.id}`,
          type: 'opportunity',
          title: 'Zona de alto tráfico',
          description: `Este espectacular recibe ~${(dailyImpressions / 1000).toFixed(0)}K vistas estimadas por día. Ideal para campañas de alto impacto.`,
          billboardId: billboard.id,
          billboardTitle: billboard.title,
          icon: <Eye className="w-5 h-5" />,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          priority: 1
        });
      }

      // High traffic with peak hours insight
      if (dailyImpressions > 15000) {
        recs.push({
          id: `peakhours-${billboard.id}`,
          type: 'opportunity',
          title: 'Horarios de mayor visibilidad',
          description: `Horarios recomendados: 8-10 AM y 5-7 PM. Ideal para campañas de retail y promociones.`,
          billboardId: billboard.id,
          billboardTitle: billboard.title,
          icon: <Clock className="w-5 h-5" />,
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/20',
          priority: 2
        });
      }

      // Missing traffic data = Update data
      if (!billboard.daily_impressions || !(billboard as any).last_traffic_update) {
        recs.push({
          id: `data-${billboard.id}`,
          type: 'review',
          title: 'Actualizar datos de tráfico',
          description: `"${billboard.title}" no tiene datos de tráfico actualizados. Usa el botón para obtener estimaciones.`,
          billboardId: billboard.id,
          billboardTitle: billboard.title,
          icon: <RefreshCw className="w-5 h-5" />,
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/20',
          priority: 0
        });
      }

      // Available billboard = Promotion suggestion
      if (billboard.is_available) {
        recs.push({
          id: `available-${billboard.id}`,
          type: 'promote',
          title: 'Espacio disponible',
          description: `"${billboard.title}" está listo para nuevas campañas. Comparte el perfil con anunciantes.`,
          billboardId: billboard.id,
          billboardTitle: billboard.title,
          icon: <Megaphone className="w-5 h-5" />,
          color: 'text-[#9BFF43]',
          bgColor: 'bg-[#9BFF43]/20',
          priority: 3
        });
      }
    });

    // Sort by priority
    return recs.sort((a, b) => a.priority - b.priority).slice(0, 4);
  }, [billboards]);

  if (isLoading) {
    return (
      <Card className="bg-[#1E1E1E] border-white/10 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#9BFF43] animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#1E1E1E] to-[#252525] border-[#9BFF43]/20 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#9BFF43]/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#9BFF43]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Recomendaciones del Entorno</h3>
            <p className="text-white/50 text-sm">Sugerencias basadas en ubicación y tráfico estimado</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshTrafficData}
          disabled={isRefreshing}
          className="border-white/20 text-white hover:bg-white/10"
        >
          {isRefreshing ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Actualizar datos
        </Button>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-[#9BFF43]/10 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-[#9BFF43]" />
          </div>
          <p className="text-white/60">¡Todo en orden! No hay acciones pendientes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="bg-[#2A2A2A] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg ${rec.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <span className={rec.color}>{rec.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium ${rec.color}`}>{rec.title}</h4>
                  <p className="text-white/60 text-sm mt-1 line-clamp-2">{rec.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default RecommendedActions;
