import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle, Clock, Loader2, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { InstallationStatus, resolveProofUrls, uploadInstallationProof } from '@/lib/bookingWorkflow';

interface Payout {
  id: string; seq: number; kind: string; period_start: string | null; period_end: string | null;
  net_cents: number; status: string; release_at: string | null;
}

interface Props {
  ownerId: string;
  booking: {
    id: string;
    installation_status: InstallationStatus;
    installation_photos: string[];
    installation_deadline: string | null;
    dispute_reason: string | null;
  };
  onChange: () => void;
}

const money = (cents: number) => `$${(cents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const OwnerInstallationSection = ({ ownerId, booking, onChange }: Props) => {
  const [files, setFiles] = useState<File[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const status = booking.installation_status;

  useEffect(() => {
    if (booking.installation_photos?.length) resolveProofUrls(booking.installation_photos).then(setPhotos);
    supabase.from('booking_payouts')
      .select('id, seq, kind, period_start, period_end, net_cents, status, release_at')
      .eq('booking_id', booking.id).neq('status', 'cancelled').order('seq')
      .then(({ data }) => setPayouts((data as Payout[]) ?? []));
  }, [booking.id, booking.installation_photos, status]);

  const upload = async () => {
    setBusy(true);
    try {
      await uploadInstallationProof(ownerId, booking.id, files);
      toast.success('Evidencia enviada. El anunciante tiene 48 horas para confirmar.');
      setFiles([]);
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const info = {
    pending: { icon: Camera, title: 'Sube la evidencia de instalación', text: 'Toma fotos del anuncio ya instalado. Tu primer pago se libera a partir del inicio de la campaña, una vez confirmada la instalación.' },
    overdue: { icon: Clock, title: 'Evidencia atrasada', text: 'La campaña ya inició. Sube las fotos para poder recibir tu pago.' },
    submitted: { icon: Clock, title: 'Esperando confirmación', text: `El anunciante puede confirmar o reportar un problema${booking.installation_deadline ? ` hasta el ${format(new Date(booking.installation_deadline), "d 'de' MMM, HH:mm", { locale: es })}` : ''}. Si no responde, se confirma solo.` },
    confirmed: { icon: CheckCircle, title: 'Instalación confirmada', text: 'Tus pagos se liberan según el calendario.' },
    disputed: { icon: AlertTriangle, title: 'Reporte del anunciante en revisión', text: 'Tus pagos están en pausa mientras Maddi revisa el caso.' },
  }[status];
  const Icon = info.icon;
  const canUpload = status === 'pending' || status === 'overdue' || status === 'submitted';

  return (
    <div className="space-y-3">
      <div className="bg-card rounded-xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 mt-0.5 ${status === 'disputed' ? 'text-red-400' : 'text-primary'}`} />
          <div>
            <p className="text-white font-medium">{info.title}</p>
            <p className="text-white/60 text-sm">{info.text}</p>
            {status === 'disputed' && booking.dispute_reason && (
              <p className="text-white/80 text-sm mt-2 italic">“{booking.dispute_reason}”</p>
            )}
          </div>
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={`Evidencia ${i + 1}`} className="w-full aspect-square object-cover rounded-lg border border-white/10" />
              </a>
            ))}
          </div>
        )}

        {canUpload && (
          <div className="space-y-2">
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 10))} />
            <Button variant="outline" onClick={() => input.current?.click()} disabled={busy}
              className="w-full border-white/10 text-white hover:bg-white/5">
              <Upload className="w-4 h-4 mr-2" />
              {files.length ? `${files.length} foto(s) seleccionada(s)` : status === 'submitted' ? 'Reemplazar fotos' : 'Seleccionar fotos'}
            </Button>
            {files.length > 0 && (
              <Button onClick={upload} disabled={busy} className="w-full bg-primary text-[#202020] hover:bg-[#8AE63A]">
                {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Enviar evidencia
              </Button>
            )}
          </div>
        )}
      </div>

      {payouts.length > 0 && (
        <div className="bg-card rounded-xl p-4">
          <p className="text-white/50 text-xs font-medium uppercase tracking-wide mb-3">Calendario de pagos</p>
          <div className="space-y-2">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-white/70">
                  {p.kind === 'settlement' ? 'Liquidación' : `Periodo ${p.seq + 1}`}
                  {p.period_start && <span className="text-white/40"> · {format(new Date(p.period_start + 'T12:00:00'), 'd MMM', { locale: es })}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-white font-medium">{money(p.net_cents)}</span>
                  <span className={`text-xs ${p.status === 'released' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {p.status === 'released' ? 'Enviado' : p.release_at ? `Se libera ${format(new Date(p.release_at), 'd MMM', { locale: es })}` : 'Tras confirmar instalación'}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs mt-3">Montos después de la comisión de Maddi.</p>
        </div>
      )}
    </div>
  );
};

export default OwnerInstallationSection;
