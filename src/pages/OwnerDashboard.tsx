import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2, Eye, MapPin, ArrowLeft, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import AddBillboardDialog from '@/components/dashboard/AddBillboardDialog';
import BookingManagement from '@/components/dashboard/BookingManagement';
import { Billboard } from '@/hooks/useBillboards';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBillboard, setEditingBillboard] = useState<Billboard | null>(null);

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
      toast.error('Error al cargar espectaculares');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este espectacular?')) return;

    try {
      const { error } = await supabase
        .from('billboards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setBillboards(prev => prev.filter(b => b.id !== id));
      toast.success('Espectacular eliminado');
    } catch (error) {
      console.error('Error deleting billboard:', error);
      toast.error('Error al eliminar');
    }
  };

  const handleBillboardSaved = () => {
    fetchBillboards();
    setShowAddDialog(false);
    setEditingBillboard(null);
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#202020] flex items-center justify-center">
        <div className="text-white">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#202020]">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 text-white hover:text-[#9BFF43] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <div className="flex items-center gap-2">
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="40" height="40" rx="8" fill="#9BFF43"/>
                <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#202020" fontSize="14" fontWeight="bold" fontFamily="system-ui">M</text>
              </svg>
              <span className="text-xl font-bold">Maddi</span>
            </div>
          </Link>
          <h1 className="text-white text-xl font-bold">Panel de Propietario</h1>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-[#9BFF43] text-[#202020] hover:bg-[#8AE63A]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar Espectacular
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        <Tabs defaultValue="billboards" className="w-full">
          <TabsList className="bg-[#1A1A1A] border border-white/10 mb-6">
            <TabsTrigger 
              value="billboards" 
              className="data-[state=active]:bg-[#9BFF43] data-[state=active]:text-[#202020]"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Mis Espectaculares
            </TabsTrigger>
            <TabsTrigger 
              value="bookings"
              className="data-[state=active]:bg-[#9BFF43] data-[state=active]:text-[#202020]"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Reservas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="billboards">
            {isLoading ? (
              <div className="text-white/50 text-center py-12">Cargando espectaculares...</div>
            ) : billboards.length === 0 ? (
              <div className="text-center py-16">
                <MapPin className="w-16 h-16 text-[#9BFF43] mx-auto mb-4" />
                <h2 className="text-white text-2xl font-bold mb-2">Sin espectaculares</h2>
                <p className="text-white/60 mb-6">Agrega tu primer espectacular para comenzar a recibir reservas</p>
                <Button
                  onClick={() => setShowAddDialog(true)}
                  className="bg-[#9BFF43] text-[#202020] hover:bg-[#8AE63A]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Espectacular
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {billboards.map((billboard) => (
                  <div
                    key={billboard.id}
                    className="bg-[#2A2A2A] rounded-2xl overflow-hidden border border-white/10"
                  >
                    {billboard.image_url ? (
                      <img
                        src={billboard.image_url}
                        alt={billboard.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-[#1A1A1A] flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-white/20" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-white font-bold text-lg">{billboard.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          billboard.is_available 
                            ? 'bg-[#9BFF43]/20 text-[#9BFF43]' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {billboard.is_available ? 'Disponible' : 'Ocupado'}
                        </span>
                      </div>
                      <p className="text-white/50 text-sm mb-3">
                        {billboard.address}, {billboard.city}
                      </p>
                      <div className="flex items-center justify-between text-sm mb-4">
                        <span className="text-white/70">{billboard.width_m}m x {billboard.height_m}m</span>
                        <span className="text-[#9BFF43] font-bold">
                          ${billboard.price_per_month.toLocaleString()}/mes
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/billboard/${billboard.id}`)}
                          className="flex-1 border-white/20 text-white hover:bg-white/10"
                        >
                          <Eye className="w-4 h-4 mr-1" /> Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingBillboard(billboard);
                            setShowAddDialog(true);
                          }}
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(billboard.id)}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings">
            <BookingManagement />
          </TabsContent>
        </Tabs>
      </main>

      {/* Add/Edit Dialog */}
      <AddBillboardDialog
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
