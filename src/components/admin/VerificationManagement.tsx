import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  ExternalLink,
  Eye
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Renders an inline image preview or a PDF download button, labeled clearly
const DocPreview = ({ label, signedUrl, rawPath }: { label: string; signedUrl: string | null; rawPath: string | null }) => {
  if (!rawPath && !signedUrl) return null;

  const isPdf = (rawPath ?? '').toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      {signedUrl ? (
        isPdf ? (
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-muted transition-colors"
          >
            <FileText className="w-4 h-4 text-primary" />
            Ver PDF
            <ExternalLink className="w-3 h-3 ml-auto" />
          </a>
        ) : (
          <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img
              src={signedUrl}
              alt={label}
              className="w-full max-h-48 object-contain rounded-md border bg-muted"
            />
          </a>
        )
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm text-muted-foreground bg-muted/50">
          <FileText className="w-4 h-4" />
          No se pudo cargar la imagen
        </div>
      )}
    </div>
  );
};

interface VerificationRequest {
  id: string;
  user_id: string;
  full_name: string;
  company_name: string | null;
  avatar_url: string | null;
  verification_status: string;
  verification_document_url: string | null;
  verification_document_type: string | null;
  verification_submitted_at: string | null;
  verification_notes: string | null;
}

interface VerificationDetails {
  ine_front_url: string | null;
  ine_back_url: string | null;
  rfc: string | null;
  address_proof_url: string | null;
  created_at: string | null;
}

interface SignedUrls {
  ineFront: string | null;
  ineBack: string | null;
  addressProof: string | null;
}

