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
    <div className="bg-background rounded-2xl border border-border p-5 relative hover:shadow-lg transition-shadow">
      {/* Edit Button */}
      <button
        onClick={onEdit}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Pencil className="w-5 h-5" />
      </button>

      {/* Title & Address */}
      <div className="mb-4 pr-8">
        <h3 className="font-bold text-foreground text-lg">{billboard.title}</h3>
        <p className="text-muted-foreground text-sm">
          {billboard.address}, {billboard.city}, {billboard.state}
        </p>
      </div>

      {/* Price Bar */}
      <div className="bg-muted rounded-lg px-4 py-3 mb-5 flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-foreground">
            {billboard.price_per_month.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-sm">/mes</span>
        </div>
        <span className="text-[hsl(142,76%,36%)] text-sm font-medium">0.39% ↑</span>
      </div>

      {/* Details Grid */}
      <div className="space-y-4">
        {/* Puntos de Interés */}
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium text-foreground text-sm">Puntos de Interés</p>
            <p className="text-muted-foreground text-sm">{pointsOfInterest}</p>
          </div>
        </div>

        {/* Vistas por día */}
        <div className="flex items-start gap-3">
          <Eye className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium text-foreground text-sm">Vistas por día</p>
            <p className="text-muted-foreground text-sm">+{dailyViews.toLocaleString()}</p>
          </div>
        </div>

        {/* Horas Pico */}
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium text-foreground text-sm">Horas Pico</p>
            <p className="text-muted-foreground text-sm">{peakHours}</p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium text-foreground text-sm">Status</p>
            <p className="text-muted-foreground text-sm">{status}</p>
          </div>
        </div>

        {/* Tamaño */}
        <div className="flex items-start gap-3">
          <Maximize className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium text-foreground text-sm">Tamaño</p>
            <p className="text-muted-foreground text-sm">{size}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerPropertyCard;
