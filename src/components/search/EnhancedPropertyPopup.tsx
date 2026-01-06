import React from 'react';
import { X, MapPin, Eye, Car, Clock, Building2, TrendingUp, ChevronRight, Plus, Store, Wallet } from 'lucide-react';
import { getTrafficLevel, formatViews } from './EnhancedPropertyMarker';

interface INEGIData {
  socioeconomicLevel: 'bajo' | 'medio' | 'medio-alto' | 'alto';
  nearbyBusinessesCount: number;
  dominantSector: string;
  audienceProfile?: string;
}

interface EnhancedPropertyPopupProps {
  property: {
    id: string;
    name: string;
    address: string;
    price: string;
    viewsPerDay: string;
    pointsOfInterest: string;
    peakHours: string;
    size: string;
    status: string;
    availability: string;
    imageUrl?: string | null;
  };
  trafficData?: {
    avgFlow: number;
    currentSpeed: number;
    freeFlowSpeed: number;
    congestionLevel: number;
  };
  nearbyPOIs?: Array<{ name: string; category: string; distance: number }>;
  inegiData?: INEGIData | null;
  isLoadingInegi?: boolean;
  onClose: () => void;
  onReserve: () => void;
  onViewDetails: () => void;
  onAddToCompare: () => void;
  isInCompare?: boolean;
}

const SOCIOECONOMIC_COLORS: Record<string, string> = {
  'bajo': '#F97316',
  'medio': '#EAB308',
  'medio-alto': '#84CC16',
  'alto': '#22C55E',
};

const SOCIOECONOMIC_LABELS: Record<string, string> = {
  'bajo': 'Bajo',
  'medio': 'Medio',
  'medio-alto': 'Medio-Alto',
  'alto': 'Alto',
};

const SOCIOECONOMIC_PERCENT: Record<string, number> = {
  'bajo': 25,
  'medio': 50,
  'medio-alto': 75,
  'alto': 100,
};

