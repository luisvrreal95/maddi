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
import { Eye, Trash2, ToggleLeft, ToggleRight, Loader2, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Property {
  id: string;
  title: string;
  city: string;
  state: string;
  price_per_month: number;
  is_available: boolean;
  daily_impressions: number | null;
  image_url: string | null;
  created_at: string;
  owner: {
    full_name: string;
    company_name: string | null;
  } | null;
  bookingsCount: number;
}

const PropertyManagement = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; propertyId: string | null }>({
    open: false,
    propertyId: null
  });
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
          // Get owner profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_name')
            .eq('user_id', billboard.owner_id)
            .single();

          // Get bookings count
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
      toast({
        title: "Error",
        description: "No se pudieron cargar las propiedades",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('billboards')
        .update({ is_available: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Propiedad ${!currentStatus ? 'activada' : 'desactivada'}`
      });

      fetchProperties();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.propertyId) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('billboards')
        .delete()
        .eq('id', deleteDialog.propertyId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Propiedad eliminada"
      });

      fetchProperties();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la propiedad",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      setDeleteDialog({ open: false, propertyId: null });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(value);
  };

  const filteredProperties = properties.filter(p => {
    if (statusFilter === 'available' && !p.is_available) return false;
    if (statusFilter === 'unavailable' && p.is_available) return false;
    return true;
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <CardTitle>Gestión de Propiedades ({properties.length})</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="available">Disponibles</SelectItem>
              <SelectItem value="unavailable">No disponibles</SelectItem>
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
                  <TableHead className="text-right">Impresiones</TableHead>
                  <TableHead className="text-center">Campañas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProperties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No hay propiedades que mostrar
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProperties.map((property) => (
                    <TableRow key={property.id}>
                      <TableCell>
                        <div className="w-16 h-12 rounded-md overflow-hidden bg-muted">
                          {property.image_url ? (
                            <img 
                              src={property.image_url} 
                              alt={property.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium max-w-[200px] truncate">
                          {property.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">
                            {property.owner?.full_name || 'N/A'}
                          </div>
                          {property.owner?.company_name && (
                            <div className="text-xs text-muted-foreground">
                              {property.owner.company_name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {property.city}, {property.state}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(property.price_per_month)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {property.daily_impressions?.toLocaleString() || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{property.bookingsCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={property.is_available ? 'default' : 'secondary'}>
                          {property.is_available ? 'Disponible' : 'No disponible'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => navigate(`/billboard/${property.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => toggleAvailability(property.id, property.is_available)}
                          >
                            {property.is_available ? (
                              <ToggleRight className="h-4 w-4 text-primary" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                            onClick={() => setDeleteDialog({ open: true, propertyId: property.id })}
                          >
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

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => 
        setDeleteDialog({ ...deleteDialog, open })
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar propiedad?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán también todas las reservaciones asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={processing}
              className="bg-red-500 hover:bg-red-600"
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default PropertyManagement;
