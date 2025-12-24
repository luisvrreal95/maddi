import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Billboard } from '@/hooks/useBillboards';
import OwnerDashboardHeader from '@/components/navigation/OwnerDashboardHeader';
import QuickStats from '@/components/owner/QuickStats';
import OwnerPropertyCard from '@/components/owner/OwnerPropertyCard';
import AddPropertyDialog from '@/components/owner/AddPropertyDialog';
import AnalyticsDashboard from '@/components/owner/AnalyticsDashboard';
import BookingManagement from '@/components/dashboard/BookingManagement';
import BillboardSelector from '@/components/owner/BillboardSelector';
import TrafficAnalytics from '@/components/owner/TrafficAnalytics';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBillboard, setEditingBillboard] = useState<Billboard | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'propiedades' | 'stats' | 'reservas'>('dashboard');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [billboardToDelete, setBillboardToDelete] = useState<Billboard | null>(null);
  const [selectedBillboard, setSelectedBillboard] = useState<Billboard | null>(null);

  // Auto-select first billboard when billboards load
  useEffect(() => {
    if (billboards.length > 0 && !selectedBillboard) {
      setSelectedBillboard(billboards[0]);
    }
  }, [billboards]);

  // Handle tab from URL params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'reservas') {
      setActiveTab('reservas');
    } else if (tab === 'propiedades') {
      setActiveTab('propiedades');
    } else if (tab === 'stats') {
      setActiveTab('stats');
    } else if (tab === 'dashboard') {
      setActiveTab('dashboard');
    }
  }, [searchParams]);

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

  const handleDeleteClick = (billboard: Billboard) => {
    setBillboardToDelete(billboard);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!billboardToDelete) return;
    
    try {
      const { error } = await supabase
        .from('billboards')
        .delete()
        .eq('id', billboardToDelete.id);
      
      if (error) throw error;
      
      toast.success('Espectacular eliminado correctamente');
      fetchBillboards();
    } catch (error) {
      console.error('Error deleting billboard:', error);
      toast.error('Error al eliminar el espectacular');
    } finally {
      setDeleteDialogOpen(false);
      setBillboardToDelete(null);
    }
  };

  // Get user name from profiles or email
  const userName = user?.email?.split('@')[0] || 'Usuario';
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);


  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col">
      {/* Header */}
      <OwnerDashboardHeader />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {activeTab === 'dashboard' && (
          <>
            {/* Welcome Section */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Bienvenido, {displayName}
              </h1>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-[#9BFF43] hover:bg-[#8AE63A] text-[#121212] font-medium"
              >
                Agregar Propiedad
              </Button>
            </div>

            {/* Billboard Selector below welcome */}
            <div className="mb-8">
              <BillboardSelector
                billboards={billboards}
                selectedId={selectedBillboard?.id || null}
                onSelect={setSelectedBillboard}
                isLoading={isLoading}
              />
            </div>

            {/* Quick Stats */}
            <QuickStats billboards={billboards} userId={user?.id || ''} />

            {/* Traffic Analytics */}
            {selectedBillboard && (
              <div className="mt-8">
                <TrafficAnalytics key={selectedBillboard.id} billboard={selectedBillboard} />
              </div>
            )}
          </>
        )}

        {activeTab === 'propiedades' && (
          <>
            {/* Properties Header */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Propiedades
              </h1>
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-[#9BFF43] hover:bg-[#8AE63A] text-[#121212] font-medium"
              >
                Agregar Propiedad
              </Button>
            </div>

            {/* Properties Grid */}
            {isLoading ? (
              <div className="text-white/60 text-center py-12">
                Cargando propiedades...
              </div>
            ) : billboards.length === 0 ? (
              <div className="text-center py-16">
                <h2 className="text-white text-2xl font-bold mb-2">
                  Sin propiedades
                </h2>
                <p className="text-white/60 mb-6">
                  Agrega tu primera propiedad para comenzar
                </p>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-[#9BFF43] hover:bg-[#8AE63A] text-[#121212] font-medium"
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
                    onDelete={() => handleDeleteClick(billboard)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'stats' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Estadísticas
              </h1>
            </div>
            <AnalyticsDashboard billboards={billboards} userId={user?.id || ''} />
          </>
        )}

        {activeTab === 'reservas' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Gestión de Reservas
              </h1>
            </div>
            <div className="max-w-4xl">
              <BookingManagement />
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] py-4 border-t border-white/10">
        <p className="text-center text-white/40 text-sm">
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#1E1E1E] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              ¿Eliminar espectacular?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Esta acción no se puede deshacer. Se eliminará permanentemente "{billboardToDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2A2A2A] border-white/10 text-white hover:bg-[#3A3A3A]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OwnerDashboard;
