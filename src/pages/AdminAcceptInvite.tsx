import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Eye, EyeOff, ShieldX } from "lucide-react";

type InvitationData = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
};

const AdminAcceptInvite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadInvitation = async () => {
      if (!token) {
        setError("No se proporcionó token de invitación");
        setLoading(false);
        return;
      }

      try {
        // Call edge function to validate token (since RLS blocks direct access)
        const { data, error: fnError } = await supabase.functions.invoke("validate-admin-invite", {
          body: { token },
        });

        if (fnError || !data?.invitation) {
          setError(data?.error || "Invitación inválida o expirada");
          setLoading(false);
          return;
        }

        setInvitation(data.invitation);
      } catch (err) {
        console.error("Error loading invitation:", err);
        setError("Error al cargar la invitación");
      } finally {
        setLoading(false);
      }
    };

    loadInvitation();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation || !token) return;

    if (!fullName.trim()) {
      toast.error("Ingresa tu nombre completo");
      return;
    }

    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create user account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          toast.error("Este email ya está registrado. Inicia sesión en /admin");
          return;
        }
        throw signUpError;
      }

      if (!signUpData.user) {
        throw new Error("No se pudo crear la cuenta");
      }

      // Accept invitation via edge function (creates admin_users record)
      const { data: acceptData, error: acceptError } = await supabase.functions.invoke(
        "accept-admin-invite",
        {
          body: { token, userId: signUpData.user.id },
        }
      );

      if (acceptError || !acceptData?.success) {
        console.error("Error accepting invite:", acceptError || acceptData?.error);
        // Account was created but admin record failed - inform user
        toast.error("Cuenta creada pero hubo un error al asignar permisos. Contacta al super admin.");
        return;
      }

      toast.success("¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.");
      navigate("/admin");
    } catch (err: any) {
      console.error("Accept invite error:", err);
      toast.error(err?.message || "Error al aceptar la invitación");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#9BFF43]" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6 p-4">
        <div className="bg-[#1A1A1A] rounded-2xl p-8 max-w-md w-full border border-white/10 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldX className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invitación inválida</h1>
          <p className="text-white/60 text-sm mb-6">
            {error || "Esta invitación no existe, ya fue usada, o ha expirado."}
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-[#9BFF43] text-[#1A1A1A] hover:bg-[#8AE63A]"
          >
            Ir al inicio
          </Button>
        </div>
      </div>
    );
  }

  const roleLabel = invitation.role === "super_admin" ? "Super Administrador" : "Administrador";

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6 p-4">
      <div className="bg-[#1A1A1A] rounded-2xl p-8 max-w-md w-full border border-white/10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#9BFF43]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-[#9BFF43]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Aceptar invitación</h1>
          <p className="text-white/60 text-sm">
            Has sido invitado como <span className="text-[#9BFF43] font-semibold">{roleLabel}</span>
          </p>
          <p className="text-white/40 text-xs mt-2">{invitation.email}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="full-name" className="text-white/80 text-sm">
              Nombre completo
            </Label>
            <Input
              id="full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus:border-[#9BFF43] focus:ring-[#9BFF43]/20"
              disabled={isSubmitting}
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/80 text-sm">
              Contraseña
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus:border-[#9BFF43] focus:ring-[#9BFF43]/20 pr-12"
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-white/80 text-sm">
              Confirmar contraseña
            </Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus:border-[#9BFF43] focus:ring-[#9BFF43]/20"
              disabled={isSubmitting}
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#9BFF43] text-[#1A1A1A] hover:bg-[#8AE63A] h-12 rounded-xl font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creando cuenta...
              </>
            ) : (
              "Crear cuenta y acceder"
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-white/40 text-xs mt-6">
          Panel de Administración de Maddi
        </p>
      </div>
    </div>
  );
};

export default AdminAcceptInvite;
