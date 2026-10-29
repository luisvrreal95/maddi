import React, { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Camera, CheckCircle2, ShieldCheck, AlertTriangle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  booking: any;
  role: 'owner' | 'business';
  onChanged: () => void;
}

const MAX_MB = 8;

/** Evidencia de instalación: el pago se libera al propietario cuando se valida que el anuncio está puesto. */
const EvidencePanel: React.FC<Props> = ({ booking, role, onChanged }) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [urls, setUrls] = useState<string[]>([]);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('');

  const ps: string = booking?.payout_status;
  const paths: string[] = booking?.evidence_paths || [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!paths.length) { setUrls([]); return; }
      const out: string[] = [];
      for (const p of paths) {
        const { data } = await supabase.storage.from('campaign-evidence').createSignedUrl(p, 3600);
        if (data?.signedUrl) out.push(data.signedUrl);
      }
      if (!cancelled) setUrls(out);
    })();
    return () => { cancelled = true; };
  }, [booking?.id, paths.join('|')]);

  if (!booking || booking.status !== 'approved' || booking.payment_model !== 'separate' || !['awaiting_evidence', 'in_review', 'disputed', 'released'].includes(ps)) return null;

  const call = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('stripe-booking-evidence', { body: { booking_id: booking.id, ...body } });
    if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message || 'Error');
  };

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    const ok = list.filter(f => f.size <= MAX_MB * 1024 * 1024);
    if (ok.length < list.length) toast.error(`Cada foto debe pesar menos de ${MAX_MB} MB`);
    setFiles(prev => [...prev, ...ok].slice(0, 6));
    e.target.value = '';
  };

  const submit = async () => {
    if (!user || !files.length) return;
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const ext = (files[i].name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${user.id}/${booking.id}/${Date.now()}-${i}.${ext}`;
        const { error } = await supabase.storage.from('campaign-evidence').upload(path, files[i], { contentType: files[i].type });
        if (error) throw error;
        uploaded.push(path);
      }
      await call({ action: 'submit', paths: uploaded, note });
      toast.success('Evidencia enviada. El anunciante tiene 48 h para confirmar.');
      setFiles([]); setNote('');
      onChanged();
    } catch (e) { toast.error((e as Error).message || 'No se pudo enviar la evidencia'); }
    finally { setBusy(false); }
  };

  const act = async (action: 'confirm' | 'dispute') => {
    setBusy(true);
    try {
      await call({ action, reason });
      toast.success(action === 'confirm' ? 'Gracias por confirmar' : 'Reporte enviado. Maddi lo revisará.');
      setReporting(false); setReason('');
      onChanged();
    } catch (e) { toast.error((e as Error).message || 'Error'); }
    finally { setBusy(false); }
  };

  const gallery = urls.length > 0 && (
    <div className="grid grid-cols-3 gap-2">
      {urls.map((u, i) => (
        <a key={i} href={u} target="_blank" rel="noreferrer"><img src={u} alt={`Evidencia ${i + 1}`} className="w-full aspect-square object-cover rounded-xl border border-border" /></a>
      ))}
    </div>
  );

  const box = 'rounded-2xl border border-border bg-card p-4 space-y-3 text-sm';

  // ---- Liberado ----
  if (ps === 'released') {
    return (
      <div className={box}>
        <p className="font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#2F7A00]" />Pago liberado</p>
        <p className="text-muted-foreground text-xs">
          {role === 'owner' ? 'Ya transferimos tu pago a tu cuenta de cobros.' : 'Confirmado: el anuncio está instalado.'}
          {booking.payout_released_at ? ` · ${format(new Date(booking.payout_released_at), "d 'de' MMM", { locale: es })}` : ''}
        </p>
        {gallery}
      </div>
    );
  }

  // ---- Propietario: subir evidencia ----
  const uploadForm = (
    <div className="space-y-3">
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative">
              <img src={URL.createObjectURL(f)} alt="" className="w-full aspect-square object-cover rounded-xl border border-border" />
              <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" onChange={pick} className="hidden" />
      <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy || files.length >= 6} className="rounded-full gap-2">
        <Camera className="w-4 h-4" /> {files.length ? 'Agregar otra foto' : 'Tomar o subir fotos'}
      </Button>
      <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Nota opcional (ej. se instaló el 3 de noviembre)" className="bg-background border-border" />
      <Button onClick={submit} disabled={busy || !files.length} className="w-full rounded-full bg-[#9BFF43] text-[#07110B] hover:bg-[#8AEE32] font-semibold">
        {busy ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando…</> : 'Enviar evidencia'}
      </Button>
    </div>
  );

  if (role === 'owner') {
    if (ps === 'awaiting_evidence') {
      return (
        <div className={box}>
          <p className="font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Sube la evidencia para recibir tu pago</p>
          <p className="text-muted-foreground text-xs">Cuando el anuncio esté instalado, toma fotos donde se vea el arte en el espectacular y el entorno. Tu pago se libera cuando el anunciante confirma o a las 48 h sin reportes.</p>
          {uploadForm}
        </div>
      );
    }
    if (ps === 'in_review') {
      return (
        <div className={box}>
          <p className="font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" />En revisión del anunciante</p>
          <p className="text-muted-foreground text-xs">
            Tu pago se libera cuando confirme{booking.review_deadline ? `, o automáticamente el ${format(new Date(booking.review_deadline), "d 'de' MMM 'a las' HH:mm", { locale: es })} si no reporta problemas` : ''}.
          </p>
          {gallery}
        </div>
      );
    }
    return (
      <div className={box}>
        <p className="font-semibold flex items-center gap-2 text-amber-700"><AlertTriangle className="w-4 h-4" />El anunciante reportó un problema</p>
        {booking.dispute_reason && <p className="bg-muted rounded-xl p-3 text-xs">“{booking.dispute_reason}”</p>}
        <p className="text-muted-foreground text-xs">Puedes subir nuevas fotos o escribirle en Mensajes. Maddi revisa el caso y te avisará.</p>
        {uploadForm}
      </div>
    );
  }

  // ---- Anunciante ----
  if (ps === 'awaiting_evidence') {
    return (
      <div className={box}>
        <p className="font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Tu pago está protegido</p>
        <p className="text-muted-foreground text-xs">Maddi retiene el pago y solo se lo entrega al propietario cuando haya fotos de tu anuncio instalado y tú lo confirmes.</p>
      </div>
    );
  }
  if (ps === 'in_review') {
    return (
      <div className={box}>
        <p className="font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Confirma que tu anuncio está instalado</p>
        <p className="text-muted-foreground text-xs">
          El propietario subió estas fotos. {booking.review_deadline ? `Tienes hasta el ${format(new Date(booking.review_deadline), "d 'de' MMM 'a las' HH:mm", { locale: es })}; si no respondes, se entiende como confirmado.` : ''}
        </p>
        {booking.evidence_note && <p className="bg-muted rounded-xl p-3 text-xs">“{booking.evidence_note}”</p>}
        {gallery}
        {reporting ? (
          <div className="space-y-2">
            <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="¿Qué problema ves? (mínimo 10 caracteres)" className="bg-background border-border" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setReporting(false)} disabled={busy} className="rounded-full">Volver</Button>
              <Button onClick={() => act('dispute')} disabled={busy || reason.trim().length < 10} className="flex-1 rounded-full bg-red-600 text-white hover:bg-red-700">Enviar reporte</Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button onClick={() => act('confirm')} disabled={busy} className="flex-1 rounded-full bg-[#9BFF43] text-[#07110B] hover:bg-[#8AEE32] font-semibold">Sí, está instalado</Button>
            <Button variant="outline" onClick={() => setReporting(true)} disabled={busy} className="rounded-full">Reportar problema</Button>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={box}>
      <p className="font-semibold flex items-center gap-2 text-amber-700"><AlertTriangle className="w-4 h-4" />Reporte en revisión</p>
      <p className="text-muted-foreground text-xs">Maddi está revisando tu reporte. El pago al propietario sigue detenido y no se libera hasta resolverlo.</p>
    </div>
  );
};

export default EvidencePanel;
