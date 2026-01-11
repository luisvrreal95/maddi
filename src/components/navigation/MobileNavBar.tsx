import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Heart, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const MobileNavBar: React.FC = () => {
  const location = useLocation();
  const { user, userRole } = useAuth();
  
  // Hide navbar on owner/business dashboards - they have their own navigation
  const hiddenPaths = ['/owner', '/business', '/admin', '/messages'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));
  
  if (shouldHide) {
    return null;
  }
  
  const navItems = [
    {
      label: 'Buscar',
      icon: Search,
      href: '/search',
      active: location.pathname === '/search',
    },
    {
      label: 'Favoritos',
      icon: Heart,
      href: user ? '/favorites' : '/auth',
      active: location.pathname === '/favorites',
    },
    {
      label: user ? 'Perfil' : 'Ingresar',
      icon: User,
      href: user ? (userRole === 'owner' ? '/owner' : '/settings') : '/auth',
      active: location.pathname === '/auth' || location.pathname === '/settings',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-[#1A1A1A] border-t border-white/10 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-16 px-4">
        {navItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
              item.active 
                ? "text-[#9BFF43]" 
                : "text-white/50 hover:text-white/80"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-transform",
              item.active && "scale-110"
            )} />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileNavBar;
