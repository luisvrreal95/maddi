import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type AdminRole = "admin" | "super_admin";

type AdminUserRow = {
  id: string;
  user_id: string;
  role?: AdminRole;
  email?: string | null;
  created_at?: string | null;
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

  const [createUserId, setCreateUserId] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<AdminRole>("admin");
  const [isCreating, setIsCreating] = useState(false);

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

  useEffect(() => {
    loadAdmins();
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

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canManageAdmins) {
      toast.error("Solo el super admin puede crear administradores");
      return;
    }

    if (!createUserId) {
      toast.error("Ingresa el user_id del usuario");
      return;
    }

    setIsCreating(true);
    try {
      const payload: any = {
        user_id: createUserId,
        role: createRole,
        email: createEmail || null,
        permissions: null,
      };

      const { error } = await (supabase.from("admin_users").insert(payload) as any);
      if (error) throw error;

      toast.success("Administrador creado");
      setCreateUserId("");
      setCreateEmail("");
      setCreateRole("admin");
      loadAdmins();
    } catch (err: any) {
      console.error("Create admin error:", err);
      toast.error(err?.message ?? "Error al crear administrador");
    } finally {
      setIsCreating(false);
    }
  };

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
        <Card>
          <CardHeader>
            <CardTitle>Administradores (Super Admin)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleCreateAdmin} className="grid gap-4 md:grid-cols-3 items-end">
              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="new-admin-user-id">user_id</Label>
                <Input
                  id="new-admin-user-id"
                  value={createUserId}
                  onChange={(e) => setCreateUserId(e.target.value)}
                  placeholder="UUID del usuario"
                />
              </div>

              <div className="space-y-2 md:col-span-1">
                <Label htmlFor="new-admin-email">Email (opcional)</Label>
                <Input
                  id="new-admin-email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="correo@dominio.com"
                />
              </div>

              <div className="space-y-2 md:col-span-1">
                <Label>Rol</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={createRole === "admin" ? "default" : "outline"}
                    onClick={() => setCreateRole("admin")}
                  >
                    Admin
                  </Button>
                  <Button
                    type="button"
                    variant={createRole === "super_admin" ? "default" : "outline"}
                    onClick={() => setCreateRole("super_admin")}
                  >
                    Super Admin
                  </Button>
                </div>
              </div>

              <div className="md:col-span-3">
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? "Creando..." : "Crear administrador"}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Nota: por ahora se crea por <span className="font-medium">user_id</span>. En el siguiente paso podemos
                  agregar invitaciones por email desde el panel.
                </p>
              </div>
            </form>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Lista</h3>
                <Button type="button" variant="outline" onClick={loadAdmins} disabled={loadingAdmins}>
                  {loadingAdmins ? "Cargando..." : "Refrescar"}
                </Button>
              </div>

              <div className="rounded-md border border-border overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-muted text-sm font-medium">
                  <div>Email</div>
                  <div>Rol</div>
                  <div className="md:col-span-2">user_id</div>
                </div>
                <div className="divide-y divide-border">
                  {admins.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No hay administradores registrados.</div>
                  ) : (
                    admins.map((a) => (
                      <div key={a.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 text-sm">
                        <div className="text-muted-foreground md:text-foreground">{a.email ?? "—"}</div>
                        <div>{a.role ?? "admin"}</div>
                        <div className="md:col-span-2 font-mono text-xs break-all">{a.user_id}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
