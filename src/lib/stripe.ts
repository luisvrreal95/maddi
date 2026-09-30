import { supabase } from '@/integrations/supabase/client';

export interface ConnectStatus {
  connected: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
}

// supabase.functions.invoke oculta el mensaje del servidor en error.context;
// lo extraemos para mostrar un motivo útil (ej. "El propietario aún no puede recibir pagos").
export async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) {
    let message = 'No se pudo completar la operación';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) message = (await ctx.json()).error ?? message;
    } catch { /* usa el mensaje por defecto */ }
    throw new Error(message);
  }
  return data as T;
}

export const getConnectStatus = () => invoke<ConnectStatus>('stripe-connect', { action: 'status' });

export async function startOwnerOnboarding(): Promise<void> {
  const { url } = await invoke<{ url: string }>('stripe-connect', { action: 'onboard' });
  window.location.href = url;
}

export async function openStripeDashboard(): Promise<void> {
  const { url } = await invoke<{ url: string }>('stripe-connect', { action: 'dashboard' });
  window.open(url, '_blank', 'noopener');
}

export async function startCheckout(bookingId: string): Promise<void> {
  const { url } = await invoke<{ url: string }>('create-checkout-session', { bookingId });
  window.location.href = url;
}

/** ¿Puede este propietario recibir pagos? (RPC segura: no expone el id de Stripe). */
export async function ownerCanReceivePayments(ownerId: string): Promise<boolean> {
  const { data } = await supabase.rpc('owner_can_receive_payments', { _owner_id: ownerId });
  return data === true;
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | null;

export async function getPaymentStatuses(bookingIds: string[]): Promise<Record<string, PaymentStatus>> {
  if (!bookingIds.length) return {};
  const { data } = await supabase
    .from('platform_commissions')
    .select('booking_id, payment_status')
    .in('booking_id', bookingIds);
  return Object.fromEntries((data ?? []).map((r) => [r.booking_id, r.payment_status as PaymentStatus]));
}
