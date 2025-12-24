import React, { useState, useEffect } from 'react';
import { Eye, MapPin, Clock, DollarSign, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Billboard } from '@/hooks/useBillboards';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuickStatsProps {
  billboards: Billboard[];
  userId: string;
}

const QuickStats: React.FC<QuickStatsProps> = ({ billboards, userId }) => {
  const [pendingBookings, setPendingBookings] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [previousMonthEarnings, setPreviousMonthEarnings] = useState(0);

  useEffect(() => {
    fetchStats();
  }, [userId, billboards]);

  const fetchStats = async () => {
    if (!userId || billboards.length === 0) return;

    try {
      const billboardIds = billboards.map(b => b.id);
      
      // Get bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status, total_price, created_at')
        .in('billboard_id', billboardIds);

      if (bookingsError) throw bookingsError;

      const pending = bookings?.filter(b => b.status === 'pending').length || 0;
      
      // Calculate current month earnings
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      
      const currentMonthEarnings = bookings
        ?.filter(b => b.status === 'approved' && new Date(b.created_at) >= currentMonthStart)
        .reduce((sum, b) => sum + b.total_price, 0) || 0;
      
      const prevMonthEarnings = bookings
        ?.filter(b => {
          const createdAt = new Date(b.created_at);
          return b.status === 'approved' && createdAt >= previousMonthStart && createdAt < currentMonthStart;
        })
        .reduce((sum, b) => sum + b.total_price, 0) || 0;

      const earnings = bookings?.filter(b => b.status === 'approved').reduce((sum, b) => sum + b.total_price, 0) || 0;

      setPendingBookings(pending);
      setTotalEarnings(earnings);
      setPreviousMonthEarnings(prevMonthEarnings);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Calculate stats
  const totalImpressions = billboards.reduce((sum, b) => sum + (b.daily_impressions || 0), 0);
  const monthlyImpressions = totalImpressions * 30;
  const rentedLocations = billboards.filter(b => !b.is_available).length;
  const availableLocations = billboards.filter(b => b.is_available).length;

  // Calculate earnings change percentage
  const earningsChange = previousMonthEarnings > 0 
    ? ((totalEarnings - previousMonthEarnings) / previousMonthEarnings) * 100 
    : 0;

  const stats = [
    {
      label: 'Impresiones Diarias',
      value: totalImpressions > 0 ? `~${(totalImpressions / 1000).toFixed(0)}K` : 'Sin datos',
      subValue: totalImpressions > 0 ? `~${(monthlyImpressions / 1000000).toFixed(1)}M/mes` : null,
      icon: Eye,
      color: 'text-[#9BFF43]',
      bgColor: 'bg-[#9BFF43]/10',
      tooltip: 'Impresiones diarias estimadas basadas en datos de tráfico de TomTom. Las impresiones mensuales se calculan multiplicando por 30 días.',
    },
    {
      label: 'Ganancias Totales',
      value: `$${totalEarnings.toLocaleString()}`,
      subValue: earningsChange !== 0 ? (
        <span className={`flex items-center gap-1 ${earningsChange >= 0 ? 'text-[#9BFF43]' : 'text-red-400'}`}>
          {earningsChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(earningsChange).toFixed(1)}% vs mes anterior
        </span>
      ) : null,
      icon: DollarSign,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      tooltip: 'Total de ganancias de reservas aprobadas. El porcentaje muestra la variación respecto al mes anterior.',
    },
    {
      label: 'Ubicaciones Rentadas',
      value: `${rentedLocations}/${billboards.length}`,
      subValue: availableLocations > 0 ? `${availableLocations} disponibles` : 'Todas ocupadas',
      icon: MapPin,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      tooltip: 'Número de propiedades actualmente ocupadas vs el total de propiedades en tu portafolio.',
    },
    {
      label: 'Reservas Pendientes',
      value: pendingBookings.toString(),
      subValue: pendingBookings > 0 ? 'Requieren atención' : 'Todo al día',
      icon: Clock,
      color: pendingBookings > 0 ? 'text-yellow-400' : 'text-white/40',
      bgColor: pendingBookings > 0 ? 'bg-yellow-500/10' : 'bg-white/5',
      tooltip: 'Reservas que están esperando tu aprobación o rechazo.',
    },
  ];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-[#1E1E1E] rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-white/30 hover:text-white/60 transition-colors">
                      <Info className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs bg-[#2A2A2A] border-white/10 text-white">
                    <p className="text-sm">{stat.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-white/50 text-sm">{stat.label}</p>
              {stat.subValue && (
                <div className="text-white/40 text-xs mt-1">
                  {typeof stat.subValue === 'string' ? stat.subValue : stat.subValue}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

export default QuickStats;
