import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Building2, Store, ArrowLeft, Eye, EyeOff, Mail, CheckCircle } from 'lucide-react';
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRoleForModal, setSelectedRoleForModal] = useState<UserType>(null);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  useEffect(() => {
    if (user && userRole) {
      // Redirect owners to their dashboard with inicio tab, businesses to search
      if (userRole === 'owner') {
        navigate('/owner?tab=inicio', { replace: true });
      } else if (userRole === 'business') {
        navigate('/search', { replace: true });
      }
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
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
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
          } else if (error.message.includes('Email not confirmed')) {
            setRegisteredEmail(email);
            setShowVerificationMessage(true);
            toast.error('Por favor verifica tu correo electrónico antes de iniciar sesión.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('¡Bienvenido de nuevo!');
          // Navigation will be handled by the useEffect above after role is loaded
        }
      } else {
        if (!selectedType) return;
        
        const { error } = await signUp(email, password, fullName, selectedType);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Este email ya está registrado. Intenta iniciar sesión.');
          } else if (error.message.includes('Email not confirmed')) {
            setRegisteredEmail(email);
            setShowVerificationMessage(true);
          } else {
            toast.error(error.message);
          }
        } else {
          // Show verification message instead of navigating
          setRegisteredEmail(email);
          setShowVerificationMessage(true);
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
      // Redirect based on assigned role
      if (selectedRoleForModal === 'owner') {
        navigate('/owner?tab=inicio', { replace: true });
      } else {
        navigate('/search', { replace: true });
      }
    }
    setIsLoading(false);
  };

  // Show verification message after signup
  if (showVerificationMessage) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-[#9BFF43]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-[#9BFF43]" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">¡Revisa tu correo!</h1>
          <p className="text-white/60 text-lg mb-6">
            Hemos enviado un enlace de verificación a:
          </p>
          <p className="text-[#9BFF43] font-semibold text-xl mb-8">{registeredEmail}</p>
          <div className="bg-[#2A2A2A] rounded-xl p-6 border border-white/10 mb-6">
            <div className="flex items-start gap-3 text-left">
              <CheckCircle className="w-5 h-5 text-[#9BFF43] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-white font-medium mb-1">Haz clic en el enlace del correo</p>
                <p className="text-white/50 text-sm">
                  Una vez verificado, podrás iniciar sesión con tus credenciales.
                </p>
              </div>
            </div>
          </div>
          <p className="text-white/40 text-sm mb-6">
            ¿No recibiste el correo? Revisa tu carpeta de spam o{' '}
            <button 
              onClick={() => {
                setShowVerificationMessage(false);
                setMode('signup');
              }}
              className="text-[#9BFF43] hover:underline"
            >
              intenta de nuevo
            </button>
          </p>
          <Button
            onClick={() => {
              setShowVerificationMessage(false);
              setMode('login');
            }}
            className="bg-[#9BFF43] text-[#1A1A1A] hover:bg-[#8AE63A] px-8"
          >
            Ir a iniciar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 lg:p-12">
        <Link to="/" className="flex items-center gap-3 text-white hover:text-[#9BFF43] transition-colors mb-8 group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <img src="/favicon.svg" alt="Maddi" className="h-10" />
        </Link>

        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          {/* Header with icon */}
          <div className="mb-8">
            <div className="w-16 h-16 bg-[#9BFF43] rounded-2xl flex items-center justify-center mb-6">
              {mode === 'login' ? (
                <svg className="w-8 h-8 text-[#1A1A1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-[#1A1A1A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              )}
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">
              {mode === 'login' ? 'Bienvenido de nuevo' : 'Crear Cuenta'}
            </h1>
            <p className="text-white/50 text-lg">
              {mode === 'login' 
                ? 'Ingresa tus credenciales para continuar' 
                : 'Únete a la plataforma de publicidad exterior más grande de México'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <>
                {/* User Type Selection */}
                <div className="space-y-3">
                  <Label className="text-white/80 text-sm font-medium">Tipo de cuenta</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedType('owner')}
                      className={`p-5 rounded-2xl border-2 transition-all duration-200 ${
                        selectedType === 'owner'
                          ? 'border-[#9BFF43] bg-[#9BFF43]/10 shadow-lg shadow-[#9BFF43]/20'
                          : 'border-white/10 hover:border-white/20 bg-white/5'
                      }`}
                    >
                      <Building2 className={`w-7 h-7 mx-auto mb-3 ${
                        selectedType === 'owner' ? 'text-[#9BFF43]' : 'text-white/50'
                      }`} />
                      <p className={`font-semibold ${
                        selectedType === 'owner' ? 'text-[#9BFF43]' : 'text-white'
                      }`}>Propietario</p>
                      <p className="text-xs text-white/40 mt-1">Tengo espectaculares</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedType('business')}
                      className={`p-5 rounded-2xl border-2 transition-all duration-200 ${
                        selectedType === 'business'
                          ? 'border-[#9BFF43] bg-[#9BFF43]/10 shadow-lg shadow-[#9BFF43]/20'
                          : 'border-white/10 hover:border-white/20 bg-white/5'
                      }`}
                    >
                      <Store className={`w-7 h-7 mx-auto mb-3 ${
                        selectedType === 'business' ? 'text-[#9BFF43]' : 'text-white/50'
                      }`} />
                      <p className={`font-semibold ${
                        selectedType === 'business' ? 'text-[#9BFF43]' : 'text-white'
                      }`}>Negocio</p>
                      <p className="text-xs text-white/40 mt-1">Quiero anunciarme</p>
                    </button>
                  </div>
                  {errors.type && <p className="text-red-400 text-sm">{errors.type}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-white/80 text-sm font-medium">Nombre completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Juan Pérez"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus:border-[#9BFF43] focus:ring-[#9BFF43]/20"
                  />
                  {errors.fullName && <p className="text-red-400 text-sm">{errors.fullName}</p>}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/80 text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl focus:border-[#9BFF43] focus:ring-[#9BFF43]/20"
              />
              {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/80 text-sm font-medium">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl pr-12 focus:border-[#9BFF43] focus:ring-[#9BFF43]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-sm">{errors.password}</p>}
            </div>

            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-white/80 text-sm font-medium">Confirmar Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-12 rounded-xl pr-12 focus:border-[#9BFF43] focus:ring-[#9BFF43]/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-400 text-sm">{errors.confirmPassword}</p>}
                </div>

                {selectedType === 'owner' && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                    <input
                      type="checkbox"
                      id="isAnonymous"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#9BFF43] focus:ring-[#9BFF43]/20"
                    />
                    <div>
                      <Label htmlFor="isAnonymous" className="text-white font-medium cursor-pointer">Mantener perfil anónimo</Label>
                      <p className="text-white/40 text-xs mt-1">Tu información no será visible para otros usuarios en tus espectaculares</p>
                    </div>
                  </div>
                )}
              </>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#9BFF43] text-[#1A1A1A] hover:bg-[#8AE63A] font-semibold h-12 rounded-xl text-base transition-all duration-200 hover:shadow-lg hover:shadow-[#9BFF43]/30"
            >
              {isLoading 
                ? 'Procesando...' 
                : mode === 'login' 
                  ? 'Iniciar Sesión' 
                  : 'Crear Cuenta'}
            </Button>
          </form>

          {/* Social Login Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#1A1A1A] text-white/40">O continúa con</span>
            </div>
          </div>

          {/* Social Login Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={isSocialLoading}
            className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 h-12 rounded-xl font-medium transition-all duration-200"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
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

          <p className="text-center text-white/50 mt-8">
            {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setErrors({});
              }}
              className="text-[#9BFF43] hover:underline ml-2 font-medium"
            >
              {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
            </button>
          </p>
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#9BFF43]/10 via-[#1A1A1A] to-[#9BFF43]/5 relative overflow-hidden items-center justify-center">
        {/* Central content */}
        <div className="text-center max-w-lg px-12 relative z-10">
          <div className="w-40 h-40 bg-gradient-to-br from-[#9BFF43] to-[#7ACC35] rounded-[2rem] mx-auto mb-10 flex items-center justify-center shadow-2xl shadow-[#9BFF43]/30 rotate-3 hover:rotate-0 transition-transform duration-500">
            <svg width="100" height="100" viewBox="0 0 169 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="scale-150">
              <path d="M72.9335 51.1919C73.2129 50.9171 73.681 51.1186 73.6719 51.5126L73.6048 54.9794C73.5993 55.2249 73.7953 55.4265 74.0384 55.4265H78.9911C79.227 55.4265 79.4211 55.2359 79.4247 54.9959L79.5318 49.442L79.6842 41.5996C79.6878 41.3779 79.5281 41.1874 79.3086 41.1562L75.8417 40.6743L70.0961 39.8754L66.5403 39.3807C66.3026 39.3477 66.0831 39.5163 66.0504 39.7563L65.3737 44.7109C65.3411 44.951 65.508 45.1727 65.7457 45.2057L69.1545 45.6802C69.5029 45.7279 69.6535 46.1548 69.414 46.415C67.7576 48.2015 66.2373 49.2093 64.639 49.2093C64.2617 49.2093 63.8788 49.1525 63.4888 49.0371C63.4688 49.0316 63.4507 49.0243 63.4307 49.0169C62.6506 48.6779 61.6311 47.9707 61.2029 45.9423C60.8637 44.3353 60.9761 42.2593 61.5204 40.1008L61.5585 39.9249C61.8705 38.2611 62.8321 35.8241 63.8498 33.2423C65.1089 30.0467 66.5367 26.426 67.2097 23.0545C68.115 18.5286 67.52 15.1461 65.3901 12.7128L65.3139 12.6249L65.2304 12.5442C63.9859 11.3312 62.4112 10.7229 60.6659 10.7229C58.9914 10.7229 57.1609 11.2836 55.3158 12.405L55.2868 12.4233C51.1994 14.9757 48.4328 18.6752 45.755 22.2538C44.0624 24.5167 42.5548 26.7595 40.5936 28.438C38.8229 29.9551 36.2849 32.055 36.2178 27.5767C36.2867 24.6578 37.4968 21.5373 38.6107 18.5708C38.7794 18.1292 38.9445 17.6931 39.1042 17.2643L39.1132 17.2387C39.9278 14.9922 40.8222 12.3775 41.1306 9.77005C41.4535 7.0362 41.1887 3.3147 38.0791 1.10124L37.9666 1.02246C37.9539 1.0133 37.9394 1.00416 37.9267 0.996827L37.807 0.930843C36.6078 0.263871 35.3705 0 34.1641 0C30.5502 0 27.1994 2.36188 25.875 3.29638L25.7643 3.37887C21.7169 6.53049 18.0141 10.2886 14.6814 14.6202C14.5653 14.7705 14.3657 14.8273 14.1879 14.7632C13.0922 14.3711 11.9855 14.175 10.8698 14.175C9.63431 14.175 8.38795 14.415 7.13615 14.8988C4.3822 15.9597 2.05821 18.0302 0.127901 19.9835C-0.0426337 20.1558 -0.0426337 20.4361 0.127901 20.6065L3.65834 24.1154C3.82706 24.284 4.101 24.284 4.26972 24.1154C6.66991 21.7004 8.44237 20.5204 9.93364 20.1722C10.3092 20.0843 10.6031 20.5003 10.3981 20.8319C8.85964 23.3202 7.42279 25.9569 6.08936 28.7384L6.0694 28.7806C3.95949 33.3614 2.90182 37.1379 2.74035 40.6578C2.43194 45.1361 4.17901 49.1544 7.19602 50.9043C7.9598 51.3477 9.14447 51.8351 10.6539 51.8351C12.1633 51.8351 13.8233 51.3935 15.7663 50.0467L15.8969 49.9514C18.3479 48.044 20.3762 45.158 21.764 41.6088C23.0557 38.3032 23.7125 34.6569 23.6635 31.06C23.6236 28.0861 23.1065 25.3486 22.1269 22.9244C21.4484 21.246 20.5721 19.7728 19.5035 18.5195C19.3675 18.3582 19.3584 18.1237 19.4872 17.9569C22.4462 14.153 25.7099 10.853 29.2567 8.08431C31.8328 6.35091 35.9565 3.78196 35.3433 9.07925C35.0893 11.2194 34.1859 13.7132 33.6434 15.2121C33.4892 15.6262 33.3296 16.0458 33.1663 16.4728C31.5643 20.6853 29.7465 25.4604 30.5829 30.208L30.5919 30.2556C31.285 33.8488 33.5727 36.1209 36.7094 36.3316L36.782 36.3353C36.8836 36.339 36.9852 36.3408 37.0868 36.3408C39.496 36.3408 41.9361 35.1718 44.5322 32.7696L44.5613 32.7421C46.7927 30.6184 48.6214 28.1741 50.3885 25.8104C52.8467 22.525 55.1689 19.421 58.322 17.4457C62.2007 15.1187 61.9812 18.8823 61.4914 21.9038C60.9217 24.7549 59.6536 27.9707 58.429 31.0802C57.3205 33.8928 56.2737 36.5497 55.8456 38.7503C53.9588 46.3527 56.0742 52.3976 61.3753 54.5378L61.466 54.5744L61.5585 54.6056C62.6017 54.9464 63.6358 55.1168 64.6626 55.1168C66.9068 55.1168 69.1056 54.3032 71.23 52.6816C71.8178 52.2327 72.3747 51.738 72.9099 51.2157C72.9117 51.2139 72.9154 51.2103 72.9172 51.2084L72.9335 51.1919ZM12.4372 45.2167C12.4264 45.2258 12.4137 45.235 12.401 45.2423C11.8785 45.5923 11.229 45.9313 10.6611 45.9313C10.4616 45.9313 10.2729 45.8892 10.1042 45.792C9.21522 45.2772 8.3934 43.3532 8.56031 41.028L8.56574 40.9455C8.68548 38.2117 9.5708 35.137 11.3505 31.2671C12.606 28.6523 13.9575 26.1787 15.4016 23.8479C15.5758 23.5658 15.9876 23.5786 16.1491 23.8681C17.2177 25.7939 17.82 28.2895 17.8581 31.1241C17.9343 36.8301 15.7119 42.6019 12.4391 45.213L12.4372 45.2167Z" fill="#1A1A1A"/>
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-white mb-5 leading-tight">
            La plataforma de publicidad exterior más grande de México
          </h2>
          <p className="text-white/50 text-lg leading-relaxed">
            Conectamos propietarios de espectaculares con negocios que buscan maximizar su alcance publicitario
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mt-12">
            <div className="text-center">
              <p className="text-3xl font-bold text-[#9BFF43]">500+</p>
              <p className="text-white/40 text-sm mt-1">Espectaculares</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#9BFF43]">1M+</p>
              <p className="text-white/40 text-sm mt-1">Impresiones/día</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-[#9BFF43]">32</p>
              <p className="text-white/40 text-sm mt-1">Estados</p>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#9BFF43]/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#9BFF43]/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-[#9BFF43] rounded-full animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-[#9BFF43]/60 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-1/2 right-1/3 w-4 h-4 bg-[#9BFF43]/40 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
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
