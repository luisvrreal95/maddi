import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Mail, Trash2 } from "lucide-react";

type AdminRole = "admin" | "super_admin";

type AdminUserRow = {
  id: string;
  user_id: string;
  role?: AdminRole;
  email?: string | null;
  created_at?: string | null;
};

type InvitationRow = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

interface AdminSettingsProps {
  isSuperAdmin: boolean;
}

const AdminSettings = ({ isSuperAdmin }: AdminSettingsProps) => {
  const { user } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [admins, setAdmins] = useState<AdminUserRow[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);

  // Invitations
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminRole>("admin");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const canManageAdmins = useMemo(() => isSuperAdmin, [isSuperAdmin]);

  const loadAdmins = async () => {
    if (!canManageAdmins) return;

    setLoadingAdmins(true);
    try {
      const { data, error } = (await (supabase
        .from("admin_users")
        .select("id, user_id, role, email, created_at")
        .order("created_at", { ascending: false }) as any)) as {
        data?: AdminUserRow[];
        error?: any;
      };

      if (error) throw error;
      setAdmins(data ?? []);
    } catch (err) {
      console.error("Error loading admins:", err);
      toast.error("No se pudo cargar la lista de administradores");
    } finally {
      setLoadingAdmins(false);
    }
  };

  const loadInvitations = async () => {
    if (!canManageAdmins) return;

    setLoadingInvitations(true);
    try {
      const { data, error } = (await (supabase
        .from("admin_invitations")
        .select("id, email, role, expires_at, accepted_at, created_at")
        .order("created_at", { ascending: false }) as any)) as {
        data?: InvitationRow[];
        error?: any;
      };

      if (error) throw error;
      setInvitations(data ?? []);
    } catch (err) {
      console.error("Error loading invitations:", err);
    } finally {
      setLoadingInvitations(false);
    }
  };

  useEffect(() => {
    loadAdmins();
    loadInvitations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageAdmins]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Ingresa la nueva contraseña y su confirmación");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Contraseña actualizada");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Password update error:", err);
      toast.error(err?.message ?? "Error al actualizar contraseña");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canManageAdmins) {
      toast.error("Solo el super admin puede enviar invitaciones");
      return;
    }

    if (!inviteEmail) {
      toast.error("Ingresa el email del nuevo administrador");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      toast.error("Ingresa un email válido");
      return;
    }

    setIsSendingInvite(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-admin-invite", {
        body: { email: inviteEmail, role: inviteRole },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Invitación enviada exitosamente");
      setInviteEmail("");
      setInviteRole("admin");
      loadInvitations();
    } catch (err: any) {
      console.error("Send invite error:", err);
      toast.error(err?.message ?? "Error al enviar invitación");
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleDeleteInvitation = async (id: string) => {
    try {
      const { error } = await (supabase.from("admin_invitations").delete().eq("id", id) as any);
      if (error) throw error;
      toast.success("Invitación eliminada");
      loadInvitations();
    } catch (err: any) {
      console.error("Delete invitation error:", err);
      toast.error(err?.message ?? "Error al eliminar invitación");
    }
  };

  const handleDeleteAdmin = async (adminId: string, adminEmail: string | null | undefined) => {
    // Prevent deleting yourself
    if (admins.find((a) => a.id === adminId)?.user_id === user?.id) {
      toast.error("No puedes eliminarte a ti mismo");
      return;
    }

    try {
      const { error } = await (supabase.from("admin_users").delete().eq("id", adminId) as any);
      if (error) throw error;
      toast.success(`Administrador ${adminEmail ?? ""} eliminado`);
      loadAdmins();
    } catch (err: any) {
      console.error("Delete admin error:", err);
      toast.error(err?.message ?? "Error al eliminar administrador");
    }
  };

  const pendingInvitations = invitations.filter(
    (inv) => !inv.accepted_at && new Date(inv.expires_at) > new Date()
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configuración</h2>
        <p className="text-muted-foreground">Seguridad y administración del panel</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña del administrador</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-new-password">Nueva contraseña</Label>
              <Input
                id="admin-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-confirm-password">Confirmar contraseña</Label>
              <Input
                id="admin-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" disabled={isUpdatingPassword}>
              {isUpdatingPassword ? "Actualizando..." : "Actualizar contraseña"}
            </Button>
          </form>

          <Separator className="my-6" />

          <div className="text-sm text-muted-foreground">
            Sesión actual: <span className="font-medium text-foreground">{user?.email ?? "—"}</span>
          </div>
        </CardContent>
      </Card>

      {canManageAdmins && (
        <>
          {/* Invite Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Invitar nuevo administrador
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3 items-end">
                  <div className="space-y-2 md:col-span-1">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="nuevo@admin.com"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-1">
                    <Label>Rol</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={inviteRole === "admin" ? "default" : "outline"}
                        onClick={() => setInviteRole("admin")}
                      >
                        Admin
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={inviteRole === "super_admin" ? "default" : "outline"}
                        onClick={() => setInviteRole("super_admin")}
                      >
                        Super Admin
                      </Button>
                    </div>
                  </div>

                  <div className="md:col-span-1">
                    <Button type="submit" disabled={isSendingInvite} className="w-full">
                      {isSendingInvite ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        "Enviar invitación"
                      )}
                    </Button>
                  </div>
                </div>
              </form>

              {pendingInvitations.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-3">Invitaciones pendientes</h4>
                  <div className="space-y-2">
                    {pendingInvitations.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm">{inv.email}</span>
                          <Badge variant="outline" className="text-xs">
                            {inv.role === "super_admin" ? "Super Admin" : "Admin"}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteInvitation(inv.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Existing Admins */}
          <Card>
            <CardHeader>
              <CardTitle>Administradores activos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-end">
                <Button type="button" variant="outline" size="sm" onClick={loadAdmins} disabled={loadingAdmins}>
                  {loadingAdmins ? "Cargando..." : "Refrescar"}
                </Button>
              </div>

              <div className="rounded-md border border-border overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-muted text-sm font-medium">
                  <div>Email</div>
                  <div>Rol</div>
                  <div className="md:col-span-1">user_id</div>
                  <div className="text-right">Acciones</div>
                </div>
                <div className="divide-y divide-border">
                  {admins.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No hay administradores registrados.</div>
                  ) : (
                    admins.map((a) => (
                      <div key={a.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 text-sm items-center">
                        <div className="text-muted-foreground md:text-foreground">{a.email ?? "—"}</div>
                        <div>
                          <Badge variant={a.role === "super_admin" ? "default" : "secondary"}>
                            {a.role === "super_admin" ? "Super Admin" : "Admin"}
                          </Badge>
                        </div>
                        <div className="font-mono text-xs break-all">{a.user_id}</div>
                        <div className="text-right">
                          {a.user_id !== user?.id && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteAdmin(a.id, a.email)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!canManageAdmins && (
        <Card>
          <CardHeader>
            <CardTitle>Administradores</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Esta sección solo está disponible para <span className="font-medium text-foreground">Super Admin</span>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminSettings;
