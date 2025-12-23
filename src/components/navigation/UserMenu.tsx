import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Menu, Heart, MessageSquare, Settings, LogOut, User, X, Palette } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import MessageBadge from '@/components/chat/MessageBadge';

interface UserMenuProps {
  className?: string;
}

const UserMenu: React.FC<UserMenuProps> = ({ className }) => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);

  const handleNavigate = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative rounded-full border border-white/20 hover:bg-white/10 ${className}`}
        >
          <Menu className="w-5 h-5 text-white" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-80 bg-[#141414] border-l border-white/10 p-0"
      >
        <SheetHeader className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-white text-lg">Menú</SheetTitle>
          </div>
          {/* User Info */}
          <div className="flex items-center gap-3 mt-4">
            <div className="w-12 h-12 rounded-full bg-[#9BFF43]/20 flex items-center justify-center">
              <User className="w-6 h-6 text-[#9BFF43]" />
            </div>
            <div>
              <p className="text-white font-medium">
                {userRole === 'owner' ? 'Propietario' : 'Negocio'}
              </p>
              <p className="text-white/40 text-sm truncate max-w-[180px]">
                {user.email}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="p-4">
          {/* Navigation Links */}
          <nav className="space-y-1">
            {userRole === 'business' && (
              <>
                <button
                  onClick={() => handleNavigate('/favorites')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Heart className="w-5 h-5 text-[#9BFF43]" />
                  <span>Favoritos</span>
                </button>
                <button
                  onClick={() => handleNavigate('/templates')}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <Palette className="w-5 h-5 text-[#9BFF43]" />
                  <span>Plantillas de diseño</span>
                </button>
              </>
            )}
            
            <button
              onClick={() => handleNavigate('/messages')}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-white/80 hover:bg-white/5 hover:text-white transition-colors"
            >
              <MessageSquare className="w-5 h-5 text-[#9BFF43]" />
              <span>Mensajes</span>
              <MessageBadge />
            </button>

            <button
              onClick={() => handleNavigate('/settings')}
              className="w-full flex items-center gap-3 p-3 rounded-lg text-white/80 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Settings className="w-5 h-5 text-[#9BFF43]" />
              <span>Configuración</span>
            </button>
          </nav>

          <Separator className="my-4 bg-white/10" />

          {/* Dashboard Links */}
          <div className="space-y-1">
            {userRole === 'owner' && (
              <button
                onClick={() => handleNavigate('/owner')}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-[#9BFF43] hover:bg-[#9BFF43]/10 transition-colors font-medium"
              >
                <span>Mi Panel de Propietario</span>
              </button>
            )}
            {userRole === 'business' && (
              <button
                onClick={() => handleNavigate('/business')}
                className="w-full flex items-center gap-3 p-3 rounded-lg text-[#9BFF43] hover:bg-[#9BFF43]/10 transition-colors font-medium"
              >
                <span>Mis Reservas</span>
              </button>
            )}
          </div>

          <Separator className="my-4 bg-white/10" />

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 p-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default UserMenu;