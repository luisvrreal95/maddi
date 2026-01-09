import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";

const AdminResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Supabase sends a recovery token via URL hash or query param
    // We need to exchange it for a session
    const handleRecovery = async () => {
      // Check if we have a recovery token in the URL hash (Supabase PKCE flow)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const type = hashParams.get("type");

      if (type === "recovery" && accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error("Error setting session:", error);
          setError("El enlace de recuperación es inválido o ha expirado.");
          return;
        }

        // Clear the hash from URL for security
        window.history.replaceState(null, "", window.location.pathname);
        setSessionReady(true);
        return;
      }

      // Check if there's already a session (user clicked link and session was set)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSessionReady(true);
        return;
      }

      // No valid recovery flow detected
      setError("No se detectó un enlace de recuperación válido. Por favor solicita uno nuevo desde /admin.");
    };

    handleRecovery();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      toast.success("Contraseña actualizada exitosamente");
      
      // Redirect to admin panel
      setTimeout(() => {
        navigate("/admin");
      }, 1500);
    } catch (err: any) {
      console.error("Password update error:", err);
      toast.error(err?.message ?? "Error al actualizar la contraseña");
    } finally {
      setIsUpdating(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6 p-4">
        <div className="bg-[#1A1A1A] rounded-2xl p-8 max-w-md w-full border border-white/10 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Enlace inválido</h1>
          <p className="text-white/60 text-sm mb-6">{error}</p>
          <Button
            onClick={() => navigate("/admin")}
            className="bg-[#9BFF43] text-[#1A1A1A] hover:bg-[#8AE63A]"
          >
            Volver al login
          </Button>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#9BFF43]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6 p-4">
      <div className="bg-[#1A1A1A] rounded-2xl p-8 max-w-md w-full border border-white/10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#9BFF43]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-[#9BFF43]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Nueva contraseña</h1>
          <p className="text-white/60 text-sm">
            Ingresa tu nueva contraseña para el panel de administración
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-white/80 text-sm">
              Nueva contraseña
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus:border-[#9BFF43] focus:ring-[#9BFF43]/20 pr-12"
                disabled={isUpdating}
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
              disabled={isUpdating}
              autoComplete="new-password"
            />
          </div>

          <Button
            type="submit"
            disabled={isUpdating}
            className="w-full bg-[#9BFF43] text-[#1A1A1A] hover:bg-[#8AE63A] h-12 rounded-xl font-semibold"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Actualizando...
              </>
            ) : (
              "Establecer contraseña"
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

export default AdminResetPassword;
