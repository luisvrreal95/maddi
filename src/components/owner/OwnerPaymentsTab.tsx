import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ExternalLink, ShieldCheck, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Billboard } from '@/hooks/useBillboards';
import { bookingFees, money } from '@/components/booking/BookingDecisionDialog';

interface Row {
  id: string;
  billboard_id: string;
  business_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  payment_status: string;
  platform_fee: number | null;
  owner_payout: number | null;
  payment_expires_at: string | null;
  created_at: string;
  updated_at?: string | null;
}

type Kind = 'held' | 'captured' | 'released';
const kindOf = (r: Row): Kind | null => {
  if (r.payment_status === 'authorized' && r.status === 'pending') return 'held';
  if (r.payment_status === 'captured') return 'captured';
  if (r.payment_status === 'canceled') return 'released';
  return null;
};
const KIND_UI: Record<Kind, { label: string; cls: string }> = {
  held: { label: 'Retenido', cls: 'bg-amber-100 text-amber-800' },
  captured: { label: 'Cobrado', cls: 'bg-[#E3F9C9] text-[#2F6B00]' },
  released: { label: 'Liberado', cls: 'bg-muted text-muted-foreground' },
};

const OwnerPaymentsTab: React.FC<{ billboards: Billboard[]; userId: string }> = ({ billboards, userId }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [filter, setFilter] = useState<'all' | Kind>('all');

  useEffect(() => {
    (async () => {
      const ids = billboards.map(b => b.id);
      if (!ids.length) { setLoading(false); return; }
      const { data } = await supabase.from('bookings').select('*').in('billboard_id', ids)
        .not('stripe_payment_intent_id', 'is', null).order('created_at', { ascending: false });
      const list = ((data as any[]) || []) as Row[];
      setRows(list);
      const bizIds = Array.from(new Set(list.map(r => r.business_id)));
      if (bizIds.length) {
        const { data: profs } = await supabase.from('profiles').select('user_id, full_name, company_name').in('user_id', bizIds);
        setNames(Object.fromEntries((profs || []).map((p: any) => [p.user_id, p.company_name || p.full_name || 'Anunciante'])));
      }
      setLoading(false);
    })();
  }, [billboards, userId]);

  const titleOf = (id: string) => billboards.find(b => b.id === id)?.title || 'Espectacular';
  const movements = useMemo(() => rows.filter(r => kindOf(r)), [rows]);

  const stats = useMemo(() => {
    const som = new Date(); som.setDate(1); som.setHours(0, 0, 0, 0);
    let held = 0, monthCaptured = 0, monthFee = 0, total = 0, heldCount = 0;
    movements.forEach(r => {
      const k = kindOf(r)!; const f = bookingFees({ ...r, billboard_id: r.billboard_id } as any);
      if (k === 'held') { held += f.payout; heldCount++; }
      if (k === 'captured') {
        total += f.payout;
        if (new Date(r.updated_at || r.created_at) >= som) { monthCaptured += f.payout; monthFee += f.fee; }
      }
    });
    return { held, heldCount, monthCaptured, monthFee, total };
  }, [movements]);

  const chart = useMemo(() => {
    const out: { name: string; ingresos: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const n = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const v = movements.filter(r => kindOf(r) === 'captured').filter(r => { const c = new Date(r.updated_at || r.created_at); return c >= d && c < n; })
        .reduce((s, r) => s + bookingFees(r as any).payout, 0);
      out.push({ name: format(d, 'MMM', { locale: es }), ingresos: v });
    }
    return out;
  }, [movements]);

  const openStripe = async () => {
    setOpening(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-status', { body: { login_link: true } });
      if (error || (data as any)?.error || !(data as any)?.url) throw new Error((data as any)?.error || error?.message || 'No disponible');
      window.open((data as any).url, '_blank', 'noopener');
    } catch (e) {
      toast.error('No se pudo abrir Stripe. Verifica que tu cuenta de cobros esté conectada.');
    } finally { setOpening(false); }
  };

  const shown = movements.filter(r => filter === 'all' || kindOf(r) === filter);
  const card = 'rounded-2xl border border-border bg-background p-5';

  if (loading) return <div className="text-muted-foreground text-center py-12">Cargando pagos…</div>;

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Pagos</h1>
          <p className="text-muted-foreground mt-1">Lo que te pagan tus anunciantes, ya con la comisión de Maddi descontada.</p>
        </div>
        <Button onClick={openStripe} disabled={opening} variant="outline" className="rounded-full gap-2">
          <ExternalLink className="w-4 h-4" /> {opening ? 'Abriendo…' : 'Administrar en Stripe'}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={card}><p className="text-sm text-muted-foreground">Retenido por aprobar</p><p className="text-3xl font-bold mt-1">{money(stats.held)}</p><p className="text-xs text-muted-foreground mt-1">{stats.heldCount} solicitud{stats.heldCount === 1 ? '' : 'es'} esperando tu respuesta</p></div>
        <div className={card}><p className="text-sm text-muted-foreground">Cobrado este mes</p><p className="text-3xl font-bold mt-1">{money(stats.monthCaptured)}</p><p className="text-xs text-muted-foreground mt-1">lo que recibes</p></div>
        <div className={card}><p className="text-sm text-muted-foreground">Comisión Maddi (15%)</p><p className="text-3xl font-bold mt-1">{money(stats.monthFee)}</p><p className="text-xs text-muted-foreground mt-1">este mes</p></div>
        <div className={card}><p className="text-sm text-muted-foreground">Total cobrado</p><p className="text-3xl font-bold mt-1">{money(stats.total)}</p><p className="text-xs text-muted-foreground mt-1">desde que empezaste</p></div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
        <div className="space-y-6 min-w-0">
          <div className={`${card} p-0 overflow-hidden`}>
            <div className="p-4 flex items-center justify-between gap-3 border-b border-border flex-wrap">
              <h3 className="font-semibold">Movimientos</h3>
              <div className="flex gap-2">
                {([['all', 'Todos'], ['held', 'Retenidos'], ['captured', 'Cobrados'], ['released', 'Liberados']] as const).map(([id, l]) => (
                  <button key={id} onClick={() => setFilter(id)} className={`text-xs font-medium rounded-full px-3 py-1.5 border ${filter === id ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted'}`}>{l}</button>
                ))}
              </div>
            </div>
            {shown.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">Aún no hay movimientos. Cuando un anunciante pague una solicitud, aparecerá aquí.</div>
            ) : (
              <div className="divide-y divide-border">
                {shown.map(r => {
                  const k = kindOf(r)!; const f = bookingFees(r as any);
                  return (
                    <div key={r.id} className="p-4 flex items-center gap-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{titleOf(r.billboard_id)}</p>
                        <p className="text-xs text-muted-foreground truncate">{names[r.business_id] || 'Anunciante'} · {format(new Date(r.start_date), 'd MMM', { locale: es })} – {format(new Date(r.end_date), 'd MMM yyyy', { locale: es })}</p>
                      </div>
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${KIND_UI[k].cls}`}>{KIND_UI[k].label}</span>
                      <div className="text-right w-28">
                        <p className="font-semibold">{k === 'released' ? '—' : money(f.payout)}</p>
                        <p className="text-[11px] text-muted-foreground">de {money(r.total_price)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={card}>
            <h3 className="font-semibold">Ingresos por mes</h3>
            <p className="text-sm text-muted-foreground mb-3">Últimos 6 meses (ya con comisión descontada)</p>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v === 0 ? '$0' : `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip formatter={(v: number) => [money(v), 'Ingresos']} />
                  <Bar dataKey="ingresos" fill="#9BFF43" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className={`${card} h-fit space-y-4`}>
          <h3 className="font-semibold flex items-center gap-2"><Wallet className="w-4 h-4" /> ¿Cómo funciona?</h3>
          <ol className="space-y-3 text-sm">
            <li><b>1. Retenemos.</b> <span className="text-muted-foreground">Cuando el anunciante solicita, su tarjeta se retiene (no se cobra todavía).</span></li>
            <li><b>2. Tú decides.</b> <span className="text-muted-foreground">Si apruebas, se cobra y el dinero va a tu cuenta menos 15% de comisión. Si rechazas o no respondes en 7 días, la tarjeta se libera.</span></li>
            <li><b>3. Te depositamos.</b> <span className="text-muted-foreground">Stripe deposita a tu cuenta bancaria; revisa fechas y estado en “Administrar en Stripe”.</span></li>
          </ol>
          <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground"><ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" /> Los pagos se procesan con Stripe. Maddi nunca ve los datos de la tarjeta.</div>
        </div>
      </div>
    </div>
  );
};

export default OwnerPaymentsTab;
