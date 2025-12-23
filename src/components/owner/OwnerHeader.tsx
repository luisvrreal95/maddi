import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Image, BarChart3, LogOut, CalendarCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import NotificationBell from '@/components/notifications/NotificationBell';

interface OwnerHeaderProps {
  activeTab: 'dashboard' | 'propiedades' | 'stats' | 'reservas';
  onTabChange: (tab: 'dashboard' | 'propiedades' | 'stats' | 'reservas') => void;
  userName: string;
  onAddProperty: () => void;
}

const OwnerHeader: React.FC<OwnerHeaderProps> = ({
  activeTab,
  onTabChange,
  userName,
}) => {
  const { signOut } = useAuth();
  
  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutGrid },
    { id: 'propiedades' as const, label: 'Propiedades', icon: Image },
    { id: 'reservas' as const, label: 'Reservas', icon: CalendarCheck },
    { id: 'stats' as const, label: 'Stats', icon: BarChart3 },
  ];

  return (
    <header className="bg-[#1A1A1A] px-4 md:px-8 py-4 border-b border-white/10">
      <div className="flex items-center justify-between w-full">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1 flex-shrink-0">
          <span className="text-3xl font-black italic text-[#9BFF43]">M</span>
          <span className="text-2xl font-bold text-white">addi</span>
        </Link>

        {/* Navigation Tabs - Centered */}
        <nav className="flex items-center gap-1 bg-[#2A2A2A] rounded-full p-1 mx-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#9BFF43] text-[#121212]'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Info & Sign Out */}
        <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
          <NotificationBell />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#9BFF43] flex items-center justify-center">
              <span className="text-[#121212] font-bold text-lg">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-white font-semibold text-sm">{userName}</p>
              <p className="text-white/50 text-xs">Propietario</p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 px-3 md:px-4 py-2 text-white/70 hover:text-white hover:bg-white/5 rounded-full transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm hidden md:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default OwnerHeader;