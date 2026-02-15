import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { Billboard } from '@/hooks/useBillboards';
import OwnerDashboardHeader from '@/components/navigation/OwnerDashboardHeader';
import OwnerPropertyCard from '@/components/owner/OwnerPropertyCard';
import AddPropertyDialog from '@/components/owner/AddPropertyDialog';
import AnalyticsDashboard from '@/components/owner/AnalyticsDashboard';
import BookingManagement from '@/components/dashboard/BookingManagement';
import BillboardSelector from '@/components/owner/BillboardSelector';
import TrafficAnalytics from '@/components/owner/TrafficAnalytics';
import RecommendedActions from '@/components/owner/RecommendedActions';
import OwnerHome from '@/components/owner/OwnerHome';
import OwnerCalendar from '@/components/owner/OwnerCalendar';
import PropertyFilters from '@/components/owner/PropertyFilters';
import PropertyListItem from '@/components/owner/PropertyListItem';
import { INEGIInsights } from '@/components/billboard/INEGIInsights';
import ShareDialog from '@/components/share/ShareDialog';
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

type TabType = 'inicio' | 'propiedades' | 'dashboard' | 'calendario' | 'mensajes' | 'stats' | 'reservas';
type ViewMode = 'grid' | 'list';

const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBillboard, setEditingBillboard] = useState<Billboard | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('inicio');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [billboardToDelete, setBillboardToDelete] = useState<Billboard | null>(null);
  const [selectedBillboard, setSelectedBillboard] = useState<Billboard | null>(null);
  
  // Property filters
  const [filterCity, setFilterCity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Auto-select first billboard when billboards load
  useEffect(() => {
    if (billboards.length > 0 && !selectedBillboard) {
      setSelectedBillboard(billboards[0]);
    }
  }, [billboards]);

  // Handle tab from URL params
  useEffect(() => {
    const tab = searchParams.get('tab') as TabType | null;
    if (tab && ['inicio', 'propiedades', 'dashboard', 'calendario', 'mensajes', 'stats', 'reservas'].includes(tab)) {
      setActiveTab(tab);
    }
    // Handle billboard selection from URL
    const billboardId = searchParams.get('billboard');
    if (billboardId && billboards.length > 0) {
      const billboard = billboards.find(b => b.id === billboardId);
      if (billboard) {
        setSelectedBillboard(billboard);
      }
    }
  }, [searchParams, billboards]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabType);
    setSearchParams({ tab });
  };

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

  // Get unique cities for filter
  const cities = useMemo(() => {
    const uniqueCities = [...new Set(billboards.map(b => b.city))];
    return uniqueCities.sort();
  }, [billboards]);

  // Fetch bookings to check current reservations
  const [currentBookings, setCurrentBookings] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchCurrentBookings = async () => {
      if (!user) return;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data } = await supabase
        .from('bookings')
        .select('billboard_id, start_date, end_date')
        .eq('status', 'approved')
        .lte('start_date', today.toISOString())
        .gte('end_date', today.toISOString());
      
      setCurrentBookings(data || []);
    };
    
    fetchCurrentBookings();
  }, [user]);

  // Filter billboards
  const filteredBillboards = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return billboards.filter(b => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = b.title.toLowerCase().includes(query);
        const matchesCity = b.city.toLowerCase().includes(query);
        const matchesAddress = b.address.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCity && !matchesAddress) return false;
      }
      if (filterCity !== 'all' && b.city !== filterCity) return false;
      
      // Check if billboard has active booking today
      const hasActiveBooking = currentBookings.some(booking => 
        booking.billboard_id === b.id &&
        new Date(booking.start_date) <= today &&
        new Date(booking.end_date) >= today
      );
      
      if (filterStatus === 'available' && (hasActiveBooking || !b.is_available)) return false;
      if (filterStatus === 'unavailable' && !hasActiveBooking && b.is_available) return false;
      return true;
    });
  }, [billboards, filterCity, filterStatus, searchQuery, currentBookings]);

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

  const handlePropertyClick = (billboard: Billboard) => {
    setSelectedBillboard(billboard);
    setSearchParams({ tab: 'dashboard', billboard: billboard.id });
    setActiveTab('dashboard');
  };

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
      <OwnerDashboardHeader activeTab={activeTab} onTabChange={handleTabChange} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {activeTab === 'inicio' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Bienvenido, {displayName}
              </h1>
              <Button
                onClick={() => navigate('/owner/add-property')}
                className="bg-[#9BFF43] hover:bg-[#8AE63A] text-[#121212] font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar espectacular
              </Button>

            </div>
            <OwnerHome billboards={billboards} userId={user?.id || ''} />
          </>
        )}

        {activeTab === 'propiedades' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-white">Mis Espectaculares</h1>
              <div className="flex items-center gap-3">
                {/* View Toggle */}
                <div className="flex items-center bg-[#2A2A2A] rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid' ? 'bg-[#9BFF43] text-[#121212]' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list' ? 'bg-[#9BFF43] text-[#121212]' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
                <ShareDialog
                  title={displayName}
                  subtitle={`${billboards.length} propiedades en Maddi`}
                  shareUrl={`/profile/${user?.id}`}
                />
                <Button onClick={() => navigate('/owner/add-property')} className="bg-[#9BFF43] hover:bg-[#8AE63A] text-[#121212] font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Agregar espectacular
                </Button>
              </div>
            </div>
            <div className="mb-6">
              <PropertyFilters
                cities={cities}
                selectedCity={filterCity}
                onCityChange={setFilterCity}
                selectedStatus={filterStatus}
                onStatusChange={setFilterStatus}
                onClearFilters={() => { setFilterCity('all'); setFilterStatus('all'); setSearchQuery(''); }}
                hasActiveFilters={filterCity !== 'all' || filterStatus !== 'all' || searchQuery !== ''}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
            {isLoading ? (
              <div className="text-white/60 text-center py-12">Cargando propiedades...</div>
            ) : filteredBillboards.length === 0 ? (
              <div className="text-center py-16">
                <h2 className="text-white text-2xl font-bold mb-2">Sin espectaculares</h2>
                <p className="text-white/60 mb-6">Agrega tu primer espectacular para comenzar a recibir contactos</p>
                <Button onClick={() => navigate('/owner/add-property')} className="bg-[#9BFF43] hover:bg-[#8AE63A] text-[#121212] font-medium flex items-center gap-2 mx-auto">
                  <Plus className="w-4 h-4" />
                  Agregar espectacular
                </Button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBillboards.map((billboard) => (
                  <div key={billboard.id} onClick={() => handlePropertyClick(billboard)} className="cursor-pointer">
                    <OwnerPropertyCard billboard={billboard} onEdit={() => handleEditBillboard(billboard)} onDelete={() => handleDeleteClick(billboard)} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBillboards.map((billboard) => (
                  <PropertyListItem 
                    key={billboard.id} 
                    billboard={billboard} 
                    onClick={() => handlePropertyClick(billboard)}
                    onEdit={() => handleEditBillboard(billboard)}
                    onDelete={() => handleDeleteClick(billboard)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'calendario' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-white">Calendario</h1>
              <p className="text-white/60 mt-2">Gestiona precios y disponibilidad de tus propiedades</p>
            </div>
            <OwnerCalendar 
              billboards={billboards} 
              userId={user?.id || ''} 
              onBillboardsRefresh={fetchBillboards}
              onNavigateToBooking={(bookingId) => {
                setActiveTab('reservas');
                // Small delay to allow tab change, then trigger booking selection
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('select-booking', { detail: bookingId }));
                }, 100);
              }}
            />
          </>
        )}

        {activeTab === 'dashboard' && (
          <>
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Dashboard del Espectacular</h1>
              <p className="text-white/60 mb-1">Perfil y características del entorno del espectacular.</p>
              <p className="text-white/40 text-sm mb-6">
                📍 Datos estimados basados en tráfico (TomTom) y actividad económica (INEGI DENUE). No representan ingresos reales.
              </p>
              
              {/* Billboard Selector */}
              {billboards.length > 0 && (
                <BillboardSelector
                  billboards={billboards}
                  selectedId={selectedBillboard?.id || null}
                  onSelect={setSelectedBillboard}
                />
              )}
            </div>
            
            {selectedBillboard ? (
              <div className="space-y-8">
                {/* Traffic Analytics */}
                <TrafficAnalytics billboard={selectedBillboard} />
                
                {/* Recommended Actions - Context-focused */}
                <RecommendedActions billboards={[selectedBillboard]} userId={user?.id || ''} />
                
                {/* INEGI Insights */}
                <INEGIInsights billboard={{
                  id: selectedBillboard.id,
                  latitude: selectedBillboard.latitude,
                  longitude: selectedBillboard.longitude
                }} />
                
                {/* CTA to Statistics */}
                <div className="bg-gradient-to-r from-[#9BFF43]/10 to-transparent border border-[#9BFF43]/20 rounded-xl p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-lg">¿Quieres ver resultados reales?</h3>
                    <p className="text-white/60 text-sm mt-1">Revisa ingresos, contactos y reservas de este espectacular</p>
                  </div>
                  <Button
                    onClick={() => handleTabChange('stats')}
                    className="bg-[#9BFF43] hover:bg-[#8AE63A] text-[#121212] font-medium"
                  >
                    Ver rendimiento e ingresos
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <h2 className="text-white text-xl font-medium mb-2">Sin espectacular seleccionado</h2>
                <p className="text-white/60">Selecciona un espectacular arriba o agrega uno nuevo para ver su dashboard.</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'stats' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Estadísticas</h1>
              <p className="text-white/60 mb-1">Resultados e ingresos generados por tus espectaculares.</p>
              <p className="text-white/40 text-sm">💰 Datos reales del periodo seleccionado.</p>
            </div>
            <AnalyticsDashboard 
              billboards={billboards} 
              userId={user?.id || ''} 
              onViewDashboard={(billboard) => {
                setSelectedBillboard(billboard);
                handleTabChange('dashboard');
                setSearchParams({ tab: 'dashboard', billboard: billboard.id });
              }}
            />
          </>
        )}

        {activeTab === 'reservas' && (
          <>
            <div className="mb-8"><h1 className="text-3xl md:text-4xl font-bold text-white">Gestión de Reservas</h1></div>
            <div className="max-w-4xl"><BookingManagement /></div>
          </>
        )}
      </main>

      <footer className="bg-[#1A1A1A] py-4 border-t border-white/10">
        <p className="text-center text-white/40 text-sm">© 2025 Maddi.</p>
      </footer>

      <AddPropertyDialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) setEditingBillboard(null); }} billboard={editingBillboard} onSave={handleBillboardSaved} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#1E1E1E] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">¿Eliminar espectacular?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">Esta acción no se puede deshacer. Se eliminará permanentemente "{billboardToDelete?.title}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#2A2A2A] border-white/10 text-white hover:bg-[#3A3A3A]">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default OwnerDashboard;
