import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Check, X, Clock, Calendar, Eye, MessageSquare, AlertTriangle, 
  Image as ImageIcon, Ban, ChevronRight, User, MapPin,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { differenceInDays, format, isAfter, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { parseDesignPaths, resolveDesignImageUrls } from '@/lib/designImageUtils';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent,
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
  billboard?: { title: string; address: string; city: string; image_url?: string | null; };
  profile?: { full_name: string; company_name: string | null; };
}

type Tab = 'pending' | 'approved' | 'past';

const BookingManagement: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resolvedImages, setResolvedImages] = useState<Record<string, string[]>>({});
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('pending');

  useEffect(() => {
    if (user) {
      fetchBookings();
      const setupRealtimeSubscription = async () => {
        const { data: billboards } = await supabase.from('billboards').select('id').eq('owner_id', user.id);
        if (billboards && billboards.length > 0) {
          const billboardIds = billboards.map(b => b.id);
          const channel = supabase
            .channel(`owner-bookings-${user.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' },
              async (payload) => {
                const newBooking = payload.new as any;
                if (billboardIds.includes(newBooking.billboard_id)) {
                  toast.success('¡Nueva solicitud recibida!');
                  fetchBookings();
                }
              })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' },
              (payload) => {
                const updated = payload.new as any;
                if (billboardIds.includes(updated.billboard_id)) {
                  setBookings(prev => prev.map(b => b.id === updated.id ? { ...b, status: updated.status } : b));
                }
              })
            .subscribe();
          return () => { supabase.removeChannel(channel); };
        }
      };
      setupRealtimeSubscription();
    }
  }, [user]);

  // Listen for select-booking event from calendar
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const bookingId = e.detail;
      const booking = bookings.find(b => b.id === bookingId);
      if (booking) setSelectedBooking(booking);
    };
    window.addEventListener('select-booking', handler as EventListener);
    return () => window.removeEventListener('select-booking', handler as EventListener);
  }, [bookings]);

  const fetchBookings = async () => {
    try {
      const { data: billboards, error: billboardsError } = await supabase
        .from('billboards').select('id').eq('owner_id', user?.id);
      if (billboardsError) throw billboardsError;
      if (!billboards || billboards.length === 0) { setBookings([]); setIsLoading(false); return; }
      const billboardIds = billboards.map(b => b.id);
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings').select('*').in('billboard_id', billboardIds).order('created_at', { ascending: false });
      if (bookingsError) throw bookingsError;
      const enrichedBookings = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          const { data: billboard } = await supabase
            .from('billboards').select('title, address, city, image_url').eq('id', booking.billboard_id).maybeSingle();
          const { data: profile } = await supabase
            .from('profiles').select('full_name, company_name').eq('user_id', booking.business_id).maybeSingle();
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

  // Resolve design image URLs
  useEffect(() => {
    const resolveAll = async () => {
      for (const booking of bookings) {
        if (!booking.ad_design_url || resolvedImages[booking.id]) continue;
        const paths = parseDesignPaths(booking.ad_design_url);
        if (paths.length > 0) {
          const urls = await resolveDesignImageUrls(paths);
          setResolvedImages(prev => ({ ...prev, [booking.id]: urls }));
        }
      }
    };
    if (bookings.length > 0) resolveAll();
  }, [bookings]);

  const categorized = useMemo(() => {
    const now = new Date();
    const pending: Booking[] = [];
    const approved: Booking[] = [];
    const past: Booking[] = [];
    bookings.forEach(b => {
      if (b.status === 'pending') pending.push(b);
      else if (b.status === 'approved' && isAfter(new Date(b.end_date), now)) approved.push(b);
      else past.push(b);
    });
    return { pending, approved, past };
  }, [bookings]);

  const tabCounts = { pending: categorized.pending.length, approved: categorized.approved.length, past: categorized.past.length };
  const currentBookings = categorized[activeTab];

  const isBillboardDigital = async (billboardId: string): Promise<boolean> => {
    const { data, error } = await supabase
      .from('billboards')
      .select('is_digital')
      .eq('id', billboardId)
      .maybeSingle();

    if (error) {
      console.error('Error checking billboard digital status:', error);
      return false;
    }

    return data?.is_digital === true;
  };

  const checkOverlap = async (booking: Booking): Promise<boolean> => {
    const isDigital = await isBillboardDigital(booking.billboard_id);
    if (isDigital) {
      setOverlapWarning(null);
      return false;
    }

    const { data: approvedBookings } = await supabase
      .from('bookings').select('id, start_date, end_date').eq('billboard_id', booking.billboard_id).eq('status', 'approved').neq('id', booking.id);
    if (approvedBookings && approvedBookings.length > 0) {
      const bookingStart = new Date(booking.start_date);
      const bookingEnd = new Date(booking.end_date);
      for (const existing of approvedBookings) {
        const existingStart = new Date(existing.start_date);
        const existingEnd = new Date(existing.end_date);
        if (bookingStart <= existingEnd && bookingEnd >= existingStart) {
          setOverlapWarning(`No se puede aprobar: las fechas se solapan con una campaña ya aprobada (${new Date(existing.start_date).toLocaleDateString()} - ${new Date(existing.end_date).toLocaleDateString()}).`);
          return true;
        }
      }
    }
    return false;
  };

  const handleApproveClick = async (booking: Booking) => {
    setSelectedBooking(booking);
    setOverlapWarning(null);
    await checkOverlap(booking);
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
      const isDigital = await isBillboardDigital(selectedBooking.billboard_id);

      const { error } = await supabase.from('bookings').update({ status: 'approved' }).eq('id', selectedBooking.id);
      if (error) throw error;

      if (!isDigital) {
        const { error: blockError } = await supabase.from('blocked_dates').insert({
          billboard_id: selectedBooking.billboard_id,
          start_date: selectedBooking.start_date,
          end_date: selectedBooking.end_date,
          reason: `Campaña aprobada #${selectedBooking.id.slice(0, 8)}`,
        });
        if (blockError) throw blockError;
      }
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'booking_confirmed',
            recipientName: selectedBooking.profile?.full_name || 'Anunciante',
            userId: selectedBooking.business_id,
            entityId: selectedBooking.id,
            data: {
              billboardTitle: selectedBooking.billboard?.title || 'Espectacular',
              startDate: new Date(selectedBooking.start_date).toLocaleDateString('es-MX'),
              endDate: new Date(selectedBooking.end_date).toLocaleDateString('es-MX'),
              totalPrice: selectedBooking.total_price,
              ownerName: user?.user_metadata?.full_name || 'Propietario',
            }
          }
        });
      } catch {}
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, status: 'approved' } : b));
      toast.success('Campaña aprobada');
      setShowApproveDialog(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al aprobar la reserva');
    } finally { setProcessing(false); }
  };

  const rejectBooking = async () => {
    if (!selectedBooking) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from('bookings').update({ status: 'rejected' }).eq('id', selectedBooking.id);
      if (error) throw error;
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'booking_rejected',
            recipientName: selectedBooking.profile?.full_name || 'Anunciante',
            userId: selectedBooking.business_id,
            entityId: selectedBooking.id,
            data: {
              billboardTitle: selectedBooking.billboard?.title || 'Espectacular',
              startDate: new Date(selectedBooking.start_date).toLocaleDateString('es-MX'),
              endDate: new Date(selectedBooking.end_date).toLocaleDateString('es-MX'),
              reason: rejectReason || '',
            }
          }
        });
      } catch {}
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, status: 'rejected' } : b));
      toast.success('Reserva rechazada');
      setShowRejectDialog(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al rechazar la reserva');
    } finally { setProcessing(false); }
  };

  const getMessageFromNotes = (notes: string | null): { message: string; extraNotes: string | null } => {
    if (!notes) return { message: '', extraNotes: null };
    const separator = '\n\n--- Notas adicionales ---\n';
    const idx = notes.indexOf(separator);
    if (idx >= 0) return { message: notes.substring(0, idx), extraNotes: notes.substring(idx + separator.length) };
    return { message: notes, extraNotes: null };
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'Pendiente', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20', icon: Clock };
      case 'approved': return { label: 'Aprobada', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: Check };
      case 'rejected': return { label: 'Rechazada', color: 'bg-red-500/15 text-red-400 border-red-500/20', icon: X };
      case 'cancelled': return { label: 'Cancelada', color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20', icon: Ban };
      default: return { label: status, color: 'bg-zinc-500/15 text-zinc-400', icon: Clock };
    }
  };

  // Detail view for a selected booking
  if (selectedBooking && !showApproveDialog && !showRejectDialog) {
    const days = differenceInDays(new Date(selectedBooking.end_date), new Date(selectedBooking.start_date));
    const months = Math.round((days / 30) * 100) / 100;
    const images = resolvedImages[selectedBooking.id] || [];
    const { message, extraNotes } = getMessageFromNotes(selectedBooking.notes);
    const statusConfig = getStatusConfig(selectedBooking.status);
    const StatusIcon = statusConfig.icon;
    const now = new Date();
    const isActive = selectedBooking.status === 'approved' && isBefore(new Date(selectedBooking.start_date), now) && isAfter(new Date(selectedBooking.end_date), now);

    return (
      <div className="max-w-2xl mx-auto space-y-4 md:space-y-6 pb-24 md:pb-0">
        {/* Back button */}
        <button onClick={() => setSelectedBooking(null)} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Volver a reservas</span>
        </button>

        {/* Header card with billboard image */}
        <div className="bg-[#222] rounded-2xl overflow-hidden border border-white/5">
          {selectedBooking.billboard?.image_url && (
            <div className="relative h-48 overflow-hidden">
              <img src={selectedBooking.billboard.image_url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#222] via-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-white text-xl font-bold">{selectedBooking.billboard?.title}</h2>
                <p className="text-white/60 text-sm flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {selectedBooking.billboard?.address}, {selectedBooking.billboard?.city}
                </p>
              </div>
            </div>
          )}
          {!selectedBooking.billboard?.image_url && (
            <div className="p-6 pb-4">
              <h2 className="text-white text-xl font-bold">{selectedBooking.billboard?.title}</h2>
              <p className="text-white/60 text-sm flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {selectedBooking.billboard?.address}, {selectedBooking.billboard?.city}
              </p>
            </div>
          )}

          <div className="p-6 pt-4 space-y-5">
            {/* Status + active indicator */}
            <div className="flex items-center justify-between">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusConfig.label}
              </div>
              {isActive && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Campaña activa
                </span>
              )}
            </div>

            {/* Requester info */}
            <div className="flex items-center gap-3 bg-[#1A1A1A] rounded-xl p-4">
              <div className="w-10 h-10 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                <User className="w-5 h-5 text-white/40" />
              </div>
              <div>
                <p className="text-white font-medium">{selectedBooking.profile?.company_name || selectedBooking.profile?.full_name || 'Negocio'}</p>
                <p className="text-white/50 text-xs">Solicitante</p>
              </div>
            </div>

            {/* Dates & pricing */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1A1A1A] rounded-xl p-4">
                <p className="text-white/50 text-xs mb-1">Check-in</p>
                <p className="text-white font-medium text-sm">{format(new Date(selectedBooking.start_date), "d 'de' MMMM, yyyy", { locale: es })}</p>
              </div>
              <div className="bg-[#1A1A1A] rounded-xl p-4">
                <p className="text-white/50 text-xs mb-1">Check-out</p>
                <p className="text-white font-medium text-sm">{format(new Date(selectedBooking.end_date), "d 'de' MMMM, yyyy", { locale: es })}</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-[#1A1A1A] rounded-xl p-4">
              <div>
                <p className="text-white/50 text-xs">Duración</p>
                <p className="text-white font-medium">{days} días <span className="text-white/40">({months} meses)</span></p>
              </div>
              <div className="text-right">
                <p className="text-white/50 text-xs">Total</p>
                <p className="text-[#9BFF43] font-bold text-lg">${selectedBooking.total_price.toLocaleString()} MXN</p>
              </div>
            </div>

            {/* Message */}
            {message && (
              <div className="space-y-2">
                <p className="text-white/50 text-xs font-medium uppercase tracking-wide">Mensaje del negocio</p>
                <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                  <p className="text-white/80 text-sm whitespace-pre-wrap leading-relaxed">{message}</p>
                </div>
              </div>
            )}
            {extraNotes && (
              <div className="bg-[#1A1A1A] rounded-xl p-4">
                <p className="text-white/50 text-xs mb-1">Notas adicionales</p>
                <p className="text-white text-sm">{extraNotes}</p>
              </div>
            )}

            {/* Design images */}
            {images.length > 0 && (
              <div className="space-y-3">
                <p className="text-white/50 text-xs font-medium uppercase tracking-wide flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#9BFF43]" />
                  Diseño del anuncio ({images.length})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {images.map((url, i) => (
                    <button key={i} onClick={() => setImageViewerUrl(url)} className="block group">
                      <img src={url} alt={`Diseño ${i + 1}`} className="w-full aspect-[4/3] object-cover rounded-xl border border-white/10 group-hover:border-[#9BFF43]/50 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Link to="/messages" className="flex-1">
                <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">
                  <MessageSquare className="w-4 h-4 mr-2" /> Chat
                </Button>
              </Link>
              <Link to={`/billboard/${selectedBooking.billboard_id}`} className="flex-1">
                <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/5">
                  <Eye className="w-4 h-4 mr-2" /> Ver espectacular
                </Button>
              </Link>
            </div>

            {selectedBooking.status === 'pending' && (
              <div className="flex gap-2 pt-2 border-t border-white/5">
                <Button onClick={() => handleApproveClick(selectedBooking)} className="flex-1 bg-[#9BFF43] text-[#202020] hover:bg-[#8AE63A] font-semibold">
                  <Check className="w-4 h-4 mr-2" /> Aprobar
                </Button>
                <Button onClick={() => handleRejectClick(selectedBooking)} variant="outline" className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10">
                  <X className="w-4 h-4 mr-2" /> Rechazar
                </Button>
              </div>
            )}

            {selectedBooking.status === 'cancelled' && (
              <div className="bg-zinc-500/10 rounded-xl p-4 text-center">
                <p className="text-zinc-400 text-sm">Esta solicitud fue cancelada por el negocio</p>
              </div>
            )}

            <p className="text-white/30 text-xs text-center pt-2">
              Solicitud recibida el {format(new Date(selectedBooking.created_at), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
            </p>
          </div>
        </div>

        {/* Image Viewer */}
        <Dialog open={!!imageViewerUrl} onOpenChange={() => setImageViewerUrl(null)}>
          <DialogContent className="bg-[#1A1A1A] border-white/10 max-w-3xl p-2">
            {imageViewerUrl && <img src={imageViewerUrl} alt="Diseño" className="w-full rounded-lg" />}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-[#9BFF43] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-white/50 text-sm">Cargando reservas...</p>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-white/20" />
        </div>
        <h3 className="text-white font-semibold text-lg mb-1">Sin reservas</h3>
        <p className="text-white/50 text-sm">Cuando un negocio solicite una campaña, aparecerá aquí.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'pending', label: 'Pendientes', count: tabCounts.pending },
    { id: 'approved', label: 'Activas', count: tabCounts.approved },
    { id: 'past', label: 'Historial', count: tabCounts.past },
  ];

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 bg-[#1A1A1A] rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.id ? 'bg-[#9BFF43] text-[#1A1A1A]' : 'bg-white/10 text-white/50'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Booking cards */}
      {currentBookings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-white/40 text-sm">No hay reservas en esta categoría</p>
        </div>
      ) : (
        <div className="space-y-3">
          {currentBookings.map((booking) => {
            const days = differenceInDays(new Date(booking.end_date), new Date(booking.start_date));
            const statusConfig = getStatusConfig(booking.status);
            const StatusIcon = statusConfig.icon;
            const { message } = getMessageFromNotes(booking.notes);

            return (
              <button
                key={booking.id}
                onClick={() => setSelectedBooking(booking)}
                className="w-full text-left bg-[#222] rounded-2xl border border-white/5 hover:border-white/10 transition-all group"
              >
                <div className="flex gap-3 md:gap-4 p-3 md:p-4">
                  {/* Billboard thumbnail */}
                  {booking.billboard?.image_url ? (
                    <img src={booking.billboard.image_url} alt="" className="w-14 h-14 md:w-20 md:h-20 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 md:w-20 md:h-20 rounded-xl bg-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 md:w-6 md:h-6 text-white/20" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-white font-semibold truncate">{booking.billboard?.title}</h4>
                        <p className="text-white/50 text-xs mt-0.5">
                          {booking.profile?.company_name || booking.profile?.full_name} · {days} días
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 flex-shrink-0 mt-1 transition-colors" />
                    </div>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </div>
                      <p className="text-[#9BFF43] font-semibold text-sm">${booking.total_price.toLocaleString()}</p>
                    </div>

                    {message && (
                      <p className="text-white/40 text-xs mt-2 line-clamp-1">"{message}"</p>
                    )}
                  </div>
                </div>

                {/* Quick actions for pending */}
                {booking.status === 'pending' && (
                  <div className="flex border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleApproveClick(booking)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors rounded-bl-2xl"
                    >
                      <Check className="w-3.5 h-3.5" /> Aprobar
                    </button>
                    <div className="w-px bg-white/5" />
                    <button
                      onClick={() => handleRejectClick(booking)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors rounded-br-2xl"
                    >
                      <X className="w-3.5 h-3.5" /> Rechazar
                    </button>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={(open) => { setShowApproveDialog(open); if (!open) setSelectedBooking(null); }}>
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
                  Al aprobar, las fechas serán bloqueadas y el negocio recibirá una notificación.
                  <br /><br />
                  <strong className="text-white">Periodo:</strong> {selectedBooking && `${format(new Date(selectedBooking.start_date), "d MMM yyyy", { locale: es })} — ${format(new Date(selectedBooking.end_date), "d MMM yyyy", { locale: es })}`}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing} className="border-white/20 text-white hover:bg-white/10">
              {overlapWarning ? 'Cerrar' : 'Cancelar'}
            </AlertDialogCancel>
            {!overlapWarning && (
              <AlertDialogAction onClick={approveBooking} disabled={processing} className="bg-[#9BFF43] text-[#202020] hover:bg-[#8AE63A]">
                {processing ? 'Aprobando...' : 'Aprobar campaña'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={(open) => { setShowRejectDialog(open); if (!open) setSelectedBooking(null); }}>
        <AlertDialogContent className="bg-[#1E1E1E] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Rechazar solicitud?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              El negocio será notificado. Puedes agregar un motivo opcional.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Motivo del rechazo (opcional)..." className="bg-[#2A2A2A] border-white/10 text-white" rows={3} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing} className="border-white/20 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={rejectBooking} disabled={processing} className="bg-red-500 hover:bg-red-600">
              {processing ? 'Rechazando...' : 'Rechazar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BookingManagement;
