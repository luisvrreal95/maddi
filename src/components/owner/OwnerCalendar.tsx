import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Billboard } from '@/hooks/useBillboards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight, DollarSign, Lock, Unlock, X, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isWithinInterval, addWeeks, subWeeks, startOfYear, addYears, subYears, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PricingOverride {
  id: string;
  billboard_id: string;
  start_date: string;
  end_date: string;
  price_per_month: number;
  notes: string | null;
}

interface BlockedDate {
  id: string;
  billboard_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
}

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
}

interface OwnerCalendarProps {
  billboards: Billboard[];
  userId: string;
}

type ViewMode = 'week' | 'month' | 'year';

const OwnerCalendar: React.FC<OwnerCalendarProps> = ({ billboards, userId }) => {
  const [selectedBillboard, setSelectedBillboard] = useState<Billboard | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [pricingOverrides, setPricingOverrides] = useState<PricingOverride[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState<'price' | 'block' | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (billboards.length > 0 && !selectedBillboard) {
      setSelectedBillboard(billboards[0]);
    }
  }, [billboards]);

  useEffect(() => {
    if (selectedBillboard) {
      fetchCalendarData();
    }
  }, [selectedBillboard]);

  const fetchCalendarData = async () => {
    if (!selectedBillboard) return;
    
    setIsLoading(true);
    try {
      // Fetch pricing overrides
      const { data: pricingData, error: pricingError } = await supabase
        .from('pricing_overrides')
        .select('*')
        .eq('billboard_id', selectedBillboard.id);

      if (pricingError) throw pricingError;
      setPricingOverrides(pricingData || []);

      // Fetch blocked dates
      const { data: blockedData, error: blockedError } = await supabase
        .from('blocked_dates')
        .select('*')
        .eq('billboard_id', selectedBillboard.id);

      if (blockedError) throw blockedError;
      setBlockedDates(blockedData || []);

      // Fetch bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('billboard_id', selectedBillboard.id)
        .in('status', ['approved', 'pending']);

      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);

    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Error al cargar datos del calendario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateMouseDown = (date: Date, isBlocked: boolean, hasBooking: boolean) => {
    if (hasBooking || isBlocked) return;
    setIsDragging(true);
    setDragStart(date);
    setSelectedDates([date]);
  };

  const handleDateMouseEnter = (date: Date, isBlocked: boolean, hasBooking: boolean) => {
    if (!isDragging || !dragStart || hasBooking || isBlocked) return;
    
    // Create a range from dragStart to current date
    const start = dragStart < date ? dragStart : date;
    const end = dragStart < date ? date : dragStart;
    
    const datesInRange: Date[] = [];
    let current = start;
    while (current <= end) {
      datesInRange.push(new Date(current));
      current = addDays(current, 1);
    }
    setSelectedDates(datesInRange);
  };

  const handleDateMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse up listener to handle drag end
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleDateClick = (date: Date) => {
    if (selectedDates.some(d => isSameDay(d, date))) {
      setSelectedDates(selectedDates.filter(d => !isSameDay(d, date)));
    } else {
      setSelectedDates([...selectedDates, date].sort((a, b) => a.getTime() - b.getTime()));
    }
  };

  const handleSavePrice = async () => {
    if (!selectedBillboard || selectedDates.length === 0 || !newPrice) return;
    
    try {
      const startDate = selectedDates[0];
      const endDate = selectedDates[selectedDates.length - 1];
      
      const { error } = await supabase
        .from('pricing_overrides')
        .insert({
          billboard_id: selectedBillboard.id,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          price_per_month: parseFloat(newPrice),
          notes: null
        });

      if (error) throw error;
      
      toast.success('Precio actualizado correctamente');
      setSelectedDates([]);
      setNewPrice('');
      setEditMode(null);
      fetchCalendarData();
    } catch (error) {
      console.error('Error saving price:', error);
      toast.error('Error al guardar el precio');
    }
  };

  const handleBlockDates = async () => {
    if (!selectedBillboard || selectedDates.length === 0) return;
    
    try {
      const startDate = selectedDates[0];
      const endDate = selectedDates[selectedDates.length - 1];
      
      const { error } = await supabase
        .from('blocked_dates')
        .insert({
          billboard_id: selectedBillboard.id,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          reason: blockReason || null
        });

      if (error) throw error;
      
      toast.success('Fechas bloqueadas correctamente');
      setSelectedDates([]);
      setBlockReason('');
      setEditMode(null);
      fetchCalendarData();
    } catch (error) {
      console.error('Error blocking dates:', error);
      toast.error('Error al bloquear fechas');
    }
  };

  const handleDeletePricing = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pricing_overrides')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Precio eliminado');
      fetchCalendarData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleDeleteBlocked = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blocked_dates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Bloqueo eliminado');
      fetchCalendarData();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (viewMode === 'week') {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    } else if (viewMode === 'month') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addYears(currentDate, 1) : subYears(currentDate, 1));
    }
  };

  const getDayStatus = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check if blocked
    const isBlocked = blockedDates.some(bd => 
      isWithinInterval(date, { 
        start: new Date(bd.start_date), 
        end: new Date(bd.end_date) 
      })
    );
    
    // Check if booked
    const booking = bookings.find(b => 
      isWithinInterval(date, { 
        start: new Date(b.start_date), 
        end: new Date(b.end_date) 
      })
    );
    
    // Check if has custom price
    const priceOverride = pricingOverrides.find(po => 
      isWithinInterval(date, { 
        start: new Date(po.start_date), 
        end: new Date(po.end_date) 
      })
    );
    
    return { isBlocked, booking, priceOverride };
  };

  const getPriceForDate = (date: Date): number => {
    const { priceOverride } = getDayStatus(date);
    return priceOverride?.price_per_month || selectedBillboard?.price_per_month || 0;
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    
    return (
      <div className="grid grid-cols-7 gap-2 select-none">
        {days.map((day) => {
          const { isBlocked, booking, priceOverride } = getDayStatus(day);
          const isSelected = selectedDates.some(d => isSameDay(d, day));
          const price = getPriceForDate(day);
          
          return (
            <div
              key={day.toISOString()}
              onMouseDown={() => handleDateMouseDown(day, isBlocked, !!booking)}
              onMouseEnter={() => handleDateMouseEnter(day, isBlocked, !!booking)}
              onMouseUp={handleDateMouseUp}
              className={cn(
                "p-4 rounded-xl border transition-all min-h-[120px] select-none",
                isBlocked && "bg-red-500/10 border-red-500/30 cursor-not-allowed",
                booking?.status === 'approved' && "bg-[#9BFF43]/10 border-[#9BFF43]/30 cursor-not-allowed",
                booking?.status === 'pending' && "bg-yellow-500/10 border-yellow-500/30 cursor-not-allowed",
                priceOverride && !isBlocked && !booking && "bg-blue-500/10 border-blue-500/30 cursor-pointer",
                isSelected && "ring-2 ring-white",
                !isBlocked && !booking && "border-white/10 hover:border-white/30 cursor-pointer"
              )}
            >
              <div className="text-white/50 text-sm">
                {format(day, 'EEE', { locale: es })}
              </div>
              <div className="text-white text-2xl font-bold">
                {format(day, 'd')}
              </div>
              <div className="mt-2">
                {isBlocked && (
                  <div className="flex items-center gap-1 text-red-400 text-xs">
                    <Lock className="w-3 h-3" />
                    Bloqueado
                  </div>
                )}
                {booking && (
                  <div className={cn(
                    "text-xs",
                    booking.status === 'approved' ? "text-[#9BFF43]" : "text-yellow-400"
                  )}>
                    {booking.status === 'approved' ? 'Reservado' : 'Pendiente'}
                  </div>
                )}
                {!isBlocked && !booking && (
                  <div className="text-white/70 text-sm font-medium">
                    ${price.toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const days: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    
    return (
      <div className="select-none">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
            <div key={d} className="text-center text-white/50 text-sm py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const { isBlocked, booking, priceOverride } = getDayStatus(day);
            const isSelected = selectedDates.some(d => isSameDay(d, day));
            const isCurrentMonth = isSameMonth(day, currentDate);
            const price = getPriceForDate(day);
            
            return (
              <div
                key={day.toISOString()}
                onMouseDown={() => isCurrentMonth && handleDateMouseDown(day, isBlocked, !!booking)}
                onMouseEnter={() => isCurrentMonth && handleDateMouseEnter(day, isBlocked, !!booking)}
                onMouseUp={handleDateMouseUp}
                className={cn(
                  "p-2 rounded-lg border transition-all min-h-[80px] select-none",
                  !isCurrentMonth && "opacity-30",
                  isBlocked && "bg-red-500/10 border-red-500/30 cursor-not-allowed",
                  booking?.status === 'approved' && "bg-[#9BFF43]/10 border-[#9BFF43]/30 cursor-not-allowed",
                  booking?.status === 'pending' && "bg-yellow-500/10 border-yellow-500/30 cursor-not-allowed",
                  priceOverride && !isBlocked && !booking && "bg-blue-500/10 border-blue-500/30 cursor-pointer",
                  isSelected && "ring-2 ring-white",
                  !isBlocked && !booking && isCurrentMonth && "border-white/10 hover:border-white/30 cursor-pointer"
                )}
              >
                <div className="text-white text-sm font-medium">
                  {format(day, 'd')}
                </div>
                {isCurrentMonth && (
                  <div className="mt-1">
                    {isBlocked && <Lock className="w-3 h-3 text-red-400" />}
                    {booking && (
                      <div className={cn(
                        "w-full h-1 rounded-full mt-1",
                        booking.status === 'approved' ? "bg-[#9BFF43]" : "bg-yellow-400"
                      )} />
                    )}
                    {!isBlocked && !booking && priceOverride && (
                      <div className="text-blue-400 text-xs">${price.toLocaleString()}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const yearStart = startOfYear(currentDate);
    const months = eachMonthOfInterval({
      start: yearStart,
      end: addMonths(yearStart, 11)
    });
    
    return (
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        {months.map((month) => {
          // Count bookings in this month
          const monthBookings = bookings.filter(b => {
            const startDate = new Date(b.start_date);
            const endDate = new Date(b.end_date);
            return isSameMonth(startDate, month) || isSameMonth(endDate, month);
          });
          
          return (
            <div
              key={month.toISOString()}
              onClick={() => {
                setCurrentDate(month);
                setViewMode('month');
              }}
              className="p-4 rounded-xl border border-white/10 hover:border-white/30 cursor-pointer transition-all"
            >
              <div className="text-white font-medium">
                {format(month, 'MMMM', { locale: es })}
              </div>
              <div className="mt-2 text-sm">
                {monthBookings.length > 0 ? (
                  <span className="text-[#9BFF43]">{monthBookings.length} reservas</span>
                ) : (
                  <span className="text-white/40">Sin reservas</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (billboards.length === 0) {
    return (
      <div className="text-center py-16">
        <Calendar className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <h2 className="text-white text-xl font-bold mb-2">Sin propiedades</h2>
        <p className="text-white/60">Agrega una propiedad para gestionar su calendario</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Calendar */}
      <div className="flex-1">
        {/* Billboard Selector */}
        <div className="mb-6">
          <Select 
            value={selectedBillboard?.id || ''} 
            onValueChange={(id) => setSelectedBillboard(billboards.find(b => b.id === id) || null)}
          >
            <SelectTrigger className="w-full md:w-[400px] bg-[#2A2A2A] border-white/10 text-white">
              <SelectValue placeholder="Selecciona una propiedad" />
            </SelectTrigger>
            <SelectContent className="bg-[#2A2A2A] border-white/10">
              {billboards.map((b) => (
                <SelectItem key={b.id} value={b.id} className="text-white">
                  <div className="flex items-center gap-2">
                    <img src={b.image_url || '/placeholder.svg'} className="w-8 h-8 rounded object-cover" />
                    <span>{b.title}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigatePeriod('prev')}
              className="border-white/20 text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-white text-xl font-bold min-w-[200px] text-center">
              {viewMode === 'year' 
                ? format(currentDate, 'yyyy')
                : format(currentDate, 'MMMM yyyy', { locale: es })
              }
            </h2>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigatePeriod('next')}
              className="border-white/20 text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex gap-2">
            {(['week', 'month', 'year'] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode(mode)}
                className={viewMode === mode 
                  ? 'bg-white text-[#121212]' 
                  : 'border-white/20 text-white/70 hover:text-white'
                }
              >
                {mode === 'week' ? 'Semana' : mode === 'month' ? 'Mes' : 'Año'}
              </Button>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-[#1E1E1E] rounded-xl p-4 border border-white/5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-white/60">Cargando...</div>
            </div>
          ) : (
            <>
              {viewMode === 'week' && renderWeekView()}
              {viewMode === 'month' && renderMonthView()}
              {viewMode === 'year' && renderYearView()}
            </>
          )}
        </div>

        {/* Legend */}
        <div className="flex gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#9BFF43]" />
            <span className="text-white/60">Reservado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-400" />
            <span className="text-white/60">Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-400" />
            <span className="text-white/60">Bloqueado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-400" />
            <span className="text-white/60">Precio especial</span>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-80 space-y-4">
        {/* Selected Dates Actions */}
        {selectedDates.length > 0 && (
          <Card className="bg-[#1E1E1E] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg flex items-center justify-between">
                {selectedDates.length} día(s) seleccionado(s)
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDates([])}
                  className="text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-white/60 text-sm">
                {format(selectedDates[0], 'dd MMM', { locale: es })}
                {selectedDates.length > 1 && (
                  <> - {format(selectedDates[selectedDates.length - 1], 'dd MMM', { locale: es })}</>
                )}
              </div>
              
              {!editMode && (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setEditMode('price')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Editar precio
                  </Button>
                  <Button
                    onClick={() => setEditMode('block')}
                    variant="outline"
                    className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Bloquear
                  </Button>
                </div>
              )}

              {editMode === 'price' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-white/70">Nuevo precio mensual</Label>
                    <Input
                      type="number"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      placeholder={selectedBillboard?.price_per_month?.toString()}
                      className="bg-[#2A2A2A] border-white/10 text-white mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSavePrice} className="flex-1 bg-[#9BFF43] text-[#121212] hover:bg-[#8AE63A]">
                      Guardar
                    </Button>
                    <Button onClick={() => setEditMode(null)} variant="outline" className="border-white/20 text-white">
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {editMode === 'block' && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-white/70">Razón (opcional)</Label>
                    <Textarea
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Ej: Mantenimiento"
                      className="bg-[#2A2A2A] border-white/10 text-white mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleBlockDates} className="flex-1 bg-red-600 hover:bg-red-700">
                      Bloquear
                    </Button>
                    <Button onClick={() => setEditMode(null)} variant="outline" className="border-white/20 text-white">
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Property Info & Booking Settings */}
        {selectedBillboard && (
          <Card className="bg-[#1E1E1E] border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg">Información</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <img 
                  src={selectedBillboard.image_url || '/placeholder.svg'} 
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div>
                  <div className="text-white font-medium">{selectedBillboard.title}</div>
                  <div className="text-white/50 text-sm">{selectedBillboard.city}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-white/10">
                <div className="text-white/50 text-sm">Precio base mensual</div>
                <div className="text-[#9BFF43] text-xl font-bold">
                  ${selectedBillboard.price_per_month?.toLocaleString()} MXN
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking Constraints Settings */}
        {selectedBillboard && (
          <BookingConstraintsCard 
            billboard={selectedBillboard} 
            onUpdate={fetchCalendarData}
          />
        )}
      </div>
    </div>
  );
};

// Booking Constraints Card Component
interface BookingConstraintsCardProps {
  billboard: Billboard;
  onUpdate: () => void;
}

const BookingConstraintsCard: React.FC<BookingConstraintsCardProps> = ({ billboard, onUpdate }) => {
  const [minCampaignDays, setMinCampaignDays] = useState(
    ((billboard as any).min_campaign_days || 30).toString()
  );
  const [minAdvanceBookingDays, setMinAdvanceBookingDays] = useState(
    ((billboard as any).min_advance_booking_days || 7).toString()
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('billboards')
        .update({
          min_campaign_days: parseInt(minCampaignDays) || 30,
          min_advance_booking_days: parseInt(minAdvanceBookingDays) || 7,
        })
        .eq('id', billboard.id);

      if (error) throw error;
      toast.success('Requisitos de reserva actualizados');
      onUpdate();
    } catch (error) {
      console.error('Error updating constraints:', error);
      toast.error('Error al actualizar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-[#1E1E1E] border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#9BFF43]" />
          Requisitos de reserva
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-white/60 text-xs mb-1 block">Duración mínima</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={minCampaignDays}
              onChange={(e) => setMinCampaignDays(e.target.value)}
              className="w-20 h-9 text-center bg-[#2A2A2A] border-white/10 text-white"
              min="1"
            />
            <span className="text-white/50 text-sm">días</span>
          </div>
          <p className="text-white/40 text-xs mt-1">Mínimo días de campaña</p>
        </div>
        
        <div>
          <Label className="text-white/60 text-xs mb-1 block">Anticipación mínima</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={minAdvanceBookingDays}
              onChange={(e) => setMinAdvanceBookingDays(e.target.value)}
              className="w-20 h-9 text-center bg-[#2A2A2A] border-white/10 text-white"
              min="1"
            />
            <span className="text-white/50 text-sm">días antes</span>
          </div>
          <p className="text-white/40 text-xs mt-1">Tiempo para aprobar e instalar</p>
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full bg-[#9BFF43] hover:bg-[#8AE63A] text-[#121212]"
        >
          {isSaving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default OwnerCalendar;
