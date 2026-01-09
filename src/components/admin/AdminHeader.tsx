import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  BarChart3,
  CreditCard,
  ArrowLeft,
  Shield,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const baseTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'campaigns', label: 'Campañas', icon: CreditCard },
  { id: 'properties', label: 'Propiedades', icon: Building2 },
  { id: 'users', label: 'Usuarios', icon: Users },
  { id: 'api-analytics', label: 'API Analytics', icon: BarChart3 },
];

const superAdminTabs = [
  ...baseTabs,
  { id: 'settings', label: 'Configuración', icon: Settings },
];

interface AdminHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isSuperAdmin?: boolean;
}

const AdminHeader = ({ activeTab, onTabChange, isSuperAdmin = false }: AdminHeaderProps) => {
  const tabs = isSuperAdmin ? superAdminTabs : baseTabs;
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Volver</span>
            </Link>
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <span className="font-bold text-lg">Maddi Admin</span>
            </div>
          </div>
        </div>

        <nav className="flex gap-1 -mb-px overflow-x-auto pb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default AdminHeader;
