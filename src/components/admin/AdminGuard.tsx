import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldX, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AdminGuardProps {
  children: React.ReactNode;
}

const AdminGuard = ({ children }: AdminGuardProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  
  // Admin login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking admin access:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
      } catch (err) {
        console.error('Error:', err);
        setIsAdmin(false);
      } finally {
        setIsChecking(false);
      }
    };

    if (!authLoading) {
      checkAdminAccess();
    }
  }, [user, authLoading]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Ingresa email y contraseña");
      return;
    }

    setIsLoggingIn(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Credenciales inválidas');
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        // Check if user is admin
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (!adminData) {
          toast.error('Esta cuenta no tiene permisos de administrador');
          await supabase.auth.signOut();
          return;
        }

        toast.success('Bienvenido al panel de administración');
        setIsAdmin(true);
      }
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Error al iniciar sesión');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in or not admin - show admin login form
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6 p-4">
        <div className="bg-[#1A1A1A] rounded-2xl p-8 max-w-md w-full border border-white/10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#9BFF43]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldX className="w-8 h-8 text-[#9BFF43]" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Panel de Administración</h1>
            <p className="text-white/60 text-sm">
              Ingresa con tu cuenta de administrador
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-white/80 text-sm">
                Email de administrador
              </Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@maddi.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus:border-[#9BFF43] focus:ring-[#9BFF43]/20"
                disabled={isLoggingIn}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-white/80 text-sm">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus:border-[#9BFF43] focus:ring-[#9BFF43]/20 pr-12"
                  disabled={isLoggingIn}
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

            <Button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-[#9BFF43] text-[#1A1A1A] hover:bg-[#8AE63A] h-12 rounded-xl font-semibold"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Acceder al Panel'
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-white/40 text-xs mt-6">
            Acceso restringido solo para administradores de Maddi
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGuard;