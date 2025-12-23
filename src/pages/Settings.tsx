import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, User, Bell, Shield, Camera, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NotificationPreferences {
  push: boolean;
  email: boolean;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  company_name: string | null;
  avatar_url: string | null;
  notification_preferences: NotificationPreferences | null;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Debes iniciar sesión para acceder a configuración');
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const rawPrefs = data.notification_preferences as unknown;
        const parsedPrefs: NotificationPreferences = typeof rawPrefs === 'object' && rawPrefs !== null
          ? { push: (rawPrefs as Record<string, boolean>).push ?? true, email: (rawPrefs as Record<string, boolean>).email ?? true }
          : { push: true, email: true };
        const profileData: Profile = {
          ...data,
          notification_preferences: parsedPrefs,
        };
        setProfile(profileData);
        setFullName(data.full_name || '');
        setPhone(data.phone || '');
        setCompanyName(data.company_name || '');
        setPushNotifications(parsedPrefs.push);
        setEmailNotifications(parsedPrefs.email);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Error al cargar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          company_name: companyName || null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Perfil actualizado correctamente');
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notification_preferences: {
            push: pushNotifications,
            email: emailNotifications,
          },
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Preferencias de notificación actualizadas');
    } catch (error) {
      console.error('Error updating notifications:', error);
      toast.error('Error al actualizar preferencias');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona una imagen');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('billboard-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('billboard-images')
        .getPublicUrl(fileName);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success('Avatar actualizado');
      fetchProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Error al subir avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast.success('Correo de restablecimiento enviado');
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast.error('Error al enviar correo');
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#202020] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#9BFF43]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#202020]">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link to="/" className="flex items-center gap-3 text-white hover:text-[#9BFF43] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <div className="flex items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="8" fill="#9BFF43"/>
                <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#202020" fontSize="14" fontWeight="bold" fontFamily="system-ui">M</text>
              </svg>
              <span className="text-xl font-bold">Maddi</span>
            </div>
          </Link>
          <h1 className="text-white text-xl font-bold">Configuración</h1>
          <div className="w-24" /> {/* Spacer */}
        </div>
      </header>

      {/* Content */}
      <main className="p-6 max-w-2xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#9BFF43]" />
          </div>
        ) : (
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-[#2A2A2A] mb-6">
              <TabsTrigger value="profile" className="data-[state=active]:bg-[#9BFF43] data-[state=active]:text-[#202020]">
                <User className="w-4 h-4 mr-2" />
                Perfil
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-[#9BFF43] data-[state=active]:text-[#202020]">
                <Bell className="w-4 h-4 mr-2" />
                Notificaciones
              </TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-[#9BFF43] data-[state=active]:text-[#202020]">
                <Shield className="w-4 h-4 mr-2" />
                Seguridad
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <div className="bg-[#2A2A2A] rounded-2xl p-6 border border-white/10">
                <h2 className="text-white text-lg font-bold mb-6">Información Personal</h2>
                
                {/* Avatar */}
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <Avatar className="w-24 h-24">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-[#9BFF43] text-[#202020] text-2xl font-bold">
                        {fullName.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-[#9BFF43] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#8AE63A] transition-colors">
                      {isUploadingAvatar ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#202020]" />
                      ) : (
                        <Camera className="w-4 h-4 text-[#202020]" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={isUploadingAvatar}
                      />
                    </label>
                  </div>
                  <div>
                    <p className="text-white font-semibold">{fullName || 'Sin nombre'}</p>
                    <p className="text-white/50 text-sm">{user.email}</p>
                    <p className="text-[#9BFF43] text-xs mt-1">
                      {userRole === 'owner' ? 'Propietario' : userRole === 'business' ? 'Negocio' : 'Usuario'}
                    </p>
                  </div>
                </div>

                {/* Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="text-white/70">Nombre Completo</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Tu nombre completo"
                      className="mt-1 bg-[#1A1A1A] border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-white/70">Teléfono</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+52 55 1234 5678"
                      className="mt-1 bg-[#1A1A1A] border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <Label htmlFor="company" className="text-white/70">Empresa</Label>
                    <Input
                      id="company"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Nombre de tu empresa"
                      className="mt-1 bg-[#1A1A1A] border-white/10 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-white/70">Correo Electrónico</Label>
                    <Input
                      value={user.email || ''}
                      disabled
                      className="mt-1 bg-[#1A1A1A] border-white/10 text-white/50"
                    />
                    <p className="text-white/30 text-xs mt-1">El correo no se puede cambiar</p>
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="w-full bg-[#9BFF43] text-[#202020] hover:bg-[#8AE63A] mt-4"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <div className="bg-[#2A2A2A] rounded-2xl p-6 border border-white/10">
                <h2 className="text-white text-lg font-bold mb-6">Preferencias de Notificación</h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Notificaciones Push</p>
                      <p className="text-white/50 text-sm">Recibe notificaciones en la app</p>
                    </div>
                    <Switch
                      checked={pushNotifications}
                      onCheckedChange={setPushNotifications}
                      className="data-[state=checked]:bg-[#9BFF43]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Notificaciones por Email</p>
                      <p className="text-white/50 text-sm">Recibe actualizaciones por correo</p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                      className="data-[state=checked]:bg-[#9BFF43]"
                    />
                  </div>

                  <Button
                    onClick={handleSaveNotifications}
                    disabled={isSaving}
                    className="w-full bg-[#9BFF43] text-[#202020] hover:bg-[#8AE63A] mt-4"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar Preferencias
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <div className="bg-[#2A2A2A] rounded-2xl p-6 border border-white/10">
                <h2 className="text-white text-lg font-bold mb-6">Seguridad</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-white font-medium mb-2">Cambiar Contraseña</h3>
                    <p className="text-white/50 text-sm mb-4">
                      Te enviaremos un correo con instrucciones para restablecer tu contraseña.
                    </p>
                    <Button
                      onClick={handleResetPassword}
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Enviar correo de restablecimiento
                    </Button>
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <h3 className="text-white font-medium mb-2">Sesión Actual</h3>
                    <p className="text-white/50 text-sm mb-4">
                      Iniciada con: {user.email}
                    </p>
                    <Button
                      onClick={() => signOut()}
                      variant="destructive"
                      className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/30"
                    >
                      Cerrar Sesión
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Settings;
