import MaddiWordmark from '@/components/ui/MaddiWordmark';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import NotificationBell from '@/components/notifications/NotificationBell';
import UserMenu from '@/components/navigation/UserMenu';

const Header: React.FC<{ transparent?: boolean }> = ({ transparent = false }) => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  // Check if user is admin
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/');
      return;
    }
    if (isAdmin) {
      navigate('/admin/dashboard');
    } else if (userRole === 'owner') {
      navigate('/owner?tab=inicio');
    } else if (userRole === 'business') {
      navigate('/search');
    } else {
      navigate('/');
    }
  };

  return (
    <header className={`flex items-center justify-between relative w-full gap-4 ${transparent ? 'bg-transparent border-0' : ''} px-8 py-5 max-md:px-6 max-md:py-4 max-sm:px-4 max-sm:py-3`}>
      {/* Logo */}
      <div className="flex items-center">
        <a href="#" onClick={handleLogoClick} className="cursor-pointer">
          <MaddiWordmark className="h-10 w-auto max-sm:h-8" />
        </a>
      </div>

      {/* Center links */}
      <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-muted-foreground">
        <button onClick={() => navigate('/search')} className="hover:text-foreground transition-colors">Buscar espacios</button>
        <button onClick={() => navigate('/valor-espectacular')} className="hover:text-foreground transition-colors">Valúa tu espectacular</button>
        <button onClick={() => navigate('/auth?role=owner')} className="hover:text-foreground transition-colors">Para propietarios</button>
      </nav>

      {/* Right side navigation */}
      <nav className="flex items-center gap-3">
        {user ? (
          <>
            <NotificationBell />
            <UserMenu />
          </>
        ) : (
          <>
            <button onClick={() => navigate('/auth')} className="hidden md:inline text-sm font-medium text-foreground hover:text-primary transition-colors">
              Iniciar sesión
            </button>
            <button
              onClick={() => navigate('/auth?role=owner')}
              className="hidden md:inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              Publicar gratis
            </button>
            <div className="md:hidden"><UserMenu /></div>
          </>
        )}
      </nav>
    </header>
  );
};

export default Header;
