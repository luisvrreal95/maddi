import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, AlertCircle, Info, Clock, Calendar as CalendarDays } from 'lucide-react';
import { format, differenceInDays, differenceInMonths, addMonths, addDays, isWithinInterval, parseISO, areIntervalsOverlapping, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Billboard } from '@/hooks/useBillboards';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billboard: Billboard;
}

interface ExistingBooking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
}

const BookingDialog: React.FC<BookingDialogProps> = ({
  open,
  onOpenChange,
  billboard,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get booking constraints from billboard (default: 0 min campaign, 7 advance)
  const minCampaignDays = (billboard as any).min_campaign_days ?? 0;
  const minAdvanceBookingDays = (billboard as any).min_advance_booking_days ?? 7;
  
  // Calculate earliest possible start date
  const earliestStartDate = addDays(new Date(), minAdvanceBookingDays);
  
  // Default dates based on constraints
  const [startDate, setStartDate] = useState<Date | undefined>(earliestStartDate);
  const [endDate, setEndDate] = useState<Date | undefined>(addDays(earliestStartDate, minCampaignDays));
  const [notes, setNotes] = useState('');
  const [adDesignUrl, setAdDesignUrl] = useState('');
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [dateConflict, setDateConflict] = useState(false);
  const [durationError, setDurationError] = useState(false);

  // Redirect to auth if user is not logged in
  useEffect(() => {
    if (open && !user) {
      toast.error('Debes iniciar sesión para reservar');
      onOpenChange(false);
      navigate('/auth');
    }
  }, [open, user, navigate, onOpenChange]);

  // Reset dates when dialog opens
  useEffect(() => {
    if (open) {
      const earliest = addDays(new Date(), minAdvanceBookingDays);
      setStartDate(earliest);
      setEndDate(addDays(earliest, minCampaignDays));
      fetchExistingBookings();
    }
  }, [open, billboard.id, minAdvanceBookingDays, minCampaignDays]);

  useEffect(() => {
    // Check for date conflicts and duration
    if (startDate && endDate) {
      // Check minimum duration (only if minCampaignDays > 0)
      const campaignDays = differenceInDays(endDate, startDate);
      setDurationError(minCampaignDays > 0 && campaignDays < minCampaignDays);
      
      // Check for conflicts with existing bookings
      if (existingBookings.length > 0) {
        const hasConflict = existingBookings.some((booking) => {
          if (booking.status === 'rejected') return false;
          const bookingStart = parseISO(booking.start_date);
          const bookingEnd = parseISO(booking.end_date);
          return areIntervalsOverlapping(
            { start: startDate, end: endDate },
            { start: bookingStart, end: bookingEnd }
          );
        });
        setDateConflict(hasConflict);
      } else {
        setDateConflict(false);
      }
    } else {
      setDateConflict(false);
      setDurationError(false);
    }
  }, [startDate, endDate, existingBookings, minCampaignDays]);

  const fetchExistingBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('id, start_date, end_date, status')
      .eq('billboard_id', billboard.id)
      .in('status', ['approved', 'pending']);
    
    if (data) setExistingBookings(data);
  };

  const isDateBooked = (date: Date): 'booked' | 'pending' | null => {
    for (const booking of existingBookings) {
      if (booking.status === 'rejected') continue;
      const start = parseISO(booking.start_date);
      const end = parseISO(booking.end_date);
      if (isWithinInterval(date, { start, end })) {
        return booking.status === 'approved' ? 'booked' : 'pending';
      }
    }
    return null;
  };
  
  // Check if date is within advance booking restriction
  const isDateTooSoon = (date: Date): boolean => {
    return isBefore(date, earliestStartDate);
  };

  const months = startDate && endDate 
    ? Math.max(1, differenceInMonths(endDate, startDate) + 1)
    : 1;
  const totalPrice = months * Number(billboard.price_per_month);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast.error('Selecciona fechas de inicio y fin');
      return;
    }

    if (endDate <= startDate) {
      toast.error('La fecha de fin debe ser posterior a la de inicio');
      return;
    }

    if (dateConflict) {
      toast.error('Las fechas seleccionadas ya están ocupadas');
      return;
    }
    
    if (durationError) {
      toast.error(`La duración mínima de la campaña es ${minCampaignDays} días`);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('bookings')
        .insert({
          billboard_id: billboard.id,
          business_id: user?.id,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          total_price: totalPrice,
          status: 'pending',
          notes: notes || null,
          ad_design_url: adDesignUrl || null,
        });

      if (error) throw error;

      toast.success('Solicitud de reserva enviada. El propietario la revisará.');
      onOpenChange(false);
      setNotes('');
      setAdDesignUrl('');
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast.error(error.message || 'Error al crear la reserva');
    } finally {
      setIsLoading(false);
    }
  };

  const calendarModifiers = {
    booked: (date: Date) => isDateBooked(date) === 'booked',
    pending: (date: Date) => isDateBooked(date) === 'pending',
    tooSoon: (date: Date) => isDateTooSoon(date) && !isDateBooked(date),
  };

  const calendarModifiersClassNames = {
    booked: 'bg-red-500/30 text-red-300',
    pending: 'bg-yellow-500/30 text-yellow-300',
    tooSoon: 'bg-gray-500/20 text-gray-400 line-through',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#2A2A2A] border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Solicitar Reserva</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-[#1A1A1A] rounded-xl p-4 mb-4">
            <p className="text-white/60 text-sm">Espectacular</p>
            <p className="text-white font-bold">{billboard.title}</p>
            <p className="text-[#9BFF43] font-bold mt-1">
              ${billboard.price_per_month.toLocaleString()}/mes
            </p>
          </div>
          
          {/* Booking Constraints Info */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
              <Info className="w-4 h-4" />
              Requisitos de reserva
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <CalendarDays className="w-4 h-4 text-blue-400" />
                <span>Mínimo <strong className="text-white">{minCampaignDays} días</strong></span>
              </div>
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Reservar con <strong className="text-white">{minAdvanceBookingDays} días</strong> de anticipación</span>
              </div>
            </div>
            <p className="text-white/50 text-xs mt-2">
              El propietario necesita tiempo para aprobar, preparar e instalar tu anuncio.
            </p>
          </div>

          {/* Date Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Fecha inicio</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-[#1A1A1A] border-white/10",
                      !startDate && "text-white/50"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP", { locale: es }) : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#2A2A2A] border-white/10">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < earliestStartDate || isDateBooked(date) === 'booked'}
                    modifiers={calendarModifiers}
                    modifiersClassNames={calendarModifiersClassNames}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Fecha fin</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-[#1A1A1A] border-white/10",
                      !endDate && "text-white/50"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP", { locale: es }) : "Seleccionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#2A2A2A] border-white/10">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => {
                      const minEndDate = startDate ? addDays(startDate, minCampaignDays - 1) : earliestStartDate;
                      return date < minEndDate || isDateBooked(date) === 'booked';
                    }}
                    modifiers={calendarModifiers}
                    modifiersClassNames={calendarModifiersClassNames}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Date conflict warning */}
          {dateConflict && (
            <div className="flex items-center gap-2 bg-red-500/20 text-red-400 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Las fechas seleccionadas se solapan con una reserva existente</span>
            </div>
          )}
          
          {/* Duration error warning */}
          {durationError && !dateConflict && (
            <div className="flex items-center gap-2 bg-orange-500/20 text-orange-400 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">La duración mínima de la campaña es {minCampaignDays} días</span>
            </div>
          )}

          <div>
            <Label htmlFor="adDesignUrl">URL del diseño publicitario</Label>
            <Input
              id="adDesignUrl"
              value={adDesignUrl}
              onChange={(e) => setAdDesignUrl(e.target.value)}
              className="bg-[#1A1A1A] border-white/10"
              placeholder="https://..."
            />
            <p className="text-white/40 text-xs mt-1">Link a tu diseño (Drive, Dropbox, etc.)</p>
          </div>

          <div>
            <Label htmlFor="notes">Notas adicionales</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-[#1A1A1A] border-white/10"
              placeholder="Información adicional para el propietario..."
              rows={3}
            />
          </div>

          {/* Price Summary */}
          <div className="bg-[#9BFF43]/10 rounded-xl p-4">
            <div className="flex justify-between text-white/70 mb-2">
              <span>{months} mes{months > 1 ? 'es' : ''} × ${billboard.price_per_month.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-white font-bold text-lg">
              <span>Total</span>
              <span className="text-[#9BFF43]">${totalPrice.toLocaleString()} MXN</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || dateConflict || durationError}
              className="flex-1 bg-[#9BFF43] text-[#202020] hover:bg-[#8AE63A] disabled:opacity-50"
            >
              {isLoading ? 'Enviando...' : 'Enviar Solicitud'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
