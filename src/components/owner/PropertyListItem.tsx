import React from 'react';
import { Billboard } from '@/hooks/useBillboards';
import { MapPin, Calendar, Eye, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PropertyListItemProps {
  billboard: Billboard;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const PropertyListItem: React.FC<PropertyListItemProps> = ({ 
  billboard, 
  onClick,
  onEdit,
  onDelete 
}) => {
  return (
    <div 
      className="bg-[#1E1E1E] rounded-xl border border-white/10 p-4 cursor-pointer hover:border-[#9BFF43]/30 hover:shadow-[0_0_20px_rgba(155,255,67,0.05)] transition-all"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {/* Image */}
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#2A2A2A]">
          {billboard.image_url ? (
            <img 
              src={billboard.image_url} 
              alt={billboard.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white/20" />
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-white truncate">{billboard.title}</h4>
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
              billboard.pause_reason === 'admin'
                ? 'bg-orange-500/20 text-orange-400'
                : billboard.is_available 
                  ? 'bg-[#9BFF43]/20 text-[#9BFF43]' 
                  : 'bg-orange-500/20 text-orange-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                billboard.pause_reason === 'admin' ? 'bg-orange-400' : billboard.is_available ? 'bg-[#9BFF43]' : 'bg-orange-400'
              }`}></span>
              {billboard.pause_reason === 'admin' ? 'Pausada por Maddi' : billboard.is_available ? 'Disponible' : 'Ocupado'}
            </span>
          </div>
          <p className="text-white/50 text-sm truncate flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {billboard.address}, {billboard.city}
          </p>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {billboard.daily_impressions 
                ? `${(billboard.daily_impressions / 1000).toFixed(0)}K vistas/día`
                : 'Sin datos'
              }
            </span>
            <span>{billboard.width_m}×{billboard.height_m}m</span>
            <span className="capitalize">{billboard.billboard_type}</span>
          </div>
        </div>
        
        {/* Price */}
        <div className="text-right flex-shrink-0">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-[#9BFF43]">
              ${billboard.price_per_month.toLocaleString()}
            </span>
            <span className="text-white/50 text-sm">/mes</span>
          </div>
        </div>
        
        {/* Actions */}
        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40 hover:text-white hover:bg-white/10">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#2A2A2A] border-white/10">
              {onEdit && (
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="text-white hover:bg-white/10 gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-red-400 hover:bg-red-500/10 gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export default PropertyListItem;
