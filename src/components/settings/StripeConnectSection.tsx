import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Clock, Loader2, ExternalLink, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import {
  ConnectStatus, getConnectStatus, openStripeDashboard, startOwnerOnboarding,
} from '@/lib/stripe';

const StripeConnectSection = () => {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getConnectStatus()
      .then(setStatus)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/50" /></div>;
  }

  const ready = !!status?.charges_enabled && !!status?.payouts_enabled;
  const inReview = !!status?.details_submitted && !ready;

  return (
    <div className="space-y-4">
      <p className="text-white/60 text-sm">
        Los pagos de los anunciantes se procesan con Stripe. Conecta tu cuenta para recibir tus
        ganancias directamente; Maddi descuenta su comisión automáticamente en cada cobro.
      </p>

      <div className="flex items-start gap-3 rounded-xl border border-white/10 p-4">
        {ready ? (
          <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
        ) : inReview ? (
          <Clock className="w-5 h-5 text-amber-400 mt-0.5" />
        ) : (
          <Wallet className="w-5 h-5 text-white/50 mt-0.5" />
        )}
        <div className="flex-1">
          <p className="text-white font-medium">
            {ready ? 'Cuenta de cobro activa' : inReview ? 'Stripe está revisando tu información' : status?.connected ? 'Falta completar tu registro' : 'Aún no has conectado tu cuenta'}
          </p>
          <p className="text-white/50 text-sm">
            {ready
              ? 'Ya puedes recibir pagos por tus campañas aprobadas.'
              : 'Hasta que esté activa, los anunciantes no podrán pagar tus reservas aprobadas.'}
          </p>
        </div>
      </div>

      {ready ? (
        <Button variant="outline" disabled={busy} onClick={() => run(openStripeDashboard)}
          className="border-white/20 text-white hover:bg-white/10">
          <ExternalLink className="w-4 h-4 mr-2" /> Ver mis pagos en Stripe
        </Button>
      ) : (
        <Button disabled={busy} onClick={() => run(startOwnerOnboarding)}
          className="bg-primary text-[#202020] hover:bg-[#8AE63A]">
          {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {status?.connected ? 'Continuar registro en Stripe' : 'Conectar cuenta de cobro'}
        </Button>
      )}
    </div>
  );
};

export default StripeConnectSection;
