import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, CheckCircle, XCircle, DollarSign, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Campaign {
  id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  created_at: string;
  billboard: {
    id: string;
    title: string;
    city: string;
  };
  businessProfile: {
    full_name: string;
    company_name: string | null;
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
    type: 'approve' | 'reject' | 'pay' | null;
    campaignId: string | null;
  }>({ open: false, type: null, campaignId: null });
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const fetchCampaigns = async () => {
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          start_date,
          end_date,
          total_price,
          status,
          created_at,
          business_id,
          billboard_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data
      const campaignsWithDetails = await Promise.all(
        (bookings || []).map(async (booking) => {
          // Get billboard
          const { data: billboard } = await supabase
            .from('billboards')
            .select('id, title, city')
            .eq('id', booking.billboard_id)
            .single();

          // Get business profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_name')
            .eq('user_id', booking.business_id)
            .single();

          // Get commission
          const { data: commission } = await supabase
            .from('platform_commissions')
            .select('id, commission_amount, owner_payout, payment_status')
            .eq('booking_id', booking.id)
            .single();

          return {
            ...booking,
            billboard: billboard || { id: '', title: 'N/A', city: 'N/A' },
            businessProfile: profile,
            commission
          };
        })
      );

      setCampaigns(campaignsWithDetails);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las campañas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

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
      } else if (actionDialog.type === 'pay') {
        const campaign = campaigns.find(c => c.id === actionDialog.campaignId);
        if (campaign?.commission) {
          const { error } = await supabase
            .from('platform_commissions')
            .update({ 
              payment_status: 'paid',
              payment_date: new Date().toISOString().split('T')[0]
            })
            .eq('id', campaign.commission.id);

          if (error) throw error;
        }
      }

      toast({
        title: "Éxito",
        description: actionDialog.type === 'pay' 
          ? "Pago marcado como completado"
          : `Campaña ${actionDialog.type === 'approve' ? 'aprobada' : 'rechazada'}`
      });

      fetchCampaigns();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la acción",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      setActionDialog({ open: false, type: null, campaignId: null });
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
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(value);
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
          <CardTitle>Gestión de Campañas</CardTitle>
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
                  <TableHead className="text-right">Propietario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
                          <div className="font-medium">
                            {campaign.businessProfile?.full_name || 'N/A'}
                          </div>
                          {campaign.businessProfile?.company_name && (
                            <div className="text-xs text-muted-foreground">
                              {campaign.businessProfile.company_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{campaign.billboard.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {campaign.billboard.city}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(campaign.start_date), 'dd/MM', { locale: es })} - {' '}
                        {format(new Date(campaign.end_date), 'dd/MM/yy', { locale: es })}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(campaign.total_price)}
                      </TableCell>
                      <TableCell className="text-right text-primary">
                        {campaign.commission 
                          ? formatCurrency(campaign.commission.commission_amount)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {campaign.commission 
                          ? formatCurrency(campaign.commission.owner_payout)
                          : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>{getPaymentBadge(campaign.commission?.payment_status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {campaign.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-green-500 hover:text-green-600"
                                onClick={() => setActionDialog({
                                  open: true,
                                  type: 'approve',
                                  campaignId: campaign.id
                                })}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                                onClick={() => setActionDialog({
                                  open: true,
                                  type: 'reject',
                                  campaignId: campaign.id
                                })}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {campaign.commission?.payment_status === 'pending' && campaign.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                              onClick={() => setActionDialog({
                                open: true,
                                type: 'pay',
                                campaignId: campaign.id
                              })}
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
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

      <AlertDialog open={actionDialog.open} onOpenChange={(open) => 
        setActionDialog({ ...actionDialog, open })
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionDialog.type === 'approve' && '¿Aprobar campaña?'}
              {actionDialog.type === 'reject' && '¿Rechazar campaña?'}
              {actionDialog.type === 'pay' && '¿Marcar pago como completado?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionDialog.type === 'approve' && 
                'La campaña será aprobada y el anunciante será notificado.'}
              {actionDialog.type === 'reject' && 
                'La campaña será rechazada y el anunciante será notificado.'}
              {actionDialog.type === 'pay' && 
                'El pago al propietario será marcado como completado.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} disabled={processing}>
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default CampaignManagement;
