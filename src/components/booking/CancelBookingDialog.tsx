import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cancelBooking } from '@/lib/bookingWorkflow';
import { estimateAdvertiserRefund } from '@/lib/cancellation';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: { id: string; start_date: string; end_date: string; total_price: number };
  role: 'advertiser' | 'owner';
  paid: boolean;
  onCancelled: () => void;
}

const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`;

const CancelBookingDialog = ({ open, onOpenChange, booking, role, paid, onCancelled }: Props) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const estimate = estimateAdvertiserRefund(Number(booking.total_price), booking.start_date, booking.end_date);

  let consequence: string;
  if (!paid) {
    consequence = 'Aún no has pagado, así que no hay cargos. Las fechas se liberarán.';
  } else if (role === 'owner') {
    consequence = `El anunciante recibirá un reembolso total de lo pagado (${money(Number(booking.total_price))}). Cancelar reservas pagadas puede afectar tu reputación.`;
  } else if (estimate.percent === 1) {
    consequence = `Recibirás un reembolso del 100% (${money(estimate.refund)}).`;
  } else if (estimate.percent === 0.5) {
    consequence = `Faltan entre 3 y 14 días para el inicio: recibirás un reembolso del 50% (${money(estimate.refund)}).`;
  } else if (estimate.percent === 0) {
    consequence = 'Faltan menos de 3 días para el inicio: no hay reembolso.';
  } else {
    consequence = estimate.refund > 0
      ? `La campaña ya inició: se reembolsan los periodos que aún no comienzan (${money(estimate.refund)}). El periodo en curso no es reembolsable.`
      : 'La campaña ya inició y no hay periodos futuros por reembolsar.';
  }

  const confirm = async () => {
    setBusy(true);
    try {
      const r = await cancelBooking(booking.id, reason.trim() || undefined);
      toast.success(r.refunded > 0 ? `Reserva cancelada. Reembolso: ${money(r.refunded)}` : 'Reserva cancelada');
      onOpenChange(false);
      onCancelled();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar esta reserva?</AlertDialogTitle>
          <AlertDialogDescription>{consequence}</AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (opcional)"
          maxLength={300}
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Volver</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={busy}>
            {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Cancelar reserva
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CancelBookingDialog;
