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

const VerificationManagement = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

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
                            onClick={() =>
                              window.open(request.verification_document_url!, "_blank")
                            }
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRequest(request);
                            setReviewNotes(request.verification_notes || "");
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
        onOpenChange={(open) => !open && setSelectedRequest(null)}
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
                    <p className="text-sm text-muted-foreground">
                      {selectedRequest.company_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Tipo de Documento</p>
                  <p className="font-medium">
                    {selectedRequest.verification_document_type || "No especificado"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fecha de Solicitud</p>
                  <p className="font-medium">
                    {selectedRequest.verification_submitted_at
                      ? format(
                          new Date(selectedRequest.verification_submitted_at),
                          "dd/MM/yyyy HH:mm",
                          { locale: es }
                        )
                      : "-"}
                  </p>
                </div>
              </div>

              {selectedRequest.verification_document_url && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    window.open(selectedRequest.verification_document_url!, "_blank")
                  }
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Documento
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              )}

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
