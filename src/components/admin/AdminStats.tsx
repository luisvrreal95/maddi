import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, Building2, Calendar, DollarSign, TrendingUp, Clock, Pause, Activity
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsData {
  totalOwners: number;
  totalBusinesses: number;
  totalBillboards: number;
  activeBillboards: number;
  pausedBillboards: number;
  pausedByAdmin: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalRevenue: number;
  maddiCommission: number;
  pendingPayouts: number;
}

const AdminStats = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: ownerRoles } = await supabase.from('user_roles').select('id').eq('role', 'owner');
        const { data: businessRoles } = await supabase.from('user_roles').select('id').eq('role', 'business');

        const { data: allBillboards } = await supabase.from('billboards').select('id, is_available, pause_reason');
        const totalBillboards = allBillboards?.length || 0;
        const activeBillboards = allBillboards?.filter(b => b.is_available).length || 0;
        const pausedBillboards = totalBillboards - activeBillboards;
        const pausedByAdmin = allBillboards?.filter(b => (b as any).pause_reason === 'admin').length || 0;

        const { data: bookings } = await supabase.from('bookings').select('status, total_price');
        const activeCampaigns = bookings?.filter(b => b.status === 'approved' || b.status === 'pending').length || 0;
        const completedCampaigns = bookings?.filter(b => b.status === 'completed').length || 0;
        const approvedBookings = bookings?.filter(b => b.status === 'approved' || b.status === 'completed') || [];
        const totalRevenue = approvedBookings.reduce((sum, b) => sum + Number(b.total_price), 0);

        const { data: pendingCommissions } = await supabase
          .from('platform_commissions')
          .select('owner_payout')
          .eq('payment_status', 'pending');
        const pendingPayouts = pendingCommissions?.reduce((sum, c) => sum + Number(c.owner_payout), 0) || 0;

        setStats({
          totalOwners: ownerRoles?.length || 0,
          totalBusinesses: businessRoles?.length || 0,
          totalBillboards,
          activeBillboards,
          pausedBillboards,
          pausedByAdmin,
          activeCampaigns,
          completedCampaigns,
          totalRevenue,
          maddiCommission: totalRevenue * 0.15,
          pendingPayouts
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(value);
  };

  const statCards = [
    { title: 'Propietarios', value: stats?.totalOwners || 0, icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { title: 'Anunciantes', value: stats?.totalBusinesses || 0, icon: Users, color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
    { title: 'Espectaculares', value: `${stats?.activeBillboards || 0} / ${stats?.totalBillboards || 0}`, subtitle: 'activos / total', icon: Building2, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
    { title: 'Pausadas por Maddi', value: stats?.pausedByAdmin || 0, icon: Pause, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    { title: 'Campañas Activas', value: stats?.activeCampaigns || 0, icon: Activity, color: 'text-green-500', bgColor: 'bg-green-500/10' },
    { title: 'Ingresos Totales', value: formatCurrency(stats?.totalRevenue || 0), icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10' },
    { title: 'Comisión Maddi (15%)', value: formatCurrency(stats?.maddiCommission || 0), icon: TrendingUp, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
    { title: 'Pagos Pendientes', value: formatCurrency(stats?.pendingPayouts || 0), icon: Clock, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="bg-card">
            <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-20" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {(stat as any).subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{(stat as any).subtitle}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AdminStats;
