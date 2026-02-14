import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { isBefore, isAfter } from 'date-fns';
import BusinessHeader from '@/components/navigation/BusinessHeader';
import EmptyCampaigns from '@/components/campaigns/EmptyCampaigns';
import CampaignCard from '@/components/campaigns/CampaignCard';
import CampaignDetail from '@/components/campaigns/CampaignDetail';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

interface Booking {
  id: string;
  billboard_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  notes: string | null;
  ad_design_url: string | null;
  created_at: string;
  billboard?: {
    title: string;
    address: string;
    city: string;
    image_url: string | null;
    daily_impressions: number | null;
  };
}

const BusinessDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userRole, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [pastCampaignsOpen, setPastCampaignsOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || userRole !== 'business')) {
      toast.error('Acceso denegado. Solo negocios pueden acceder.');
      navigate('/');
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchBookings();

      const channel = supabase
        .channel(`business-bookings-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `business_id=eq.${user.id}`,
          },
          () => fetchBookings()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchBookings = async () => {
    try {
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('business_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enrichedBookings = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          const { data: billboard } = await supabase
            .from('billboards')
            .select('title, address, city, image_url, daily_impressions')
            .eq('id', booking.billboard_id)
            .maybeSingle();

          return { ...booking, billboard: billboard || undefined };
        })
      );

      setBookings(enrichedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Error al cargar reservas');
    } finally {
      setIsLoading(false);
    }
  };

  // Categorize campaigns
  const { activeCampaigns, scheduledCampaigns, pendingCampaigns, pastCampaigns } = useMemo(() => {
    const now = new Date();
    const active: Booking[] = [];
    const scheduled: Booking[] = [];
    const pending: Booking[] = [];
    const past: Booking[] = [];

    bookings.forEach(booking => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);

      if (booking.status === 'pending') {
        pending.push(booking);
      } else if (booking.status === 'approved') {
        if (isBefore(start, now) && isAfter(end, now)) {
          active.push(booking);
        } else if (isAfter(start, now)) {
          scheduled.push(booking);
        } else {
          past.push(booking);
        }
      } else if (booking.status === 'rejected' || booking.status === 'cancelled') {
        past.push(booking);
      }
    });

    return { activeCampaigns: active, scheduledCampaigns: scheduled, pendingCampaigns: pending, pastCampaigns: past };
  }, [bookings]);

  const currentCampaigns = [...activeCampaigns, ...scheduledCampaigns, ...pendingCampaigns];
  const selectedBooking = bookings.find(b => b.id === selectedBookingId);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <BusinessHeader title="Mis Campañas" />

      <main className="p-6 max-w-3xl mx-auto">
        {isLoading ? (
          <div className="text-muted-foreground text-center py-12">Cargando campañas...</div>
        ) : selectedBooking ? (
          <CampaignDetail 
            booking={selectedBooking} 
            onBack={() => setSelectedBookingId(null)}
            onRefresh={fetchBookings}
          />
        ) : bookings.length === 0 ? (
          <EmptyCampaigns />
        ) : (
          <div className="space-y-6">
            {/* Active/Current Campaigns */}
            {currentCampaigns.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  {activeCampaigns.length > 0 ? 'Campaña Activa' : 'Campañas'}
                </h2>
                <div className="space-y-3">
                  {currentCampaigns.map(booking => (
                    <CampaignCard
                      key={booking.id}
                      booking={booking}
                      onSelect={setSelectedBookingId}
                      isActive={activeCampaigns.some(a => a.id === booking.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Past Campaigns */}
            {pastCampaigns.length > 0 && (
              <Collapsible open={pastCampaignsOpen} onOpenChange={setPastCampaignsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between py-3 text-muted-foreground hover:text-foreground">
                    <span>Campañas Anteriores ({pastCampaigns.length})</span>
                    {pastCampaignsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  {pastCampaigns.map(booking => (
                    <CampaignCard
                      key={booking.id}
                      booking={booking}
                      onSelect={setSelectedBookingId}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Empty current but has past */}
            {currentCampaigns.length === 0 && pastCampaigns.length > 0 && (
              <EmptyCampaigns />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default BusinessDashboard;
