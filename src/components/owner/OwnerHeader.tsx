import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutGrid, Image, BarChart3, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OwnerHeaderProps {
  activeTab: 'dashboard' | 'propiedades' | 'stats';
  onTabChange: (tab: 'dashboard' | 'propiedades' | 'stats') => void;
  userName: string;
  onAddProperty: () => void;
}

const OwnerHeader: React.FC<OwnerHeaderProps> = ({
  activeTab,
  onTabChange,
  userName,
  onAddProperty,
}) => {
  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutGrid },
    { id: 'propiedades' as const, label: 'Propiedades', icon: Image },
    { id: 'stats' as const, label: 'Stats', icon: BarChart3 },
  ];

  return (
    <header className="bg-foreground px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-1">
          <span className="text-3xl font-black italic text-[hsl(86,100%,63%)]">M</span>
          <span className="text-2xl font-bold text-background">addi</span>
        </Link>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-2 bg-background/10 rounded-full p-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-background text-foreground'
                    : 'text-background/70 hover:text-background'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-background font-semibold text-sm">{userName}</p>
            <p className="text-background/60 text-xs">Administrador</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default OwnerHeader;
