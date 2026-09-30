import { useCallback, useEffect, useState } from 'react';
import { Loader2, AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { resolveDispute, resolveProofUrls } from '@/lib/bookingWorkflow';

interface Case {
  id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  installation_status: string;
  installation_photos: string[];
  dispute_reason: string | null;
  disputed_at: string | null;
  billboard_title: string;
  owner_name: string;
  business_name: string;
  pending_cents: number;
}

type Action = { c: Case; resolution: 'release' | 'refund' | 'split' } | null;

const money = (cents: number) => `$${(cents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`;

const DisputeManagement = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<Action>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [proofs, setProofs] = useState<Record<string, string[]>>({});

  const load = useCallback(async () => {
    const { data: bookings } = await supabase.from('bookings')
      .select('id, start_date, end_date, total_price, installation_status, installation_photos, dispute_reason, disputed_at, business_id, billboard_id')
      .eq('status', 'approved').in('installation_status', ['disputed', 'overdue'])
      .order('disputed_at', { ascending: true, nullsFirst: false });

    const rows: Case[] = [];
    for (const b of bookings ?? []) {
      const [{ data: bb }, { data: biz }, { data: pend }] = await Promise.all([
        supabase.from('billboards').select('title, owner_id').eq('id', b.billboard_id).maybeSingle(),
        supabase.from('profiles').select('full_name, company_name').eq('user_id', b.business_id).maybeSingle(),
        supabase.from('booking_payouts').select('gross_cents').eq('booking_id', b.id).eq('status', 'scheduled'),
      ]);
      const { data: owner } = bb ? await supabase.from('profiles').select('full_name, company_name').eq('user_id', bb.owner_id).maybeSingle() : { data: null };
      rows.push({
        ...b,
        billboard_title: bb?.title ?? 'Espectacular',
        owner_name: owner?.company_name || owner?.full_name || 'Propietario',
        business_name: biz?.company_name || biz?.full_name || 'Anunciante',
        pending_cents: (pend ?? []).reduce((s, p) => s + p.gross_cents, 0),
      });
    }
    setCases(rows);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showProofs = async (c: Case) => {
    if (proofs[c.id]) return;
    setProofs((p) => ({ ...p, [c.id]: [] }));
    const urls = await resolveProofUrls(c.installation_photos);
    setProofs((p) => ({ ...p, [c.id]: urls }));
  };

  const confirm = async () => {
    if (!action) return;
    setBusy(true);
    try {
      const r = await resolveDispute(action.c.id, action.resolution,
        action.resolution === 'split' ? Number(amount) : undefined);
      toast.success(r.refunded > 0 ? `Disputa resuelta. Reembolsado $${r.refunded.toLocaleString('es-MX')} MXN` : 'Disputa resuelta');
      setAction(null);
      setAmount('');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Disputas e instalaciones atrasadas</h2>
        <p className="text-muted-foreground">
          Reportes de anunciantes (pagos congelados) y campañas iniciadas sin evidencia de instalación.
        </p>
      </div>

      {cases.length === 0 && <Card className="p-8 text-center text-muted-foreground">Nada pendiente 🎉</Card>}

      {cases.map((c) => (
        <Card key={c.id} className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold">{c.billboard_title}</h3>
              <p className="text-sm text-muted-foreground">
                {c.business_name} → {c.owner_name} · {format(new Date(c.start_date + 'T12:00:00'), 'd MMM', { locale: es })} – {format(new Date(c.end_date + 'T12:00:00'), 'd MMM yyyy', { locale: es })}
              </p>
            </div>
            {c.installation_status === 'disputed'
              ? <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Disputa</Badge>
              : <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Sin evidencia</Badge>}
          </div>

          {c.dispute_reason && <p className="text-sm italic">“{c.dispute_reason}”</p>}
          <p className="text-sm text-muted-foreground">
            Total: ${Number(c.total_price).toLocaleString('es-MX')} MXN · Retenido sin liberar: <span className="text-foreground font-medium">{money(c.pending_cents)}</span>
          </p>

          {c.installation_photos.length > 0 && (
            <div>
              <Button variant="link" className="px-0 h-auto" onClick={() => showProofs(c)}>Ver evidencia del propietario</Button>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {(proofs[c.id] ?? []).map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt="" className="aspect-square object-cover rounded-lg border" /></a>
                ))}
              </div>
            </div>
          )}

          {c.installation_status === 'disputed' && (
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={() => setAction({ c, resolution: 'release' })}>Liberar al propietario</Button>
              <Button size="sm" variant="outline" onClick={() => { setAmount(''); setAction({ c, resolution: 'split' }); }}>Reembolso parcial</Button>
              <Button size="sm" variant="destructive" onClick={() => setAction({ c, resolution: 'refund' })}>Reembolso total y cancelar</Button>
            </div>
          )}
        </Card>
      ))}

      <Dialog open={!!action} onOpenChange={(o) => !busy && !o && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action?.resolution === 'release' ? 'Liberar pago al propietario'
                : action?.resolution === 'split' ? 'Reembolso parcial' : 'Reembolso total y cancelación'}
            </DialogTitle>
            <DialogDescription>
              {action?.resolution === 'release' && 'Se confirma la instalación y los pagos se liberan según el calendario.'}
              {action?.resolution === 'refund' && `Se reembolsan ${action ? money(action.c.pending_cents) : ''} al anunciante y se cancela la reserva. Lo ya liberado al propietario no se recupera.`}
              {action?.resolution === 'split' && `Indica cuánto reembolsar al anunciante (máx. ${action ? money(action.c.pending_cents) : ''}, sin llegar al total). El resto se libera al propietario.`}
            </DialogDescription>
          </DialogHeader>
          {action?.resolution === 'split' && (
            <Input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto en MXN" />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)} disabled={busy}>Cancelar</Button>
            <Button onClick={confirm} disabled={busy || (action?.resolution === 'split' && !(Number(amount) > 0))}>
              {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DisputeManagement;
