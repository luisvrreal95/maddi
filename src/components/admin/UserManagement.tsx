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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Loader2, Building2, Calendar, User, AlertTriangle, Eye, Mail, Phone, ShieldCheck, ShieldX, Clock, FileText } from "lucide-react";
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
    is_verified: boolean;
    verification_status: string | null;
    verification_document_type: string | null;
    verification_document_url: string | null;
    verification_submitted_at: string | null;
    verification_reviewed_at: string | null;
    verification_notes: string | null;
  } | null;
  email: string | null;
  last_sign_in_at: string | null;
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
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; user: UserData | null }>({ open: false, user: null });
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      // Fetch auth user details (email + last_sign_in_at) via edge function
      let authUserMap: Record<string, { email: string; last_sign_in_at: string | null }> = {};
      try {
        const { data: authData, error: authError } = await supabase.functions.invoke('get-admin-user-details');
        if (!authError && authData?.users) {
          authUserMap = authData.users;
        }
      } catch (e) {
        console.error('Error fetching auth user details:', e);
      }

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithDetails = await Promise.all(
        (roles || []).map(async (role) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company_name, avatar_url, phone, is_verified, verification_status, verification_document_type, verification_document_url, verification_submitted_at, verification_reviewed_at, verification_notes')
            .eq('user_id', role.user_id)
            .single();

          const authInfo = authUserMap[role.user_id];
          const email = authInfo?.email || null;
          const last_sign_in_at = authInfo?.last_sign_in_at || null;

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

          return { ...role, profile, email, last_sign_in_at, count };
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

  const getVerificationBadge = (status: string | null | undefined) => {
    if (!status || status === 'none') return <Badge variant="outline" className="text-xs">Sin verificar</Badge>;
    if (status === 'pending') return <Badge variant="secondary" className="text-xs gap-1"><Clock className="w-3 h-3" /> Pendiente</Badge>;
    if (status === 'approved') return <Badge variant="default" className="text-xs gap-1"><ShieldCheck className="w-3 h-3" /> Verificado</Badge>;
    if (status === 'rejected') return <Badge variant="destructive" className="text-xs gap-1"><ShieldX className="w-3 h-3" /> Rechazado</Badge>;
    return <Badge variant="outline" className="text-xs">{status}</Badge>;
  };

  const renderUserTable = (users: UserData[], type: 'owner' | 'business') => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuario</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Empresa</TableHead>
          <TableHead>Verificación</TableHead>
          <TableHead>Último acceso</TableHead>
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
            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
              <TableCell>
                <span className="text-sm text-muted-foreground">{user.email || '—'}</span>
              </TableCell>
              <TableCell>{user.profile?.company_name || '-'}</TableCell>
              <TableCell>{getVerificationBadge(user.profile?.verification_status)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {user.last_sign_in_at 
                  ? format(new Date(user.last_sign_in_at), 'dd/MM/yy HH:mm', { locale: es })
                  : '—'}
              </TableCell>
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
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => setDetailDialog({ open: true, user })}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
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
                </div>
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

      {/* Delete Dialog */}
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

      {/* User Detail Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => !open && setDetailDialog({ open: false, user: null })}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Usuario</DialogTitle>
          </DialogHeader>
          {detailDialog.user && (() => {
            const u = detailDialog.user;
            return (
              <div className="space-y-4">
                {/* Avatar & Name */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={u.profile?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl">
                      {getInitials(u.profile?.full_name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-lg">{u.profile?.full_name || 'Sin nombre'}</h3>
                    <Badge variant="outline">{u.role === 'owner' ? 'Propietario' : 'Negocio'}</Badge>
                  </div>
                </div>

                {/* Contact */}
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Contacto</p>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{u.email || 'No disponible'}</span>
                  </div>
                  {u.profile?.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{u.profile.phone}</span>
                    </div>
                  )}
                  {u.profile?.company_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>{u.profile.company_name}</span>
                    </div>
                  )}
                </div>

                {/* Verification */}
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Verificación</p>
                  <div className="flex items-center gap-2">
                    {getVerificationBadge(u.profile?.verification_status)}
                  </div>
                  {u.profile?.verification_document_type && (
                    <p className="text-sm">Documento: <span className="font-medium">{u.profile.verification_document_type}</span></p>
                  )}
                  {u.profile?.verification_submitted_at && (
                    <p className="text-xs text-muted-foreground">
                      Enviado: {format(new Date(u.profile.verification_submitted_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </p>
                  )}
                  {u.profile?.verification_reviewed_at && (
                    <p className="text-xs text-muted-foreground">
                      Revisado: {format(new Date(u.profile.verification_reviewed_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </p>
                  )}
                  {u.profile?.verification_notes && (
                    <div className="bg-background rounded p-2 mt-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Notas</p>
                      <p className="text-sm">{u.profile.verification_notes}</p>
                    </div>
                  )}
                  {u.profile?.verification_document_url && (
                    <a href={u.profile.verification_document_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline">
                      Ver documento de verificación →
                    </a>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{u.count}</p>
                    <p className="text-xs text-muted-foreground">{u.role === 'owner' ? 'Propiedades' : 'Campañas'}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-sm font-medium">{format(new Date(u.created_at), 'dd/MM/yyyy', { locale: es })}</p>
                    <p className="text-xs text-muted-foreground">Registrado</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center">
                    <p className="text-sm font-medium">
                      {u.last_sign_in_at 
                        ? format(new Date(u.last_sign_in_at), 'dd/MM/yy HH:mm', { locale: es })
                        : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Último acceso</p>
                  </div>
                </div>

                {/* IDs */}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <p>User ID: {u.user_id}</p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default UserManagement;
