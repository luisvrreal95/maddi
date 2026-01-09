import { useState } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminStats from "@/components/admin/AdminStats";
import CampaignManagement from "@/components/admin/CampaignManagement";
import PropertyManagement from "@/components/admin/PropertyManagement";
import UserManagement from "@/components/admin/UserManagement";
import APIUsageChart from "@/components/admin/APIUsageChart";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

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
      default:
        return null;
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-background">
        <AdminHeader activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="container mx-auto px-4 py-6">
          {renderContent()}
        </main>
      </div>
    </AdminGuard>
  );
};

export default AdminDashboard;
