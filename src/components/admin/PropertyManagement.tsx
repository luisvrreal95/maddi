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
import { Eye, Trash2, Loader2, MapPin, ExternalLink, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";

interface Property {
  id: string;
  title: string;
  city: string;
  state: string;
  price_per_month: number;
  is_available: boolean;
  pause_reason: string | null;
  daily_impressions: number | null;
  image_url: string | null;
  created_at: string;
  owner_id: string;
  owner: {
    full_name: string;
    company_name: string | null;
    is_anonymous: boolean;
  } | null;
  bookingsCount: number;
}

const PropertyManagement = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; property: Property | null }>({ open: false, property: null });
  const [processing, setProcessing] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchProperties = async () => {
    try {
      const { data: billboards, error } = await supabase
        .from('billboards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const propertiesWithDetails = await Promise.all(
        (billboards || []).map(async (billboard) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_name, is_anonymous')
            .eq('user_id', billboard.owner_id)
            .single();

          const { count } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('billboard_id', billboard.id);

          return {
            ...billboard,
            owner: profile,
            bookingsCount: count || 0
          };
        })
      );

      setProperties(propertiesWithDetails);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({ title: "Error", description: "No se pudieron cargar las propiedades", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProperties(); }, []);

  const sendEmailToOwner = async (property: Property, type: string, extraData: Record<string, string | number | boolean> = {}) => {
    try {
      // We need the owner's email - fetch from auth via a workaround
      // Since we can't access auth.users from client, we'll pass the data and let the edge function handle it
      await supabase.functions.invoke('send-notification-email', {
        body: {
          email: '', // Will be resolved server-side if empty, or we skip
          type,
          recipientName: property.owner?.full_name || 'Propietario',
          userId: property.owner_id,
          entityId: property.id,
          data: {
            billboardTitle: property.title,
            billboardId: property.id,
            ...extraData,
          }
        }
      });
    } catch (err) {
      console.error('Error sending email:', err);
    }
  };

  const handleToggleStatus = async (property: Property) => {
    const willPause = property.is_available && !property.pause_reason;
    
    setProcessing(property.id);
    try {
      if (willPause) {
        const { error } = await supabase
          .from('billboards')
          .update({ is_available: false, pause_reason: 'admin' } as any)
          .eq('id', property.id);
        if (error) throw error;

        await supabase.from('notifications').insert({
          user_id: property.owner_id,
          title: 'Propiedad pausada por Maddi',
          message: `Tu propiedad "${property.title}" fue dada de baja temporal por el equipo de Maddi. Si tienes preguntas, contáctanos.`,
          type: 'admin_action',
          related_billboard_id: property.id
        });

        await sendEmailToOwner(property, 'property_paused');
        toast({ title: "Propiedad pausada", description: "Se notificó al propietario." });
      } else {
        const { error } = await supabase
          .from('billboards')
          .update({ is_available: true, pause_reason: null } as any)
          .eq('id', property.id);
        if (error) throw error;

        await supabase.from('notifications').insert({
          user_id: property.owner_id,
          title: 'Propiedad reactivada',
          message: `Tu propiedad "${property.title}" ha sido reactivada y ahora está visible nuevamente.`,
          type: 'admin_action',
          related_billboard_id: property.id
        });

        await sendEmailToOwner(property, 'property_reactivated');
        toast({ title: "Propiedad reactivada", description: "Ahora es visible para todos." });
      }
      
      fetchProperties();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Error", description: "No se pudo cambiar el estado", variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async () => {
    const property = deleteDialog.property;
    if (!property) return;
    
    setProcessing(property.id);
    try {
      // Delete all related data in order (respecting FK constraints)
      await supabase.from('reviews').delete().eq('billboard_id', property.id);
      await supabase.from('favorites').delete().eq('billboard_id', property.id);
      await supabase.from('blocked_dates').delete().eq('billboard_id', property.id);
      await supabase.from('pricing_overrides').delete().eq('billboard_id', property.id);
      await supabase.from('traffic_data').delete().eq('billboard_id', property.id);
      await supabase.from('inegi_demographics').delete().eq('billboard_id', property.id);
      await supabase.from('poi_overview_cache').delete().eq('billboard_id', property.id);
      await supabase.from('notifications').delete().eq('related_billboard_id', property.id);
      
      // Delete messages in conversations for this billboard
      const { data: convos } = await supabase
        .from('conversations')
        .select('id')
        .eq('billboard_id', property.id);
      
      if (convos && convos.length > 0) {
        const convoIds = convos.map(c => c.id);
        await supabase.from('messages').delete().in('conversation_id', convoIds);
        await supabase.from('conversations').delete().eq('billboard_id', property.id);
      }

      // Delete bookings
      await supabase.from('bookings').delete().eq('billboard_id', property.id);
      
      // Finally delete the billboard
      const { error } = await supabase.from('billboards').delete().eq('id', property.id);
      if (error) throw error;

      toast({ title: "Éxito", description: `"${property.title}" eliminada permanentemente` });
      fetchProperties();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Error", description: "No se pudo eliminar la propiedad. Verifica si tiene datos relacionados.", variant: "destructive" });
    } finally {
      setProcessing(null);
      setDeleteDialog({ open: false, property: null });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(value);
  };

  const isActive = (property: Property) => property.is_available && !property.pause_reason;

  const filteredProperties = properties.filter(p => {
    if (statusFilter === 'available' && !isActive(p)) return false;
    if (statusFilter === 'unavailable' && isActive(p)) return false;
    if (statusFilter === 'paused_admin' && p.pause_reason !== 'admin') return false;
    return true;
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <CardTitle>Gestión de Propiedades ({properties.length})</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="available">Activas</SelectItem>
              <SelectItem value="unavailable">Pausadas</SelectItem>
              <SelectItem value="paused_admin">Pausadas por Maddi</SelectItem>
            </SelectContent>
          </Select>
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
                  <TableHead>Imagen</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Propietario</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-center">Campañas</TableHead>
                  <TableHead className="text-center">Activa</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProperties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No hay propiedades que mostrar
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProperties.map((property) => {
                    const active = isActive(property);
                    const isToggling = processing === property.id;
                    return (
                      <TableRow key={property.id} className={!active ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="w-16 h-12 rounded-md overflow-hidden bg-muted">
                            {property.image_url ? (
                              <img src={property.image_url} alt={property.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium max-w-[200px] truncate">{property.title}</div>
                          {property.pause_reason === 'admin' && (
                            <span className="text-xs text-orange-400">Pausada por Maddi</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            {property.owner?.is_anonymous ? (
                              <span className="text-muted-foreground text-sm">Anónimo</span>
                            ) : (
                              <Link to={`/profile/${property.owner_id}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                                {property.owner?.full_name || 'N/A'}
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{property.city}, {property.state}</div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(property.price_per_month)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{property.bookingsCount}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isToggling ? (
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : (
                              <Switch
                                checked={active}
                                onCheckedChange={() => handleToggleStatus(property)}
                                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-destructive/40"
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => navigate(`/billboard/${property.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteDialog({ open: true, property })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, property: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              ¿Eliminar propiedad permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.property && (
                <div className="space-y-3">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="font-medium text-foreground">{deleteDialog.property.title}</p>
                    <p className="text-sm">{deleteDialog.property.city}, {deleteDialog.property.state}</p>
                    {deleteDialog.property.bookingsCount > 0 && (
                      <p className="text-sm text-destructive mt-1 font-medium">
                        ⚠️ Tiene {deleteDialog.property.bookingsCount} campaña(s) asociada(s)
                      </p>
                    )}
                  </div>
                  <p className="text-sm">Esta acción no se puede deshacer. Se eliminarán permanentemente:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>La propiedad y toda su información</li>
                    <li>Todas las reservaciones y campañas</li>
                    <li>Datos de tráfico, análisis e INEGI</li>
                    <li>Conversaciones y mensajes</li>
                    <li>Favoritos y reseñas</li>
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={!!processing} className="bg-destructive hover:bg-destructive/90">
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default PropertyManagement;
