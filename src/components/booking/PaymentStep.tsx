import React, { useEffect, useState } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  bookingId: string;
  total: number;
  onPaid: () => void;
  onCancel: () => void;
}

const Form: React.FC<{ total: number; onPaid: () => void; onCancel: () => void }> = ({ total, onPaid, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    if (error) {
      toast.error(error.message || 'No se pudo autorizar la tarjeta');
      setBusy(false);
      return;
    }
    // requires_capture = retención autorizada
    if (paymentIntent && ['requires_capture', 'succeeded', 'processing'].includes(paymentIntent.status)) onPaid();
    else { toast.error('No se pudo autorizar el pago'); setBusy(false); }
  };

  return (
    <form onSubmit={pay} className="space-y-4">
      <PaymentElement />
      <p className="text-xs text-muted-foreground flex items-start gap-2">
        <Lock className="w-3.5 h-3.5 mt-0.5 flex-none" />
        Solo retenemos ${total.toLocaleString('es-MX')} MXN en tu tarjeta. El cobro se hace únicamente si el propietario aprueba tu solicitud; si la rechaza o no responde, se libera.
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="rounded-full" onClick={onCancel} disabled={busy}>Atrás</Button>
        <Button type="submit" disabled={!stripe || busy} className="flex-1 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary-hover">
          {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Autorizar y enviar solicitud
        </Button>
      </div>
    </form>
  );
};

const PaymentStep: React.FC<Props> = ({ bookingId, total, onPaid, onCancel }) => {
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke('stripe-create-payment', { body: { booking_id: bookingId } });
      if (error || !data?.client_secret || !data?.publishable_key) {
        setError((data as any)?.error || 'No se pudo iniciar el pago');
        return;
      }
      setStripePromise(loadStripe(data.publishable_key));
      setClientSecret(data.client_secret);
    })();
  }, [bookingId]);

  if (error) return (
    <div className="space-y-3">
      <p className="text-sm text-red-600">{error}</p>
      <Button variant="outline" className="rounded-full" onClick={onCancel}>Atrás</Button>
    </div>
  );
  if (!clientSecret || !stripePromise) return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, locale: 'es', appearance: { theme: 'stripe', variables: { colorPrimary: '#0B120E', borderRadius: '12px', fontFamily: 'Poppins, system-ui, sans-serif' } } }}>
      <Form total={total} onPaid={onPaid} onCancel={onCancel} />
    </Elements>
  );
};

export default PaymentStep;
