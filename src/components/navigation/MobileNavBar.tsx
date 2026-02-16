import React from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { Search, Heart, User, Home, Building2, Calendar, BarChart3, MessageSquare, ClipboardList } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { cn } from '@/lib/utils';

const MobileNavBar: React.FC = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, userRole } = useAuth();
  const { unreadCount } = useUnreadMessages();
  
  // Hide on admin, messages, settings, auth pages
  const hiddenPaths = ['/admin', '/settings', '/auth'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));
  
  if (shouldHide || !user) {
    // Show public navbar for non-authenticated users
    if (!user && !shouldHide) {
      const publicItems = [
        { label: 'Buscar', icon: Search, href: '/search', active: location.pathname === '/search' },
        { label: 'Favoritos', icon: Heart, href: '/auth', active: false },
        { label: 'Ingresar', icon: User, href: '/auth', active: location.pathname === '/auth' },
      ];

      return (
        <nav 
          className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#1A1A1A] border-t border-white/10 block md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex items-center justify-around h-16 px-4">
            {publicItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                  item.active ? "text-[#9BFF43]" : "text-white/50 hover:text-white/80"
                )}
              >
                <item.icon className={cn("w-5 h-5", item.active && "scale-110")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      );
    }
    return null;
  }

  // Owner navbar
  if (userRole === 'owner') {
    const ownerTab = location.pathname === '/owner' ? (searchParams.get('tab') || 'inicio') : '';
    
    const ownerItems = [
      { label: 'Inicio', icon: Home, href: '/owner?tab=inicio', active: ownerTab === 'inicio' },
      { label: 'Espacios', icon: Building2, href: '/owner?tab=propiedades', active: ownerTab === 'propiedades' },
      { label: 'Calendario', icon: Calendar, href: '/owner?tab=calendario', active: ownerTab === 'calendario' },
      { label: 'Reservas', icon: ClipboardList, href: '/owner?tab=reservas', active: ownerTab === 'reservas' },
      { label: 'Stats', icon: BarChart3, href: '/owner?tab=stats', active: ownerTab === 'stats' },
    ];

    return (
      <nav 
        className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#1A1A1A] border-t border-white/10 block md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16 px-1">
          {ownerItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
                item.active ? "text-[#9BFF43]" : "text-white/50 hover:text-white/80"
              )}
            >
              <item.icon className={cn("w-5 h-5", item.active && "scale-110")} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    );
  }

  // Business navbar
  if (userRole === 'business') {
    const businessItems = [
      { label: 'Buscar', icon: Search, href: '/search', active: location.pathname === '/search' },
      { label: 'Campañas', icon: ClipboardList, href: '/business', active: location.pathname === '/business' },
      { label: 'Favoritos', icon: Heart, href: '/favorites', active: location.pathname === '/favorites' },
      { 
        label: 'Mensajes', icon: MessageSquare, href: '/messages', 
        active: location.pathname === '/messages', badge: unreadCount 
      },
      { label: 'Analytics', icon: BarChart3, href: '/business-analytics', active: location.pathname === '/business-analytics' },
    ];

    return (
      <nav 
        className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#1A1A1A] border-t border-white/10 block md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16 px-1">
          {businessItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors relative",
                item.active ? "text-[#9BFF43]" : "text-white/50 hover:text-white/80"
              )}
            >
              <div className="relative">
                <item.icon className={cn("w-5 h-5", item.active && "scale-110")} />
                {'badge' in item && item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    );
  }

  // Default public navbar for other roles
  const defaultItems = [
    { label: 'Buscar', icon: Search, href: '/search', active: location.pathname === '/search' },
    { label: 'Favoritos', icon: Heart, href: user ? '/favorites' : '/auth', active: location.pathname === '/favorites' },
    { label: 'Perfil', icon: User, href: '/settings', active: location.pathname === '/settings' },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#1A1A1A] border-t border-white/10 block md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16 px-4">
        {defaultItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors",
              item.active ? "text-[#9BFF43]" : "text-white/50 hover:text-white/80"
            )}
          >
            <item.icon className={cn("w-5 h-5", item.active && "scale-110")} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileNavBar;