const VerificationManagement = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [verificationDetails, setVerificationDetails] = useState<VerificationDetails | null>(null);
  const [signedUrls, setSignedUrls] = useState<SignedUrls>({ ineFront: null, ineBack: null, addressProof: null });
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [loadingDocUrl, setLoadingDocUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Try 'verifications' bucket first (new), fall back to 'verification-docs' (legacy)
  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('verifications')
        .createSignedUrl(filePath, 3600);
      if (!error && data?.signedUrl) return data.signedUrl;

      // Legacy bucket fallback
      const { data: legacyData, error: legacyError } = await supabase.storage
        .from('verification-docs')
        .createSignedUrl(filePath, 3600);
      if (!legacyError && legacyData?.signedUrl) return legacyData.signedUrl;

      return null;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      return null;
    }
  };

  // Open a document in a new tab using a signed URL
  const handleViewDocument = async (docPath: string) => {
    setLoadingDocUrl(docPath);
    try {
      const signedUrl = await getSignedUrl(docPath);
      if (signedUrl) {
        window.open(signedUrl, '_blank');
      } else {
        toast({ title: "Error", description: "No se pudo cargar el documento", variant: "destructive" });
      }
    } finally {
      setLoadingDocUrl(null);
    }
  };

  // Extract relative storage path from a full Supabase URL or return as-is
  const extractStoragePath = (raw: string, bucket: string): string => {
    // Handles: /object/public/verifications/... and /object/sign/verifications/...
    const markers = [
      `/object/public/${bucket}/`,
      `/object/sign/${bucket}/`,
      `/object/authenticated/${bucket}/`,
    ];
    for (const marker of markers) {
      const idx = raw.indexOf(marker);
      if (idx !== -1) return raw.slice(idx + marker.length).split('?')[0];
    }
    // Already a relative path
    return raw;
  };

  // Generate a signed URL from the verifications bucket (1h expiry)
  const signUrl = async (raw: string | null): Promise<string | null> => {
    if (!raw) return null;
    console.log('[verification admin] raw value from DB:', raw);
    try {
      const path = raw.startsWith('http') ? extractStoragePath(raw, 'verifications') : raw;
      console.log('[verification admin] extracted path:', path);

      const { data, error } = await supabase.storage
        .from('verifications')
        .createSignedUrl(path, 3600);
      if (!error && data?.signedUrl) {
        console.log('[verification admin] signed URL ok for:', path);
        return data.signedUrl;
      }
      console.warn('[verification admin] verifications bucket error:', error, '— trying legacy bucket');

      // Legacy bucket fallback
      const legacyPath = raw.startsWith('http') ? extractStoragePath(raw, 'verification-docs') : raw;
      const { data: ld, error: le } = await supabase.storage
        .from('verification-docs')
        .createSignedUrl(legacyPath, 3600);
      if (!le && ld?.signedUrl) return ld.signedUrl;
      console.error('[verification admin] both buckets failed for path:', path, le);
      return null;
    } catch (err) {
      console.error('[verification admin] signUrl exception:', err);
      return null;
    }
  };

  // Load full documents from verification_requests and pre-generate all signed URLs
  const fetchVerificationDetails = async (userId: string) => {
    setLoadingDetails(true);
    setVerificationDetails(null);
    setSignedUrls({ ineFront: null, ineBack: null, addressProof: null });
    try {
      const { data, error } = await (supabase as any)
        .from('verification_requests')
        .select('ine_front_url, ine_back_url, rfc, address_proof_url, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[admin] verification_requests query error:', error);
      }

      const details: VerificationDetails = data ?? null;
      console.log('[verification admin] verification_requests row:', JSON.stringify(details));
      setVerificationDetails(details);

      if (details) {
        console.log('[verification admin] ine_front_url:', details.ine_front_url);
        console.log('[verification admin] ine_back_url:', details.ine_back_url);
        console.log('[verification admin] address_proof_url:', details.address_proof_url);
        // Generate all three signed URLs in parallel
        const [ineFront, ineBack, addressProof] = await Promise.all([
          signUrl(details.ine_front_url),
          signUrl(details.ine_back_url),
          signUrl(details.address_proof_url),
        ]);
        setSignedUrls({ ineFront, ineBack, addressProof });
      }
    } catch (err) {
      console.error('[admin] Error fetching verification details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchRequests = async () => {
    try {
      let query = supabase
        .from("profiles")
        .select("id, user_id, full_name, company_name, avatar_url, verification_status, verification_document_url, verification_document_type, verification_submitted_at, verification_notes")
        .order("verification_submitted_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("verification_status", statusFilter);
      } else {
        query = query.neq("verification_status", "none");
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests((data as VerificationRequest[]) || []);
    } catch (error) {
      console.error("Error fetching verification requests:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las solicitudes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selectedRequest || !user) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          verification_status: status,
          is_verified: status === "approved",
          verification_reviewed_at: new Date().toISOString(),
          verification_reviewed_by: user.id,
          verification_notes: reviewNotes || null,
        })
        .eq("user_id", selectedRequest.user_id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Verificación ${status === "approved" ? "aprobada" : "rechazada"}`,
      });

      setSelectedRequest(null);
      setReviewNotes("");
      fetchRequests();
    } catch (error) {
      console.error("Error updating verification:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la verificación",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-amber-500 border-amber-500">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="text-green-500 border-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprobada
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="text-red-500 border-red-500">
            <XCircle className="w-3 h-3 mr-1" />
            Rechazada
          </Badge>
        );
      default:
        return <Badge variant="secondary">Sin solicitud</Badge>;
    }
  };

  const pendingCount = requests.filter((r) => r.verification_status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Verificación de Identidad</h2>
        <p className="text-muted-foreground">
          Revisa y aprueba las solicitudes de verificación de propietarios
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              Solicitudes de Verificación
              {pendingCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {pendingCount} pendientes
                </Badge>
              )}
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="approved">Aprobadas</SelectItem>
                <SelectItem value="rejected">Rechazadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay solicitudes de verificación</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Tipo de Documento</TableHead>
                  <TableHead>Fecha de Solicitud</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={request.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {request.full_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{request.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {request.company_name || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.verification_document_type || (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {request.verification_submitted_at
                        ? format(
                            new Date(request.verification_submitted_at),
                            "dd MMM yyyy",
                            { locale: es }
                          )
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(request.verification_status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {request.verification_document_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={loadingDocUrl === request.verification_document_url}
                            onClick={() => handleViewDocument(request.verification_document_url!)}
                          >
                            {loadingDocUrl === request.verification_document_url
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <ExternalLink className="w-4 h-4" />}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRequest(request);
                            setReviewNotes(request.verification_notes || "");
                            fetchVerificationDetails(request.user_id);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Revisar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog
        open={!!selectedRequest}
        onOpenChange={(open) => { if (!open) { setSelectedRequest(null); setVerificationDetails(null); setSignedUrls({ ineFront: null, ineBack: null, addressProof: null }); } }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Revisar Verificación</DialogTitle>
            <DialogDescription>
              Revisa los documentos y aprueba o rechaza la solicitud
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* User info */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedRequest.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {selectedRequest.full_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedRequest.full_name}</p>
                  {selectedRequest.company_name && (
                    <p className="text-sm text-muted-foreground">{selectedRequest.company_name}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedRequest.verification_submitted_at
                      ? format(new Date(selectedRequest.verification_submitted_at), "dd/MM/yyyy HH:mm", { locale: es })
                      : "Sin fecha"}
                  </p>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-3">
                <p className="text-sm font-medium">Documentos de verificación</p>

                {loadingDetails ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generando URLs firmadas...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* INE Frente */}
                    <DocPreview
                      label="INE Frente"
                      signedUrl={signedUrls.ineFront}
                      rawPath={verificationDetails?.ine_front_url ?? selectedRequest.verification_document_url}
                    />

                    {/* INE Reverso */}
                    <DocPreview
                      label="INE Reverso"
                      signedUrl={signedUrls.ineBack}
                      rawPath={verificationDetails?.ine_back_url ?? null}
                    />

                    {/* Comprobante de Domicilio */}
                    {(verificationDetails?.address_proof_url || signedUrls.addressProof) && (
                      <DocPreview
                        label="Comprobante de Domicilio"
                        signedUrl={signedUrls.addressProof}
                        rawPath={verificationDetails?.address_proof_url ?? null}
                      />
                    )}

                    {/* RFC */}
                    {verificationDetails?.rfc && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm">
                        <span className="text-muted-foreground">RFC:</span>
                        <span className="font-mono font-medium">{verificationDetails.rfc}</span>
                      </div>
                    )}

                    {!signedUrls.ineFront && !signedUrls.ineBack && !verificationDetails && (
                      <p className="text-sm text-muted-foreground">Sin documentos adjuntos</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas de Revisión</Label>
                <Textarea
                  id="notes"
                  placeholder="Agregar notas sobre la revisión..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="destructive"
              onClick={() => handleReview("rejected")}
              disabled={processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <XCircle className="w-4 h-4 mr-1" />
              Rechazar
            </Button>
            <Button
              onClick={() => handleReview("approved")}
              disabled={processing}
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <CheckCircle className="w-4 h-4 mr-1" />
              Aprobar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerificationManagement;
