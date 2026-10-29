import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, CalendarCheck, CreditCard, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export const COMMISSION_RATE = 0.15;
export const money = (n: number) => `$${Math.round(n).toLocaleString('es-MX')}`;

export interface DecisionBooking {
  id: string;
  billboard_id: string;
  business_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  stripe_payment_intent_id?: string | null;
  platform_fee?: number | null;
  owner_payout?: number | null;
  billboard?: { title: string } | null;
  profile?: { full_name?: string | null; company_name?: string | null } | null;
}

export const bookingFees = (b: DecisionBooking) => {
  const fee = b.platform_fee ?? Math.round(b.total_price * COMMISSION_RATE);
  const payout = b.owner_payout ?? b.total_price - fee;
  return { fee, payout };
};

const REASONS = [
  { id: 'dates', label: 'Las fechas ya no están disponibles' },
  { id: 'type', label: 'El tipo de anuncio no es compatible' },
  { id: 'other_campaign', label: 'Prefiero otra campaña para esas fechas' },
  { id: 'other', label: 'Otro motivo' },
];

interface Props {
  booking: DecisionBooking | null;
  mode: 'approve' | 'reject' | null;
  onClose: () => void;
  onDone: (bookingId: string, status: 'approved' | 'rejected') => void;
}

const fmt = (d: string) => format(new Date(d), 'd MMM yyyy', { locale: es });

