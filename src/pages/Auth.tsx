import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Building2, Store, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido');
const passwordSchema = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres');
const nameSchema = z.string().min(2, 'El nombre debe tener al menos 2 caracteres');

type AuthMode = 'login' | 'signup';
type UserType = 'owner' | 'business' | null;

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, needsRoleSelection, signUp, signIn, signInWithGoogle, assignRole } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [selectedType, setSelectedType] = useState<UserType>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRoleForModal, setSelectedRoleForModal] = useState<UserType>(null);

  useEffect(() => {
    if (user && userRole) {
      navigate('/');
    }
  }, [user, userRole, navigate]);

  useEffect(() => {
    if (needsRoleSelection) {
      setShowRoleModal(true);
    }
  }, [needsRoleSelection]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (mode === 'signup') {
      const nameResult = nameSchema.safeParse(fullName);
      if (!nameResult.success) {
        newErrors.fullName = nameResult.error.errors[0].message;
      }
      if (!selectedType) {
        newErrors.type = 'Selecciona un tipo de cuenta';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Credenciales inválidas. Verifica tu email y contraseña.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('¡Bienvenido de nuevo!');
          navigate('/');
        }
      } else {
        if (!selectedType) return;
        
        const { error } = await signUp(email, password, fullName, selectedType);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Este email ya está registrado. Intenta iniciar sesión.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('¡Cuenta creada exitosamente!');
          navigate('/');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSocialLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error('Error al iniciar sesión con Google');
    }
    setIsSocialLoading(false);
  };


  const handleRoleAssignment = async () => {
    if (!selectedRoleForModal) {
      toast.error('Selecciona un tipo de cuenta');
      return;
    }
    setIsLoading(true);
    const { error } = await assignRole(selectedRoleForModal);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('¡Cuenta configurada exitosamente!');
      setShowRoleModal(false);
      navigate('/');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#202020] flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-8">
        <Link to="/" className="flex items-center gap-3 text-white hover:text-[#9BFF43] transition-colors mb-12">
          <ArrowLeft className="w-5 h-5" />
          <div className="flex items-center gap-2">
            <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="40" height="40" rx="8" fill="#9BFF43"/>
              <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#202020" fontSize="14" fontWeight="bold" fontFamily="system-ui">
                M
              </text>
            </svg>
            <span className="text-xl font-bold">Maddi</span>
          </div>
        </Link>

        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <h1 className="text-3xl font-bold text-white mb-2">
            {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </h1>
          <p className="text-white/60 mb-8">
            {mode === 'login' 
              ? 'Ingresa tus credenciales para acceder' 
              : 'Únete a la plataforma de publicidad exterior más grande de México'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'signup' && (
              <>
                {/* User Type Selection */}
                <div className="space-y-3">
                  <Label className="text-white">Tipo de cuenta</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setSelectedType('owner')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedType === 'owner'
                          ? 'border-[#9BFF43] bg-[#9BFF43]/10'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <Building2 className={`w-8 h-8 mx-auto mb-2 ${
                        selectedType === 'owner' ? 'text-[#9BFF43]' : 'text-white/60'
                      }`} />
                      <p className={`font-medium ${
                        selectedType === 'owner' ? 'text-[#9BFF43]' : 'text-white'
                      }`}>Propietario</p>
                      <p className="text-xs text-white/40 mt-1">Tengo espectaculares</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedType('business')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedType === 'business'
                          ? 'border-[#9BFF43] bg-[#9BFF43]/10'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <Store className={`w-8 h-8 mx-auto mb-2 ${
                        selectedType === 'business' ? 'text-[#9BFF43]' : 'text-white/60'
                      }`} />
                      <p className={`font-medium ${
                        selectedType === 'business' ? 'text-[#9BFF43]' : 'text-white'
                      }`}>Negocio</p>
                      <p className="text-xs text-white/40 mt-1">Quiero anunciarme</p>
                    </button>
                  </div>
                  {errors.type && <p className="text-red-400 text-sm">{errors.type}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-white">Nombre completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Juan Pérez"
                    className="bg-[#2A2A2A] border-white/10 text-white placeholder:text-white/40"
                  />
                  {errors.fullName && <p className="text-red-400 text-sm">{errors.fullName}</p>}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="bg-[#2A2A2A] border-white/10 text-white placeholder:text-white/40"
              />
              {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-[#2A2A2A] border-white/10 text-white placeholder:text-white/40 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-sm">{errors.password}</p>}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#9BFF43] text-[#202020] hover:bg-[#8AE63A] font-semibold py-6"
            >
              {isLoading 
                ? 'Procesando...' 
                : mode === 'login' 
                  ? 'Iniciar Sesión' 
                  : 'Crear Cuenta'}
            </Button>
          </form>

          {/* Social Login Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#202020] text-white/40">O continúa con</span>
            </div>
          </div>

          {/* Social Login Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={isSocialLoading}
            className="w-full bg-white border-gray-300 text-gray-700 hover:bg-gray-50 py-6"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar con Google
          </Button>

          <p className="text-center text-white/60 mt-6">
            {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setErrors({});
              }}
              className="text-[#9BFF43] hover:underline ml-2"
            >
              {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>

      {/* Right Side - Image/Decoration */}
      <div className="hidden lg:block w-1/2 bg-gradient-to-br from-[#9BFF43]/20 to-[#202020] relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center max-w-md px-8">
            <div className="w-32 h-32 bg-[#9BFF43] rounded-3xl mx-auto mb-8 flex items-center justify-center">
              <span className="text-[#202020] text-6xl font-bold">M</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              La plataforma de publicidad exterior más grande de México
            </h2>
            <p className="text-white/60">
              Conectamos propietarios de espectaculares con negocios que buscan anunciarse
            </p>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-[#9BFF43]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#9BFF43]/5 rounded-full blur-3xl" />
      </div>

      {/* Role Selection Modal for OAuth users */}
      <Dialog open={showRoleModal} onOpenChange={() => {}}>
        <DialogContent className="bg-[#2A2A2A] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">
              ¡Bienvenido a Maddi!
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/60 text-center mb-4">
            Selecciona el tipo de cuenta para continuar
          </p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setSelectedRoleForModal('owner')}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedRoleForModal === 'owner'
                  ? 'border-[#9BFF43] bg-[#9BFF43]/10'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              <Building2 className={`w-8 h-8 mx-auto mb-2 ${
                selectedRoleForModal === 'owner' ? 'text-[#9BFF43]' : 'text-white/60'
              }`} />
              <p className={`font-medium ${
                selectedRoleForModal === 'owner' ? 'text-[#9BFF43]' : 'text-white'
              }`}>Propietario</p>
              <p className="text-xs text-white/40 mt-1">Tengo espectaculares</p>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleForModal('business')}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedRoleForModal === 'business'
                  ? 'border-[#9BFF43] bg-[#9BFF43]/10'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              <Store className={`w-8 h-8 mx-auto mb-2 ${
                selectedRoleForModal === 'business' ? 'text-[#9BFF43]' : 'text-white/60'
              }`} />
              <p className={`font-medium ${
                selectedRoleForModal === 'business' ? 'text-[#9BFF43]' : 'text-white'
              }`}>Negocio</p>
              <p className="text-xs text-white/40 mt-1">Quiero anunciarme</p>
            </button>
          </div>
          <Button
            onClick={handleRoleAssignment}
            disabled={isLoading || !selectedRoleForModal}
            className="w-full bg-[#9BFF43] text-[#202020] hover:bg-[#8AE63A] font-semibold py-6"
          >
            {isLoading ? 'Configurando...' : 'Continuar'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
