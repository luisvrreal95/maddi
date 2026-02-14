import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Clock, Calendar, Eye, MessageSquare, AlertTriangle, Image as ImageIcon, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

interface Booking {
  id: string;
  billboard_id: string;
  business_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  notes: string | null;
  ad_design_url: string | null;
  created_at: string;
  billboard?: { title: string; address: string; city: string; };
  profile?: { full_name: string; company_name: string | null; };
}

const BookingManagement: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchBookings();

      const setupRealtimeSubscription = async () => {
        const { data: billboards } = await supabase
          .from('billboards')
          .select('id')
          .eq('owner_id', user.id);

        if (billboards && billboards.length > 0) {
          const billboardIds = billboards.map(b => b.id);
          
          const channel = supabase
            .channel(`owner-bookings-${user.id}`)
            .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'bookings' },
              async (payload) => {
                const newBooking = payload.new as any;
                if (billboardIds.includes(newBooking.billboard_id)) {
                  toast.success('¡Nueva solicitud de reserva recibida!');
                  fetchBookings();
                }
              }
            )
            .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: 'bookings' },
              (payload) => {
                const updated = payload.new as any;
                if (billboardIds.includes(updated.billboard_id)) {
                  setBookings(prev => 
                    prev.map(b => b.id === updated.id ? { ...b, status: updated.status } : b)
                  );
                }
              }
            )
            .subscribe();

          return () => { supabase.removeChannel(channel); };
        }
      };

      setupRealtimeSubscription();
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const { data: billboards, error: billboardsError } = await supabase
        .from('billboards')
        .select('id')
        .eq('owner_id', user?.id);

      if (billboardsError) throw billboardsError;

      if (!billboards || billboards.length === 0) {
        setBookings([]);
        setIsLoading(false);
        return;
      }

      const billboardIds = billboards.map(b => b.id);

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .in('billboard_id', billboardIds)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      const enrichedBookings = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          const { data: billboard } = await supabase
            .from('billboards')
            .select('title, address, city')
            .eq('id', booking.billboard_id)
            .maybeSingle();

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_name')
            .eq('user_id', booking.business_id)
            .maybeSingle();

          return { ...booking, billboard: billboard || undefined, profile: profile || undefined };
        })
      );

      setBookings(enrichedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Error al cargar reservas');
    } finally {
      setIsLoading(false);
    }
  };

  const checkOverlap = async (booking: Booking): Promise<boolean> => {
    const { data: approvedBookings } = await supabase
      .from('bookings')
      .select('id, start_date, end_date')
      .eq('billboard_id', booking.billboard_id)
      .eq('status', 'approved')
      .neq('id', booking.id);

    if (approvedBookings && approvedBookings.length > 0) {
      const bookingStart = new Date(booking.start_date);
      const bookingEnd = new Date(booking.end_date);

      for (const existing of approvedBookings) {
        const existingStart = new Date(existing.start_date);
        const existingEnd = new Date(existing.end_date);

        if (bookingStart <= existingEnd && bookingEnd >= existingStart) {
          setOverlapWarning(
            `No se puede aprobar: las fechas se solapan con una campaña ya aprobada (${new Date(existing.start_date).toLocaleDateString()} - ${new Date(existing.end_date).toLocaleDateString()}).`
          );
          return true;
        }
      }
    }
    return false;
  };

  const handleApproveClick = async (booking: Booking) => {
    setSelectedBooking(booking);
    setOverlapWarning(null);
    const hasOverlap = await checkOverlap(booking);
    if (hasOverlap) {
      setShowApproveDialog(true);
      return;
    }
    setShowApproveDialog(true);
  };

  const handleRejectClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setRejectReason('');
    setShowRejectDialog(true);
  };

  const approveBooking = async () => {
    if (!selectedBooking || overlapWarning) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'approved' })
        .eq('id', selectedBooking.id);

      if (error) throw error;

      await supabase.from('blocked_dates').insert({
        billboard_id: selectedBooking.billboard_id,
        start_date: selectedBooking.start_date,
        end_date: selectedBooking.end_date,
        reason: `Campaña aprobada #${selectedBooking.id.slice(0, 8)}`,
      });

      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'booking_confirmed',
            data: {
              billboardTitle: selectedBooking.billboard?.title || 'Espectacular',
              startDate: new Date(selectedBooking.start_date).toLocaleDateString('es-MX'),
              endDate: new Date(selectedBooking.end_date).toLocaleDateString('es-MX'),
              totalPrice: selectedBooking.total_price,
              businessId: selectedBooking.business_id,
            }
          }
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }

      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, status: 'approved' } : b));
      toast.success('Campaña aprobada. Las fechas han sido bloqueadas.');
      setShowApproveDialog(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al aprobar la reserva');
    } finally {
      setProcessing(false);
    }
  };

  const rejectBooking = async () => {
    if (!selectedBooking) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'rejected' })
        .eq('id', selectedBooking.id);

      if (error) throw error;

      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'booking_rejected',
            data: {
              billboardTitle: selectedBooking.billboard?.title || 'Espectacular',
              startDate: new Date(selectedBooking.start_date).toLocaleDateString('es-MX'),
              endDate: new Date(selectedBooking.end_date).toLocaleDateString('es-MX'),
              reason: rejectReason || undefined,
              businessId: selectedBooking.business_id,
            }
          }
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
      }

      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, status: 'rejected' } : b));
      toast.success('Reserva rechazada');
      setShowRejectDialog(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al rechazar la reserva');
    } finally {
      setProcessing(false);
    }
  };

  const getDesignImages = (booking: Booking): string[] => {
    if (!booking.ad_design_url) return [];
    try {
      const parsed = JSON.parse(booking.ad_design_url);
      return Array.isArray(parsed) ? parsed : [booking.ad_design_url];
    } catch {
      return booking.ad_design_url.startsWith('http') ? [booking.ad_design_url] : [];
    }
  };

  // Extract message from notes (before "--- Notas adicionales ---")
  const getMessageFromNotes = (notes: string | null): { message: string; extraNotes: string | null } => {
    if (!notes) return { message: '', extraNotes: null };
    const separator = '\n\n--- Notas adicionales ---\n';
    const idx = notes.indexOf(separator);
    if (idx >= 0) {
      return {
        message: notes.substring(0, idx),
        extraNotes: notes.substring(idx + separator.length),
      };
    }
    return { message: notes, extraNotes: null };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
            <Clock className="w-3 h-3" /> Pendiente
          </span>
        );
      case 'approved':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#9BFF43]/20 text-[#9BFF43] text-xs">
            <Check className="w-3 h-3" /> Aprobada
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
            <X className="w-3 h-3" /> Rechazada
          </span>
        );
      case 'cancelled':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs">
            <Ban className="w-3 h-3" /> Cancelada
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return <div className="text-white/50 text-center py-8">Cargando reservas...</div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-12 h-12 text-white/30 mx-auto mb-3" />
        <p className="text-white/50">No tienes reservas pendientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((booking) => {
        const days = differenceInDays(new Date(booking.end_date), new Date(booking.start_date));
        const months = Math.round((days / 30) * 100) / 100;
        const images = getDesignImages(booking);
        const { message } = getMessageFromNotes(booking.notes);

        return (
          <div
            key={booking.id}
            className="bg-[#2A2A2A] rounded-xl p-4 border border-white/10 cursor-pointer hover:border-white/20 transition-colors"
            onClick={() => { setSelectedBooking(booking); setShowDetail(true); }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-white font-semibold">
                  {booking.billboard?.title || 'Espectacular'}
                </h4>
                <p className="text-white/50 text-sm">
                  {booking.billboard?.address}, {booking.billboard?.city}
                </p>
              </div>
              {getStatusBadge(booking.status)}
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
              <div className="bg-[#1A1A1A] rounded-lg p-2">
                <p className="text-white/50 text-xs">Solicitante</p>
                <p className="text-white text-sm">
                  {booking.profile?.company_name || booking.profile?.full_name || 'Negocio'}
                </p>
              </div>
              <div className="bg-[#1A1A1A] rounded-lg p-2">
                <p className="text-white/50 text-xs">Total</p>
                <p className="text-[#9BFF43] font-semibold text-sm">
                  ${booking.total_price.toLocaleString()} MXN
                </p>
              </div>
              <div className="bg-[#1A1A1A] rounded-lg p-2">
                <p className="text-white/50 text-xs">Periodo</p>
                <p className="text-white text-xs">
                  {new Date(booking.start_date).toLocaleDateString('es-MX')} — {new Date(booking.end_date).toLocaleDateString('es-MX')}
                </p>
              </div>
              <div className="bg-[#1A1A1A] rounded-lg p-2">
                <p className="text-white/50 text-xs">Duración</p>
                <p className="text-white text-sm">{days} días ({months} meses)</p>
              </div>
            </div>

            {/* Message bubble - separate from metadata */}
            {message && (
              <div className="mb-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                <p className="text-white/50 text-xs mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Mensaje del negocio
                </p>
                <p className="text-white text-sm line-clamp-2">{message}</p>
              </div>
            )}

            {images.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon className="w-4 h-4 text-[#9BFF43]" />
                <span className="text-white/60 text-sm">{images.length} diseño(s) adjunto(s)</span>
              </div>
            )}

            {booking.status === 'pending' && (
              <div className="flex gap-2 pt-3 border-t border-white/10" onClick={(e) => e.stopPropagation()}>
                <Button
                  onClick={() => handleApproveClick(booking)}
                  className="flex-1 bg-[#9BFF43] text-[#202020] hover:bg-[#8AE63A]"
                >
                  <Check className="w-4 h-4 mr-2" /> Aprobar
                </Button>
                <Button
                  onClick={() => handleRejectClick(booking)}
                  variant="outline"
                  className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <X className="w-4 h-4 mr-2" /> Rechazar
                </Button>
              </div>
            )}

            {booking.status === 'cancelled' && (
              <div className="pt-3 border-t border-white/10 text-center">
                <p className="text-gray-400 text-sm">Esta solicitud fue cancelada por el negocio</p>
              </div>
            )}
          </div>
        );
      })}

      {/* Booking Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-[#2A2A2A] border-white/10 text-white max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Solicitud</DialogTitle>
          </DialogHeader>
          {selectedBooking && (() => {
            const days = differenceInDays(new Date(selectedBooking.end_date), new Date(selectedBooking.start_date));
            const months = Math.round((days / 30) * 100) / 100;
            const images = getDesignImages(selectedBooking);
            const { message, extraNotes } = getMessageFromNotes(selectedBooking.notes);
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">{selectedBooking.billboard?.title}</h3>
                  {getStatusBadge(selectedBooking.status)}
                </div>

                {/* Structured metadata block */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-[#1A1A1A] rounded-lg p-3">
                    <p className="text-white/50 text-xs">Solicitante</p>
                    <p className="text-white font-medium">{selectedBooking.profile?.company_name || selectedBooking.profile?.full_name}</p>
                  </div>
                  <div className="bg-[#1A1A1A] rounded-lg p-3">
                    <p className="text-white/50 text-xs">Total</p>
                    <p className="text-[#9BFF43] font-bold">${selectedBooking.total_price.toLocaleString()} MXN</p>
                  </div>
                  <div className="bg-[#1A1A1A] rounded-lg p-3">
                    <p className="text-white/50 text-xs">Fecha inicio</p>
                    <p className="text-white">{new Date(selectedBooking.start_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="bg-[#1A1A1A] rounded-lg p-3">
                    <p className="text-white/50 text-xs">Fecha fin</p>
                    <p className="text-white">{new Date(selectedBooking.end_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="bg-[#1A1A1A] rounded-lg p-3">
                  <p className="text-white/50 text-xs mb-1">Duración</p>
                  <p className="text-white">{days} días ({months} meses equivalentes)</p>
                </div>

                {/* Message as independent bubble */}
                {message && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                    <p className="text-blue-400 text-xs mb-2 flex items-center gap-1 font-medium">
                      <MessageSquare className="w-3.5 h-3.5" /> Mensaje del negocio
                    </p>
                    <p className="text-white text-sm whitespace-pre-wrap">{message}</p>
                  </div>
                )}

                {extraNotes && (
                  <div className="bg-[#1A1A1A] rounded-lg p-3">
                    <p className="text-white/50 text-xs mb-1">Notas adicionales</p>
                    <p className="text-white text-sm whitespace-pre-wrap">{extraNotes}</p>
                  </div>
                )}

                {/* Design images gallery */}
                {images.length > 0 && (
                  <div>
                    <p className="text-white/50 text-xs mb-2 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-[#9BFF43]" /> Diseños adjuntos ({images.length})
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {images.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                          <img src={url} alt={`Diseño ${i + 1}`} className="w-full aspect-video object-cover rounded-lg border border-white/10 hover:border-[#9BFF43]/50 transition-colors" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Link to={`/messages`} className="flex-1" onClick={() => setShowDetail(false)}>
                    <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                      <MessageSquare className="w-4 h-4 mr-2" /> Ir a mensajes
                    </Button>
                  </Link>
                  <Link to={`/billboard/${selectedBooking.billboard_id}`} className="flex-1" onClick={() => setShowDetail(false)}>
                    <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                      <Eye className="w-4 h-4 mr-2" /> Ver espectacular
                    </Button>
                  </Link>
                </div>

                {selectedBooking.status === 'pending' && (
                  <div className="flex gap-2 pt-2 border-t border-white/10">
                    <Button
                      onClick={() => { setShowDetail(false); handleApproveClick(selectedBooking); }}
                      className="flex-1 bg-[#9BFF43] text-[#202020] hover:bg-[#8AE63A]"
                    >
                      <Check className="w-4 h-4 mr-2" /> Aprobar
                    </Button>
                    <Button
                      onClick={() => { setShowDetail(false); handleRejectClick(selectedBooking); }}
                      variant="outline"
                      className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      <X className="w-4 h-4 mr-2" /> Rechazar
                    </Button>
                  </div>
                )}

                {selectedBooking.status === 'cancelled' && (
                  <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-3 text-center">
                    <p className="text-gray-400 text-sm">Esta solicitud fue cancelada por el negocio</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent className="bg-[#1E1E1E] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {overlapWarning ? 'No se puede aprobar' : '¿Aprobar campaña?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              {overlapWarning ? (
                <div className="flex items-start gap-2 text-orange-400">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{overlapWarning}</span>
                </div>
              ) : (
                <>
                  Al aprobar, las fechas serán bloqueadas automáticamente y el negocio recibirá una notificación de confirmación.
                  <br /><br />
                  <strong className="text-white">Periodo:</strong> {selectedBooking && `${new Date(selectedBooking.start_date).toLocaleDateString('es-MX')} — ${new Date(selectedBooking.end_date).toLocaleDateString('es-MX')}`}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing} className="border-white/20 text-white hover:bg-white/10">
              {overlapWarning ? 'Cerrar' : 'Cancelar'}
            </AlertDialogCancel>
            {!overlapWarning && (
              <AlertDialogAction 
                onClick={approveBooking} 
                disabled={processing}
                className="bg-[#9BFF43] text-[#202020] hover:bg-[#8AE63A]"
              >
                {processing ? 'Aprobando...' : 'Aprobar campaña'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog with optional reason */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent className="bg-[#1E1E1E] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Rechazar solicitud?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              El negocio será notificado del rechazo. Puedes agregar un motivo opcional.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Motivo del rechazo (opcional)..."
            className="bg-[#2A2A2A] border-white/10 text-white"
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing} className="border-white/20 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={rejectBooking} 
              disabled={processing}
              className="bg-red-500 hover:bg-red-600"
            >
              {processing ? 'Rechazando...' : 'Rechazar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BookingManagement;
