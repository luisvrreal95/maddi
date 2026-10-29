import React from 'react';
import { Camera, ShieldCheck, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEvidenceTodos, EvidenceTodo } from '@/hooks/useEvidenceTodos';

interface Props {
  role: 'owner' | 'business';
  onOpen: (bookingId: string) => void;
}

const fmt = (d: string) => new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

const hoursLeft = (deadline: string | null) => {
  if (!deadline) return null;
  const h = Math.max(0, Math.round((new Date(deadline).getTime() - Date.now()) / 3600000));
  return h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} h` : `${h} h`;
};

/** Aviso visible de lo que falta por hacer con la evidencia de instalación. */
const EvidenceTodoBanner: React.FC<Props> = ({ role, onOpen }) => {
  const { todos } = useEvidenceTodos(role);
  if (todos.length === 0) return null;

  const owner = role === 'owner';
  const disputed = todos.filter((t) => t.payout_status === 'disputed').length;
  const title = owner
    ? todos.length === 1 ? 'Sube la evidencia de 1 reserva' : `Sube la evidencia de ${todos.length} reservas`
    : todos.length === 1 ? 'Confirma que tu anuncio está instalado' : `Confirma la instalación de ${todos.length} campañas`;
  const sub = owner
    ? 'Tu pago se libera cuando subas fotos del anuncio instalado y el anunciante las confirme.'
    : 'El propietario ya subió fotos. Si no respondes en 48 h, se confirma automáticamente.';

  const rowLabel = (t: EvidenceTodo) => {
    if (owner) return t.payout_status === 'disputed' ? 'El anunciante reportó un problema' : `Campaña ${fmt(t.start_date)} – ${fmt(t.end_date)}`;
    const left = hoursLeft(t.review_deadline);
    return left ? `Quedan ${left} para revisar` : 'Pendiente de revisar';
  };

  return (
    <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          {owner ? <Camera className="w-5 h-5 text-primary" /> : <ShieldCheck className="w-5 h-5 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-foreground font-semibold">{title}</h3>
          <p className="text-muted-foreground text-sm mt-0.5">{sub}</p>
          {owner && disputed > 0 && (
            <p className="text-sm mt-1 flex items-center gap-1 text-destructive">
              <AlertTriangle className="w-3.5 h-3.5" /> {disputed} con reporte del anunciante: sube nuevas fotos o responde desde la reserva.
            </p>
          )}
          <div className="mt-3 space-y-2">
            {todos.slice(0, 3).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl bg-card border border-border px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{rowLabel(t)}</p>
                </div>
                <Button size="sm" onClick={() => onOpen(t.id)} className="flex-shrink-0">
                  {owner ? (t.payout_status === 'disputed' ? 'Ver reporte' : 'Subir evidencia') : 'Revisar fotos'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ))}
            {todos.length > 3 && <p className="text-xs text-muted-foreground">y {todos.length - 3} más en Reservas</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvidenceTodoBanner;
