import React from 'react';
import { Pencil, Users, Eye, Clock, CheckCircle2, Maximize } from 'lucide-react';
import { Billboard } from '@/hooks/useBillboards';

interface OwnerPropertyCardProps {
  billboard: Billboard;
  onEdit: () => void;
}

const OwnerPropertyCard: React.FC<OwnerPropertyCardProps> = ({ billboard, onEdit }) => {
  // Calculate mock values for display (these would come from actual data in production)
  const dailyViews = billboard.daily_impressions || 20000;
  const peakHours = '8am-12pm';
  const status = billboard.is_available ? 'Disponible' : 'Ocupado';
  const size = `${billboard.width_m}m x ${billboard.height_m}m`;
  const pointsOfInterest = 'Plazas comerciales, Bancos, Parques.';

  return (
    <div className="bg-[#1E1E1E] rounded-2xl border border-[#9BFF43]/30 p-5 relative hover:border-[#9BFF43]/60 hover:shadow-[0_0_30px_rgba(155,255,67,0.15)] transition-all">
      {/* Image */}
      {billboard.image_url && (
        <div className="relative mb-4 rounded-xl overflow-hidden">
          <img 
            src={billboard.image_url} 
            alt={billboard.title}
            className="w-full h-40 object-cover"
          />
        </div>
      )}
      
      {/* Edit Button */}
      <button
        onClick={onEdit}
        className="absolute top-4 right-4 text-white/60 hover:text-[#9BFF43] transition-colors bg-[#2A2A2A] p-2 rounded-lg"
      >
        <Pencil className="w-4 h-4" />
      </button>

      {/* Title & Address */}
      <div className="mb-4 pr-10">
        <h3 className="font-bold text-white text-lg">{billboard.title}</h3>
        <p className="text-white/50 text-sm">
          {billboard.address}, {billboard.city}, {billboard.state}
        </p>
      </div>

      {/* Price Bar */}
      <div className="bg-[#2A2A2A] rounded-lg px-4 py-3 mb-5 flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-white">
            ${billboard.price_per_month.toLocaleString()}
          </span>
          <span className="text-white/50 text-sm">/mes</span>
        </div>
        <span className="text-[#9BFF43] text-sm font-medium">0.39% ↑</span>
      </div>

      {/* Details Grid */}
      <div className="space-y-3">
        {/* Puntos de Interés */}
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-[#9BFF43] mt-0.5" />
          <div>
            <p className="font-medium text-white text-sm">Puntos de Interés</p>
            <p className="text-white/50 text-sm">{pointsOfInterest}</p>
          </div>
        </div>

        {/* Vistas por día */}
        <div className="flex items-start gap-3">
          <Eye className="w-5 h-5 text-[#9BFF43] mt-0.5" />
          <div>
            <p className="font-medium text-white text-sm">Vistas por día</p>
            <p className="text-white/50 text-sm">+{dailyViews.toLocaleString()}</p>
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
          <CheckCircle2 className="w-5 h-5 text-[#9BFF43] mt-0.5" />
          <div>
            <p className="font-medium text-white text-sm">Status</p>
            <p className="text-white/50 text-sm">{status}</p>
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