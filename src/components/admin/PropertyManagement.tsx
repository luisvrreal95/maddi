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
import { Eye, Trash2, Loader2, MapPin, ExternalLink, Power, PowerOff, Pause } from "lucide-react";
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

type DialogType = 'delete' | 'pause_admin' | 'reactivate' | null;

const PropertyManagement = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialog, setDialog] = useState<{ 
    type: DialogType; 
    propertyId: string | null;
    propertyTitle?: string;
  }>({ type: null, propertyId: null });
  const [processing, setProcessing] = useState(false);
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

  const handlePauseByAdmin = async () => {
    if (!dialog.propertyId) return;
    setProcessing(true);
    try {
      const property = properties.find(p => p.id === dialog.propertyId);
      
      const { error } = await supabase
        .from('billboards')
        .update({ is_available: false, pause_reason: 'admin' } as any)
        .eq('id', dialog.propertyId);

      if (error) throw error;

      // Notify owner
      if (property) {
        await supabase.from('notifications').insert({
          user_id: property.owner_id,
          title: 'Propiedad pausada por Maddi',
          message: `Tu propiedad "${property.title}" fue dada de baja temporal por el equipo de Maddi. Si tienes preguntas, contáctanos.`,
          type: 'admin_action',
          related_billboard_id: property.id
        });
      }

      toast({ title: "Éxito", description: "Propiedad pausada por Maddi. Se notificó al propietario." });
      fetchProperties();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Error", description: "No se pudo pausar la propiedad", variant: "destructive" });
    } finally {
      setProcessing(false);
      setDialog({ type: null, propertyId: null });
    }
  };

  const handleReactivate = async () => {
    if (!dialog.propertyId) return;
    setProcessing(true);
    try {
      const property = properties.find(p => p.id === dialog.propertyId);
      
      const { error } = await supabase
        .from('billboards')
        .update({ is_available: true, pause_reason: null } as any)
        .eq('id', dialog.propertyId);

      if (error) throw error;

      if (property) {
        await supabase.from('notifications').insert({
          user_id: property.owner_id,
          title: 'Propiedad reactivada',
          message: `Tu propiedad "${property.title}" ha sido reactivada y ahora está visible nuevamente.`,
          type: 'admin_action',
          related_billboard_id: property.id
        });
      }

      toast({ title: "Éxito", description: "Propiedad reactivada correctamente." });
      fetchProperties();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Error", description: "No se pudo reactivar", variant: "destructive" });
    } finally {
      setProcessing(false);
      setDialog({ type: null, propertyId: null });
    }
  };

  const handleDelete = async () => {
    if (!dialog.propertyId) return;
    setProcessing(true);
    try {
      await supabase.from('favorites').delete().eq('billboard_id', dialog.propertyId);
      await supabase.from('blocked_dates').delete().eq('billboard_id', dialog.propertyId);
      await supabase.from('pricing_overrides').delete().eq('billboard_id', dialog.propertyId);
      await supabase.from('traffic_data').delete().eq('billboard_id', dialog.propertyId);
      await supabase.from('inegi_demographics').delete().eq('billboard_id', dialog.propertyId);
      await supabase.from('poi_overview_cache').delete().eq('billboard_id', dialog.propertyId);
      
      const { error } = await supabase.from('billboards').delete().eq('id', dialog.propertyId);
      if (error) throw error;

      toast({ title: "Éxito", description: "Propiedad eliminada permanentemente" });
      fetchProperties();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Error", description: "No se pudo eliminar la propiedad. Puede tener reservas activas.", variant: "destructive" });
    } finally {
      setProcessing(false);
      setDialog({ type: null, propertyId: null });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(value);
  };

  const getPropertyStatus = (property: Property) => {
    if (property.is_available) return { label: 'Activa', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Power };
    if ((property as any).pause_reason === 'admin') return { label: 'Pausada por Maddi', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Pause };
    return { label: 'Pausada', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: PowerOff };
  };

  const filteredProperties = properties.filter(p => {
    if (statusFilter === 'available' && !p.is_available) return false;
    if (statusFilter === 'unavailable' && p.is_available) return false;
    if (statusFilter === 'paused_admin' && (p as any).pause_reason !== 'admin') return false;
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
                  <TableHead>Estado</TableHead>
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
                    const status = getPropertyStatus(property);
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={property.id}>
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
                        <TableCell>
                          <Badge variant="outline" className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => navigate(`/billboard/${property.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {property.is_available ? (
                              <Button
                                size="sm" variant="ghost" className="h-8 w-8 p-0 text-orange-500 hover:text-orange-600"
                                onClick={() => setDialog({ type: 'pause_admin', propertyId: property.id, propertyTitle: property.title })}
                                title="Pausar por Maddi"
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-500 hover:text-green-600"
                                onClick={() => setDialog({ type: 'reactivate', propertyId: property.id })}
                                title="Reactivar"
                              >
                                <Power className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                              onClick={() => setDialog({ type: 'delete', propertyId: property.id })}
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

      {/* Pause by Admin Dialog */}
      <AlertDialog open={dialog.type === 'pause_admin'} onOpenChange={(open) => !open && setDialog({ type: null, propertyId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Pausar propiedad por Maddi?</AlertDialogTitle>
            <AlertDialogDescription>
              La propiedad será ocultada de búsquedas y no podrá recibir nuevas reservas. Las campañas ya aprobadas no se verán afectadas. Se notificará al propietario automáticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePauseByAdmin} disabled={processing} className="bg-orange-500 hover:bg-orange-600">
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pausar propiedad
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reactivate Dialog */}
      <AlertDialog open={dialog.type === 'reactivate'} onOpenChange={(open) => !open && setDialog({ type: null, propertyId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reactivar propiedad?</AlertDialogTitle>
            <AlertDialogDescription>
              La propiedad volverá a ser visible para todos los usuarios en la plataforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReactivate} disabled={processing} className="bg-primary hover:bg-primary/90">
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={dialog.type === 'delete'} onOpenChange={(open) => !open && setDialog({ type: null, propertyId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar propiedad permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán permanentemente:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>La propiedad y toda su información</li>
                <li>Todas las reservaciones asociadas</li>
                <li>Datos de tráfico y análisis</li>
                <li>Favoritos de usuarios</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={processing} className="bg-red-500 hover:bg-red-600">
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
