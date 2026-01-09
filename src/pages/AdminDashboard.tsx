import { useEffect, useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStats from "@/components/admin/AdminStats";
import AdminCharts from "@/components/admin/AdminCharts";
import CampaignManagement from "@/components/admin/CampaignManagement";
import PropertyManagement from "@/components/admin/PropertyManagement";
import UserManagement from "@/components/admin/UserManagement";
import APIUsageChart from "@/components/admin/APIUsageChart";
import AdminSettings from "@/components/admin/AdminSettings";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type AdminRole = 'admin' | 'super_admin';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);

  useEffect(() => {
    const loadRole = async () => {
      if (!user) return;
      const { data, error } = (await (supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle() as any)) as { data?: { role?: AdminRole } | null; error?: any };

      if (error) {
        console.error('Error loading admin role:', error);
        setAdminRole(null);
        return;
      }

      setAdminRole((data?.role as AdminRole) ?? 'admin');
    };

    loadRole();
  }, [user]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Dashboard General</h2>
              <p className="text-muted-foreground">Vista general de la plataforma Maddi</p>
            </div>
            <AdminStats />
            <AdminCharts />
          </div>
        );
      case 'campaigns':
        return <CampaignManagement />;
      case 'properties':
        return <PropertyManagement />;
      case 'users':
        return <UserManagement />;
      case 'api-analytics':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Analítica de APIs</h2>
              <p className="text-muted-foreground">
                Monitoreo del uso de APIs externas (TomTom, Mapbox, INEGI)
              </p>
            </div>
            <APIUsageChart />
          </div>
        );
      case 'settings':
        return <AdminSettings isSuperAdmin={adminRole === 'super_admin'} />;
      default:
        return null;
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <AdminHeader
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isSuperAdmin={adminRole === 'super_admin'}
        />
        <main className="container mx-auto px-4 py-6">
          {renderContent()}
        </main>
      </div>
    </AdminGuard>
  );
};

export default AdminDashboard;
