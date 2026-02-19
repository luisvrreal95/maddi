import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Eye, CheckCircle, XCircle, DollarSign, Loader2, Trash2, Ban, Calendar, MapPin, User, FileText, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { parseDesignPaths, resolveDesignImageUrls } from "@/lib/designImageUtils";

interface Campaign {
  id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  created_at: string;
  notes: string | null;
  ad_design_url: string | null;
  business_id: string;
  billboard_id: string;
  billboard: {
    id: string;
    title: string;
    city: string;
    address: string;
  };
  businessProfile: {
    full_name: string;
    company_name: string | null;
    phone: string | null;
  } | null;
  commission: {
    id: string;
    commission_amount: number;
    owner_payout: number;
    payment_status: string;
  } | null;
}

const CampaignManagement = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | 'pay' | 'cancel' | 'delete' | null;
    campaignId: string | null;
  }>({ open: false, type: null, campaignId: null });
  const [processing, setProcessing] = useState(false);
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; campaign: Campaign | null }>({ open: false, campaign: null });
  const [designImages, setDesignImages] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchCampaigns = async () => {
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const campaignsWithDetails = await Promise.all(
        (bookings || []).map(async (booking) => {
          const { data: billboard } = await supabase
            .from('billboards')
            .select('id, title, city, address')
            .eq('id', booking.billboard_id)
            .single();

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_name, phone')
            .eq('user_id', booking.business_id)
            .single();

          const { data: commission } = await supabase
            .from('platform_commissions')
            .select('id, commission_amount, owner_payout, payment_status')
            .eq('booking_id', booking.id)
            .single();

          return {
            ...booking,
            billboard: billboard || { id: '', title: 'N/A', city: 'N/A', address: '' },
            businessProfile: profile,
            commission
          };
        })
      );

      setCampaigns(campaignsWithDetails);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({ title: "Error", description: "No se pudieron cargar las campañas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const handleAction = async () => {
    if (!actionDialog.campaignId || !actionDialog.type) return;
    
    setProcessing(true);
    try {
      if (actionDialog.type === 'approve' || actionDialog.type === 'reject') {
        const { error } = await supabase
          .from('bookings')
          .update({ status: actionDialog.type === 'approve' ? 'approved' : 'rejected' })
          .eq('id', actionDialog.campaignId);
        if (error) throw error;
      } else if (actionDialog.type === 'cancel') {
        const { error } = await supabase
          .from('bookings')
          .update({ status: 'cancelled' })
          .eq('id', actionDialog.campaignId);
        if (error) throw error;
      } else if (actionDialog.type === 'delete') {
        // Delete commission first
        await supabase.from('platform_commissions').delete().eq('booking_id', actionDialog.campaignId);
        await supabase.from('reviews').delete().eq('booking_id', actionDialog.campaignId);
        await supabase.from('notifications').delete().eq('related_booking_id', actionDialog.campaignId);
        const { error } = await supabase.from('bookings').delete().eq('id', actionDialog.campaignId);
        if (error) throw error;
      } else if (actionDialog.type === 'pay') {
        const campaign = campaigns.find(c => c.id === actionDialog.campaignId);
        if (campaign?.commission) {
          const { error } = await supabase
            .from('platform_commissions')
            .update({ payment_status: 'paid', payment_date: new Date().toISOString().split('T')[0] })
            .eq('id', campaign.commission.id);
          if (error) throw error;
        }
      }

      const labels: Record<string, string> = {
        approve: 'Campaña aprobada',
        reject: 'Campaña rechazada',
        cancel: 'Campaña cancelada',
        delete: 'Campaña eliminada permanentemente',
        pay: 'Pago marcado como completado',
      };
      toast({ title: "Éxito", description: labels[actionDialog.type] || 'Acción completada' });
      fetchCampaigns();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Error", description: "No se pudo completar la acción", variant: "destructive" });
    } finally {
      setProcessing(false);
      setActionDialog({ open: false, type: null, campaignId: null });
    }
  };

  const openDetail = async (campaign: Campaign) => {
    setDetailDialog({ open: true, campaign });
    // Resolve design images
    const paths = parseDesignPaths(campaign.ad_design_url);
    if (paths.length > 0) {
      const urls = await resolveDesignImageUrls(paths);
      setDesignImages(urls);
    } else {
      setDesignImages([]);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: 'secondary', label: 'Pendiente' },
      approved: { variant: 'default', label: 'Aprobada' },
      rejected: { variant: 'destructive', label: 'Rechazada' },
      completed: { variant: 'outline', label: 'Completada' },
      cancelled: { variant: 'destructive', label: 'Cancelada' }
    };
    const config = variants[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentBadge = (status: string | undefined) => {
    if (!status) return <Badge variant="outline">Sin comisión</Badge>;
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: 'secondary', label: 'Pendiente' },
      scheduled: { variant: 'outline', label: 'Programado' },
      paid: { variant: 'default', label: 'Pagado' }
    };
    const config = variants[status] || { variant: 'secondary' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(value);
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (paymentFilter !== 'all') {
      if (paymentFilter === 'pending' && c.commission?.payment_status !== 'pending') return false;
      if (paymentFilter === 'paid' && c.commission?.payment_status !== 'paid') return false;
    }
    return true;
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <CardTitle>Gestión de Campañas ({campaigns.length})</CardTitle>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="approved">Aprobada</SelectItem>
                <SelectItem value="completed">Completada</SelectItem>
                <SelectItem value="rejected">Rechazada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Pago" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Anunciante</TableHead>
                  <TableHead>Espectacular</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Comisión</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No hay campañas que mostrar
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(campaign.created_at), 'dd/MM/yy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{campaign.businessProfile?.full_name || 'N/A'}</div>
                          {campaign.businessProfile?.company_name && (
                            <div className="text-xs text-muted-foreground">{campaign.businessProfile.company_name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{campaign.billboard.title}</div>
                          <div className="text-xs text-muted-foreground">{campaign.billboard.city}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(campaign.start_date), 'dd/MM', { locale: es })} -{' '}
                        {format(new Date(campaign.end_date), 'dd/MM/yy', { locale: es })}
                        <div className="text-xs text-muted-foreground">
                          {differenceInDays(new Date(campaign.end_date), new Date(campaign.start_date))} días
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(campaign.total_price)}</TableCell>
                      <TableCell className="text-right text-primary">
                        {campaign.commission ? formatCurrency(campaign.commission.commission_amount) : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>{getPaymentBadge(campaign.commission?.payment_status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {/* View details */}
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                            onClick={() => openDetail(campaign)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {/* Approve/Reject for pending */}
                          {campaign.status === 'pending' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-500 hover:text-green-600"
                                onClick={() => setActionDialog({ open: true, type: 'approve', campaignId: campaign.id })}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                                onClick={() => setActionDialog({ open: true, type: 'reject', campaignId: campaign.id })}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {/* Cancel for approved/pending */}
                          {(campaign.status === 'approved' || campaign.status === 'pending') && (
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-orange-500 hover:text-orange-600"
                              onClick={() => setActionDialog({ open: true, type: 'cancel', campaignId: campaign.id })}>
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Pay commission */}
                          {campaign.commission?.payment_status === 'pending' && campaign.status === 'approved' && (
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                              onClick={() => setActionDialog({ open: true, type: 'pay', campaignId: campaign.id })}>
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Delete */}
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                            onClick={() => setActionDialog({ open: true, type: 'delete', campaignId: campaign.id })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Action Dialog */}
      <AlertDialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.type === 'approve' && '¿Aprobar campaña?'}
              {actionDialog.type === 'reject' && '¿Rechazar campaña?'}
              {actionDialog.type === 'pay' && '¿Marcar pago como completado?'}
              {actionDialog.type === 'cancel' && '¿Cancelar campaña?'}
              {actionDialog.type === 'delete' && '¿Eliminar campaña permanentemente?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.type === 'approve' && 'La campaña será aprobada y el anunciante será notificado.'}
              {actionDialog.type === 'reject' && 'La campaña será rechazada y el anunciante será notificado.'}
              {actionDialog.type === 'pay' && 'El pago al propietario será marcado como completado.'}
              {actionDialog.type === 'cancel' && 'La campaña será cancelada. Ambas partes serán notificadas.'}
              {actionDialog.type === 'delete' && 'Se eliminarán permanentemente la reserva, comisiones, reseñas y notificaciones asociadas. Esta acción no se puede deshacer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={processing}
              className={actionDialog.type === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Campaign Detail Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => !open && setDetailDialog({ open: false, campaign: null })}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Campaña</DialogTitle>
          </DialogHeader>
          {detailDialog.campaign && (() => {
            const c = detailDialog.campaign;
            return (
              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center gap-2">
                  {getStatusBadge(c.status)}
                  {c.commission && getPaymentBadge(c.commission.payment_status)}
                </div>

                {/* Business */}
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <User className="w-4 h-4" /> Anunciante
                  </div>
                  <p className="text-sm">{c.businessProfile?.full_name || 'N/A'}</p>
                  {c.businessProfile?.company_name && <p className="text-xs text-muted-foreground">{c.businessProfile.company_name}</p>}
                  {c.businessProfile?.phone && <p className="text-xs text-muted-foreground">📞 {c.businessProfile.phone}</p>}
                </div>

                {/* Billboard */}
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="w-4 h-4" /> Espectacular
                  </div>
                  <p className="text-sm">{c.billboard.title}</p>
                  <p className="text-xs text-muted-foreground">{c.billboard.address}, {c.billboard.city}</p>
                </div>

                {/* Dates & Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><Calendar className="w-3 h-3" /> Periodo</div>
                    <p className="text-sm font-medium">
                      {format(new Date(c.start_date), 'dd/MM/yy', { locale: es })} - {format(new Date(c.end_date), 'dd/MM/yy', { locale: es })}
                    </p>
                    <p className="text-xs text-muted-foreground">{differenceInDays(new Date(c.end_date), new Date(c.start_date))} días</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><DollarSign className="w-3 h-3" /> Inversión</div>
                    <p className="text-sm font-bold">{formatCurrency(c.total_price)}</p>
                    {c.commission && (
                      <p className="text-xs text-muted-foreground">
                        Comisión: {formatCurrency(c.commission.commission_amount)} | Propietario: {formatCurrency(c.commission.owner_payout)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {c.notes && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><FileText className="w-3 h-3" /> Notas del anunciante</div>
                    <p className="text-sm">{c.notes}</p>
                  </div>
                )}

                {/* Design Images */}
                {designImages.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground"><ImageIcon className="w-3 h-3" /> Diseños ({designImages.length})</div>
                    <div className="grid grid-cols-2 gap-2">
                      {designImages.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Diseño ${i + 1}`} className="w-full h-32 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <p>Creada: {format(new Date(c.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                  <p>ID: {c.id}</p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CampaignManagement;
