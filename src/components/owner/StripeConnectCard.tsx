import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

type State = { loading: boolean; connected: boolean; chargesEnabled: boolean; payoutsEnabled: boolean };

const StripeConnectCard: React.FC = () => {
  const [st, setSt] = useState<State>({ loading: true, connected: false, chargesEnabled: false, payoutsEnabled: false });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.functions.invoke('stripe-connect-status');
    if (error || (data as any)?.error) { setSt((s) => ({ ...s, loading: false })); return; }
    setSt({ loading: false, connected: !!data.connected, chargesEnabled: !!data.chargesEnabled, payoutsEnabled: !!data.payoutsEnabled });
  };
  useEffect(() => { load(); }, []);

  const start = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('stripe-connect-onboard');
    if (error || !(data as any)?.url) { toast.error('No se pudo abrir el alta de pagos'); setBusy(false); return; }
    window.location.href = (data as any).url;
  };

  if (st.loading) return null;

  if (st.chargesEnabled) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#2F7A00] bg-[#EAF9D6] rounded-2xl px-4 py-3 mb-5 w-fit">
        <CheckCircle2 className="w-4 h-4" />Cobros en Maddi activos{!st.payoutsEnabled && ' · falta confirmar tu cuenta bancaria en Stripe'}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center flex-none"><CreditCard className="w-5 h-5" /></div>
      <div className="flex-1">
        <div className="font-semibold text-sm">{st.connected ? 'Termina tu alta para cobrar en Maddi' : 'Cobra tus rentas desde Maddi'}</div>
        <p className="text-xs text-muted-foreground mt-0.5">Conecta tu cuenta para recibir el pago de tus reservas directo en tu banco. Es un registro de unos minutos con Stripe. Mientras tanto, tus reservas siguen funcionando con pago por fuera.</p>
      </div>
      <Button onClick={start} disabled={busy} className="rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary-hover">
        {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{st.connected ? 'Continuar alta' : 'Conectar cuenta'}
      </Button>
    </div>
  );
};

export default StripeConnectCard;
