import React, { useState } from 'react';
import { Calendar, Users, MapPin, Clock, Check, X, ChevronRight, Ban, MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDateOnlyStart, parseDateOnlyEnd, getTodayStart } from '@/lib/dateUtils';

interface CampaignCardProps {
  booking: {
    id: string;
    billboard_id: string;
    start_date: string;
    end_date: string;
    total_price: number;
    status: string;
    billboard?: {
      title: string;
      address: string;
      city: string;
      image_url: string | null;
      daily_impressions?: number | null;
    };
    ad_design_url?: string | null;
  };
  onSelect: (id: string) => void;
  isActive?: boolean;
  onCancel?: (id: string) => void;
}

const CampaignCard: React.FC<CampaignCardProps> = ({ booking, onSelect, isActive = false, onCancel }) => {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const startDate = parseDateOnlyStart(booking.start_date);
  const endDate = parseDateOnlyEnd(booking.end_date);
  const now = getTodayStart();
  
  const isOngoing = booking.status === 'approved' && isBefore(startDate, now) && isAfter(endDate, now);
  const isScheduled = booking.status === 'approved' && isAfter(startDate, now);
  const isPast = booking.status === 'approved' && isBefore(endDate, now);
  const isPending = booking.status === 'pending';
  const isRejected = booking.status === 'rejected';
  const isCancelled = booking.status === 'cancelled';

  const totalDays = differenceInDays(endDate, startDate) + 1;
  const estimatedImpressions = (booking.billboard?.daily_impressions || 1000) * totalDays;

  const getStatusBadge = () => {
    if (isOngoing) {
      return (
        <Badge className="bg-primary text-primary-foreground gap-1">
          <span className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />
          Activa
        </Badge>
      );
    }
    if (isScheduled) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Calendar className="w-3 h-3" />
          Programada
        </Badge>
      );
    }
    if (isPending) {
      return (
        <Badge variant="outline" className="border-warning text-warning gap-1">
          <Clock className="w-3 h-3" />
          Pendiente
        </Badge>
      );
    }
    if (isRejected) {
      return (
        <Badge variant="outline" className="border-destructive text-destructive gap-1">
          <X className="w-3 h-3" />
          Rechazada
        </Badge>
      );
    }
    if (isCancelled) {
      return (
        <Badge variant="outline" className="border-muted-foreground text-muted-foreground gap-1">
          <Ban className="w-3 h-3" />
          Cancelada
        </Badge>
      );
    }
    if (isPast) {
      return (
        <Badge variant="outline" className="gap-1">
          <Check className="w-3 h-3" />
          Finalizada
        </Badge>
      );
    }
    return null;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${Math.round(num / 1000)}K`;
    return num.toLocaleString();
  };

  return (
    <>
      <div
        className={`w-full text-left bg-card border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/50 relative ${
          isActive ? 'ring-2 ring-primary border-primary' : 'border-border'
        }`}
      >
        <button onClick={() => onSelect(booking.id)} className="w-full text-left">
          <div className="flex flex-col md:flex-row">
            {/* Image */}
            <div className="w-full md:w-40 h-32 md:h-auto flex-shrink-0 relative">
              {booking.billboard?.image_url ? (
                <img
                  src={booking.billboard.image_url}
                  alt={booking.billboard?.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              {isOngoing && (
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                    EN VIVO
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 p-4 pr-12">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {booking.billboard?.title || 'Espectacular'}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {booking.billboard?.city}
                  </p>
                </div>
                {getStatusBadge()}
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(startDate, 'd MMM', { locale: es })} - {format(endDate, 'd MMM yyyy', { locale: es })}
                </span>
              </div>

              {(isOngoing || isPast) && (
                <div className="flex items-center gap-1 text-sm">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-foreground font-medium">{formatNumber(estimatedImpressions)}</span>
                  <span className="text-muted-foreground">personas impactadas</span>
                </div>
              )}
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center pr-4">
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </button>

        {/* 3-dot menu */}
        {onCancel && (
          <div className="absolute top-3 right-3 z-10">
            <Popover open={menuOpen} onOpenChange={setMenuOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 p-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    setShowCancelDialog(true);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                >
                  <Ban className="w-4 h-4" />
                  Cancelar solicitud
                </button>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">¿Cancelar solicitud?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Se cancelará tu solicitud para "{booking.billboard?.title}". El propietario será notificado. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onCancel?.(booking.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar solicitud
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CampaignCard;
