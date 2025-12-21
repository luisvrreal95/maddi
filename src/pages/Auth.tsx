import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const { user, signUp, signIn } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [selectedType, setSelectedType] = useState<UserType>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

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
    </div>
  );
};

export default Auth;
