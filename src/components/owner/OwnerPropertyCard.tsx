import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Eye, Clock, CheckCircle2, Maximize, MapPin, Loader2 } from 'lucide-react';
import { Billboard } from '@/hooks/useBillboards';
import { supabase } from '@/integrations/supabase/client';

interface OwnerPropertyCardProps {
  billboard: Billboard;
  onEdit: () => void;
  onDelete: () => void;
}

interface TrafficData {
  estimated_daily_impressions: number;
  recorded_at: string;
}

interface POICategory {
  name: string;
  count: number;
}

const OwnerPropertyCard: React.FC<OwnerPropertyCardProps> = ({ billboard, onEdit, onDelete }) => {
  const [impressionChange, setImpressionChange] = useState<number | null>(null);
  const [isLoadingTraffic, setIsLoadingTraffic] = useState(false);
  const [nearbyPOIs, setNearbyPOIs] = useState<POICategory[]>([]);
  const [isLoadingPOIs, setIsLoadingPOIs] = useState(false);

  // Use stored points_of_interest from DB - no API call needed
  const storedPois = billboard.points_of_interest || [];
  const poisDisplay = nearbyPOIs.length > 0 
    ? nearbyPOIs.slice(0, 3).map(p => `${p.name} (${p.count})`).join(', ')
    : storedPois.length > 0 
      ? storedPois.slice(0, 3).join(', ')
      : 'Sin datos';
  
  const dailyViews = billboard.daily_impressions || 0;
  const peakHours = '8am-12pm';
  const status = billboard.pause_reason === 'admin' ? 'Pausada por Maddi' : billboard.is_available ? 'Disponible' : 'Ocupado';
  const isPausedByAdmin = billboard.pause_reason === 'admin';
  const size = `${billboard.width_m}m x ${billboard.height_m}m`;

  // Only fetch POIs from API if billboard has no stored points_of_interest
  useEffect(() => {
    const fetchNearbyPOIs = async () => {
      // Skip if we already have stored POIs or no coordinates
      if (storedPois.length > 0 || !billboard.latitude || !billboard.longitude) return;
      
      setIsLoadingPOIs(true);
      try {
        const { data, error } = await supabase.functions.invoke('analyze-nearby-poi', {
          body: { 
            latitude: billboard.latitude, 
            longitude: billboard.longitude,
            billboard_title: billboard.title,
            city: billboard.city
          }
        });
        
        if (!error && data?.success && data?.categories) {
          const topCategories = data.categories
            .filter((cat: any) => cat.count > 0)
            .slice(0, 4)
            .map((cat: any) => ({ name: cat.name, count: cat.count }));
          setNearbyPOIs(topCategories);
          
          // Save POI names to billboard for future use
          const poiNames = topCategories.map((c: POICategory) => c.name);
          if (poiNames.length > 0) {
            await supabase
              .from('billboards')
              .update({ points_of_interest: poiNames })
              .eq('id', billboard.id);
          }
        }
      } catch (err) {
        console.error('Error fetching POIs:', err);
      } finally {
        setIsLoadingPOIs(false);
      }
    };

    fetchNearbyPOIs();
  }, [billboard.id]);

  // Fetch traffic data to calculate impression change
  useEffect(() => {
    const fetchTrafficChange = async () => {
      if (!billboard.id) return;
      
      setIsLoadingTraffic(true);
      try {
        const { data, error } = await supabase
          .from('traffic_data')
          .select('estimated_daily_impressions, recorded_at')
          .eq('billboard_id', billboard.id)
          .order('recorded_at', { ascending: false })
          .limit(2);

        if (!error && data && data.length >= 2) {
          const current = data[0].estimated_daily_impressions || 0;
          const previous = data[1].estimated_daily_impressions || 0;
          if (previous > 0) {
            const change = ((current - previous) / previous) * 100;
            setImpressionChange(change);
          }
        }
      } catch (err) {
        console.error('Error fetching traffic data:', err);
      } finally {
        setIsLoadingTraffic(false);
      }
    };

    fetchTrafficChange();
  }, [billboard.id]);

  return (
    <div className={`bg-[#1E1E1E] rounded-2xl border ${isPausedByAdmin ? 'border-orange-500/30' : 'border-[#9BFF43]/30'} p-5 relative hover:border-[#9BFF43]/60 hover:shadow-[0_0_30px_rgba(155,255,67,0.15)] transition-all h-full flex flex-col`}>
      {/* Admin pause banner */}
      {isPausedByAdmin && (
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div>
            <p className="text-orange-400 text-sm font-medium">⚠️ Pausada por Maddi</p>
            <p className="text-orange-400/60 text-xs mt-0.5">Esta propiedad no es visible para los anunciantes.</p>
          </div>
          <a 
            href="mailto:soporte@maddi.com.mx?subject=Consulta sobre propiedad pausada"
            className="text-xs text-orange-400 border border-orange-500/30 rounded-lg px-3 py-1.5 hover:bg-orange-500/10 transition-colors whitespace-nowrap"
            onClick={(e) => e.stopPropagation()}
          >
            Contactar soporte
          </a>
        </div>
      )}
      {/* Image - Always show with fixed height */}
      <div className="relative mb-4 rounded-xl overflow-hidden h-40 flex-shrink-0">
        {billboard.image_url ? (
          <img 
            src={billboard.image_url} 
            alt={billboard.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#2A2A2A] flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <span className="text-white/30 text-sm">Sin imagen</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={onEdit}
          className="text-white/60 hover:text-[#9BFF43] transition-colors bg-[#2A2A2A] p-2 rounded-lg"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="text-white/60 hover:text-red-500 transition-colors bg-[#2A2A2A] p-2 rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Title & Address */}
      <div className="mb-4 pr-10">
        <h3 className="font-bold text-white text-lg">{billboard.title}</h3>
        <p className="text-white/50 text-sm">
          {billboard.address}, {billboard.city}, {billboard.state}
        </p>
      </div>

      {/* Price Bar with Impression Change */}
      <div className="bg-[#2A2A2A] rounded-lg px-4 py-3 mb-5 flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-white">
            ${billboard.price_per_month.toLocaleString()}
          </span>
          <span className="text-white/50 text-sm">/mes</span>
        </div>
        {impressionChange !== null && (
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4 text-[#9BFF43]" />
            <span className={`text-sm font-medium ${impressionChange >= 0 ? 'text-[#9BFF43]' : 'text-red-400'}`}>
              {impressionChange >= 0 ? '+' : ''}{impressionChange.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Details Grid */}
      <div className="space-y-3">
        {/* Puntos de Interés */}
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-[#9BFF43] mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-white text-sm">Lugares cercanos</p>
            {isLoadingPOIs ? (
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Analizando zona...</span>
              </div>
            ) : (
              <p className="text-white/50 text-sm">{poisDisplay}</p>
            )}
          </div>
        </div>

        {/* Vistas por día */}
        <div className="flex items-start gap-3">
          <Eye className="w-5 h-5 text-[#9BFF43] mt-0.5" />
          <div>
            <p className="font-medium text-white text-sm">Vistas por día</p>
            <p className="text-white/50 text-sm">{dailyViews > 0 ? `+${dailyViews.toLocaleString()}` : 'Sin datos'}</p>
          </div>
        </div>

        {/* Horas Pico */}
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-[#9BFF43] mt-0.5" />
          <div>
            <p className="font-medium text-white text-sm">Horas Pico</p>
            <p className="text-white/50 text-sm">{peakHours}</p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-start gap-3">
          <CheckCircle2 className={`w-5 h-5 mt-0.5 ${isPausedByAdmin ? 'text-orange-400' : 'text-[#9BFF43]'}`} />
          <div>
            <p className="font-medium text-white text-sm">Status</p>
            <p className={`text-sm ${isPausedByAdmin ? 'text-orange-400' : 'text-white/50'}`}>{status}</p>
          </div>
        </div>

        {/* Tamaño */}
        <div className="flex items-start gap-3">
          <Maximize className="w-5 h-5 text-[#9BFF43] mt-0.5" />
          <div>
            <p className="font-medium text-white text-sm">Tamaño</p>
            <p className="text-white/50 text-sm">{size}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerPropertyCard;