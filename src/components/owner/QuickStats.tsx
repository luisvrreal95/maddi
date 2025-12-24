import React, { useState, useEffect } from 'react';
import { Eye, MapPin, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Billboard } from '@/hooks/useBillboards';

interface QuickStatsProps {
  billboards: Billboard[];
  userId: string;
}

const QuickStats: React.FC<QuickStatsProps> = ({ billboards, userId }) => {
  const [pendingBookings, setPendingBookings] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    fetchStats();
  }, [userId, billboards]);

  const fetchStats = async () => {
    if (!userId || billboards.length === 0) return;

    try {
      // Get pending bookings
      const billboardIds = billboards.map(b => b.id);
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status, total_price')
        .in('billboard_id', billboardIds);

      if (bookingsError) throw bookingsError;

      const pending = bookings?.filter(b => b.status === 'pending').length || 0;
      const earnings = bookings?.filter(b => b.status === 'approved').reduce((sum, b) => sum + b.total_price, 0) || 0;

      setPendingBookings(pending);
      setTotalEarnings(earnings);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Calculate stats
  const totalImpressions = billboards.reduce((sum, b) => sum + (b.daily_impressions || 0), 0);
  const rentedLocations = billboards.filter(b => !b.is_available).length;
  const availableLocations = billboards.filter(b => b.is_available).length;

  const stats = [
    {
      label: 'Impresiones Diarias Est.',
      value: totalImpressions.toLocaleString(),
      icon: Eye,
      color: 'text-[#9BFF43]',
      bgColor: 'bg-[#9BFF43]/10',
    },
    {
      label: 'Ubicaciones Rentadas',
      value: rentedLocations.toString(),
      icon: MapPin,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Reservas Pendientes',
      value: pendingBookings.toString(),
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-[#1E1E1E] rounded-2xl p-5 border border-white/5"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center mb-3`}>
              <Icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-white/50 text-sm">{stat.label}</p>
          </div>
        );
      })}
    </div>
  );
};

export default QuickStats;
