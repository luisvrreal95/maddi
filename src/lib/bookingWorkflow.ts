import { supabase } from '@/integrations/supabase/client';
import { invoke } from '@/lib/stripe';

export type InstallationStatus = 'pending' | 'submitted' | 'confirmed' | 'disputed' | 'overdue';

// Las RPC lanzan errores de Postgres con mensajes ya en español (RAISE EXCEPTION).
const rpcError = (e: { message?: string }) => new Error(e.message || 'No se pudo completar la operación');

const notifyEvent = (bookingId: string, event: 'proof_submitted' | 'issue_reported') =>
  invoke('booking-event', { bookingId, event }).catch((e) => console.error('booking-event:', e));

export async function uploadInstallationProof(ownerId: string, bookingId: string, files: File[]): Promise<void> {
  const paths: string[] = [];
  for (const file of files) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${ownerId}/${bookingId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('installation-proofs').upload(path, file, { contentType: file.type });
    if (error) throw new Error('No se pudo subir una de las fotos');
    paths.push(path);
  }
  const { error } = await supabase.rpc('submit_installation_proof', { _booking_id: bookingId, _paths: paths });
  if (error) throw rpcError(error);
  void notifyEvent(bookingId, 'proof_submitted');
}

export async function resolveProofUrls(paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const p of paths) {
    const { data } = await supabase.storage.from('installation-proofs').createSignedUrl(p, 3600);
    if (data?.signedUrl) out.push(data.signedUrl);
  }
  return out;
}

export async function confirmInstallation(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc('confirm_installation', { _booking_id: bookingId });
  if (error) throw rpcError(error);
}

export async function reportInstallationIssue(bookingId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc('report_installation_issue', { _booking_id: bookingId, _reason: reason });
  if (error) throw rpcError(error);
  void notifyEvent(bookingId, 'issue_reported');
}

export const cancelBooking = (bookingId: string, reason?: string) =>
  invoke<{ ok: boolean; refunded: number; retained: number }>('cancel-booking', { bookingId, reason });

export const resolveDispute = (bookingId: string, resolution: 'release' | 'refund' | 'split', refundAmount?: number) =>
  invoke<{ ok: boolean; refunded: number }>('resolve-dispute', { bookingId, resolution, refundAmount });
