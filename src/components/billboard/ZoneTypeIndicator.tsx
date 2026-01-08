import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Factory, 
  ShoppingBag, 
  Building2, 
  Home, 
  Truck, 
  Layers,
  Info
} from 'lucide-react';

export type UrbanZoneType = 
  | 'industrial'
  | 'commercial'
  | 'corporate'
  | 'residential'
  | 'transit'
  | 'mixed';

interface ZoneTypeConfig {
  icon: React.ReactNode;
  emoji: string;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  recommendedCampaigns: string[];
}

const ZONE_CONFIGS: Record<UrbanZoneType, ZoneTypeConfig> = {
  industrial: {
    icon: <Factory className="h-4 w-4" />,
    emoji: '🏭',
    label: 'Zona Industrial / Maquiladora',
    shortLabel: 'Industrial',
    description: 'Entorno dominado por actividad industrial y tránsito laboral diario',
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
    borderColor: 'border-slate-300 dark:border-slate-600',
    recommendedCampaigns: ['Reclutamiento', 'B2B', 'Servicios de nómina', 'Transporte', 'Food service'],
  },
  commercial: {
    icon: <ShoppingBag className="h-4 w-4" />,
    emoji: '🛒',
    label: 'Zona Comercial',
    shortLabel: 'Comercial',
    description: 'Alta concentración de comercios y servicios al consumidor',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    borderColor: 'border-blue-200 dark:border-blue-700',
    recommendedCampaigns: ['Retail', 'Promociones', 'Lanzamientos', 'Consumo masivo', 'Moda'],
  },
  corporate: {
    icon: <Building2 className="h-4 w-4" />,
    emoji: '🏢',
    label: 'Zona Corporativa / Oficinas',
    shortLabel: 'Corporativa',
    description: 'Concentración de oficinas y servicios profesionales',
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/30',
    borderColor: 'border-indigo-200 dark:border-indigo-700',
    recommendedCampaigns: ['B2B', 'Servicios profesionales', 'Tecnología', 'Financieros', 'Educación ejecutiva'],
  },
  residential: {
    icon: <Home className="h-4 w-4" />,
    emoji: '🏠',
    label: 'Zona Habitacional',
    shortLabel: 'Habitacional',
    description: 'Predominantemente residencial con comercio de proximidad',
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
    borderColor: 'border-emerald-200 dark:border-emerald-700',
    recommendedCampaigns: ['Servicios del hogar', 'Supermercados', 'Salud', 'Escuelas', 'Inmobiliarias'],
  },
  transit: {
    icon: <Truck className="h-4 w-4" />,
    emoji: '🚚',
    label: 'Zona de Tránsito / Logística',
    shortLabel: 'Tránsito',
    description: 'Corredor de alto flujo vehicular y actividad logística',
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    borderColor: 'border-amber-200 dark:border-amber-700',
    recommendedCampaigns: ['Automotriz', 'Gasolineras', 'Hoteles', 'Restaurantes de carretera', 'Logística'],
  },
  mixed: {
    icon: <Layers className="h-4 w-4" />,
    emoji: '🔀',
    label: 'Zona Mixta',
    shortLabel: 'Mixta',
    description: 'Combinación equilibrada de usos comerciales, residenciales y servicios',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30',
    borderColor: 'border-purple-200 dark:border-purple-700',
    recommendedCampaigns: ['Consumo masivo', 'Servicios generales', 'Entretenimiento', 'Telecomunicaciones'],
  },
};

interface ZoneTypeIndicatorProps {
  zoneType: UrbanZoneType;
  confidence?: number;
  variant?: 'full' | 'compact' | 'badge';
  showTooltip?: boolean;
  showCampaigns?: boolean;
  className?: string;
}

export const ZoneTypeIndicator = ({
  zoneType,
  confidence,
  variant = 'full',
  showTooltip = true,
  showCampaigns = false,
  className = '',
}: ZoneTypeIndicatorProps) => {
  const config = ZONE_CONFIGS[zoneType] || ZONE_CONFIGS.mixed;

  // Badge variant - minimal
  if (variant === 'badge') {
    const content = (
      <Badge 
        variant="outline" 
        className={`${config.bgColor} ${config.borderColor} ${config.color} gap-1.5 ${className}`}
      >
        <span>{config.emoji}</span>
        <span className="font-medium">{config.shortLabel}</span>
      </Badge>
    );

    if (!showTooltip) return content;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-semibold">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${config.bgColor} ${config.borderColor} border`}>
          <span className="text-base">{config.emoji}</span>
          <span className={`text-sm font-medium ${config.color}`}>{config.shortLabel}</span>
        </div>
        {showTooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-xs">{config.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Inferido con INEGI + patrones de tráfico
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  // Full variant - complete display
  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`text-2xl`}>{config.emoji}</div>
          <div>
            <h4 className={`font-semibold ${config.color}`}>{config.label}</h4>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
        {showTooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs">
                  Clasificación inferida combinando distribución de negocios INEGI, 
                  patrones de tráfico TomTom y diversidad comercial.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Confidence indicator (if provided) */}
      {confidence !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Confianza:</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                confidence >= 0.7 ? 'bg-emerald-500' : 
                confidence >= 0.5 ? 'bg-amber-500' : 'bg-orange-500'
              }`}
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium">{Math.round(confidence * 100)}%</span>
        </div>
      )}

      {/* Recommended campaigns */}
      {showCampaigns && config.recommendedCampaigns.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Campañas recomendadas para esta zona:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {config.recommendedCampaigns.map((campaign, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {campaign}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Attribution */}
      <p className="text-[10px] text-muted-foreground mt-3">
        Clasificación basada en INEGI DENUE + patrones de tráfico
      </p>
    </div>
  );
};

// Export config for use in other components
export { ZONE_CONFIGS };
