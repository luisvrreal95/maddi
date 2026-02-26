import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface BlockedDate {
  id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

interface AvailabilityCalendarProps {
  billboardId: string;
  isDigital?: boolean;
  className?: string;
  onRangeSelect?: (range: DateRange | undefined) => void;
}

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  billboardId,
  isDigital = false,
  className,
  onRangeSelect,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch approved AND pending for display, but only approved blocks dates
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, start_date, end_date, status')
        .eq('billboard_id', billboardId)
        .in('status', ['approved', 'pending']);

      if (!bookingsError && bookingsData) {
        setBookings(bookingsData);
      }

      const { data: blockedData, error: blockedError } = await supabase
        .from('blocked_dates')
        .select('id, start_date, end_date, reason')
        .eq('billboard_id', billboardId);

      if (!blockedError && blockedData) {
        setBlockedDates(blockedData);
      }
    };

    fetchData();

    const channel = supabase
      .channel(`availability-${billboardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `billboard_id=eq.${billboardId}`,
        },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blocked_dates',
          filter: `billboard_id=eq.${billboardId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [billboardId]);

  const getDateStatus = (date: Date): 'available' | 'pending' | 'booked' | 'blocked' => {
    for (const blocked of blockedDates) {
      const start = parseISO(blocked.start_date);
      const end = parseISO(blocked.end_date);
      if (isWithinInterval(date, { start, end })) {
        return 'blocked';
      }
    }

    for (const booking of bookings) {
      const start = parseISO(booking.start_date);
      const end = parseISO(booking.end_date);
      
      if (isWithinInterval(date, { start, end })) {
        return booking.status === 'approved' ? 'booked' : 'pending';
      }
    }
    return 'available';
  };

  const modifiers = {
    booked: (date: Date) => !isDigital && getDateStatus(date) === 'booked',
    pending: (date: Date) => !isDigital && getDateStatus(date) === 'pending',
    blocked: (date: Date) => getDateStatus(date) === 'blocked',
  };

  const modifiersClassNames = {
    booked: 'bg-red-500/30 text-red-300 hover:bg-red-500/40',
    pending: 'bg-yellow-500/30 text-yellow-300 hover:bg-yellow-500/40',
    blocked: 'bg-gray-500/30 text-gray-400 cursor-not-allowed',
  };

  // Only approved (booked) and blocked dates are disabled; pending does NOT block
  // Digital billboards never block dates from bookings
  const isDateDisabled = (date: Date) => {
    if (isDigital) {
      const status = getDateStatus(date);
      return date < new Date() || status === 'blocked';
    }
    const status = getDateStatus(date);
    return date < new Date() || status === 'blocked' || status === 'booked';
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setSelectedRange(range);
    onRangeSelect?.(range);
  };

  return (
    <div className={cn("bg-[#2A2A2A] rounded-2xl p-4", className)}>
      <h3 className="text-white font-bold mb-1">Disponibilidad</h3>
      <p className="text-white/50 text-xs mb-3">Haz clic en una fecha de inicio y luego en una de fin para seleccionar un rango.</p>
      
      <Calendar
        mode="range"
        selected={selectedRange}
        onSelect={handleRangeSelect}
        locale={es}
        modifiers={modifiers}
        modifiersClassNames={modifiersClassNames}
        disabled={isDateDisabled}
        className="pointer-events-auto bg-transparent"
      />

      {selectedRange?.from && selectedRange?.to && (
        <div className="mt-3 p-2 bg-[#1A1A1A] rounded-lg text-sm">
          <span className="text-white/60">Rango: </span>
          <span className="text-white font-medium">{format(selectedRange.from, 'd MMM yyyy', { locale: es })}</span>
          <span className="text-white/60"> — </span>
          <span className="text-white font-medium">{format(selectedRange.to, 'd MMM yyyy', { locale: es })}</span>
        </div>
      )}
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#9BFF43]" />
          <span className="text-white/60 text-sm">Disponible</span>
        </div>
        {!isDigital && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-white/60 text-sm">Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-white/60 text-sm">Reservado</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-500" />
          <span className="text-white/60 text-sm">Bloqueado</span>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;
