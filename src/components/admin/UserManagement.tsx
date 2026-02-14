import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Loader2, Building2, Calendar, User, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface UserData {
  id: string;
  user_id: string;
  role: 'owner' | 'business';
  created_at: string;
  profile: {
    full_name: string;
    company_name: string | null;
    avatar_url: string | null;
    phone: string | null;
  } | null;
  count: number;
}

const UserManagement = () => {
  const [owners, setOwners] = useState<UserData[]>([]);
  const [businesses, setBusinesses] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ 
    open: boolean; 
    userId: string | null;
    userName: string;
  }>({ open: false, userId: null, userName: '' });
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithDetails = await Promise.all(
        (roles || []).map(async (role) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_name, avatar_url, phone')
            .eq('user_id', role.user_id)
            .single();

          let count = 0;
          if (role.role === 'owner') {
            const { count: billboardCount } = await supabase
              .from('billboards')
              .select('*', { count: 'exact', head: true })
              .eq('owner_id', role.user_id);
            count = billboardCount || 0;
          } else {
            const { count: bookingCount } = await supabase
              .from('bookings')
              .select('*', { count: 'exact', head: true })
              .eq('business_id', role.user_id);
            count = bookingCount || 0;
          }

          return { ...role, profile, count };
        })
      );

      setOwners(usersWithDetails.filter(u => u.role === 'owner'));
      setBusinesses(usersWithDetails.filter(u => u.role === 'business'));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: "Error", description: "No se pudieron cargar los usuarios", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDeleteUser = async () => {
    if (!deleteDialog.userId) return;
    
    setProcessing(true);
    try {
      // Call edge function for complete cascade deletion
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        body: { target_user_id: deleteDialog.userId, admin_action: true }
      });

      if (error) throw error;

      toast({ title: "Éxito", description: "Usuario y toda su información eliminados permanentemente" });
      fetchUsers();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Error", description: "No se pudo eliminar el usuario", variant: "destructive" });
    } finally {
      setProcessing(false);
      setDeleteDialog({ open: false, userId: null, userName: '' });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderUserTable = (users: UserData[], type: 'owner' | 'business') => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuario</TableHead>
          <TableHead>Empresa</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead>Registro</TableHead>
          <TableHead className="text-center">
            {type === 'owner' ? 'Propiedades' : 'Campañas'}
          </TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
              No hay {type === 'owner' ? 'propietarios' : 'anunciantes'} registrados
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(user.profile?.full_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.profile?.full_name || 'Sin nombre'}</div>
                    <div className="text-xs text-muted-foreground">{user.user_id.slice(0, 8)}...</div>
                  </div>
                </div>
              </TableCell>
              <TableCell>{user.profile?.company_name || '-'}</TableCell>
              <TableCell className="text-muted-foreground">{user.profile?.phone || '-'}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(user.created_at), 'dd/MM/yy', { locale: es })}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="outline" className="gap-1">
                  {type === 'owner' ? <Building2 className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                  {user.count}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                  onClick={() => setDeleteDialog({ 
                    open: true, 
                    userId: user.user_id,
                    userName: user.profile?.full_name || 'Usuario'
                  })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Gestión de Usuarios
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="owners" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="owners" className="gap-2">
                Propietarios
                <Badge variant="secondary" className="ml-1">{owners.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="businesses" className="gap-2">
                Anunciantes
                <Badge variant="secondary" className="ml-1">{businesses.length}</Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="owners" className="overflow-x-auto">
              {renderUserTable(owners, 'owner')}
            </TabsContent>
            <TabsContent value="businesses" className="overflow-x-auto">
              {renderUserTable(businesses, 'business')}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => 
        setDeleteDialog({ ...deleteDialog, open })
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-5 w-5" />
              ¿Eliminar usuario permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">Esta acción eliminará permanentemente al usuario "{deleteDialog.userName}" y toda su información:</span>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Todos sus espectaculares/propiedades</li>
                <li>Todas sus campañas y reservas</li>
                <li>Todos sus mensajes y conversaciones</li>
                <li>Sus favoritos y plantillas</li>
                <li>Su cuenta de autenticación</li>
              </ul>
              <p className="mt-3 text-red-500 font-medium">Esta acción no se puede deshacer.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser} 
              disabled={processing}
              className="bg-red-500 hover:bg-red-600"
            >
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default UserManagement;
