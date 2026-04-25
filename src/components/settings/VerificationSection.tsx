import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Clock, XCircle, Upload, Loader2, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface VerificationSectionProps {
  onVerificationChange?: () => void;
}

interface ProfileVerification {
  is_verified: boolean;
  verification_status: string | null;
  verification_notes: string | null;
}

interface FileFieldProps {
  label: string;
  required?: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

const FileField = ({ label, required, file, onChange, disabled }: FileFieldProps) => {
  const ref = useRef<HTMLInputElement>(null);
  const preview = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null;

  return (
    <div className="space-y-2">
      <Label className="text-white/80">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </Label>
      <div
        onClick={() => !disabled && ref.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden
          ${disabled ? 'opacity-50 cursor-not-allowed border-white/10' : 'border-white/20 hover:border-primary/50 hover:bg-primary/5'}
          ${file ? 'border-primary/40 bg-primary/5' : ''}
        `}
        style={{ minHeight: '96px' }}
      >
        {preview ? (
          <img src={preview} alt={label} className="w-full h-24 object-cover rounded-xl" />
        ) : file ? (
          <div className="flex flex-col items-center gap-1 py-4">
            <FileText className="w-6 h-6 text-primary" />
            <span className="text-xs text-white/60 text-center px-2 truncate max-w-full">{file.name}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-4">
            <Upload className="w-6 h-6 text-white/40" />
            <span className="text-xs text-white/40">JPG, PNG o PDF (máx 10MB)</span>
          </div>
        )}
      </div>
      {file && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(null); }}
          className="text-xs text-white/40 hover:text-red-400 transition-colors"
          disabled={disabled}
        >
          Quitar archivo
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          if (!f) return;
          if (f.size > 10 * 1024 * 1024) { toast.error('El archivo no debe superar 10MB'); return; }
          onChange(f);
          e.target.value = '';
        }}
      />
    </div>
  );
};

const VerificationSection = ({ onVerificationChange }: VerificationSectionProps) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileVerification | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [ineFront, setIneFront] = useState<File | null>(null);
  const [ineBack, setIneBack] = useState<File | null>(null);
  const [rfc, setRfc] = useState('');
  const [addressProof, setAddressProof] = useState<File | null>(null);

  useEffect(() => {
    if (user) fetchStatus();
  }, [user]);

  const fetchStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified, verification_status, verification_notes')
        .eq('user_id', user?.id)
        .single();
      if (error) throw error;
      setProfile(data as ProfileVerification);
    } catch (err) {
      console.error('Error fetching verification status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    console.log('[verification] uploading to bucket "verifications":', path);
    const { error } = await supabase.storage
      .from('verifications')
      .upload(path, file, { upsert: true });
    if (error) {
      console.error('[verification] storage upload error:', error);
      throw error;
    }
    return path;
  };

  const handleSubmit = async () => {
    if (!ineFront || !ineBack || !user) return;

    setIsSubmitting(true);
    try {
      const ts = Date.now();
      const ext = (f: File) => f.name.split('.').pop() ?? 'jpg';

      // Step 1: upload files
      console.log('[verification] step 1 — uploading INE front');
      const ineFrontPath = await uploadFile(ineFront, `${user.id}/ine-front-${ts}.${ext(ineFront)}`);

      console.log('[verification] step 2 — uploading INE back');
      const ineBackPath = await uploadFile(ineBack, `${user.id}/ine-back-${ts}.${ext(ineBack)}`);

      let addressProofPath: string | null = null;
      if (addressProof) {
        console.log('[verification] step 3 — uploading address proof');
        addressProofPath = await uploadFile(addressProof, `${user.id}/address-${ts}.${ext(addressProof)}`);
      }

      // Step 4: insert into verification_requests
      console.log('[verification] step 4 — inserting into verification_requests');
      const { error: insertError } = await (supabase as any)
        .from('verification_requests')
        .insert({
          user_id: user.id,
          ine_front_url: ineFrontPath,
          ine_back_url: ineBackPath,
          rfc: rfc.trim() || null,
          address_proof_url: addressProofPath,
          status: 'pending',
        });
      if (insertError) {
        console.error('[verification] insert error:', insertError);
        throw insertError;
      }

      // Step 5: sync profiles for admin backward compat (non-critical)
      console.log('[verification] step 5 — syncing profiles');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          verification_status: 'pending',
          verification_submitted_at: new Date().toISOString(),
          verification_document_url: ineFrontPath,
          verification_document_type: 'ine',
        } as any)
        .eq('user_id', user.id);
      if (profileError) {
        console.warn('[verification] profiles sync error (non-critical):', profileError);
      }

      console.log('[verification] success');
      toast.success('Solicitud de verificación enviada');
      setIneFront(null);
      setIneBack(null);
      setRfc('');
      setAddressProof(null);
      fetchStatus();
      onVerificationChange?.();
    } catch (err: any) {
      const detail = err?.message ?? err?.error_description ?? JSON.stringify(err);
      console.error('[verification] FAILED —', detail, err);
      toast.error(`Error al enviar: ${detail}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const status = profile?.is_verified ? 'approved' : (profile?.verification_status ?? null);

  if (status === 'approved') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
        <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
        <div>
          <p className="font-medium text-green-400">Identidad Verificada</p>
          <p className="text-sm text-green-400/70">Tu cuenta ha sido verificada exitosamente.</p>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <Clock className="w-8 h-8 text-amber-500 shrink-0" />
        <div>
          <p className="font-medium text-amber-400">En revisión</p>
          <p className="text-sm text-amber-400/70">
            Estamos revisando tu documentación. Recibirás una notificación cuando se complete la revisión.
          </p>
        </div>
      </div>
    );
  }

  const isRejected = status === 'rejected';

  return (
    <div className="space-y-5">
      {isRejected && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <XCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-400">Verificación rechazada</p>
            <p className="text-sm text-red-400/70 mt-0.5">
              {profile?.verification_notes || 'Tu solicitud no fue aprobada. Por favor envía documentos actualizados.'}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-white/10">
        <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <p className="text-white/50 text-sm">
          Los propietarios verificados generan más confianza y reciben más solicitudes. Tu información está protegida y no se compartirá públicamente.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FileField
          label="INE frente"
          required
          file={ineFront}
          onChange={setIneFront}
          disabled={isSubmitting}
        />
        <FileField
          label="INE reverso"
          required
          file={ineBack}
          onChange={setIneBack}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rfc" className="text-white/80">RFC <span className="text-white/30 font-normal">(opcional)</span></Label>
        <Input
          id="rfc"
          value={rfc}
          onChange={(e) => setRfc(e.target.value.toUpperCase())}
          placeholder="XAXX010101000"
          maxLength={13}
          className="bg-card border-white/10 text-white uppercase"
          disabled={isSubmitting}
        />
      </div>

      <FileField
        label="Comprobante de domicilio (opcional)"
        file={addressProof}
        onChange={setAddressProof}
        disabled={isSubmitting}
      />

      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !ineFront || !ineBack}
        className="w-full bg-primary text-black hover:bg-primary/90 disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Enviando...
          </>
        ) : (
          'Enviar verificación'
        )}
      </Button>

      {(!ineFront || !ineBack) && (
        <p className="text-white/30 text-xs text-center">
          INE frente e INE reverso son requeridos
        </p>
      )}
    </div>
  );
};

export default VerificationSection;
