import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { AlertCircle, Info, Clock, Calendar as CalendarDays, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { format, differenceInDays, addDays, isWithinInterval, parseISO, areIntervalsOverlapping, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Billboard } from '@/hooks/useBillboards';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { DateRange } from 'react-day-picker';

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
  
  const minCampaignDays = (billboard as any).min_campaign_days ?? 0;
  const minAdvanceBookingDays = (billboard as any).min_advance_booking_days ?? 7;
  
  const earliestStartDate = addDays(new Date(), minAdvanceBookingDays);
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: earliestStartDate,
    to: addDays(earliestStartDate, Math.max(minCampaignDays, 30)),
  });
  const [message, setMessage] = useState('');
  const [notes, setNotes] = useState('');
  const [existingBookings, setExistingBookings] = useState<ExistingBooking[]>([]);
  const [dateConflict, setDateConflict] = useState(false);
  const [durationError, setDurationError] = useState(false);

  // Image attachments
  const [designImages, setDesignImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startDate = dateRange?.from;
  const endDate = dateRange?.to;

  useEffect(() => {
    if (open && !user) {
      toast.error('Debes iniciar sesión para reservar');
      onOpenChange(false);
      navigate('/auth');
    }
  }, [open, user, navigate, onOpenChange]);

  useEffect(() => {
    if (open) {
      const earliest = addDays(new Date(), minAdvanceBookingDays);
      setDateRange({
        from: earliest,
        to: addDays(earliest, Math.max(minCampaignDays, 30)),
      });
      setMessage('');
      setNotes('');
      setDesignImages([]);
      fetchExistingBookings();
    }
  }, [open, billboard.id, minAdvanceBookingDays, minCampaignDays]);

  useEffect(() => {
    if (startDate && endDate) {
      const campaignDays = differenceInDays(endDate, startDate);
      setDurationError(minCampaignDays > 0 && campaignDays < minCampaignDays);
      
      if (existingBookings.length > 0) {
        const hasConflict = existingBookings.some((booking) => {
          if (booking.status !== 'approved') return false;
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
      .in('status', ['approved']);
    
    if (data) setExistingBookings(data);
  };

  const isDateBooked = (date: Date): 'booked' | null => {
    for (const booking of existingBookings) {
      if (booking.status !== 'approved') continue;
      const start = parseISO(booking.start_date);
      const end = parseISO(booking.end_date);
      if (isWithinInterval(date, { start, end })) {
        return 'booked';
      }
    }
    return null;
  };
  
  const isDateTooSoon = (date: Date): boolean => {
    return isBefore(date, earliestStartDate);
  };

  const campaignDays = startDate && endDate ? differenceInDays(endDate, startDate) : 0;
  const monthsEquivalent = campaignDays > 0 ? Math.round((campaignDays / 30) * 100) / 100 : 0;
  const totalPrice = Math.round(monthsEquivalent * Number(billboard.price_per_month) * 100) / 100;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    const remainingSlots = 5 - designImages.length;
    if (remainingSlots <= 0) {
      toast.error('Máximo 5 imágenes de diseño');
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setIsUploadingImage(true);

    try {
      for (const file of filesToUpload) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}: Máximo 5MB`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `designs/${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('billboard-images')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (error) continue;

        const { data: urlData } = supabase.storage
          .from('billboard-images')
          .getPublicUrl(data.path);

        setDesignImages(prev => [...prev, urlData.publicUrl]);
      }
    } catch (error) {
      console.error('Error uploading:', error);
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

    if (message.trim().length < 20) {
      toast.error('El mensaje al propietario debe tener al menos 20 caracteres');
      return;
    }

    if (dateConflict) {
      toast.error('Las fechas seleccionadas ya están reservadas');
      return;
    }
    
    if (durationError) {
      toast.error(`La duración mínima de la campaña es ${minCampaignDays} días`);
      return;
    }

    // Check if billboard is paused
    if (!billboard.is_available || billboard.pause_reason) {
      toast.error('Este espectacular no está disponible actualmente');
      return;
    }

    setIsLoading(true);

    try {
      const adDesignValue = designImages.length > 0 
        ? JSON.stringify(designImages) 
        : null;

      const { data: bookingData, error } = await supabase
        .from('bookings')
        .insert({
          billboard_id: billboard.id,
          business_id: user?.id,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          total_price: totalPrice,
          status: 'pending',
          notes: message.trim() + (notes ? `\n\n--- Notas adicionales ---\n${notes}` : ''),
          ad_design_url: adDesignValue,
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-create conversation thread
      try {
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('id')
          .eq('billboard_id', billboard.id)
          .eq('business_id', user?.id)
          .eq('owner_id', billboard.owner_id)
          .maybeSingle();

        let conversationId: string;

        if (existingConv) {
          conversationId = existingConv.id;
        } else {
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({
              billboard_id: billboard.id,
              business_id: user?.id,
              owner_id: billboard.owner_id,
            })
            .select('id')
            .single();

          if (convError) throw convError;
          conversationId = newConv.id;
        }

        await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: user?.id,
          content: `📋 Nueva solicitud de campaña para "${billboard.title}"\n\n📅 ${format(startDate, 'd MMM yyyy', { locale: es })} — ${format(endDate, 'd MMM yyyy', { locale: es })}\n💰 Total: $${totalPrice.toLocaleString()} MXN\n\n${message.trim()}`,
        });
      } catch (chatError) {
        console.error('Error creating conversation:', chatError);
      }

      // Send notification email
      try {
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('full_name, company_name')
          .eq('user_id', billboard.owner_id)
          .maybeSingle();
        
        const { data: businessProfile } = await supabase
          .from('profiles')
          .select('full_name, company_name')
          .eq('user_id', user?.id)
          .maybeSingle();

        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'booking_request',
            recipientName: ownerProfile?.full_name || 'Propietario',
            data: {
              billboardTitle: billboard.title,
              businessName: businessProfile?.company_name || businessProfile?.full_name || 'Anunciante',
              startDate: format(startDate, 'd MMM yyyy', { locale: es }),
              endDate: format(endDate, 'd MMM yyyy', { locale: es }),
              totalPrice: totalPrice,
              ownerId: billboard.owner_id,
            }
          }
        });
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
      }

      toast.success(
        'Tu solicitud fue enviada. El propietario revisará tu propuesta y podrá contactarte para coordinar detalles y pago.',
        { duration: 6000 }
      );
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast.error(error.message || 'Error al crear la reserva');
    } finally {
      setIsLoading(false);
    }
  };

  const calendarModifiers = {
    booked: (date: Date) => isDateBooked(date) === 'booked',
    tooSoon: (date: Date) => isDateTooSoon(date) && !isDateBooked(date),
  };

  const calendarModifiersClassNames = {
    booked: 'bg-red-500/30 text-red-300',
    tooSoon: 'bg-gray-500/20 text-gray-400 line-through',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#2A2A2A] border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Solicitar Campaña</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-[#1A1A1A] rounded-xl p-4 mb-4">
            <p className="text-white/60 text-sm">Espectacular</p>
            <p className="text-white font-bold">{billboard.title}</p>
            <p className="text-[#9BFF43] font-bold mt-1">
              ${billboard.price_per_month.toLocaleString()}/mes
            </p>
          </div>
          
          {(minCampaignDays > 0 || minAdvanceBookingDays > 0) && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                <Info className="w-4 h-4" />
                Requisitos de reserva
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {minCampaignDays > 0 && (
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <CalendarDays className="w-4 h-4 text-blue-400" />
                    <span>Mínimo <strong className="text-white">{minCampaignDays} días</strong></span>
                  </div>
                )}
                {minAdvanceBookingDays > 0 && (
                  <div className="flex items-center gap-2 text-white/70 text-sm">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span>Reservar con <strong className="text-white">{minAdvanceBookingDays} días</strong> de anticipación</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calendar with range selection - click to select start, click again for end */}
          <div>
            <Label className="mb-2 block">Selecciona rango de fechas</Label>
            <p className="text-white/50 text-xs mb-2">Haz clic en una fecha para establecer el inicio, luego en otra para el fin.</p>
            <div className="bg-[#1A1A1A] rounded-xl p-2 border border-white/10">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                disabled={(date) => date < earliestStartDate || isDateBooked(date) === 'booked'}
                modifiers={calendarModifiers}
                modifiersClassNames={calendarModifiersClassNames}
                locale={es}
                numberOfMonths={1}
                className="pointer-events-auto"
              />
            </div>
            {startDate && endDate && (
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-white/60">Desde</span>
                <span className="text-white font-medium">{format(startDate, 'd MMM yyyy', { locale: es })}</span>
                <span className="text-white/60">hasta</span>
                <span className="text-white font-medium">{format(endDate, 'd MMM yyyy', { locale: es })}</span>
              </div>
            )}
          </div>

          {dateConflict && (
            <div className="flex items-center gap-2 bg-red-500/20 text-red-400 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Las fechas seleccionadas ya están reservadas</span>
            </div>
          )}
          
          {durationError && !dateConflict && (
            <div className="flex items-center gap-2 bg-orange-500/20 text-orange-400 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">La duración mínima de la campaña es {minCampaignDays} días</span>
            </div>
          )}

          {/* Required message to owner */}
          <div>
            <Label htmlFor="message" className="flex items-center gap-1">
              Mensaje al propietario <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-[#1A1A1A] border-white/10 mt-1"
              placeholder="Cuéntale al propietario sobre tu marca, qué quieres anunciar y cualquier detalle importante..."
              rows={4}
              maxLength={1000}
            />
            <p className={cn(
              "text-xs mt-1",
              message.trim().length < 20 ? "text-orange-400" : "text-white/40"
            )}>
              {message.trim().length}/1000 caracteres (mínimo 20)
            </p>
          </div>

          {/* Compact design upload section */}
          <div className="bg-[#1A1A1A] rounded-xl p-3 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-4 h-4 text-[#9BFF43]" />
              <Label className="text-xs font-medium">¿Ya cuentas con diseño?</Label>
              <span className="text-xs text-white/40 bg-white/5 px-1.5 py-0.5 rounded-full ml-auto">Opcional</span>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {designImages.map((url, index) => (
                <div key={url} className="relative w-14 h-14 rounded-lg overflow-hidden border border-white/10 group">
                  <img src={url} alt={`Diseño ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setDesignImages(prev => prev.filter((_, i) => i !== index))}
                    className="absolute top-0.5 right-0.5 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </div>
              ))}
              {designImages.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-14 h-14 flex items-center justify-center border border-dashed border-white/20 rounded-lg hover:border-[#9BFF43]/50 transition-colors"
                >
                  {isUploadingImage ? (
                    <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
                  ) : (
                    <span className="text-white/40 text-xl">+</span>
                  )}
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              className="hidden"
              multiple
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas adicionales</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-[#1A1A1A] border-white/10"
              placeholder="Horarios preferidos para instalación, contacto alternativo..."
              rows={2}
            />
          </div>

          {/* Price Summary */}
          <div className="bg-[#9BFF43]/10 rounded-xl p-4">
            <div className="space-y-1 text-sm text-white/70 mb-2">
              <div className="flex justify-between">
                <span>Duración</span>
                <span className="text-white">{campaignDays} días ({monthsEquivalent} meses)</span>
              </div>
              <div className="flex justify-between">
                <span>Tarifa mensual</span>
                <span className="text-white">${billboard.price_per_month.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-white/10">
              <span>Total estimado</span>
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
              disabled={isLoading || dateConflict || durationError || message.trim().length < 20 || !startDate || !endDate}
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