const EnhancedPropertyPopup: React.FC<EnhancedPropertyPopupProps> = ({ 
  property, 
  trafficData,
  nearbyPOIs = [],
  inegiData,
  isLoadingInegi,
  onClose, 
  onReserve,
  onViewDetails,
  onAddToCompare,
  isInCompare = false
}) => {
  const viewsNumber = parseInt(property.viewsPerDay.replace(/[^0-9]/g, '')) || 0;
  const traffic = getTrafficLevel(viewsNumber);
  
  // Estimate traffic flow if not provided
  const estimatedFlow = trafficData?.avgFlow || Math.round(viewsNumber / 12);
  const congestionLevel = trafficData?.congestionLevel || Math.min(100, Math.round((viewsNumber / 50000) * 100));

  return (
    <div className="bg-[#1A1A1A] rounded-2xl overflow-hidden shadow-2xl w-[380px] border border-white/10">
      {/* Compact Header */}
      <div className="relative h-32 bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A]">
        {property.imageUrl ? (
          <img 
            src={property.imageUrl} 
            alt={property.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-12 h-12 bg-[#9BFF43]/20 rounded-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-[#9BFF43]" />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent" />
        
        {/* Traffic Level Badge */}
        <div 
          className="absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-bold uppercase"
          style={{ backgroundColor: traffic.color, color: '#202020' }}
        >
          Tráfico {traffic.level}
        </div>
        
        <div className="absolute bottom-2 left-3 right-3">
          <h3 className="text-white font-bold text-base drop-shadow-lg truncate">{property.name}</h3>
          <p className="text-white/60 text-xs truncate">{property.address}</p>
        </div>
        
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Key Metrics Grid */}
      <div className="p-4">
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-[#2A2A2A] rounded-xl p-2.5 text-center">
            <Eye className="w-4 h-4 text-[#9BFF43] mx-auto mb-1" />
            <p className="text-white font-bold text-sm">{property.viewsPerDay}</p>
            <p className="text-white/50 text-[9px]">Vistas/Día</p>
          </div>
          <div className="bg-[#2A2A2A] rounded-xl p-2.5 text-center">
            <Car className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <p className="text-white font-bold text-sm">{formatViews(estimatedFlow)}</p>
            <p className="text-white/50 text-[9px]">Flujo/Hora</p>
          </div>
          <div className="bg-[#2A2A2A] rounded-xl p-2.5 text-center">
            <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <p className="text-white font-bold text-sm">{property.peakHours.split('-')[0]}</p>
            <p className="text-white/50 text-[9px]">Hora Pico</p>
          </div>
          <div className="bg-[#2A2A2A] rounded-xl p-2.5 text-center">
            <Building2 className="w-4 h-4 text-purple-400 mx-auto mb-1" />
            <p className="text-white font-bold text-sm">{property.pointsOfInterest}</p>
            <p className="text-white/50 text-[9px]">POIs</p>
          </div>
        </div>

        {/* Traffic Flow Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/60 text-xs">Nivel de tráfico</span>
            <span className="text-white text-xs font-medium">{congestionLevel}%</span>
          </div>
          <div className="h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${congestionLevel}%`,
                backgroundColor: traffic.color
              }}
            />
          </div>
        </div>

        {/* Nearby POIs */}
        {nearbyPOIs.length > 0 && (
          <div className="mb-4">
            <p className="text-white/60 text-xs mb-2">POIs cercanos:</p>
            <div className="flex flex-wrap gap-1">
              {nearbyPOIs.slice(0, 4).map((poi, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-[#2A2A2A] text-white/70 text-[10px] rounded-full">
                  {poi.name} ({poi.distance}m)
                </span>
              ))}
              {nearbyPOIs.length > 4 && (
                <span className="px-2 py-0.5 bg-[#2A2A2A] text-[#9BFF43] text-[10px] rounded-full">
                  +{nearbyPOIs.length - 4} más
                </span>
              )}
            </div>
          </div>
        )}

        {/* INEGI Zone Profile */}
        {isLoadingInegi && (
          <div className="mb-4 p-3 bg-[#2A2A2A] rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-[#9BFF43] border-t-transparent rounded-full animate-spin" />
              <span className="text-white/60 text-xs">Analizando zona...</span>
            </div>
          </div>
        )}
        
        {inegiData && !isLoadingInegi && (
          <div className="mb-4 p-3 bg-[#2A2A2A] rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-[#9BFF43]" />
              <span className="text-white text-xs font-medium">Perfil de Zona</span>
            </div>
            
            {/* Socioeconomic Level */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/60 text-[10px]">Nivel Socioeconómico</span>
                <span 
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ 
                    backgroundColor: SOCIOECONOMIC_COLORS[inegiData.socioeconomicLevel] + '20',
                    color: SOCIOECONOMIC_COLORS[inegiData.socioeconomicLevel]
                  }}
                >
                  {SOCIOECONOMIC_LABELS[inegiData.socioeconomicLevel]}
                </span>
              </div>
              <div className="h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${SOCIOECONOMIC_PERCENT[inegiData.socioeconomicLevel]}%`,
                    backgroundColor: SOCIOECONOMIC_COLORS[inegiData.socioeconomicLevel]
                  }}
                />
              </div>
            </div>
            
            {/* Business Stats */}
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1 text-white/70">
                <Store className="w-3 h-3" />
                <span>{inegiData.nearbyBusinessesCount} negocios</span>
              </div>
              <span className="text-white/40">|</span>
              <span className="text-white/70 truncate">{inegiData.dominantSector}</span>
            </div>
          </div>
        )}

        {/* Price */}
        <div className="bg-[#2A2A2A] rounded-xl py-2.5 px-4 flex items-center justify-between mb-4">
          <div>
            <span className="text-white text-xl font-bold">{property.price}</span>
            <span className="text-white/50 text-sm">/mes</span>
          </div>
          <div className="flex items-center gap-1 text-[#9BFF43]">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Alto ROI</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onAddToCompare}
            className={`p-2.5 rounded-xl transition-colors ${
              isInCompare 
                ? 'bg-blue-500 text-white' 
                : 'bg-[#2A2A2A] text-white/70 hover:text-white hover:bg-[#3A3A3A]'
            }`}
            title={isInCompare ? 'En comparador' : 'Agregar a comparar'}
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={onViewDetails}
            className="flex-1 py-2.5 rounded-xl bg-[#2A2A2A] text-white font-medium text-sm hover:bg-[#3A3A3A] transition-colors flex items-center justify-center gap-2"
          >
            Ver Detalles
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={onReserve}
            className="flex-1 py-2.5 rounded-xl bg-[#9BFF43] text-[#1A1A1A] font-bold text-sm hover:bg-[#8AE63A] transition-colors"
          >
            Reservar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPropertyPopup;
