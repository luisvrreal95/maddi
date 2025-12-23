import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Billboard } from '@/hooks/useBillboards';
import OwnerHeader from '@/components/owner/OwnerHeader';
import EarningsChart from '@/components/owner/EarningsChart';
import PropertyListItem from '@/components/owner/PropertyListItem';
import OwnerPropertyCard from '@/components/owner/OwnerPropertyCard';
import AddPropertyDialog from '@/components/owner/AddPropertyDialog';

const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBillboard, setEditingBillboard] = useState<Billboard | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'propiedades' | 'stats'>('dashboard');

  useEffect(() => {
    if (!authLoading && (!user || userRole !== 'owner')) {
      toast.error('Acceso denegado. Solo propietarios pueden acceder.');
      navigate('/');
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchBillboards();
    }
  }, [user]);

  const fetchBillboards = async () => {
    try {
      const { data, error } = await supabase
        .from('billboards')
        .select('*')
        .eq('owner_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBillboards(data || []);
    } catch (error) {
      console.error('Error fetching billboards:', error);
      toast.error('Error al cargar propiedades');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBillboardSaved = () => {
    fetchBillboards();
    setShowAddDialog(false);
    setEditingBillboard(null);
  };

  const handleEditBillboard = (billboard: Billboard) => {
    setEditingBillboard(billboard);
    setShowAddDialog(true);
  };

  // Get user name from profiles or email
  const userName = user?.email?.split('@')[0] || 'Usuario';
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  // Calculate total earnings (mock calculation based on billboards)
  const totalEarnings = billboards.reduce((acc, b) => acc + b.price_per_month, 0);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Header */}
      <OwnerHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userName={displayName}
        onAddProperty={() => setShowAddDialog(true)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {activeTab === 'dashboard' && (
          <>
            {/* Welcome Section */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold text-foreground">
                Bienvenido, {displayName}
              </h1>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowAddDialog(true)}
                  variant="outline"
                  className="border-border"
                >
                  Agregar Propiedad
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-border"
                >
                  <Bell className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Earnings Chart - Left Side */}
              <div className="lg:col-span-2">
                <h2 className="text-xl font-semibold text-foreground mb-4 italic">
                  Últimas ganancias
                </h2>
                <EarningsChart totalEarnings={totalEarnings} />
              </div>

              {/* Properties List - Right Side */}
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Propiedades
                </h2>
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="text-muted-foreground text-center py-8">
                      Cargando...
                    </div>
                  ) : billboards.length === 0 ? (
                    <div className="text-muted-foreground text-center py-8">
                      No hay propiedades aún
                    </div>
                  ) : (
                    billboards.slice(0, 3).map((billboard) => (
                      <PropertyListItem
                        key={billboard.id}
                        billboard={billboard}
                        onClick={() => setActiveTab('propiedades')}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'propiedades' && (
          <>
            {/* Properties Header */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-4xl font-bold text-foreground">
                Propiedades
              </h1>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowAddDialog(true)}
                  variant="outline"
                  className="border-border"
                >
                  Agregar Propiedad
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-border"
                >
                  <Bell className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Properties Grid */}
            {isLoading ? (
              <div className="text-muted-foreground text-center py-12">
                Cargando propiedades...
              </div>
            ) : billboards.length === 0 ? (
              <div className="text-center py-16">
                <h2 className="text-foreground text-2xl font-bold mb-2">
                  Sin propiedades
                </h2>
                <p className="text-muted-foreground mb-6">
                  Agrega tu primera propiedad para comenzar
                </p>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-[hsl(220,80%,55%)] hover:bg-[hsl(220,80%,50%)] text-white"
                >
                  Agregar Propiedad
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {billboards.map((billboard) => (
                  <OwnerPropertyCard
                    key={billboard.id}
                    billboard={billboard}
                    onEdit={() => handleEditBillboard(billboard)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'stats' && (
          <div className="text-center py-16">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Estadísticas
            </h1>
            <p className="text-muted-foreground">
              Próximamente: estadísticas detalladas de tus propiedades
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-foreground py-4">
        <p className="text-center text-background/60 text-sm">
          © 2025 Maddi.
        </p>
      </footer>

      {/* Add/Edit Dialog */}
      <AddPropertyDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditingBillboard(null);
        }}
        billboard={editingBillboard}
        onSave={handleBillboardSaved}
      />
    </div>
  );
};

export default OwnerDashboard;
