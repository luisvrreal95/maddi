import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  Upload, 
  FileText, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface VerificationSectionProps {
  onVerificationChange?: () => void;
}

interface VerificationData {
  is_verified: boolean;
  verification_status: string | null;
  verification_document_url: string | null;
  verification_document_type: string | null;
  verification_submitted_at: string | null;
  verification_notes: string | null;
}

const VerificationSection = ({ onVerificationChange }: VerificationSectionProps) => {
  const { user } = useAuth();
  const [verification, setVerification] = useState<VerificationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [documentType, setDocumentType] = useState('ine');

  useEffect(() => {
    if (user) {
      fetchVerificationStatus();
    }
  }, [user]);

  const fetchVerificationStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified, verification_status, verification_document_url, verification_document_type, verification_submitted_at, verification_notes')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setVerification(data as VerificationData);
    } catch (error) {
      console.error('Error fetching verification status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // State for staged document before submission
  const [stagedDocument, setStagedDocument] = useState<{
    url: string;
    type: string;
    file: File;
  } | null>(null);

  const handleDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato no válido. Usa JPG, PNG, WebP o PDF');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no debe superar 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/verification-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('billboard-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('billboard-images')
        .getPublicUrl(fileName);

      // Stage the document for confirmation
      setStagedDocument({
        url: urlData.publicUrl,
        type: documentType,
        file: file
      });
      
      toast.success('Documento cargado. Confirma para enviar a verificación.');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Error al subir documento');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!stagedDocument || !user) return;

    setIsUploading(true);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          verification_document_url: stagedDocument.url,
          verification_document_type: stagedDocument.type,
          verification_status: 'pending',
          verification_submitted_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success('Solicitud de verificación enviada');
      setStagedDocument(null);
      fetchVerificationStatus();
      onVerificationChange?.();
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast.error('Error al enviar verificación');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelVerification = async () => {
    if (!stagedDocument || !user) return;

    try {
      // Delete uploaded file from storage
      const filePath = stagedDocument.url.split('/billboard-images/')[1];
      if (filePath) {
        await supabase.storage.from('billboard-images').remove([filePath]);
      }
      setStagedDocument(null);
      toast.info('Documento eliminado');
    } catch (error) {
      console.error('Error canceling:', error);
      setStagedDocument(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#9BFF43]" />
      </div>
    );
  }

  const renderStatus = () => {
    if (verification?.is_verified) {
      return (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
          <CheckCircle className="w-8 h-8 text-green-500" />
          <div>
            <p className="font-medium text-green-400">Identidad Verificada</p>
            <p className="text-sm text-green-400/70">
              Tu cuenta ha sido verificada exitosamente
            </p>
          </div>
        </div>
      );
    }

    switch (verification?.verification_status) {
      case 'pending':
        return (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <Clock className="w-8 h-8 text-amber-500" />
            <div>
              <p className="font-medium text-amber-400">Verificación en Proceso</p>
              <p className="text-sm text-amber-400/70">
                Estamos revisando tu documentación. Te notificaremos pronto.
              </p>
            </div>
          </div>
        );
      case 'rejected':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <XCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="font-medium text-red-400">Verificación Rechazada</p>
                <p className="text-sm text-red-400/70">
                  {verification.verification_notes || 'Tu solicitud no fue aprobada. Puedes enviar nueva documentación.'}
                </p>
              </div>
            </div>
            {renderUploadForm()}
          </div>
        );
      default:
        return renderUploadForm();
    }
  };

  const renderUploadForm = () => (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-[#1A1A1A] border border-white/10">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-[#9BFF43] mt-0.5" />
          <div>
            <p className="text-white font-medium">¿Por qué verificar tu identidad?</p>
            <p className="text-white/50 text-sm mt-1">
              Los propietarios verificados generan más confianza y reciben más solicitudes de reserva.
              Tu información está protegida y no se compartirá públicamente.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-white">Tipo de Documento</Label>
        <Select value={documentType} onValueChange={setDocumentType}>
          <SelectTrigger className="bg-[#1A1A1A] border-white/10 text-white">
            <SelectValue placeholder="Selecciona el tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ine">INE / IFE</SelectItem>
            <SelectItem value="passport">Pasaporte</SelectItem>
            <SelectItem value="license">Licencia de Conducir</SelectItem>
            <SelectItem value="rfc">Constancia de RFC</SelectItem>
            <SelectItem value="acta_constitutiva">Acta Constitutiva (Empresas)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!stagedDocument ? (
        <div className="space-y-3">
          <Label className="text-white">Subir Documento</Label>
          <div className="relative">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleDocumentSelect}
              className="hidden"
              id="verification-doc"
              disabled={isUploading}
            />
            <label
              htmlFor="verification-doc"
              className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                isUploading
                  ? 'border-white/20 bg-white/5'
                  : 'border-white/20 hover:border-[#9BFF43]/50 hover:bg-[#9BFF43]/5'
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-[#9BFF43] animate-spin mb-2" />
                  <span className="text-white/70">Subiendo documento...</span>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-white/50 mb-2" />
                  <span className="text-white/70 text-center">
                    Arrastra o haz clic para subir
                  </span>
                  <span className="text-white/40 text-xs mt-1">
                    JPG, PNG, WebP o PDF (máx 10MB)
                  </span>
                </>
              )}
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#9BFF43]/10 border border-[#9BFF43]/30">
            <FileText className="w-5 h-5 text-[#9BFF43]" />
            <span className="text-white/70 text-sm flex-1">
              Documento listo: {stagedDocument.type.toUpperCase()}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(stagedDocument.url, '_blank')}
              className="text-[#9BFF43] hover:text-[#9BFF43]/80"
            >
              Ver
            </Button>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleCancelVerification}
              variant="outline"
              className="flex-1 border-white/20 text-white hover:bg-white/10"
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitVerification}
              className="flex-1 bg-[#9BFF43] text-black hover:bg-[#9BFF43]/90"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Verificar'
              )}
            </Button>
          </div>
        </div>
      )}

      {verification?.verification_document_url && !stagedDocument && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
          <FileText className="w-5 h-5 text-[#9BFF43]" />
          <span className="text-white/70 text-sm flex-1">
            Documento cargado: {verification.verification_document_type?.toUpperCase()}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open(verification.verification_document_url!, '_blank')}
            className="text-[#9BFF43] hover:text-[#9BFF43]/80"
          >
            Ver
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium">Verificación de Identidad</h3>
        {verification?.is_verified && (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verificado
          </Badge>
        )}
      </div>
      {renderStatus()}
    </div>
  );
};

export default VerificationSection;
