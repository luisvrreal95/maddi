import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Menu, Heart, MessageSquare, Settings, LogOut, User, LayoutDashboard, Calendar, UserPlus, Search, Star, BarChart3 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import MessageBadge from '@/components/chat/MessageBadge';

interface UserMenuProps {
  className?: string;
}

const UserMenu: React.FC<UserMenuProps> = ({ className }) => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Menu for non-authenticated users
  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`relative rounded-full border border-white/20 hover:bg-white/10 ${className}`}
          >
            <Menu className="w-5 h-5 text-white" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-card border-border"
        >
          <DropdownMenuItem 
            onClick={() => handleNavigate('/auth')}
            className="cursor-pointer text-foreground hover:bg-muted focus:bg-muted"
          >
            <User className="w-4 h-4 mr-3 text-[#9BFF43]" />
            <span>Ingresar</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleNavigate('/auth')}
            className="cursor-pointer text-foreground hover:bg-muted focus:bg-muted"
          >
            <UserPlus className="w-4 h-4 mr-3 text-[#9BFF43]" />
            <span>Registrarme</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Menu for authenticated users
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative rounded-full border border-white/20 hover:bg-white/10 ${className}`}
        >
          <Menu className="w-5 h-5 text-white" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-64 bg-card border-border"
      >
        {/* User Info */}
        <DropdownMenuLabel className="text-muted-foreground font-normal">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#9BFF43]/20 flex items-center justify-center">
              <User className="w-5 h-5 text-[#9BFF43]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium text-sm">
                {userRole === 'owner' ? 'Propietario' : 'Negocio'}
              </p>
              <p className="text-muted-foreground text-xs truncate">
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="bg-border" />

        {/* Search link for business users */}
        {userRole === 'business' && (
          <DropdownMenuItem 
            onClick={() => handleNavigate('/search')}
            className="cursor-pointer text-[#9BFF43] hover:bg-[#9BFF43]/10 focus:bg-[#9BFF43]/10"
          >
            <Search className="w-4 h-4 mr-3" />
            <span className="font-medium">Buscar Espacios</span>
          </DropdownMenuItem>
        )}

        {/* Dashboard Links */}
        {userRole === 'owner' && (
          <DropdownMenuItem 
            onClick={() => handleNavigate('/owner')}
            className="cursor-pointer text-[#9BFF43] hover:bg-[#9BFF43]/10 focus:bg-[#9BFF43]/10"
          >
            <LayoutDashboard className="w-4 h-4 mr-3" />
            <span className="font-medium">Mi Panel de Propietario</span>
          </DropdownMenuItem>
        )}
        {userRole === 'business' && (
          <>
            <DropdownMenuItem 
              onClick={() => handleNavigate('/business')}
              className="cursor-pointer text-foreground hover:bg-muted focus:bg-muted"
            >
              <Calendar className="w-4 h-4 mr-3 text-[#9BFF43]" />
              <span>Mis Reservas</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleNavigate('/favorites')}
              className="cursor-pointer text-foreground hover:bg-muted focus:bg-muted"
            >
              <Heart className="w-4 h-4 mr-3 text-[#9BFF43]" />
              <span>Favoritos</span>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator className="bg-border" />

        {/* Common Links */}
        <DropdownMenuItem 
          onClick={() => handleNavigate('/messages')}
          className="cursor-pointer text-foreground hover:bg-muted focus:bg-muted"
        >
          <MessageSquare className="w-4 h-4 mr-3 text-[#9BFF43]" />
          <span>Mensajes</span>
          <div className="ml-auto">
            <MessageBadge />
          </div>
        </DropdownMenuItem>

        {userRole === 'business' && (
          <DropdownMenuItem 
            onClick={() => handleNavigate('/reviews')}
            className="cursor-pointer text-foreground hover:bg-muted focus:bg-muted"
          >
            <Star className="w-4 h-4 mr-3 text-[#9BFF43]" />
            <span>Mis Reseñas</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem 
          onClick={() => handleNavigate('/business-analytics')}
          className="cursor-pointer text-foreground hover:bg-muted focus:bg-muted"
        >
          <BarChart3 className="w-4 h-4 mr-3 text-[#9BFF43]" />
          <span>Analytics</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => handleNavigate('/settings')}
          className="cursor-pointer text-foreground hover:bg-muted focus:bg-muted"
        >
          <Settings className="w-4 h-4 mr-3 text-[#9BFF43]" />
          <span>Configuración</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border" />

        {/* Sign Out */}
        <DropdownMenuItem 
          onClick={handleSignOut}
          className="cursor-pointer text-red-400 hover:bg-red-500/10 focus:bg-red-500/10"
        >
          <LogOut className="w-4 h-4 mr-3" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
