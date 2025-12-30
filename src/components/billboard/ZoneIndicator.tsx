import React from 'react';
import { 
  Utensils, 
  Hotel, 
  ShoppingBag, 
  Building2, 
  GraduationCap, 
  Stethoscope,
  Car,
  Plane,
  MapPin,
  Landmark,
  PartyPopper,
  Dumbbell
} from 'lucide-react';

interface ZoneIndicatorProps {
  pointsOfInterest: string[] | null;
  className?: string;
}

interface ZoneInfo {
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

// Zone classification based on POI categories
const ZONE_CLASSIFICATIONS: Record<string, { keywords: string[]; zone: ZoneInfo }> = {
  restaurants: {
    keywords: ['restaurante', 'restaurant', 'café', 'cafetería', 'bar', 'comida', 'food', 'taquería', 'pizzería'],
    zone: { 
      name: 'Zona Gastronómica', 
      icon: Utensils, 
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/10'
    }
  },
  hotels: {
    keywords: ['hotel', 'hostal', 'motel', 'resort', 'hospedaje', 'airbnb'],
    zone: { 
      name: 'Zona Hotelera', 
      icon: Hotel, 
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10'
    }
  },
  shopping: {
    keywords: ['plaza', 'centro comercial', 'mall', 'tienda', 'store', 'boutique', 'supermercado', 'walmart', 'soriana', 'chedraui'],
    zone: { 
      name: 'Zona Comercial', 
      icon: ShoppingBag, 
      color: 'text-pink-400',
      bgColor: 'bg-pink-400/10'
    }
  },
  corporate: {
    keywords: ['oficina', 'office', 'corporativo', 'empresa', 'banco', 'bank', 'financiera'],
    zone: { 
      name: 'Zona Corporativa', 
      icon: Building2, 
      color: 'text-slate-400',
      bgColor: 'bg-slate-400/10'
    }
  },
  education: {
    keywords: ['escuela', 'universidad', 'colegio', 'instituto', 'school', 'university', 'campus', 'preparatoria'],
    zone: { 
      name: 'Zona Educativa', 
      icon: GraduationCap, 
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-400/10'
    }
  },
  health: {
    keywords: ['hospital', 'clínica', 'clinic', 'médico', 'farmacia', 'pharmacy', 'consultorio', 'salud'],
    zone: { 
      name: 'Zona Médica', 
      icon: Stethoscope, 
      color: 'text-red-400',
      bgColor: 'bg-red-400/10'
    }
  },
  automotive: {
    keywords: ['gasolinera', 'gas station', 'taller', 'autozone', 'refacciones', 'lavado', 'agencia'],
    zone: { 
      name: 'Zona Automotriz', 
      icon: Car, 
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10'
    }
  },
  transport: {
    keywords: ['aeropuerto', 'airport', 'terminal', 'estación', 'metro', 'bus', 'central'],
    zone: { 
      name: 'Zona de Transporte', 
      icon: Plane, 
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/10'
    }
  },
  entertainment: {
    keywords: ['cine', 'teatro', 'museo', 'parque', 'entretenimiento', 'casino', 'bowling'],
    zone: { 
      name: 'Zona de Entretenimiento', 
      icon: PartyPopper, 
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10'
    }
  },
  sports: {
    keywords: ['gimnasio', 'gym', 'estadio', 'deportivo', 'club', 'fitness', 'yoga'],
    zone: { 
      name: 'Zona Deportiva', 
      icon: Dumbbell, 
      color: 'text-green-400',
      bgColor: 'bg-green-400/10'
    }
  },
  government: {
    keywords: ['gobierno', 'municipal', 'palacio', 'presidencia', 'oficina de gobierno', 'sat', 'imss'],
    zone: { 
      name: 'Zona Gubernamental', 
      icon: Landmark, 
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10'
    }
  }
};

function classifyPOIs(pois: string[]): ZoneInfo[] {
  const zoneScores: Record<string, number> = {};
  
  pois.forEach(poi => {
    const poiLower = poi.toLowerCase();
    
    Object.entries(ZONE_CLASSIFICATIONS).forEach(([key, { keywords }]) => {
      keywords.forEach(keyword => {
        if (poiLower.includes(keyword.toLowerCase())) {
          zoneScores[key] = (zoneScores[key] || 0) + 1;
        }
      });
    });
  });

  // Get zones with scores, sorted by score
  const classifiedZones = Object.entries(zoneScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3) // Top 3 zones
    .map(([key]) => ZONE_CLASSIFICATIONS[key].zone);

  return classifiedZones;
}

const ZoneIndicator: React.FC<ZoneIndicatorProps> = ({ pointsOfInterest, className = '' }) => {
  if (!pointsOfInterest || pointsOfInterest.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <MapPin className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Sin información de zona</span>
      </div>
    );
  }

  const zones = classifyPOIs(pointsOfInterest);

  if (zones.length === 0) {
    // If no specific zone detected, show as mixed zone
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-sm">
          <MapPin className="w-4 h-4" />
          <span>Zona Mixta</span>
        </div>
        <span className="text-xs text-muted-foreground self-center">
          ({pointsOfInterest.length} puntos de interés)
        </span>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap gap-2">
        {zones.map((zone, index) => {
          const Icon = zone.icon;
          return (
            <div 
              key={index}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${zone.bgColor} ${zone.color} text-sm font-medium`}
            >
              <Icon className="w-4 h-4" />
              <span>{zone.name}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Basado en {pointsOfInterest.length} puntos de interés cercanos
      </p>
    </div>
  );
};

export default ZoneIndicator;
