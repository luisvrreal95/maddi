import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Billboard } from '@/hooks/useBillboards';
import { DollarSign, TrendingUp, Eye, Trophy, Calendar } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface OwnerStatsTabProps {
  billboards: Billboard[];
  userId: string;
}

interface CommissionRow {
  owner_payout: number;
  payment_status: string;
  created_at: string;
  booking_id: string;
  booking?: {
    billboard_id: string;
    total_price: number;
    start_date: string;
    end_date: string;
    status: string;
  };
}

const monthLabel = (d: Date) =>
  d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });

const OwnerStatsTab: React.FC<OwnerStatsTabProps> = ({ billboards, userId }) => {
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [activeBookingsByBillboard, setActiveBookingsByBillboard] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const billboardIds = billboards.map(b => b.id);
        if (billboardIds.length === 0) {
          setLoading(false);
          return;
        }

        // Get bookings for these billboards (incl. their commissions)
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id, billboard_id, total_price, start_date, end_date, status')
          .in('billboard_id', billboardIds);

        const bookingIds = (bookings || []).map(b => b.id);
        const bookingMap = new Map((bookings || []).map(b => [b.id, b]));

        let comms: CommissionRow[] = [];
        if (bookingIds.length > 0) {
          const { data: commData } = await supabase
            .from('platform_commissions')
            .select('owner_payout, payment_status, created_at, booking_id')
            .in('booking_id', bookingIds);
          comms = (commData || []).map(c => ({
            ...c,
            booking: bookingMap.get(c.booking_id) as any,
          }));
        }
        setCommissions(comms);

        // Active bookings count per billboard (today between start/end and approved)
        const today = new Date();
        const counts: Record<string, number> = {};
        (bookings || []).forEach(b => {
          if (b.status !== 'approved') return;
          const s = new Date(b.start_date);
          const e = new Date(b.end_date);
          if (s <= today && e >= today) {
            counts[b.billboard_id] = (counts[b.billboard_id] || 0) + 1;
          }
        });
        setActiveBookingsByBillboard(counts);
      } catch (err) {
        console.error('Error loading owner stats', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [billboards]);

  // Total accumulated paid
  const totalPaid = commissions
    .filter(c => c.payment_status === 'paid')
    .reduce((sum, c) => sum + Number(c.owner_payout || 0), 0);

  // Current month earnings (paid)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthPaid = commissions
    .filter(c => c.payment_status === 'paid' && new Date(c.created_at) >= startOfMonth)
    .reduce((sum, c) => sum + Number(c.owner_payout || 0), 0);

  // Occupancy
  const billboardsWithActive = Object.keys(activeBookingsByBillboard).length;
  const occupancy = billboards.length > 0
    ? Math.round((billboardsWithActive / billboards.length) * 100)
    : 0;

  // Total accumulated impressions (sum daily * days each billboard has been live -- approximation: just sum of daily_impressions)
  const totalDailyImpressions = billboards.reduce((s, b) => s + (b.daily_impressions || 0), 0);

  // Last 6 months earnings chart
  const chartData: { name: string; ingresos: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const total = commissions
      .filter(c => {
        const cd = new Date(c.created_at);
        return cd >= d && cd < next;
      })
      .reduce((s, c) => s + Number(c.owner_payout || 0), 0);
    chartData.push({ name: monthLabel(d), ingresos: total });
  }

  // Top billboard by earnings
  const earningsByBillboard: Record<string, number> = {};
  const bookingsCountByBillboard: Record<string, number> = {};
  commissions.forEach(c => {
    if (!c.booking) return;
    earningsByBillboard[c.booking.billboard_id] =
      (earningsByBillboard[c.booking.billboard_id] || 0) + Number(c.owner_payout || 0);
    bookingsCountByBillboard[c.booking.billboard_id] =
      (bookingsCountByBillboard[c.booking.billboard_id] || 0) + 1;
  });
  let topBillboardId: string | null = null;
  let topBillboardScore = 0;
  Object.entries(earningsByBillboard).forEach(([id, val]) => {
    if (val > topBillboardScore) { topBillboardScore = val; topBillboardId = id; }
  });
  if (!topBillboardId) {
    // fallback by booking count
    Object.entries(bookingsCountByBillboard).forEach(([id, val]) => {
      if (val > topBillboardScore) { topBillboardScore = val; topBillboardId = id; }
    });
  }
  const topBillboard = billboards.find(b => b.id === topBillboardId);

  if (loading) {
    return <div className="text-white/60 text-center py-12">Cargando estadísticas...</div>;
  }

  return (
    <div className="space-y-8">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#9BFF43]/20 to-[#9BFF43]/5 border-primary/20 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-sm mb-1">Ingresos totales</p>
              <p className="text-3xl font-bold text-white">${totalPaid.toLocaleString()}</p>
              <p className="text-xs text-white/40 mt-1">acumulado pagado</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="bg-[#1E1E1E] border-white/10 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-sm mb-1">Ingresos del mes</p>
              <p className="text-3xl font-bold text-white">${monthPaid.toLocaleString()}</p>
              <p className="text-xs text-white/40 mt-1">{startOfMonth.toLocaleDateString('es-MX', { month: 'long' })}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-[#1E1E1E] border-white/10 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-sm mb-1">Tasa de ocupación</p>
              <p className="text-3xl font-bold text-white">{occupancy}%</p>
              <p className="text-xs text-white/40 mt-1">{billboardsWithActive} de {billboards.length} activos</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
          </div>
        </Card>

        <Card className="bg-[#1E1E1E] border-white/10 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/60 text-sm mb-1">Impresiones diarias</p>
              <p className="text-3xl font-bold text-white">
                {totalDailyImpressions >= 1000
                  ? `${(totalDailyImpressions / 1000).toFixed(1)}K`
                  : totalDailyImpressions}
              </p>
              <p className="text-xs text-white/40 mt-1">suma de todos tus espectaculares</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Eye className="w-6 h-6 text-white/60" />
            </div>
          </div>
        </Card>
      </div>

      {/* Earnings chart */}
      <Card className="bg-[#1E1E1E] border-white/10 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">Ingresos por mes</h3>
          <p className="text-white/50 text-sm mt-1">Últimos 6 meses</p>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#666" tick={{ fill: '#888', fontSize: 12 }} />
              <YAxis
                stroke="#666"
                tick={{ fill: '#888', fontSize: 12 }}
                tickFormatter={(value) => value === 0 ? '$0' : `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#2A2A2A', border: '1px solid #444', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
              />
              <Bar dataKey="ingresos" fill="#9BFF43" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Top billboard */}
      {topBillboard && (
        <Card className="bg-gradient-to-r from-[#9BFF43]/10 to-transparent border-primary/20 p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/60 text-sm">Top espectacular</p>
              <p className="text-white text-xl font-bold truncate">{topBillboard.title}</p>
              <p className="text-white/50 text-sm mt-1">
                ${(earningsByBillboard[topBillboard.id] || 0).toLocaleString()} generados ·{' '}
                {bookingsCountByBillboard[topBillboard.id] || 0} reservas
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default OwnerStatsTab;
