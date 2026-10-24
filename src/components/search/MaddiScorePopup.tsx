import React from 'react';
import { X, MapPin, GitCompare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TrafficData {
  currentSpeed?: number;
  freeFlowSpeed?: number;
  confidence?: number;
}

interface CategoryDistribution {
  label: string;
  percentage: number;
  count: number;
}


interface INEGIData {
  socioeconomicLevel?: string;
  nearbyBusinessesCount?: number;
  dominantSector?: string;
  businessSectors?: Record<string, number>;
  audienceProfile?: string;
  commercialEnvironment?: string;
  rawDenueData?: {
    distribution?: CategoryDistribution[];
    known_brands?: string[];
    interpretation?: string;
    zone_type?: 'mixed' | 'specialized' | 'limited';
  };
}

interface MaddiScorePopupProps {
  property: {
    id: string;
    title: string;
    address: string;
    city: string;
    price_per_month: number;
    image_url?: string;
    daily_impressions?: number;
    billboard_type?: string;
    size?: string;
    peak_hours?: string;
    availability?: string;
  };
  faces?: Array<{ id: string; label: string }>;
  activeFaceId?: string;
  onFaceChange?: (id: string) => void;
  trafficData?: TrafficData;
  inegiData?: INEGIData;
  isLoadingTraffic?: boolean;
  isLoadingInegi?: boolean;
  onClose: () => void;
  onCompare?: (id: string) => void;
  isSelected?: boolean;
}

/** Costo por 1,000 vistas (mensual: vistas/día × 30). null si falta algún dato. */
export function costPerThousand(price?: number, dailyViews?: number): number | null {
  if (!price || !dailyViews) return null;
  return price / ((dailyViews * 30) / 1000);
}

const MaddiScorePopup: React.FC<MaddiScorePopupProps> = ({ property, onClose, onCompare, isSelected = false, faces, activeFaceId, onFaceChange }) => {
  const navigate = useNavigate();
  const cpm = costPerThousand(property.price_per_month, property.daily_impressions);
  const size = property.size && property.size.trim() && !/^n\/?a$/i.test(property.size.trim()) ? property.size : null;

  return (
    <div className="flex w-[460px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      {/* Photo */}
      <div className="relative w-[140px] flex-shrink-0 bg-secondary">
        {property.image_url ? (
          <img src={property.image_url} alt={property.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center"><MapPin className="h-6 w-6 text-muted-foreground" /></div>
        )}
        {size && (
          <span className="absolute left-2 top-2 rounded-full bg-card/95 px-2.5 py-1 text-[10.5px] font-semibold text-foreground shadow-sm">{size}</span>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold text-foreground">{property.title}</h3>
            <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{property.address}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="-mr-1 -mt-1 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {faces && faces.length > 1 && (
          <div className="mt-2 flex gap-1.5">
            {faces.map((f) => (
              <button
                key={f.id}
                onClick={() => onFaceChange?.(f.id)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                  f.id === activeFaceId ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-foreground">${property.price_per_month?.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">/mes</span>
        </div>
        {cpm !== null && (
          <span className="mt-1 inline-block rounded-full bg-primary/20 px-2.5 py-0.5 text-[11.5px] font-semibold text-foreground">
            ≈ ${Math.round(cpm).toLocaleString()} por 1,000 vistas
          </span>
        )}

        <div className="mb-3.5 mt-3 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11.5px] text-muted-foreground">
          {!!property.daily_impressions && (
            <span><b className="text-foreground">{property.daily_impressions.toLocaleString()}</b> vistas/día</span>
          )}
          {property.peak_hours && <span>Horario <b className="text-foreground">{property.peak_hours}</b></span>}
          {property.availability && <span className="font-semibold text-primary">● {property.availability}</span>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/billboard/${property.id}`)}
            className="flex-1 rounded-full bg-primary py-2 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Ver detalles
          </button>
          <button
            onClick={() => navigate(`/billboard/${property.id}?book=true`)}
            className="rounded-full border border-border px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Reservar
          </button>
          <button
            onClick={() => onCompare?.(property.id)}
            aria-label={isSelected ? 'Quitar del comparador' : 'Agregar al comparador'}
            title={isSelected ? 'Quitar del comparador' : 'Comparar'}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground hover:bg-secondary'}`}
          >
            <GitCompare className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaddiScorePopup;
