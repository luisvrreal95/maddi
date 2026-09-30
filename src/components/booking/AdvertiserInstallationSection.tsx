import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Loader2, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  confirmInstallation, InstallationStatus, reportInstallationIssue, resolveProofUrls,
} from '@/lib/bookingWorkflow';

interface Props {
  booking: {
    id: string;
    installation_status: InstallationStatus;
    installation_photos: string[];
    installation_deadline: string | null;
    dispute_reason: string | null;
    dispute_resolution: string | null;
  };
  onChange: () => void;
}

const AdvertiserInstallationSection = ({ booking, onChange }: Props) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const status = booking.installation_status;

  useEffect(() => {
    if (booking.installation_photos?.length) resolveProofUrls(booking.installation_photos).then(setPhotos);
  }, [booking.installation_photos]);

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setReportOpen(false);
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const header = {
    pending: { icon: Clock, title: 'Esperando la instalación', text: 'El propietario debe subir fotos de tu anuncio instalado. Tu pago está protegido: no se libera al propietario hasta confirmar la instalación.' },
    overdue: { icon: Clock, title: 'Instalación atrasada', text: 'El propietario aún no sube evidencia. Tu pago sigue retenido. Si lo necesitas, puedes reportar un problema.' },
    submitted: { icon: Camera, title: 'Revisa la instalación', text: `Confirma si el anuncio quedó como esperabas. Si no respondes${booking.installation_deadline ? ` antes del ${format(new Date(booking.installation_deadline), "d 'de' MMM, HH:mm", { locale: es })}` : ' en 48 horas'}, se confirmará automáticamente.` },
    confirmed: { icon: CheckCircle, title: 'Instalación confirmada', text: 'El pago se libera al propietario según el calendario de la campaña.' },
    disputed: { icon: AlertTriangle, title: 'Reporte en revisión', text: 'Maddi está revisando tu reporte. Los pagos al propietario están en pausa.' },
  }[status];
  const Icon = header.icon;

  return (
    <>
      <Card className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 mt-0.5 ${status === 'disputed' ? 'text-destructive' : 'text-primary'}`} />
          <div>
            <h3 className="font-semibold text-foreground">{header.title}</h3>
            <p className="text-sm text-muted-foreground">{header.text}</p>
            {status === 'disputed' && booking.dispute_reason && (
              <p className="text-sm text-foreground mt-2 italic">“{booking.dispute_reason}”</p>
            )}
          </div>
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={`Instalación ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border border-border" />
              </a>
            ))}
          </div>
        )}

        {status === 'submitted' && (
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => run(() => confirmInstallation(booking.id), 'Instalación confirmada')} className="flex-1">
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Confirmar instalación
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => setReportOpen(true)} className="flex-1">
              Reportar problema
            </Button>
          </div>
        )}
        {(status === 'pending' || status === 'overdue' || status === 'confirmed') && (
          <Button variant="outline" size="sm" onClick={() => setReportOpen(true)}>Reportar un problema</Button>
        )}
      </Card>

      <Dialog open={reportOpen} onOpenChange={(o) => !busy && setReportOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar un problema</DialogTitle>
            <DialogDescription>
              Los pagos pendientes al propietario se pausarán y un administrador de Maddi revisará el caso.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} rows={5}
            placeholder="Describe qué pasó (mínimo 10 caracteres)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)} disabled={busy}>Cancelar</Button>
            <Button disabled={busy || reason.trim().length < 10}
              onClick={() => run(() => reportInstallationIssue(booking.id, reason), 'Reporte enviado')}>
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Enviar reporte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdvertiserInstallationSection;
