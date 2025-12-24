import React from 'react';
import { LayoutGrid, Image, BarChart3, CalendarCheck } from 'lucide-react';

interface DashboardTabsProps {
  activeTab: 'dashboard' | 'propiedades' | 'stats' | 'reservas';
  onTabChange: (tab: 'dashboard' | 'propiedades' | 'stats' | 'reservas') => void;
}

const DashboardTabs: React.FC<DashboardTabsProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutGrid },
    { id: 'propiedades' as const, label: 'Propiedades', icon: Image },
    { id: 'reservas' as const, label: 'Reservas', icon: CalendarCheck },
    { id: 'stats' as const, label: 'Stats', icon: BarChart3 },
  ];

  return (
    <nav className="flex items-center gap-1 bg-[#2A2A2A] rounded-full p-1 w-fit mx-auto mb-8">
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
  );
};

export default DashboardTabs;
