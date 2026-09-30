import { useEffect, useState } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { startOwnerOnboarding } from '@/lib/stripe';

type State = 'loading' | 'none' | 'incomplete' | 'review' | 'ready';

/** Aviso para propietarios que aún no pueden cobrar. Lee el estado que mantiene el webhook. */
const StripeSetupBanner = ({ userId, hasProperties }: { userId: string; hasProperties: boolean }) => {
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from('stripe_accounts')
      .select('charges_enabled, payouts_enabled, details_submitted')
      .eq('user_id', userId).maybeSingle()
      .then(({ data }) => {
        if (!data) setState('none');
        else if (data.charges_enabled && data.payouts_enabled) setState('ready');
        else setState(data.details_submitted ? 'review' : 'incomplete');
      });
  }, [userId]);

  if (state === 'loading' || state === 'ready') return null;

  const copy = {
    none: {
      title: hasProperties ? 'Conecta tu cuenta de cobro para aprobar reservas' : 'Prepárate para cobrar',
      text: 'Toma unos 5 minutos y se hace una sola vez. Ten a la mano tu identificación, RFC y la CLABE donde quieres recibir tus pagos. Sin esto no podrás aprobar solicitudes.',
      cta: 'Conectar ahora',
    },
    incomplete: {
      title: 'Termina tu registro de cobros',
      text: 'Ya iniciaste el registro en Stripe, solo falta completarlo para poder aprobar reservas.',
      cta: 'Continuar registro',
    },
    review: {
      title: 'Stripe está revisando tu información',
      text: 'Te avisaremos cuando tu cuenta esté activa. Suele tardar poco.',
      cta: null,
    },
  }[state];

  const start = async () => {
    setBusy(true);
    try {
      await startOwnerOnboarding();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 md:p-5">
      <div className="flex items-start gap-3 flex-1">
        <Wallet className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-white font-semibold">{copy.title}</p>
          <p className="text-white/60 text-sm mt-1">{copy.text}</p>
        </div>
      </div>
      {copy.cta && (
        <Button onClick={start} disabled={busy} className="bg-primary text-[#202020] hover:bg-[#8AE63A] w-full sm:w-auto">
          {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {copy.cta}
        </Button>
      )}
    </div>
  );
};

export default StripeSetupBanner;
