import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface EvidenceTodo {
  id: string;
  billboard_id: string;
  title: string;
  start_date: string;
  end_date: string;
  payout_status: string;
  review_deadline: string | null;
  dispute_reason: string | null;
  owner_payout: number | null;
}

/** Evento global para refrescar los avisos después de subir / confirmar evidencia. */
export const EVIDENCE_CHANGED_EVENT = 'evidence-changed';

/**
 * Pendientes de evidencia del usuario:
 *  - owner: reservas aprobadas esperando fotos (o con reporte por corregir)
 *  - business: reservas con fotos por confirmar
 */
export function useEvidenceTodos(role: 'owner' | 'business') {
  const { user } = useAuth();
  const [todos, setTodos] = useState<EvidenceTodo[]>([]);

  const refresh = useCallback(async () => {
    if (!user) { setTodos([]); return; }
    try {
      let rows: any[] = [];
      if (role === 'owner') {
        const { data: bbs } = await supabase.from('billboards').select('id, title').eq('owner_id', user.id);
        const ids = (bbs || []).map((b: any) => b.id);
        if (ids.length === 0) { setTodos([]); return; }
        const { data } = await (supabase.from('bookings') as any).select('*')
          .in('billboard_id', ids).eq('status', 'approved').eq('payment_model', 'separate')
          .in('payout_status', ['awaiting_evidence', 'disputed']).order('start_date', { ascending: true });
        const titles = new Map((bbs || []).map((b: any) => [b.id, b.title]));
        rows = (data || []).map((b: any) => ({ ...b, title: titles.get(b.billboard_id) || 'Espectacular' }));
      } else {
        const { data } = await (supabase.from('bookings') as any).select('*')
          .eq('business_id', user.id).eq('status', 'approved').eq('payment_model', 'separate')
          .eq('payout_status', 'in_review').order('review_deadline', { ascending: true });
        const list = (data || []) as any[];
        const ids = [...new Set(list.map((b) => b.billboard_id))];
        const { data: bbs } = ids.length ? await supabase.from('billboards').select('id, title').in('id', ids) : { data: [] as any[] };
        const titles = new Map((bbs || []).map((b: any) => [b.id, b.title]));
        rows = list.map((b) => ({ ...b, title: titles.get(b.billboard_id) || 'Espectacular' }));
      }
      setTodos(rows.map((b) => ({
        id: b.id, billboard_id: b.billboard_id, title: b.title, start_date: b.start_date, end_date: b.end_date,
        payout_status: b.payout_status, review_deadline: b.review_deadline, dispute_reason: b.dispute_reason, owner_payout: b.owner_payout,
      })));
    } catch (e) {
      console.error('evidence todos', e);
    }
  }, [user, role]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const h = () => refresh();
    window.addEventListener(EVIDENCE_CHANGED_EVENT, h);
    return () => window.removeEventListener(EVIDENCE_CHANGED_EVENT, h);
  }, [refresh]);

  // Cambios en vivo: nuevas notificaciones suelen significar un cambio de estado
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`evidence-todos-${role}-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, role, refresh]);

  return { todos, refresh };
}