/** Diálogos compartidos para aprobar (y cobrar) o rechazar (y liberar la tarjeta) una solicitud. */
const BookingDecisionDialog: React.FC<Props> = ({ booking, mode, onClose, onDone }) => {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);
  const [reason, setReason] = useState('dates');
  const [message, setMessage] = useState('');
  const [isDigital, setIsDigital] = useState(false);
  const [overlap, setOverlap] = useState<string | null>(null);

  useEffect(() => {
    setReason('dates');
    setMessage('');
    setOverlap(null);
    setIsDigital(false);
    if (!booking || mode !== 'approve') return;
    (async () => {
      const { data: bb } = await supabase.from('billboards').select('is_digital').eq('id', booking.billboard_id).maybeSingle();
      const digital = (bb as any)?.is_digital === true;
      setIsDigital(digital);
      if (digital) return;
      const { data: others } = await supabase
        .from('bookings').select('id, start_date, end_date')
        .eq('billboard_id', booking.billboard_id).eq('status', 'approved').neq('id', booking.id);
      const s = new Date(booking.start_date), e = new Date(booking.end_date);
      const hit = (others || []).find(o => s <= new Date(o.end_date) && e >= new Date(o.start_date));
      if (hit) setOverlap(`Las fechas se empalman con una campaña ya aprobada (${fmt(hit.start_date)} – ${fmt(hit.end_date)}).`);
    })();
  }, [booking?.id, mode]);

  if (!booking || !mode) return null;
  const { fee, payout } = bookingFees(booking);
  const paysInApp = !!booking.stripe_payment_intent_id;
  const title = booking.billboard?.title || 'Espectacular';

  // Manda el mensaje opcional al chat del anunciante
  const postMessage = async (content: string) => {
    if (!user || !content.trim()) return;
    const { data: conv } = await supabase
      .from('conversations').select('id')
      .eq('billboard_id', booking.billboard_id).eq('business_id', booking.business_id).eq('owner_id', user.id)
      .maybeSingle();
    if (!conv) return;
    await supabase.from('messages').insert({ conversation_id: conv.id, sender_id: user.id, content: content.trim() });
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conv.id);
  };

  const approve = async () => {
    if (overlap) return;
    setProcessing(true);
    try {
      if (paysInApp) {
        const { data: res, error } = await supabase.functions.invoke('stripe-booking-action', { body: { booking_id: booking.id, action: 'approve' } });
        if (error || (res as any)?.error) throw new Error((res as any)?.error || error?.message || 'Error al cobrar');
      } else {
        const { error } = await supabase.from('bookings').update({ status: 'approved' }).eq('id', booking.id);
        if (error) throw error;
      }
      if (!isDigital) {
        const { error: blockErr } = await supabase.from('blocked_dates').insert({
          billboard_id: booking.billboard_id, start_date: booking.start_date, end_date: booking.end_date,
          reason: `Campaña aprobada #${booking.id.slice(0, 8)}`,
        });
        if (blockErr) throw blockErr;
      }
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'booking_confirmed', recipientName: booking.profile?.full_name || 'Anunciante',
            userId: booking.business_id, entityId: booking.id,
            data: {
              billboardTitle: title, startDate: new Date(booking.start_date).toLocaleDateString('es-MX'),
              endDate: new Date(booking.end_date).toLocaleDateString('es-MX'), totalPrice: booking.total_price,
              ownerName: user?.user_metadata?.full_name || 'Propietario',
            },
          },
        });
      } catch { /* correo opcional */ }
      try { await postMessage(message); } catch { /* mensaje opcional */ }
      toast.success(paysInApp ? `Aprobada · se cobraron ${money(booking.total_price)}` : 'Campaña aprobada');
      onDone(booking.id, 'approved');
    } catch (err) {
      const msg = (err as { message?: string })?.message || '';
      toast.error(/empalm/.test(msg) ? 'Esas fechas ya fueron reservadas por otra campaña.' : msg || 'Error al aprobar la reserva');
    } finally { setProcessing(false); }
  };

  const reject = async () => {
    setProcessing(true);
    try {
      if (paysInApp) {
        const { data: res, error } = await supabase.functions.invoke('stripe-booking-action', { body: { booking_id: booking.id, action: 'reject' } });
        if (error || (res as any)?.error) throw new Error((res as any)?.error || error?.message || 'Error al rechazar');
      } else {
        const { error } = await supabase.from('bookings').update({ status: 'rejected' }).eq('id', booking.id);
        if (error) throw error;
      }
      const reasonLabel = REASONS.find(r => r.id === reason)?.label || '';
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'booking_rejected', recipientName: booking.profile?.full_name || 'Anunciante',
            userId: booking.business_id, entityId: booking.id,
            data: {
              billboardTitle: title, startDate: new Date(booking.start_date).toLocaleDateString('es-MX'),
              endDate: new Date(booking.end_date).toLocaleDateString('es-MX'),
              reason: [reasonLabel, message.trim()].filter(Boolean).join(' — '),
            },
          },
        });
      } catch { /* correo opcional */ }
      try { await postMessage(`Tu solicitud no fue aceptada: ${reasonLabel.toLowerCase()}.${message.trim() ? ' ' + message.trim() : ''}`); } catch { /* opcional */ }
      toast.success(paysInApp ? 'Solicitud rechazada · la tarjeta fue liberada' : 'Solicitud rechazada');
      onDone(booking.id, 'rejected');
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Error al rechazar la reserva');
    } finally { setProcessing(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !processing) onClose(); }}>
      <DialogContent className="theme-light bg-white text-foreground border-border rounded-3xl max-w-md p-0 overflow-hidden">
        {mode === 'approve' ? (
          <>
            <DialogHeader className="px-6 pt-6">
              <DialogTitle className="text-xl font-bold">Aprobar solicitud</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {title} · {fmt(booking.start_date)} – {fmt(booking.end_date)}
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 space-y-4">
              {overlap ? (
                <div className="flex items-start gap-2 rounded-xl bg-amber-50 text-amber-800 p-3 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> <span>No se puede aprobar. {overlap}</span>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-border divide-y divide-border text-sm">
                    <div className="flex justify-between p-3"><span>{paysInApp ? 'Se cobra al anunciante' : 'Total de la campaña'}</span><b>{money(booking.total_price)}</b></div>
                    {paysInApp && (
                      <>
                        <div className="flex justify-between p-3 text-muted-foreground"><span>Comisión Maddi (15%)</span><span>− {money(fee)}</span></div>
                        <div className="flex justify-between p-3"><span className="font-semibold">Tú recibes</span><b className="text-[#2F7A00]">{money(payout)}</b></div>
                      </>
                    )}
                  </div>
                  {paysInApp && (
                    <div className="flex items-start gap-2 rounded-xl bg-blue-50 text-blue-900 p-3 text-xs">
                      <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>Maddi retiene el pago y te lo transfiere cuando subas fotos del anuncio instalado y el anunciante lo confirme (o pasen 48 h sin reportes).</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CalendarCheck className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{isDigital ? 'Es una pantalla digital: las fechas no se bloquean.' : 'Esas fechas se bloquearán en tu calendario y el anunciante recibirá la confirmación.'}</span>
                  </div>
                  <div>
                    <label className="text-xs font-semibold">Mensaje de bienvenida (opcional)</label>
                    <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
                      placeholder="Ej. ¡Gracias! Mándame el arte en alta resolución 5 días antes."
                      className="mt-1.5 bg-white border-border" />
                  </div>
                </>
              )}
            </div>
            <div className="px-6 py-4 mt-2 border-t border-border flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={processing} className="rounded-full">Cancelar</Button>
              {!overlap && (
                <Button onClick={approve} disabled={processing} className="rounded-full bg-[#9BFF43] text-[#07110B] hover:bg-[#8AEE32] font-semibold">
                  {processing ? 'Aprobando…' : paysInApp ? `Aprobar y cobrar ${money(booking.total_price)}` : 'Aprobar campaña'}
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="px-6 pt-6">
              <DialogTitle className="text-xl font-bold">Rechazar solicitud</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {title} · {fmt(booking.start_date)} – {fmt(booking.end_date)}
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 space-y-4">
              <div className="space-y-2">
                {REASONS.map(r => (
                  <label key={r.id} className={`flex items-center gap-3 rounded-xl border p-3 text-sm cursor-pointer ${reason === r.id ? 'border-foreground bg-muted/50' : 'border-border'}`}>
                    <input type="radio" name="reject-reason" checked={reason === r.id} onChange={() => setReason(r.id)} className="accent-black" />
                    {r.label}
                  </label>
                ))}
              </div>
              <div>
                <label className="text-xs font-semibold">Mensaje para el anunciante (opcional)</label>
                <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={2} className="mt-1.5 bg-white border-border"
                  placeholder="Ej. Esas fechas las reservé para un cliente anterior." />
              </div>
              {paysInApp && (
                <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                  <CreditCard className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>La tarjeta del anunciante se libera y <b>no se le cobra nada</b>.</span>
                </div>
              )}
            </div>
            <div className="px-6 py-4 mt-2 border-t border-border flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={processing} className="rounded-full">Cancelar</Button>
              <Button onClick={reject} disabled={processing} className="rounded-full bg-red-600 text-white hover:bg-red-700 font-semibold">
                {processing ? 'Rechazando…' : 'Rechazar solicitud'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingDecisionDialog;
